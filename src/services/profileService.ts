import { apiGet, apiPost } from '../lib/apiClient';
import type { AppUser } from '../types/auth';
import type { Profile } from '../types';
import { consumeBootstrapProfile } from './authService';

export async function getOrCreateProfile(user: AppUser): Promise<Profile> {
  const cached = consumeBootstrapProfile(user.id);
  if (cached.found) return cached.value;
  const { profile } = await apiGet<{ profile: Profile }>('/api/profile');
  return profile;
}

export async function completeOnboarding(_userId: string) {
  const { profile } = await apiPost<{ profile: Profile }>('/api/profile/onboarding', {});
  return profile;
}

export async function completeWalkthrough() {
  const { profile } = await apiPost<{ profile: Profile }>('/api/profile/walkthrough', {});
  return profile;
}
