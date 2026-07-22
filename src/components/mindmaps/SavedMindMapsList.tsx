import { Clock3, Network, Trash2 } from 'lucide-react';
import type { MentalMap } from '../../types/mentalMap';

export function SavedMindMapsList({ maps, activeId, onOpen, onDelete }: { maps: MentalMap[]; activeId?: string; onOpen: (map: MentalMap) => void; onDelete: (map: MentalMap) => void }) {
  if (!maps.length) return null;
  return <section className="saved-maps"><div className="section-heading"><div><span className="eyebrow">SUA BIBLIOTECA</span><h2>Mapas salvos</h2></div><span>{maps.length} {maps.length === 1 ? 'mapa' : 'mapas'}</span></div><div className="saved-maps__grid">{maps.map((map) => <article key={map.id} className={map.id === activeId ? 'active' : ''}><button className="saved-map__open" onClick={() => onOpen(map)}><span><Network size={20}/></span><div><strong>{map.title}</strong><small><Clock3 size={12}/> Atualizado em {new Date(map.updatedAt).toLocaleDateString('pt-BR')}</small></div></button><button className="saved-map__delete" onClick={() => onDelete(map)} aria-label={`Excluir ${map.title}`}><Trash2 size={16}/></button></article>)}</div></section>;
}
