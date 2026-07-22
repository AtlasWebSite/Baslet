import { randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppUrl, json, methodNotAllowed, requireEnvironment } from '../_lib/http';

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response);
    return;
  }

  const clientId = requireEnvironment('GOOGLE_CLIENT_ID');
  const appUrl = getAppUrl(request);
  const redirectUri = `${appUrl}/api/auth/callback`;
  const state = randomBytes(24).toString('hex');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  response.setHeader('Set-Cookie', `studyflow_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  response.redirect(url.toString());
}
