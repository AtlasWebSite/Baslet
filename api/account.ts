import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePublicRequest } from '../server/public-handler.js';

export default function handler(request: VercelRequest, response: VercelResponse) {
  return handlePublicRequest(request, response, 'account');
}
