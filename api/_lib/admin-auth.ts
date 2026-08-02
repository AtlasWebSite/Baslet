import type { VercelRequest } from '@vercel/node';
import { getSessionUser, type SessionUser } from './session.js';

export class AdminAccessError extends Error {
  constructor(public readonly code: 'ADMIN_NOT_CONFIGURED' | 'AUTH_REQUIRED' | 'ADMIN_FORBIDDEN') {
    super(code);
  }
}

export async function requireAdmin(request: VercelRequest): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) throw new AdminAccessError('AUTH_REQUIRED');

  const adminUserId = process.env.ADMIN_USER_ID?.trim();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLocaleLowerCase();
  if (!adminUserId && !adminEmail) throw new AdminAccessError('ADMIN_NOT_CONFIGURED');

  const matchesId = Boolean(adminUserId && user.id === adminUserId);
  const matchesEmail = Boolean(adminEmail && user.email.toLocaleLowerCase() === adminEmail);
  if (!matchesId && !matchesEmail) throw new AdminAccessError('ADMIN_FORBIDDEN');

  return user;
}
