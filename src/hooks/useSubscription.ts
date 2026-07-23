import { useCallback, useEffect, useState } from 'react';
import type { Subscription } from '../types/subscription';
import {
  cancelSubscription,
  createCheckoutSession,
  getUserSubscription,
  openBillingPayment,
} from '../services/billingService';

export function useSubscription(userId: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      setErrorMessage('');
      const current = await getUserSubscription(userId);
      setSubscription(current);
      return current;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível verificar sua assinatura.';
      setErrorMessage(message);
      return null;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;

      void refresh();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh]);

  const startSubscription = async () => {
    if (isStarting) return;

    setIsStarting(true);
    setErrorMessage('');

    try {
      const checkout = await createCheckoutSession();
      openBillingPayment(checkout.checkoutUrl);
    } catch (error) {
      console.error('Erro ao iniciar pagamento:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento.');
    } finally {
      setIsStarting(false);
    }
  };

  const cancel = async () => {
    if (isCancelling) return;

    setIsCancelling(true);
    setErrorMessage('');

    try {
      await cancelSubscription();
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível cancelar a assinatura.');
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    subscription,
    isLoading,
    isRefreshing,
    isStarting,
    isCancelling,
    errorMessage,
    isPremium: subscription?.status === 'active',
    refresh,
    startSubscription,
    cancel,
  };
}
