import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createStudySetForUser, deleteStudyData, getStudySets } from '../_lib/data';
import { json, methodNotAllowed, readJsonBody } from '../_lib/http';
import { requireSessionUser } from '../_lib/session';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const user = await requireSessionUser(request);

    if (request.method === 'GET') {
      const studySets = await getStudySets(user);
      json(response, 200, { studySets });
      return;
    }

    if (request.method === 'POST') {
      const body = await readJsonBody<Record<string, unknown>>(request);
      const studySet = await createStudySetForUser(user, body);
      json(response, 201, { studySet });
      return;
    }

    if (request.method === 'DELETE') {
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
