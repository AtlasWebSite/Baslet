import type { VercelRequest, VercelResponse } from '@vercel/node';
import { completeProfileOnboarding } from '../_lib/data';
import { json, methodNotAllowed } from '../_lib/http';
import { requireSessionUser } from '../_lib/session';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
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
