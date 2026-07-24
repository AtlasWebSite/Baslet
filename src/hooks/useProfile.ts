import { useCallback, useEffect, useState } from 'react';
import type { Profile } from '../types';
import type { AppUser } from '../types/auth';
import { completeOnboarding, completeWalkthrough, getOrCreateProfile } from '../services/profileService';

export function useProfile(user?: AppUser) {
  const [profile, setProfile] = useState<Profile>();
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!user) { setProfile(undefined); setIsLoading(false); return; }
    setIsLoading(true); setError(undefined);
    getOrCreateProfile(user).then(setProfile).catch((reason: Error) => setError(reason.message)).finally(() => setIsLoading(false));
  }, [user]);

  const finishOnboarding = useCallback(async () => {
    if (!user) return;
    const updated = await completeOnboarding(user.id);
    setProfile(updated);
  }, [user]);

  const finishWalkthrough = useCallback(async () => {
    if (!user) return;
    const updated = await completeWalkthrough();
    setProfile(updated);
  }, [user]);

  return { profile, isLoading, error, finishOnboarding, finishWalkthrough };
}
