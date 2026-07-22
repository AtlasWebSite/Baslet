import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveQuiz } from './_lib/data.js';
import { json, methodNotAllowed, readJsonBody } from './_lib/http.js';
import { requireSessionUser } from './_lib/session.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
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
