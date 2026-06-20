import { useAuth } from '../context/AuthContext';

export default function LoginPanel({ error }) {
  const { loginWithGitHub, loginWithGoogle } = useAuth();

  return (
    <section className="login-panel">
      <h2>Sign in to continue</h2>
      <p>
        Log in with GitHub or Google to analyze repositories and keep a personal history of
        every analysis you run.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="login-actions">
        <button type="button" className="login-btn github" onClick={loginWithGitHub}>
          Continue with GitHub
        </button>
        <button type="button" className="login-btn google" onClick={loginWithGoogle}>
          Continue with Google
        </button>
      </div>
    </section>
  );
}
