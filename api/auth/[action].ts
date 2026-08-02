import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePublicRequest } from '../../server/public-handler.js';

export default function handler(request: VercelRequest, response: VercelResponse) {
  const action = request.query.action;
  request.query.route = Array.isArray(action) ? action : action ? [action] : [];
  return handlePublicRequest(request, response, 'auth');
}
