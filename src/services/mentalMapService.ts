import { apiDelete, apiGet, apiPost, apiPut } from '../lib/apiClient';
import type { MentalMap, MentalMapDraft } from '../types/mentalMap';

export async function getMentalMaps(_userId: string) {
  const { mentalMaps } = await apiGet<{ mentalMaps: MentalMap[] }>('/api/mental-maps');
  return mentalMaps;
}

export async function getMentalMapById(id: string, _userId: string) {
  const { mentalMap } = await apiGet<{ mentalMap: MentalMap }>(`/api/mental-maps/${id}`);
  return mentalMap;
}

export async function createMentalMap(payload: MentalMapDraft) {
  const { mentalMap } = await apiPost<{ mentalMap: MentalMap }>('/api/mental-maps', payload);
  return mentalMap;
}

export async function updateMentalMap(id: string, _userId: string, payload: Pick<MentalMapDraft, 'title' | 'nodes' | 'edges' | 'mode'>) {
  const { mentalMap } = await apiPut<{ mentalMap: MentalMap }>(`/api/mental-maps/${id}`, payload);
  return mentalMap;
}

export async function deleteMentalMap(id: string, _userId: string) {
  await apiDelete<{ ok: true }>(`/api/mental-maps/${id}`);
}
