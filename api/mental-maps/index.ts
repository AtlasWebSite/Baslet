import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMentalMapForUser, getMentalMaps } from '../_lib/data.js';
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import { requireSessionUser } from '../_lib/session.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const user = await requireSessionUser(request);

    if (request.method === 'GET') {
      const mentalMaps = await getMentalMaps(user);
      json(response, 200, { mentalMaps });
      return;
    }

    if (request.method === 'POST') {
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
