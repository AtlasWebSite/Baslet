import type { StudySet } from '../types';

export function getSetProgress(studySet: StudySet) {
  if (!studySet.cards.length) return 0;
  const earned = studySet.cards.reduce((total, current) => total + current.mastery, 0);
  return Math.round((earned / (studySet.cards.length * 3)) * 100);
}

export function getOverallProgress(studySets: StudySet[]) {
  const cards = studySets.flatMap((studySet) => studySet.cards);
  if (!cards.length) return 0;
  const earned = cards.reduce((total, current) => total + current.mastery, 0);
  return Math.round((earned / (cards.length * 3)) * 100);
}

export function newId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
