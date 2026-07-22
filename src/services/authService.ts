import { apiGet, apiPost } from '../lib/apiClient';
import type { AppSession } from '../types/auth';

export async function signInWithGoogle() {
  window.location.assign('/api/auth/google');
}

export async function signOut() {
  await apiPost<{ ok: true }>('/api/auth/logout');
  window.location.replace('/');
}

export async function getCurrentSession() {
  const { session } = await apiGet<{ session: AppSession | null }>('/api/auth/session');
  return session;
}
