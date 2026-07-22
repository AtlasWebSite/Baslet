import { useCallback, useEffect, useState } from 'react';
import type { Subscription } from '../types/subscription';
import { cancelSubscription, getUserSubscription } from '../services/billingService';

const TEMPORARY_PREMIUM_KEY = 'studyflow-temporary-premium-users';

function getTemporaryPremiumUsers() {
  try {
    const storedUsers = localStorage.getItem(TEMPORARY_PREMIUM_KEY);
    if (!storedUsers) return [];

    const parsedUsers = JSON.parse(storedUsers);
    if (!Array.isArray(parsedUsers)) return [];

    return parsedUsers.filter((user): user is string => typeof user === 'string');
  } catch (error) {
    console.error('Não foi possível ler o Premium temporário:', error);
    return [];
  }
}

function hasTemporaryPremiumAccess(userId: string) {
  return getTemporaryPremiumUsers().includes(userId);
}

function saveTemporaryPremiumAccess(userId: string) {
  const users = getTemporaryPremiumUsers();
  if (users.includes(userId)) return;

  localStorage.setItem(TEMPORARY_PREMIUM_KEY, JSON.stringify([...users, userId]));
}

function removeTemporaryPremiumAccess(userId: string) {
  const users = getTemporaryPremiumUsers().filter((currentUserId) => currentUserId !== userId);
  localStorage.setItem(TEMPORARY_PREMIUM_KEY, JSON.stringify(users));
}

function createTemporarySubscription(userId: string): Subscription {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return {
    id: `temporary-${userId}`,
    userId,
    mercadoPagoPreapprovalId: null,
    mercadoPagoPayerId: null,
    status: 'active',
    planName: 'StudyFlow Premium',
    amount: 11.9,
    currency: 'BRL',
    startedAt: now.toISOString(),
    nextPaymentAt: nextMonth.toISOString(),
    cancelledAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function useSubscription(userId: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasTemporaryAccess, setHasTemporaryAccess] = useState(() => hasTemporaryPremiumAccess(userId));

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
    setHasTemporaryAccess(hasTemporaryPremiumAccess(userId));
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
      saveTemporaryPremiumAccess(userId);
      setHasTemporaryAccess(true);
    } catch (error) {
      console.error('Erro ao liberar Premium temporário:', error);
      setErrorMessage('Não foi possível liberar o acesso temporário.');
    } finally {
      setIsStarting(false);
    }
  };

  const cancel = async () => {
    if (isCancelling) return;

    setIsCancelling(true);
    setErrorMessage('');

    try {
      if (hasTemporaryAccess && subscription?.status !== 'active') {
        removeTemporaryPremiumAccess(userId);
        setHasTemporaryAccess(false);
        return;
      }

      await cancelSubscription();
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível cancelar a assinatura.');
    } finally {
      setIsCancelling(false);
    }
  };

  const isPremium = hasTemporaryAccess || subscription?.status === 'active';
  const visibleSubscription = hasTemporaryAccess && subscription?.status !== 'active'
    ? createTemporarySubscription(userId)
    : subscription;

  return {
    subscription: visibleSubscription,
    isLoading,
    isRefreshing,
    isStarting,
    isCancelling,
    errorMessage,
    isPremium,
    refresh,
    startSubscription,
    cancel,
  };
}
