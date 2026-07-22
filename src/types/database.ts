export type ProgressStatus = 'new' | 'learning' | 'almost' | 'mastered';

export interface StudySetRow {
  id: string; user_id: string; title: string; description: string | null; subject: string;
  color: string; icon: string; created_at: string; updated_at: string;
}

export interface FlashcardRow {
  id: string; user_id: string; study_set_id: string; term: string; definition: string;
  difficulty: string; created_at: string; updated_at: string;
}

export interface ProgressRow {
  id: string; user_id: string; study_set_id: string; flashcard_id: string; status: ProgressStatus;
  times_seen: number; times_correct: number; times_wrong: number; last_reviewed_at: string | null;
  created_at: string; updated_at: string;
}
