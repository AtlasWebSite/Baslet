import { apiDelete, apiGet, apiPost } from '../lib/apiClient';
import type { AppSession } from '../types/auth';
import type { Profile, StudySet } from '../types';
import type { Subscription } from '../types/subscription';

const LOCAL_ACCOUNT_KEYS = ['studyflow_sets_v1'];

interface AppBootstrapSnapshot {
  userId: string;
  profile: Profile;
  studySets: StudySet[];
  subscription: Subscription | null;
}

let bootstrapSnapshot: AppBootstrapSnapshot | null = null;
const consumedBootstrapParts = new Set<'profile' | 'studySets' | 'subscription'>();

function consumeBootstrapPart<K extends 'profile' | 'studySets' | 'subscription'>(userId: string, part: K) {
  if (!bootstrapSnapshot || bootstrapSnapshot.userId !== userId || consumedBootstrapParts.has(part)) return { found: false as const };
  consumedBootstrapParts.add(part);
  return { found: true as const, value: bootstrapSnapshot[part] };
}

export const consumeBootstrapProfile = (userId: string) => consumeBootstrapPart(userId, 'profile');
export const consumeBootstrapStudySets = (userId: string) => consumeBootstrapPart(userId, 'studySets');
export const consumeBootstrapSubscription = (userId: string) => consumeBootstrapPart(userId, 'subscription');

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
  clearLocalAccountData();
  window.location.replace('/');
}

export async function getCurrentSession() {
  const { session, bootstrap } = await apiGet<{ session: AppSession | null; bootstrap: AppBootstrapSnapshot | null }>('/api/account?route=bootstrap');
  bootstrapSnapshot = bootstrap;
  consumedBootstrapParts.clear();
  return session;
}

function clearLocalAccountData() {
  for (const key of LOCAL_ACCOUNT_KEYS) {
    localStorage.removeItem(key);
  }
}
