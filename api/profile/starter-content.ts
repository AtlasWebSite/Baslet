import type { VercelRequest, VercelResponse } from '@vercel/node';
import { markStarterContentCreated } from '../_lib/data.js';
import { json, methodNotAllowed } from '../_lib/http.js';
import { requireSessionUser } from '../_lib/session.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
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
