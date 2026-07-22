import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify, SignJWT } from 'jose';
import { requireEnvironment } from './http';

const COOKIE_NAME = 'studyflow_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

function getSecret() {
  return new TextEncoder().encode(requireEnvironment('AUTH_SECRET'));
}

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf('=');
        if (separatorIndex === -1) return [cookie, ''];
        return [cookie.slice(0, separatorIndex), decodeURIComponent(cookie.slice(separatorIndex + 1))];
      }),
  );
}

function serializeCookie(value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function getSessionUser(request: VercelRequest) {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.id !== 'string' || typeof payload.email !== 'string' || typeof payload.fullName !== 'string') return null;

    return {
      id: payload.id,
      email: payload.email,
      fullName: payload.fullName,
      avatarUrl: typeof payload.avatarUrl === 'string' ? payload.avatarUrl : null,
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(request: VercelRequest) {
  const user = await getSessionUser(request);
  if (!user) throw new Error('AUTH_REQUIRED');
  return user;
}

export async function setSessionCookie(response: VercelResponse, user: SessionUser) {
  const token = await createSessionToken(user);
  response.setHeader('Set-Cookie', serializeCookie(token, MAX_AGE_SECONDS));
}

export function clearSessionCookie(response: VercelResponse) {
  response.setHeader('Set-Cookie', serializeCookie('', 0));
}
