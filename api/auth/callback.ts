import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppUrl, requireEnvironment } from '../_lib/http';
import { upsertProfileFromSession } from '../_lib/db';
import { setSessionCookie, type SessionUser } from '../_lib/session';

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

function getCookie(request: VercelRequest, name: string) {
  const cookieHeader = request.headers.cookie ?? '';
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!target) return undefined;
  return decodeURIComponent(target.slice(name.length + 1));
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const appUrl = getAppUrl(request);
  const code = typeof request.query.code === 'string' ? request.query.code : '';
  const state = typeof request.query.state === 'string' ? request.query.state : '';
  const storedState = getCookie(request, 'studyflow_oauth_state');

  response.setHeader('Set-Cookie', 'studyflow_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

  if (!code || !state || !storedState || state !== storedState) {
    response.redirect(`${appUrl}/auth/callback?error_description=${encodeURIComponent('Não foi possível validar o retorno do Google.')}`);
    return;
  }

  try {
    const clientId = requireEnvironment('GOOGLE_CLIENT_ID');
    const clientSecret = requireEnvironment('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${appUrl}/api/auth/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenPayload = await tokenResponse.json() as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      console.error('Erro ao trocar código do Google:', tokenPayload);
      response.redirect(`${appUrl}/auth/callback?error_description=${encodeURIComponent('O Google não concluiu a autenticação.')}`);
      return;
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });
    const googleUser = await userInfoResponse.json() as GoogleUserInfo;

    if (!userInfoResponse.ok || !googleUser.sub || !googleUser.email) {
      console.error('Erro ao buscar perfil do Google:', googleUser);
      response.redirect(`${appUrl}/auth/callback?error_description=${encodeURIComponent('Não foi possível carregar seu perfil Google.')}`);
      return;
    }

    const user: SessionUser = {
      id: googleUser.sub,
      email: googleUser.email,
      fullName: googleUser.name ?? googleUser.email.split('@')[0] ?? 'Estudante',
      avatarUrl: googleUser.picture ?? null,
    };

    await upsertProfileFromSession(user);
    await setSessionCookie(response, user);
    response.redirect(`${appUrl}/auth/callback`);
  } catch (error) {
    console.error('Erro na callback Google/Vercel:', error);
    response.redirect(`${appUrl}/auth/callback?error_description=${encodeURIComponent('Erro inesperado ao concluir o login.')}`);
  }
}
