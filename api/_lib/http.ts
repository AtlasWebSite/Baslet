import type { VercelRequest, VercelResponse } from '@vercel/node';

export function json<T>(response: VercelResponse, status: number, payload: T) {
  response.status(status).json(payload);
}

export function methodNotAllowed(response: VercelResponse) {
  json(response, 405, { error: 'Método não permitido.' });
}

export function requireEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável ${name} não configurada.`);
  return value;
}

export async function readJsonBody<T>(request: VercelRequest): Promise<T> {
  if (!request.body) return {} as T;
  if (typeof request.body === 'object') return request.body as T;
  return JSON.parse(request.body) as T;
}

export function getAppUrl(request: VercelRequest) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');

  const host = request.headers.host;
  const protocol = host?.startsWith('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}`;
}
