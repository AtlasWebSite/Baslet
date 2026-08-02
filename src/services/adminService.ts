import { apiGet, apiPut } from '../lib/apiClient';
import type {
  AdminOverview,
  AdminPeriodSelection,
  AdminPaginatedSubscriptions,
  AdminPaginatedUsers,
  AdminUserDetail,
} from '../types/admin';

export function buildAdminQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getAdminSession() {
  return apiGet<{ admin: { id: string; email: string; name: string; avatarUrl: string | null } }>('/api/admin/session');
}

export async function getAdminOverview(selection: AdminPeriodSelection) {
  const { overview } = await apiGet<{ overview: AdminOverview }>(`/api/admin/overview${buildAdminQuery({ period: selection.period, start: selection.start, end: selection.end })}`);
  return overview;
}

export async function getAdminUsers(params: Record<string, string | number | undefined>) {
  const { result } = await apiGet<{ result: AdminPaginatedUsers }>(`/api/admin/users${buildAdminQuery(params)}`);
  return result;
}

export async function getAdminUser(id: string) {
  const { user } = await apiGet<{ user: AdminUserDetail }>(`/api/admin/users/${encodeURIComponent(id)}`);
  return user;
}

export async function getAdminSubscriptions(params: Record<string, string | number | undefined>) {
  const { result } = await apiGet<{ result: AdminPaginatedSubscriptions }>(`/api/admin/subscriptions${buildAdminQuery(params)}`);
  return result;
}

export async function getAdminSection<T>(section: string, selection?: AdminPeriodSelection) {
  return apiGet<T>(`/api/admin/${section}${buildAdminQuery(selection ? { period: selection.period, start: selection.start, end: selection.end } : {})}`);
}

export async function updateAdminSettings(payload: Record<string, unknown>) {
  return apiPut<{ settings: { values: Record<string, unknown>; editableKeys: string[] } }>('/api/admin/settings', payload);
}


export async function updateAdminErrorStatus(id: string, status: string) {
  return apiPut<{ error: { id: string; status: string } }>(`/api/admin/errors/${encodeURIComponent(id)}`, { status });
}
