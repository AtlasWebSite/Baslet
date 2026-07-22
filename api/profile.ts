import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProfile } from './_lib/data.js';
import { json, methodNotAllowed } from './_lib/http.js';
import { requireSessionUser } from './_lib/session.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    const profile = await getProfile(user);
    json(response, 200, { profile });
  } catch (error) {
    json(response, error instanceof Error && error.message === 'AUTH_REQUIRED' ? 401 : 500, { error: 'Não foi possível carregar seu perfil.' });
  }
}
