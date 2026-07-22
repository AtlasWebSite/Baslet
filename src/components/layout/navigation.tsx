import { BarChart3, BookOpen, BrainCircuit, Crown, Home, Layers3, Network, UserRound } from 'lucide-react';
import type { ViewId } from '../../types';

export const navigationItems: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'studies', label: 'Meus estudos', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers3 },
  { id: 'mindmaps', label: 'Mapas Mentais', icon: Network },
  { id: 'quiz', label: 'Testes', icon: BrainCircuit },
  { id: 'progress', label: 'Progresso', icon: BarChart3 },
  { id: 'billing', label: 'Premium', icon: Crown },
  { id: 'profile', label: 'Perfil', icon: UserRound },
];
