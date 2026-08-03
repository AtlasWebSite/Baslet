import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePublicRequest } from '../server/public-handler.js';

export default function handler(request: VercelRequest, response: VercelResponse) {
  request.query.route = request.query.route === 'bootstrap' ? ['bootstrap'] : [];
  return handlePublicRequest(request, response, 'account');
}
