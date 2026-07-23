import { randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  cancelUserSubscription,
  completeProfileOnboarding,
  createMentalMapForUser,
  createStarterStudySets,
  createStudySetForUser,
  deleteMentalMapForUser,
  deleteStudyData,
  getMentalMap,
  getMentalMaps,
  getProfile,
  getStudySets,
  getSubscription,
  markStarterContentCreated,
  saveProgress,
  saveQuiz,
  updateMentalMapForUser,
} from './_lib/data.js';
import { upsertProfileFromSession } from './_lib/db.js';
import { getAppUrl, json, methodNotAllowed, readJsonBody, requireEnvironment } from './_lib/http.js';
import {
  clearSessionCookie,
  getSessionUser,
  requireSessionUser,
  setSessionCookie,
  type SessionUser,
} from './_lib/session.js';

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

function getStringQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function getSafeInternalPath(value: string | undefined) {
  if (!value) return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';

  try {
    const parsed = new URL(value, 'https://studyflow.local');
    if (parsed.origin !== 'https://studyflow.local') return '/';

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

function getCookie(request: VercelRequest, name: string) {
  const cookieHeader = request.headers.cookie ?? '';
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!target) return undefined;

  return decodeURIComponent(target.slice(name.length + 1));
}

function getRouteSegments(request: VercelRequest) {
  const routeParam = request.query.route;
  if (Array.isArray(routeParam)) {
    return routeParam.flatMap((segment) => segment.split('/')).filter(Boolean);
  }

  if (typeof routeParam === 'string' && routeParam) {
    return routeParam.split('/').filter(Boolean);
  }

  const host = request.headers.host ?? 'localhost';
  const url = new URL(request.url ?? '/', `http://${host}`);
  return url.pathname
    .replace(/^\/api\/?/, '')
    .replace(/^\[\.\.\.route\]\/?/, '')
    .split('/')
    .filter(Boolean);
}

function getMethod(request: VercelRequest) {
  return request.method ?? 'GET';
}

function unauthorized(response: VercelResponse, message = 'Entre novamente para continuar.') {
  json(response, 401, { error: message });
}

function routeNotFound(response: VercelResponse) {
  json(response, 404, { error: 'Rota não encontrada.' });
}

async function handleGoogleLogin(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'GET') {
    methodNotAllowed(response);
    return;
  }

  const clientId = requireEnvironment('GOOGLE_CLIENT_ID');
  const appUrl = getAppUrl(request);
  const redirectUri = `${appUrl}/api/auth/callback`;
  const state = randomBytes(24).toString('hex');
  const nextPath = getSafeInternalPath(getStringQueryValue(request.query.next));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  response.setHeader('Set-Cookie', [
    `studyflow_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
    `studyflow_auth_next=${encodeURIComponent(nextPath)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
  ]);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  response.redirect(url.toString());
}

async function handleGoogleCallback(request: VercelRequest, response: VercelResponse) {
  const appUrl = getAppUrl(request);
  const code = typeof request.query.code === 'string' ? request.query.code : '';
  const state = typeof request.query.state === 'string' ? request.query.state : '';
  const storedState = getCookie(request, 'studyflow_oauth_state');
  const nextPath = getSafeInternalPath(getCookie(request, 'studyflow_auth_next'));

  response.setHeader('Set-Cookie', [
    'studyflow_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    'studyflow_auth_next=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  ]);

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
    const callbackUrl = new URL('/auth/callback', appUrl);
    if (nextPath !== '/') callbackUrl.searchParams.set('next', nextPath);
    response.redirect(callbackUrl.toString());
  } catch (error) {
    console.error('Erro na callback Google/Vercel:', error);
    response.redirect(`${appUrl}/auth/callback?error_description=${encodeURIComponent('Erro inesperado ao concluir o login.')}`);
  }
}

async function handleAuthSession(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'GET') {
    methodNotAllowed(response);
    return;
  }

  const user = await getSessionUser(request);
  if (!user) {
    json(response, 200, { session: null });
    return;
  }

  json(response, 200, {
    session: {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: {
          full_name: user.fullName,
          name: user.fullName,
          avatar_url: user.avatarUrl,
        },
      },
    },
  });
}

function handleAuthLogout(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  clearSessionCookie(response);
  json(response, 200, { ok: true });
}

async function handleProfile(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'GET') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    const profile = await getProfile(user);
    json(response, 200, { profile });
  } catch {
    json(response, 401, { error: 'Não foi possível carregar seu perfil.' });
  }
}

async function handleProfileOnboarding(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    const profile = await completeProfileOnboarding(user);
    json(response, 200, { profile });
  } catch {
    json(response, 500, { error: 'Não foi possível salvar o tutorial.' });
  }
}

async function handleProfileStarterContent(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    await markStarterContentCreated(user);
    json(response, 200, { ok: true });
  } catch {
    json(response, 500, { error: 'Não foi possível atualizar o perfil.' });
  }
}

