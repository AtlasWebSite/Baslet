import { useEffect, useState } from 'react';
import { getCurrentSession } from '../services/authService';
import type { AppSession, AppUser } from '../types/auth';

export function useAuth() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;

    getCurrentSession()
      .then((currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
      })
      .catch((reason: Error) => {
        if (!mounted) return;
        setError(reason.message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { session, user: session?.user as AppUser | undefined, isLoading, error };
}
