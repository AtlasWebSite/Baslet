import type { ReactNode } from 'react';
import { LoadingState } from '../ui/LoadingState';

export function SubscriptionGuard({ isLoading, isPremium, fallback, children }: { isLoading: boolean; isPremium: boolean; fallback: ReactNode; children: ReactNode }) {
  if (isLoading) return <LoadingState label="Verificando assinatura..."/>;
  if (!isPremium) return <>{fallback}</>;
  return <>{children}</>;
}
