import { Network, Sparkles } from 'lucide-react';
import type { StudySet } from '../../types';
import { Button } from '../ui/Button';

export function MindMapSetSelector({ studySets, selectedId, generating, onSelect, onGenerate }: { studySets: StudySet[]; selectedId: string; generating: boolean; onSelect: (id: string) => void; onGenerate: () => void }) {
  const selected = studySets.find((set) => set.id === selectedId);
  return <section className="map-selector"><span className="map-selector__icon"><Network size={22}/></span><div><span className="eyebrow">CONTEÚDO DE ORIGEM</span><label htmlFor="mind-map-set">Escolha um conjunto</label><select id="mind-map-set" value={selectedId} onChange={(event) => onSelect(event.target.value)}><option value="">Selecionar conjunto...</option>{studySets.map((set) => <option key={set.id} value={set.id}>{set.title} · {set.cards.length} cards</option>)}</select>{selected && !selected.cards.length && <small>Este conjunto ainda não possui flashcards.</small>}</div><Button loading={generating} disabled={!selectedId || !selected?.cards.length} icon={<Sparkles size={17}/>} onClick={onGenerate}>Gerar mapa mental</Button></section>;
}
