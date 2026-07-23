export type ViewId = 'home' | 'studies' | 'flashcards' | 'mindmaps' | 'quiz' | 'progress' | 'billing' | 'profile';

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  mastery: 0 | 1 | 2 | 3;
}

export interface StudySet {
  id: string;
  title: string;
  subject: string;
  description?: string;
  color: string;
  icon: 'language' | 'biology' | 'history' | 'math' | 'general';
  cards: Flashcard[];
  updatedAt: string;
  createdByAi?: boolean;
  aiTopic?: string;
  aiGenerationId?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  starter_content_created?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
