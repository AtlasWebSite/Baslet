import { apiGet, apiPost } from '../lib/apiClient';
import type { CheckoutResponse, Subscription, SubscriptionStatus } from '../types/subscription';
import { consumeBootstrapSubscription } from './authService';

export async function getUserSubscription(userId: string) {
  const cached = consumeBootstrapSubscription(userId);
  if (cached.found) return cached.value;
  const { subscription } = await apiGet<{ subscription: Subscription | null }>('/api/payments?route=subscription');
  return subscription;
}

export const refreshSubscriptionStatus = getUserSubscription;

export async function createCheckoutSession(): Promise<CheckoutResponse> {
  const { checkout } = await apiPost<{ checkout: CheckoutResponse }>('/api/payments?route=billing/checkout', {});
  return checkout;
}

export function openBillingPayment(checkoutUrl: string) {
  const url = new URL(checkoutUrl);
  window.location.assign(url.toString());
}

export async function cancelSubscription() {
  await apiPost<{ status: SubscriptionStatus }>('/api/payments?route=subscription/cancel', {});
}
