import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, methodNotAllowed } from '../_lib/http';
import { getSessionUser } from '../_lib/session';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(response);
    return;
  }

  const user = await getSessionUser(request);
  if (!user) {
    json(response, 200, { session: null });
    return;
  }

  json(response, 200, {
    session: {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: {
          full_name: user.fullName,
          name: user.fullName,
          avatar_url: user.avatarUrl,
        },
      },
    },
  });
}
