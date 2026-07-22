import { apiPost } from '../lib/apiClient';

export async function saveQuizResult(_userId: string, studySetId: string, score: number, total: number) {
  await apiPost<{ ok: true }>('/api/quiz-results', {
    studySetId,
    score,
    total,
  });
}
