import { useState } from 'react';

export default function RepoForm({ onAnalyze, loading }) {
  const [repoUrl, setRepoUrl] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (repoUrl.trim()) {
      onAnalyze(repoUrl.trim());
    }
  }

  return (
    <form className="repo-form" onSubmit={handleSubmit}>
      <label htmlFor="repo-url" className="form-label">
        GitHub repository URL or owner/repo
      </label>
      <div className="form-row">
        <input
          id="repo-url"
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/facebook/react or facebook/react"
          disabled={loading}
          autoComplete="off"
        />
        <button type="submit" disabled={loading || !repoUrl.trim()}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>
    </form>
  );
}
