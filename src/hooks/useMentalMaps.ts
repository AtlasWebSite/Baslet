import { useCallback, useEffect, useState } from 'react';
import type { MentalMap, MentalMapDraft } from '../types/mentalMap';
import { createMentalMap, deleteMentalMap, getMentalMaps, updateMentalMap } from '../services/mentalMapService';

export function useMentalMaps(userId: string) {
  const [maps, setMaps] = useState<MentalMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<MentalMap>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadMaps = useCallback(async () => {
    setIsLoading(true); setError(undefined);
    try { setMaps(await getMentalMaps(userId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar seus mapas.'); }
    finally { setIsLoading(false); }
  }, [userId]);

  useEffect(() => { void loadMaps(); }, [loadMaps]);

  const saveMap = useCallback(async (draft: MentalMapDraft) => {
    const saved = await createMentalMap(draft);
    setMaps((current) => [saved, ...current]); setSelectedMap(saved); return saved;
  }, []);

  const saveChanges = useCallback(async (map: MentalMap) => {
    const saved = await updateMentalMap(map.id, userId, { title: map.title, nodes: map.nodes, edges: map.edges, mode: map.mode });
    setMaps((current) => current.map((item) => item.id === saved.id ? saved : item)); setSelectedMap(saved); return saved;
  }, [userId]);

  const removeMap = useCallback(async (id: string) => {
    await deleteMentalMap(id, userId);
    setMaps((current) => current.filter((map) => map.id !== id));
    setSelectedMap((current) => current?.id === id ? undefined : current);
  }, [userId]);

  return { maps, selectedMap, setSelectedMap, isLoading, error, saveMap, saveChanges, removeMap, reload: loadMaps };
}
