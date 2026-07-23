import { apiPost } from '../lib/apiClient';
import type { AiContentType, AiGenerationResponse } from '../types/ai';

export async function generateStudyContentWithAi(type: AiContentType, topic: string) {
  const { generationId, content, usage } = await apiPost<AiGenerationResponse>('/api/ai/generate-study-content', {
    type,
    topic: topic.replace(/\s+/g, ' ').trim(),
  });

  return { generationId, content, usage };
}