async function handleStudySets(request: VercelRequest, response: VercelResponse) {
  try {
    const user = await requireSessionUser(request);

    if (getMethod(request) === 'GET') {
      const studySets = await getStudySets(user);
      json(response, 200, { studySets });
      return;
    }

    if (getMethod(request) === 'POST') {
      const body = await readJsonBody<Record<string, unknown>>(request);
      const studySet = await createStudySetForUser(user, body);
      json(response, 201, { studySet });
      return;
    }

    if (getMethod(request) === 'DELETE') {
      await deleteStudyData(user);
      json(response, 200, { ok: true });
      return;
    }

    methodNotAllowed(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar seus estudos.';
    json(response, message === 'AUTH_REQUIRED' ? 401 : 400, { error: message === 'AUTH_REQUIRED' ? 'Entre novamente para continuar.' : message });
  }
}

async function handleStarterStudySets(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    const body = await readJsonBody<{ starterStudySets?: Array<Record<string, unknown>> }>(request);
    const created = await createStarterStudySets(user, body.starterStudySets ?? []);
    json(response, 200, { created });
  } catch (error) {
    console.error('Erro ao criar flashcards iniciais:', error);
    json(response, 200, { created: false });
  }
}

async function handleProgress(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    const body = await readJsonBody<Record<string, unknown>>(request);
    await saveProgress(user, body);
    json(response, 200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Seu progresso não pôde ser salvo.';
    json(response, message === 'AUTH_REQUIRED' ? 401 : 400, { error: message });
  }
}

async function handleQuizResults(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    const body = await readJsonBody<Record<string, unknown>>(request);
    await saveQuiz(user, body);
    json(response, 200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'O resultado do teste não pôde ser salvo.';
    json(response, message === 'AUTH_REQUIRED' ? 401 : 400, { error: message });
  }
}

async function handleSubscription(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'GET') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    const subscription = await getSubscription(user);
    json(response, 200, { subscription });
  } catch {
    unauthorized(response, 'Entre novamente para verificar sua assinatura.');
  }
}

async function handleSubscriptionCancel(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    await cancelUserSubscription(user);
    json(response, 200, { status: 'active' });
  } catch {
    unauthorized(response, 'Entre novamente para cancelar a assinatura.');
  }
}

async function handleBillingCheckout(request: VercelRequest, response: VercelResponse) {
  if (getMethod(request) !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  try {
    await requireSessionUser(request);
    json(response, 503, { error: 'Checkout do Mercado Pago ainda não configurado.' });
  } catch {
    unauthorized(response, 'Entre novamente para assinar.');
  }
}

async function handleMentalMaps(request: VercelRequest, response: VercelResponse) {
  try {
    const user = await requireSessionUser(request);

    if (getMethod(request) === 'GET') {
      const mentalMaps = await getMentalMaps(user);
      json(response, 200, { mentalMaps });
      return;
    }

    if (getMethod(request) === 'POST') {
      const body = await readJsonBody<Record<string, unknown>>(request);
      const mentalMap = await createMentalMapForUser(user, body);
      json(response, 201, { mentalMap });
      return;
    }

    methodNotAllowed(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível processar o mapa mental.';
    json(response, message === 'AUTH_REQUIRED' ? 401 : 400, { error: message });
  }
}

async function handleMentalMapById(request: VercelRequest, response: VercelResponse, id: string) {
  try {
    const user = await requireSessionUser(request);
    if (!id) {
      json(response, 400, { error: 'Mapa mental inválido.' });
      return;
    }

    if (getMethod(request) === 'GET') {
      const mentalMap = await getMentalMap(user, id);
      json(response, 200, { mentalMap });
      return;
    }

    if (getMethod(request) === 'PUT') {
      const body = await readJsonBody<Record<string, unknown>>(request);
      const mentalMap = await updateMentalMapForUser(user, id, body);
      json(response, 200, { mentalMap });
      return;
    }

    if (getMethod(request) === 'DELETE') {
      await deleteMentalMapForUser(user, id);
      json(response, 200, { ok: true });
      return;
    }

    methodNotAllowed(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível processar este mapa mental.';
    json(response, message === 'AUTH_REQUIRED' ? 401 : 400, { error: message });
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const [resource, action] = getRouteSegments(request);

  if (resource === 'auth' && action === 'google') return handleGoogleLogin(request, response);
  if (resource === 'auth' && action === 'callback') return handleGoogleCallback(request, response);
  if (resource === 'auth' && action === 'logout') return handleAuthLogout(request, response);
  if (resource === 'auth' && action === 'session') return handleAuthSession(request, response);

  if (resource === 'profile' && !action) return handleProfile(request, response);
  if (resource === 'profile' && action === 'onboarding') return handleProfileOnboarding(request, response);
  if (resource === 'profile' && action === 'starter-content') return handleProfileStarterContent(request, response);

  if (resource === 'study-sets' && !action) return handleStudySets(request, response);
  if (resource === 'study-sets' && action === 'starter') return handleStarterStudySets(request, response);

  if (resource === 'progress') return handleProgress(request, response);
  if (resource === 'quiz-results') return handleQuizResults(request, response);

  if (resource === 'subscription' && !action) return handleSubscription(request, response);
  if (resource === 'subscription' && action === 'cancel') return handleSubscriptionCancel(request, response);

  if (resource === 'billing' && action === 'checkout') return handleBillingCheckout(request, response);

  if (resource === 'mental-maps' && !action) return handleMentalMaps(request, response);
  if (resource === 'mental-maps' && action) return handleMentalMapById(request, response, action);

  routeNotFound(response);
}
