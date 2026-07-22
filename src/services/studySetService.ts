import { apiDelete, apiGet, apiPost } from '../lib/apiClient';
import { starterStudySets } from '../data/starterStudySets';
import type { StudySet } from '../types';

interface StarterSetResult {
  created: boolean;
  warning?: string;
}

const starterCreationTasks = new Map<string, Promise<StarterSetResult>>();

export async function fetchStudySets(_userId: string): Promise<StudySet[]> {
  const { studySets } = await apiGet<{ studySets: StudySet[] }>('/api/study-sets');
  return studySets;
}

export async function createStudySet(_userId: string, draft: Omit<StudySet, 'id' | 'updatedAt'>): Promise<StudySet> {
  const { studySet } = await apiPost<{ studySet: StudySet }>('/api/study-sets', draft);
  return studySet;
}

async function provisionStarterStudySets(userId: string): Promise<StarterSetResult> {
  try {
    const studySets = await fetchStudySets(userId);
    if (studySets.length > 0) {
      await apiPost('/api/profile/starter-content', {});
      return { created: false };
    }

    const { created } = await apiPost<{ created: boolean }>('/api/study-sets/starter', { starterStudySets });
    return { created };
  } catch (error) {
    console.error('Erro ao criar conjuntos iniciais:', error);
    return {
      created: false,
      warning: 'Os flashcards iniciais não puderam ser criados. Você pode criar seus próprios conjuntos normalmente.',
    };
  }
}

export function ensureStarterStudySets(userId: string) {
  const pendingTask = starterCreationTasks.get(userId);
  if (pendingTask) return pendingTask;

  const task = provisionStarterStudySets(userId).finally(() => starterCreationTasks.delete(userId));
  starterCreationTasks.set(userId, task);
  return task;
}

export async function deleteAllStudyData(_userId: string) {
  await apiDelete<{ ok: true }>('/api/study-sets');
}
