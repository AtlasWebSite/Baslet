import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveProgress } from './_lib/data';
import { json, methodNotAllowed, readJsonBody } from './_lib/http';
import { requireSessionUser } from './_lib/session';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
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
