import { GoogleGenerativeAI } from '@google/generative-ai';

const ANALYSIS_PROMPT = `You are an expert software engineer and open-source analyst. Analyze the following GitHub repository data and return a structured JSON analysis.

Repository Data:
{REPO_DATA}

Respond ONLY with valid JSON (no markdown, no code fences) in this exact shape:
{
  "summary": "2-3 sentence overview of the project",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "techStack": ["technology 1", "technology 2"],
  "useCases": ["use case 1", "use case 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "healthScore": 75,
  "complexity": "low|medium|high",
  "architectureDiagram": "graph TD\\n  A[Frontend] --> B[Backend API]\\n  B --> C[(Database)]",
  "interviewQuestions": [
    { "question": "string", "whatGoodAnswerLooksLike": "1 sentence hint for the interviewer" }
  ]
}

Rules:
- healthScore is 0-100 based on maintenance, docs, activity, and community signals
- Be specific and actionable, referencing actual repo details
- Keep each array item concise (one sentence max)
- architectureDiagram MUST be valid Mermaid flowchart syntax starting with "graph TD". Use \\n for newlines (it is embedded in a JSON string). Represent 6-10 major components (e.g. frontend, backend, database, auth, external APIs) and how they connect, based on the actual file tree and tech stack provided. Do not wrap it in markdown fences.
- Node labels MUST be plain short text only (2-4 words, e.g. "AES Module" not "AES Module (aes.c, aes.h)"). NEVER use parentheses, brackets, quotes, pipes, or any special characters inside node labels — these break the Mermaid parser. If you want to mention a filename, put it in a separate node or omit it entirely.
- Use simple node shape syntax only: A[Label] for rectangles or A(Label) for rounded — pick ONE style and use it consistently for all nodes. Do not mix shapes or nest any punctuation inside the label text itself.
- Example of a SAFE diagram: "graph TD\\n  A[Frontend] --> B[Backend API]\\n  B --> C[Auth Service]\\n  B --> D[(Database)]\\n  B --> E[Gemini API]"
- Generate exactly 5 interviewQuestions, specific to THIS repo's actual architecture and code (not generic questions), covering a mix of design decisions, tradeoffs, and implementation details visible in the data provided.`;

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

function getModelCandidates() {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const candidates = preferred ? [preferred, ...FALLBACK_MODELS] : FALLBACK_MODELS;
  return [...new Set(candidates)];
}

function buildRepoContext(owner, repo, repoData) {
  const topLanguages = Object.entries(repoData.languages || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([lang, bytes]) => `${lang}: ${bytes} bytes`)
    .join(', ');

  const sampleFiles = (repoData.fileTree || []).slice(0, 40).join('\n');

  return JSON.stringify(
    {
      owner,
      repo,
      name: repoData.name,
      description: repoData.description,
      stars: repoData.stars,
      forks: repoData.forks,
      openIssues: repoData.openIssues,
      primaryLanguage: repoData.language,
      topics: repoData.topics,
      license: repoData.license,
      defaultBranch: repoData.defaultBranch,
      createdAt: repoData.createdAt,
      updatedAt: repoData.updatedAt,
      languages: topLanguages,
      readmeExcerpt: (repoData.readme || '').slice(0, 4000),
      sampleFiles,
    },
    null,
    2
  );
}

function parseGeminiJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return JSON.parse(cleaned);
}

// Sanity-check + sanitize the diagram field so a malformed response never
// breaks rendering downstream. Falls back to null if unusable, which the
// frontend should treat as "no diagram available" rather than erroring.
function sanitizeDiagram(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith('graph ')) return null;
  return trimmed;
}

function sanitizeInterviewQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q) => q && typeof q.question === 'string')
    .slice(0, 5)
    .map((q) => ({
      question: q.question.trim(),
      whatGoodAnswerLooksLike:
        typeof q.whatGoodAnswerLooksLike === 'string' ? q.whatGoodAnswerLooksLike.trim() : '',
    }));
}

function isQuotaError(error) {
  const message = error?.message || '';
  return message.includes('429') || message.toLowerCase().includes('quota');
}

function getRetryDelayMs(error, attempt) {
  const match = error?.message?.match(/retry in ([\d.]+)s/i);
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000) + 500;
  }

  return Math.min(30000, 2000 * 2 ** attempt);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithModel(genAI, modelName, prompt) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const parsed = parseGeminiJson(result.response.text());

  return {
    ...parsed,
    architectureDiagram: sanitizeDiagram(parsed.architectureDiagram),
    interviewQuestions: sanitizeInterviewQuestions(parsed.interviewQuestions),
  };
}

export async function analyzeRepo(owner, repo, repoData) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = ANALYSIS_PROMPT.replace('{REPO_DATA}', buildRepoContext(owner, repo, repoData));
  const models = getModelCandidates();
  const errors = [];

  for (const modelName of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await generateWithModel(genAI, modelName, prompt);
      } catch (error) {
        errors.push(`${modelName}: ${error.message}`);

        if (isQuotaError(error) && attempt === 0) {
          await sleep(getRetryDelayMs(error, attempt));
          continue;
        }

        break;
      }
    }
  }

  throw new Error(
    `Gemini analysis failed after trying ${models.join(', ')}. ` +
      'Your API key may have no free-tier quota left, or billing may be required. ' +
      'Set GEMINI_MODEL in backend/.env (e.g. gemini-2.5-flash) and check https://ai.google.dev/gemini-api/docs/rate-limits. ' +
      `Details: ${errors[errors.length - 1]}`
  );
}