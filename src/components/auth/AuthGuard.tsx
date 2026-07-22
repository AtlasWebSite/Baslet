import type { ReactNode } from 'react';
import type { AppSession } from '../../types/auth';
import { LoadingState } from '../ui/LoadingState';
import { LoginScreen } from './LoginScreen';

export function AuthGuard({ session, isLoading, error, children }: { session: AppSession | null; isLoading: boolean; error?: string; children: ReactNode }) {
  if (isLoading) return <LoadingState/>;
  if (error) return <div className="auth-error-screen"><h1>Não foi possível conectar</h1><p>{error}</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>;
  if (!session) return <LoginScreen/>;
  return children;
}
