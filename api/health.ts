import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  response.status(200).json({ ok: true, service: 'studyflow-api' });
}
