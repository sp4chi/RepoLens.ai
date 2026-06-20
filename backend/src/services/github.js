import axios from 'axios';

const GITHUB_API = 'https://api.github.com';

function getHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

export function parseRepoUrl(url) {
  const patterns = [
    /github\.com\/([^/]+)\/([^/?#]+)/i,
    /^([^/]+)\/([^/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
      };
    }
  }

  throw new Error('Invalid GitHub repository URL. Use format: owner/repo or https://github.com/owner/repo');
}

async function githubGet(path) {
  const response = await axios.get(`${GITHUB_API}${path}`, { headers: getHeaders() });
  return response.data;
}

async function fetchReadme(owner, repo) {
  try {
    const data = await githubGet(`/repos/${owner}/${repo}/readme`);
    const content = Buffer.from(data.content, data.encoding || 'base64').toString('utf-8');
    return content.slice(0, 8000);
  } catch {
    return '';
  }
}

async function fetchLanguages(owner, repo) {
  try {
    return await githubGet(`/repos/${owner}/${repo}/languages`);
  } catch {
    return {};
  }
}

async function fetchFileTree(owner, repo, branch = 'main') {
  try {
    const tree = await githubGet(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
    return (tree.tree || [])
      .filter((item) => item.type === 'blob')
      .map((item) => item.path)
      .slice(0, 200);
  } catch {
    try {
      const repoData = await githubGet(`/repos/${owner}/${repo}`);
      const tree = await githubGet(
        `/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`
      );
      return (tree.tree || [])
        .filter((item) => item.type === 'blob')
        .map((item) => item.path)
        .slice(0, 200);
    } catch {
      return [];
    }
  }
}

export async function fetchRepoData(owner, repo) {
  const repoInfo = await githubGet(`/repos/${owner}/${repo}`);

  const [readme, languages, fileTree] = await Promise.all([
    fetchReadme(owner, repo),
    fetchLanguages(owner, repo),
    fetchFileTree(owner, repo, repoInfo.default_branch),
  ]);

  return {
    name: repoInfo.name,
    description: repoInfo.description || '',
    stars: repoInfo.stargazers_count,
    forks: repoInfo.forks_count,
    openIssues: repoInfo.open_issues_count,
    language: repoInfo.language || '',
    topics: repoInfo.topics || [],
    license: repoInfo.license?.spdx_id || repoInfo.license?.name || 'None',
    defaultBranch: repoInfo.default_branch,
    createdAt: repoInfo.created_at,
    updatedAt: repoInfo.updated_at,
    readme,
    languages,
    fileTree,
  };
}
