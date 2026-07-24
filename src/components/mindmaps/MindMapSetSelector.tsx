import { Crown, Network, Sparkles } from 'lucide-react';
import type { StudySet } from '../../types';
import { Button } from '../ui/Button';

interface MindMapSetSelectorProps {
  studySets: StudySet[];
  selectedId: string;
  generating: boolean;
  isPremium: boolean;
  onSelect: (id: string) => void;
  onGenerate: () => void;
}

export function MindMapSetSelector({
  studySets,
  selectedId,
  generating,
  isPremium,
  onSelect,
  onGenerate,
}: MindMapSetSelectorProps) {
  const selected = studySets.find((set) => set.id === selectedId);

  return (
    <section className="map-selector" data-tour="mindmap-selector">
      <span className="map-selector__icon"><Network size={22} /></span>
      <div>
        <span className="eyebrow">CONTEÚDO DE ORIGEM</span>
        <label htmlFor="mind-map-set">Escolha um conjunto</label>
        <select id="mind-map-set" value={selectedId} onChange={(event) => onSelect(event.target.value)}>
          <option value="">Selecionar conjunto...</option>
          {studySets.map((set) => <option key={set.id} value={set.id}>{set.title} · {set.cards.length} cards</option>)}
        </select>
        {selected && !selected.cards.length && <small>Este conjunto ainda não possui flashcards.</small>}
      </div>
      <Button
        data-tour="mindmap-generate"
        className={!isPremium ? 'premium-action-button' : undefined}
        loading={generating}
        disabled={!selectedId || !selected?.cards.length}
        icon={isPremium ? <Sparkles size={17} /> : <Crown size={16} />}
        onClick={onGenerate}
      >
        {isPremium ? 'Gerar mapa mental' : 'Premium · gerar mapa'}
      </Button>
    </section>
  );
}
