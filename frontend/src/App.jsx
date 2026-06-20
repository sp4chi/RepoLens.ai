import { useCallback, useEffect, useState } from 'react';
import { analyzeRepo, getAnalyses, getAnalysis } from './api';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthBar from './components/AuthBar';
import LoginPanel from './components/LoginPanel';
import RepoForm from './components/RepoForm';
import AnalysisResult from './components/AnalysisResult';
import HistoryList from './components/HistoryList';
import './App.css';

function AppContent() {
  const { user, loading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setHistory([]);
      return;
    }

    try {
      const items = await getAnalyses();
      setHistory(items);
    } catch {
      setHistory([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('login') === 'success') {
      refreshUser();
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (params.get('error')) {
      setAuthError(params.get('error'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshUser]);

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated, loadHistory]);

  async function handleAnalyze(repoUrl) {
    setLoading(true);
    setError('');

    try {
      const result = await analyzeRepo(repoUrl);
      setCurrent(result);
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(id) {
    setError('');

    try {
      const result = await getAnalysis(id);
      setCurrent(result);
    } catch (err) {
      setError(err.message);
    }
  }

  if (authLoading) {
    return (
      <div className="app">
        <div className="loading-state page-loading">
          <div className="spinner" />
          <p>Loading session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-top">
          <div className="hero-badge">Powered by Gemini</div>
          {isAuthenticated && <AuthBar />}
        </div>
        <h1>RepoLens.ai</h1>
        <p>
          Paste any public GitHub repository and get an AI-powered breakdown of its health,
          tech stack, strengths, and improvement opportunities.
        </p>
      </header>

      {!isAuthenticated ? (
        <LoginPanel error={authError} />
      ) : (
        <main className="layout">
          <section className="main-panel">
            <RepoForm onAnalyze={handleAnalyze} loading={loading} />

            {error && <div className="error-banner">{error}</div>}

            {loading && (
              <div className="loading-state">
                <div className="spinner" />
                <p>Fetching repo data and running Gemini analysis…</p>
              </div>
            )}

            {!loading && current?.status === 'completed' && (
              <AnalysisResult data={current} />
            )}
          </section>

          <HistoryList
            items={history}
            onSelect={handleSelect}
            activeId={current?._id}
            userName={user.name}
          />
        </main>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
