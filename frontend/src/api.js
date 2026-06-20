const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getMe() {
  return request('/api/auth/me');
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function getLoginUrl(provider) {
  return `${API_BASE}/api/auth/${provider}`;
}

export function analyzeRepo(repoUrl) {
  return request('/api/analyses', {
    method: 'POST',
    body: JSON.stringify({ repoUrl }),
  });
}

export function getAnalyses() {
  return request('/api/analyses');
}

export function getAnalysis(id) {
  return request(`/api/analyses/${id}`);
}
