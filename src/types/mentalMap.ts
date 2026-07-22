export type MindMapNodeType = 'central' | 'category' | 'term' | 'definition' | 'example' | 'question' | 'keyword';
export type MindMapMode = 'summary' | 'complete';

export interface MindMapNode {
  id: string;
  type: MindMapNodeType;
  label: string;
  subtitle?: string;
  fullText: string;
  x: number;
  y: number;
  flashcardId?: string;
  categoryId?: string;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
}

export interface MentalMap {
  id: string;
  userId: string;
  studySetId: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  mode: MindMapMode;
  createdAt: string;
  updatedAt: string;
}

export interface MentalMapDraft {
  userId: string;
  studySetId: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  mode: MindMapMode;
}
