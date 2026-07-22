import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, methodNotAllowed } from '../_lib/http.js';
import { clearSessionCookie } from '../_lib/session.js';

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    methodNotAllowed(response);
    return;
  }

  clearSessionCookie(response);
  json(response, 200, { ok: true });
}
