import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteMentalMapForUser, getMentalMap, updateMentalMapForUser } from '../_lib/data';
import { json, methodNotAllowed, readJsonBody } from '../_lib/http';
import { requireSessionUser } from '../_lib/session';

function getId(request: VercelRequest) {
  return typeof request.query.id === 'string' ? request.query.id : '';
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const user = await requireSessionUser(request);
    const id = getId(request);
    if (!id) {
      json(response, 400, { error: 'Mapa mental inválido.' });
      return;
    }

    if (request.method === 'GET') {
      const mentalMap = await getMentalMap(user, id);
      json(response, 200, { mentalMap });
      return;
    }

    if (request.method === 'PUT') {
      const body = await readJsonBody<Record<string, unknown>>(request);
      const mentalMap = await updateMentalMapForUser(user, id, body);
      json(response, 200, { mentalMap });
      return;
    }

    if (request.method === 'DELETE') {
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
