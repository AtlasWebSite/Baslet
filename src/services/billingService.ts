import { apiGet, apiPost } from '../lib/apiClient';
import type { CheckoutResponse, Subscription, SubscriptionStatus } from '../types/subscription';

export async function getUserSubscription(_userId: string) {
  const { subscription } = await apiGet<{ subscription: Subscription | null }>('/api/subscription');
  return subscription;
}

export const refreshSubscriptionStatus = getUserSubscription;

export async function createCheckoutSession(): Promise<CheckoutResponse> {
  const { checkout } = await apiPost<{ checkout: CheckoutResponse }>('/api/billing/checkout', {});
  return checkout;
}

export function openBillingPayment(checkoutUrl: string) {
  const url = new URL(checkoutUrl);
  window.location.assign(url.toString());
}

export async function cancelSubscription() {
  await apiPost<{ status: SubscriptionStatus }>('/api/subscription/cancel', {});
}
