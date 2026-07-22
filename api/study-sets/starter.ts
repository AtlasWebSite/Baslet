import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createStarterStudySets } from '../_lib/data';
import { json, methodNotAllowed, readJsonBody } from '../_lib/http';
import { requireSessionUser } from '../_lib/session';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
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
