export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() as { error?: string } & T : undefined;

  if (response.ok) return payload as T;

  const message = payload?.error ?? 'Não foi possível concluir a solicitação.';
  throw new ApiError(message, response.status);
}

export async function apiGet<T>(path: string) {
  const response = await fetch(path, { credentials: 'include' });
  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export async function apiPut<T>(path: string, body: unknown) {
  const response = await fetch(path, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export async function apiDelete<T>(path: string) {
  const response = await fetch(path, {
    method: 'DELETE',
    credentials: 'include',
  });

  return parseResponse<T>(response);
}
