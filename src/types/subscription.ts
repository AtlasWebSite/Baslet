export type SubscriptionStatus = 'inactive' | 'pending' | 'active' | 'paused' | 'cancelled' | 'rejected';

export interface Subscription {
  id: string;
  userId: string;
  mercadoPagoPreapprovalId: string | null;
  mercadoPagoPreferenceId: string | null;
  mercadoPagoPaymentId: string | null;
  mercadoPagoPayerId: string | null;
  status: SubscriptionStatus;
  planName: string;
  amount: number;
  currency: string;
  startedAt: string | null;
  nextPaymentAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  preapprovalId: string;
  status: SubscriptionStatus;
}

export type PaymentReturnStatus = 'success' | 'pending' | 'failure';
