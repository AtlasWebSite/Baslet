import { apiDelete, apiGet, apiPost } from '../lib/apiClient';
import type { AppSession } from '../types/auth';

export async function signInWithGoogle(redirectPath = '/') {
  const loginUrl = redirectPath === '/'
    ? '/api/auth/google'
    : `/api/auth/google?next=${encodeURIComponent(redirectPath)}`;

  window.location.assign(loginUrl);
}

export async function signOut() {
  await apiPost<{ ok: true }>('/api/auth/logout');
  window.location.replace('/');
}

export async function deleteAccount() {
  await apiDelete<{ ok: true }>('/api/account');
  window.location.replace('/');
}

export async function getCurrentSession() {
  const { session } = await apiGet<{ session: AppSession | null }>('/api/auth/session');
  return session;
}
