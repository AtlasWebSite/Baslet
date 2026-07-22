import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, methodNotAllowed } from '../_lib/http';
import { requireSessionUser } from '../_lib/session';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  try {
    await requireSessionUser(request);
    json(response, 200, {
      checkout: {
        checkoutUrl: '/',
        preapprovalId: 'temporary-vercel-bypass',
        status: 'pending',
      },
    });
  } catch {
    json(response, 401, { error: 'Entre novamente para assinar.' });
  }
}
