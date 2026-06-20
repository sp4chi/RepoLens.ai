import { Router } from 'express';
import {
  createOAuthState,
  exchangeGitHubCode,
  exchangeGoogleCode,
  getGitHubAuthUrl,
  getGoogleAuthUrl,
  setOAuthStateCookie,
  verifyOAuthState,
} from '../services/oauth.js';
import { findOrCreateOAuthUser, serializeUser } from '../services/user.js';
import { clearAuthCookie, optionalAuth, requireAuth, setAuthCookie, signToken } from '../middleware/auth.js';

const router = Router();

function getClientUrl() {
  return process.env.CLIENT_URL || 'http://localhost:5173';
}

function redirectWithError(res, message) {
  const params = new URLSearchParams({ error: message });
  res.redirect(`${getClientUrl()}/?${params}`);
}

function assertOAuthConfig(provider) {
  if (provider === 'github') {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      throw new Error('GitHub OAuth is not configured');
    }
  }

  if (provider === 'google') {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth is not configured');
    }
  }
}

router.get('/me', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }

  res.json({ user: serializeUser(req.user) });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/github', (_req, res) => {
  try {
    assertOAuthConfig('github');
    const state = createOAuthState();
    setOAuthStateCookie(res, state);
    res.redirect(getGitHubAuthUrl(state));
  } catch (error) {
    redirectWithError(res, error.message);
  }
});

router.get('/github/callback', async (req, res) => {
  try {
    assertOAuthConfig('github');
    verifyOAuthState(req, res, req.query.state);

    if (req.query.error) {
      throw new Error(req.query.error_description || req.query.error);
    }

    if (!req.query.code) {
      throw new Error('Missing authorization code from GitHub');
    }

    const profile = await exchangeGitHubCode(req.query.code);
    const user = await findOrCreateOAuthUser(profile);
    setAuthCookie(res, signToken(user._id));
    res.redirect(`${getClientUrl()}/?login=success`);
  } catch (error) {
    redirectWithError(res, error.message);
  }
});

router.get('/google', (_req, res) => {
  try {
    assertOAuthConfig('google');
    const state = createOAuthState();
    setOAuthStateCookie(res, state);
    res.redirect(getGoogleAuthUrl(state));
  } catch (error) {
    redirectWithError(res, error.message);
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    assertOAuthConfig('google');
    verifyOAuthState(req, res, req.query.state);

    if (req.query.error) {
      throw new Error(req.query.error_description || req.query.error);
    }

    if (!req.query.code) {
      throw new Error('Missing authorization code from Google');
    }

    const profile = await exchangeGoogleCode(req.query.code);
    const user = await findOrCreateOAuthUser(profile);
    setAuthCookie(res, signToken(user._id));
    res.redirect(`${getClientUrl()}/?login=success`);
  } catch (error) {
    redirectWithError(res, error.message);
  }
});

export default router;
