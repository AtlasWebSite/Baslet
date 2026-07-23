export type AiContentType = 'flashcards' | 'mind_map';

export interface AiFlashcardItem {
  front: string;
  back: string;
  explanation: string;
  position: number;
}

export interface AiFlashcardsContent {
  type: 'flashcards';
  title: string;
  description: string;
  topic: string;
  cards: AiFlashcardItem[];
}

export interface AiMindMapNode {
  id: string;
  label: string;
  description: string;
  level: 0 | 1 | 2 | 3;
  order: number;
}

export interface AiMindMapEdge {
  id: string;
  source: string;
  target: string;
}

export interface AiMindMapContent {
  type: 'mind_map';
  title: string;
  description: string;
  topic: string;
  nodes: AiMindMapNode[];
  edges: AiMindMapEdge[];
}

export type AiGeneratedContent = AiFlashcardsContent | AiMindMapContent;

export interface AiUsageSnapshot {
  plan: 'free' | 'premium' | 'admin';
  limit: number | null;
  used: number;
  remaining: number | null;
}

export interface AiGenerationResponse {
  generationId: string;
  content: AiGeneratedContent;
  usage: AiUsageSnapshot;
}

