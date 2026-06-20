import crypto from 'crypto';
import axios from 'axios';

const OAUTH_STATE_COOKIE = 'oauth_state';

export function createOAuthState() {
  return crypto.randomBytes(24).toString('hex');
}

export function setOAuthStateCookie(res, state) {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000,
  });
}

export function verifyOAuthState(req, res, state) {
  const expected = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  if (!expected || expected !== state) {
    throw new Error('Invalid OAuth state');
  }
}

function getServerUrl() {
  return process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
}

export function getGitHubAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${getServerUrl()}/api/auth/github/callback`,
    scope: 'read:user user:email',
    state,
  });

  return `https://github.com/login/oauth/authorize?${params}`;
}

export function getGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${getServerUrl()}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGitHubCode(code) {
  const tokenResponse = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${getServerUrl()}/api/auth/github/callback`,
    },
    { headers: { Accept: 'application/json' } }
  );

  const accessToken = tokenResponse.data.access_token;
  if (!accessToken) {
    throw new Error('GitHub did not return an access token');
  }

  const headers = { Authorization: `Bearer ${accessToken}` };
  const [profileResponse, emailsResponse] = await Promise.all([
    axios.get('https://api.github.com/user', { headers }),
    axios.get('https://api.github.com/user/emails', { headers }),
  ]);

  const primaryEmail =
    emailsResponse.data.find((entry) => entry.primary)?.email ||
    emailsResponse.data.find((entry) => entry.verified)?.email ||
    emailsResponse.data[0]?.email;

  if (!primaryEmail) {
    throw new Error('Unable to read a verified email from GitHub');
  }

  return {
    provider: 'github',
    providerId: String(profileResponse.data.id),
    email: primaryEmail.toLowerCase(),
    name: profileResponse.data.name || profileResponse.data.login,
    avatar: profileResponse.data.avatar_url || '',
  };
}

export async function exchangeGoogleCode(code) {
  const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    code,
    redirect_uri: `${getServerUrl()}/api/auth/google/callback`,
    grant_type: 'authorization_code',
  });

  const accessToken = tokenResponse.data.access_token;
  if (!accessToken) {
    throw new Error('Google did not return an access token');
  }

  const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.data.email) {
    throw new Error('Unable to read email from Google');
  }

  return {
    provider: 'google',
    providerId: profileResponse.data.id,
    email: profileResponse.data.email.toLowerCase(),
    name: profileResponse.data.name || profileResponse.data.email,
    avatar: profileResponse.data.picture || '',
  };
}
