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
  "complexity": "low|medium|high"
}

Rules:
- healthScore is 0-100 based on maintenance, docs, activity, and community signals
- Be specific and actionable, referencing actual repo details
- Keep each array item concise (one sentence max)`;

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
  return parseGeminiJson(result.response.text());
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
