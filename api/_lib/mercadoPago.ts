import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';
import type { SessionUser } from './session.js';
import { getAppUrl, requireEnvironment } from './http.js';

const MERCADO_PAGO_API_URL = 'https://api.mercadopago.com';
const PLAN_NAME = 'StudyFlow Premium';
const PLAN_AMOUNT = 11.9;
const PLAN_CURRENCY = 'BRL';

export type AppSubscriptionStatus = 'inactive' | 'pending' | 'active' | 'paused' | 'cancelled' | 'rejected';

interface MercadoPagoErrorResponse {
  message?: string;
  error?: string;
  cause?: unknown;
}

export interface MercadoPagoPreapproval {
  id: string;
  status: string;
  init_point?: string;
  sandbox_init_point?: string;
  external_reference?: string | number | null;
  payer_id?: string | number | null;
  payer_email?: string | null;
  date_created?: string | null;
  last_modified?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    transaction_amount?: number;
    currency_id?: string;
    next_payment_date?: string | null;
  };
}

function getAccessToken() {
  return requireEnvironment('MERCADO_PAGO_ACCESS_TOKEN');
}

function getHeaderValue(request: VercelRequest, name: string) {
  const value = request.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? '';
  if (typeof value === 'number') return String(value);
  return value ?? '';
}

function parseSignatureHeader(signature: string) {
  return Object.fromEntries(
    signature
      .split(',')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value),
  );
}

function safeCompareHex(left: string, right: string) {
  try {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    if (leftBuffer.length !== rightBuffer.length) return false;

    return timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${MERCADO_PAGO_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({})) as T & MercadoPagoErrorResponse;
  if (response.ok) return payload;

  console.error('Erro Mercado Pago:', response.status, payload);
  throw new Error(payload.message || payload.error || 'Mercado Pago não conseguiu processar a solicitação.');
}

export function mapMercadoPagoStatus(status?: string | null): AppSubscriptionStatus {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'authorized') return 'active';
  if (normalized === 'active') return 'active';
  if (normalized === 'pending') return 'pending';
  if (normalized === 'paused') return 'paused';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  if (normalized === 'rejected') return 'rejected';

  return 'inactive';
}

export function getSubscriptionUserIdFromReference(reference?: string | number | null) {
  if (typeof reference !== 'string') return undefined;

  const prefix = 'studyflow:user:';
  if (!reference.startsWith(prefix)) return undefined;

  return reference.slice(prefix.length) || undefined;
}

export function getMercadoPagoNextPaymentDate(preapproval: MercadoPagoPreapproval) {
  return preapproval.next_payment_date ?? preapproval.auto_recurring?.next_payment_date ?? null;
}

export function getMercadoPagoCheckoutUrl(preapproval: MercadoPagoPreapproval) {
  return preapproval.init_point ?? preapproval.sandbox_init_point ?? '';
}

export function getMercadoPagoPayerId(preapproval: MercadoPagoPreapproval) {
  if (preapproval.payer_id === undefined || preapproval.payer_id === null) return null;
  return String(preapproval.payer_id);
}

export function getMercadoPagoAmount(preapproval: MercadoPagoPreapproval) {
  return Number(preapproval.auto_recurring?.transaction_amount ?? PLAN_AMOUNT);
}

export function getMercadoPagoCurrency(preapproval: MercadoPagoPreapproval) {
  return preapproval.auto_recurring?.currency_id ?? PLAN_CURRENCY;
}

export async function createMercadoPagoSubscription(user: SessionUser, request: VercelRequest) {
  const appUrl = getAppUrl(request);
  const notificationUrl = `${appUrl}/api/mercado-pago/webhook`;

  const preapproval = await mercadoPagoRequest<MercadoPagoPreapproval>('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason: PLAN_NAME,
      external_reference: `studyflow:user:${user.id}`,
      payer_email: user.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: PLAN_AMOUNT,
        currency_id: PLAN_CURRENCY,
      },
      back_url: `${appUrl}/billing/success`,
      notification_url: notificationUrl,
      status: 'pending',
    }),
  });

  const checkoutUrl = getMercadoPagoCheckoutUrl(preapproval);
  if (!preapproval.id || !checkoutUrl) {
    console.error('Assinatura sem link de checkout:', preapproval);
    throw new Error('O Mercado Pago não retornou o link de pagamento.');
  }

  return preapproval;
}

export async function getMercadoPagoSubscription(preapprovalId: string) {
  return mercadoPagoRequest<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(preapprovalId)}`);
}

export async function cancelMercadoPagoSubscription(preapprovalId: string) {
  return mercadoPagoRequest<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(preapprovalId)}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'canceled' }),
  });
}

export function extractMercadoPagoWebhookResourceId(request: VercelRequest, body: Record<string, unknown>) {
  const queryDataId = request.query['data.id'];
  if (Array.isArray(queryDataId)) return queryDataId[0] ?? '';
  if (typeof queryDataId === 'string') return queryDataId;

  const queryId = request.query.id;
  if (Array.isArray(queryId)) return queryId[0] ?? '';
  if (typeof queryId === 'string') return queryId;

  const data = body.data;
  if (data && typeof data === 'object' && 'id' in data) return String((data as { id?: unknown }).id ?? '');
  if ('id' in body) return String(body.id ?? '');

  return '';
}

export function isMercadoPagoWebhookSignatureValid(request: VercelRequest, resourceId: string) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';

  const signature = getHeaderValue(request, 'x-signature');
  const requestId = getHeaderValue(request, 'x-request-id');
  if (!signature || !requestId) return false;

  const parsed = parseSignatureHeader(signature);
  const timestamp = parsed.ts;
  const receivedHash = parsed.v1;
  if (!timestamp || !receivedHash) return false;

  const manifest = [
    resourceId ? `id:${resourceId}` : '',
    `request-id:${requestId}`,
    `ts:${timestamp}`,
  ].filter(Boolean).join(';') + ';';
  const expectedHash = createHmac('sha256', secret).update(manifest).digest('hex');

  return safeCompareHex(expectedHash, receivedHash);
}
