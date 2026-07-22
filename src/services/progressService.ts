import { apiPost } from '../lib/apiClient';
import type { StudySet } from '../types';

export async function saveCardProgress(_userId: string, studySet: StudySet, flashcardId: string, mastery: 1 | 2 | 3) {
  await apiPost<{ ok: true }>('/api/progress', {
    studySetId: studySet.id,
    flashcardId,
    mastery,
  });
}
