import { useCallback, useEffect, useState } from 'react';
import type { StudySet } from '../types';
import { ensureStarterStudySets, createStudySet, deleteAllStudyData, fetchStudySets } from '../services/studySetService';

export function useStudySets(userId?: string, enabled = true) {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId && enabled));
  const [error, setError] = useState<string>();
  const [starterSetsCreated, setStarterSetsCreated] = useState(false);
  const [starterWarning, setStarterWarning] = useState<string>();

  const refresh = useCallback(async () => {
    if (!userId || !enabled) { setStudySets([]); setIsLoading(false); setError(undefined); return; }
    setIsLoading(true); setError(undefined); setStarterWarning(undefined);
    try {
      const loadedSets = await fetchStudySets(userId);
      if (loadedSets.length > 0) { void ensureStarterStudySets(userId); setStudySets(loadedSets); return; }
      const result = await ensureStarterStudySets(userId);
      if (result.warning) setStarterWarning(result.warning);
      if (!result.created) { setStudySets([]); return; }
      setStudySets(await fetchStudySets(userId));
      setStarterSetsCreated(true);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar seus estudos.'); }
    finally { setIsLoading(false); }
  }, [enabled, userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const addStudySet = useCallback(async (draft: Omit<StudySet, 'id' | 'updatedAt'>) => {
    if (!userId) throw new Error('Entre novamente para salvar seu conjunto.');
    if (!enabled) throw new Error('Ative o StudyFlow Premium para criar conjuntos.');
    const created = await createStudySet(userId, draft);
    setStudySets((current) => [created, ...current]);
    return created;
  }, [enabled, userId]);

  const updateStudySet = useCallback((updatedSet: StudySet) => setStudySets((current) => current.map((set) => set.id === updatedSet.id ? updatedSet : set)), []);
  const clearStudySets = useCallback(async () => { if (!userId) return; await deleteAllStudyData(userId); setStudySets([]); }, [userId]);
  const clearSensitiveState = useCallback(() => { setStudySets([]); setError(undefined); }, []);
  return { studySets, isLoading, error, starterSetsCreated, starterWarning, addStudySet, updateStudySet, clearStudySets, clearSensitiveState, refresh };
}
