import { apiGet, apiPost } from '../lib/apiClient';
import type { AppUser } from '../types/auth';
import type { Profile } from '../types';

export async function getOrCreateProfile(_user: AppUser): Promise<Profile> {
  const { profile } = await apiGet<{ profile: Profile }>('/api/profile');
  return profile;
}

export async function completeOnboarding(_userId: string) {
  const { profile } = await apiPost<{ profile: Profile }>('/api/profile/onboarding', {});
  return profile;
}
