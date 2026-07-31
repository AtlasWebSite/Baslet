import { BarChart3, BookOpen, BrainCircuit, Crown, Home, Layers3, Network, UserRound } from 'lucide-react';
import type { ViewId } from '../../types';

export type NavigationItem = { id: ViewId; label: string; icon: typeof Home };

export const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'studies', label: 'Meus estudos', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers3 },
  { id: 'mindmaps', label: 'Mapas Mentais', icon: Network },
  { id: 'quiz', label: 'Testes', icon: BrainCircuit },
  { id: 'progress', label: 'Progresso', icon: BarChart3 },
  { id: 'billing', label: 'Premium', icon: Crown },
  { id: 'profile', label: 'Perfil', icon: UserRound },
];

export const sidebarPrimaryItem = navigationItems[0];
export const sidebarStudyItems = navigationItems.slice(1, 5);
export const sidebarPerformanceItems = navigationItems.slice(5, 6);
export const sidebarFooterItems = navigationItems.slice(6);
