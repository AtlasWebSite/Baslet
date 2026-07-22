import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSubscription } from './_lib/data';
import { json, methodNotAllowed } from './_lib/http';
import { requireSessionUser } from './_lib/session';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    const subscription = await getSubscription(user);
    json(response, 200, { subscription });
  } catch {
    json(response, 401, { error: 'Entre novamente para verificar sua assinatura.' });
  }
}
