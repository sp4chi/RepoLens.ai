import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export function signToken(userId) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });
}

export function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findById(payload.userId).select('-__v');

    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return next();
    }

    const payload = jwt.verify(token, getJwtSecret());
    req.user = await User.findById(payload.userId).select('-__v');
  } catch {
    req.user = null;
  }

  next();
}
