import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cancelUserSubscription } from '../_lib/data';
import { json, methodNotAllowed } from '../_lib/http';
import { requireSessionUser } from '../_lib/session';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  try {
    const user = await requireSessionUser(request);
    await cancelUserSubscription(user);
    json(response, 200, { status: 'cancelled' });
  } catch {
    json(response, 401, { error: 'Entre novamente para cancelar a assinatura.' });
  }
}
