import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { AiFlashcardItem, AiFlashcardsContent } from '../../types/ai';
import { Button } from '../ui/Button';

interface AiFlashcardsPreviewProps {
  content: AiFlashcardsContent;
  saving: boolean;
  onChange: (content: AiFlashcardsContent) => void;
  onSave: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

function reorderCards(cards: AiFlashcardItem[]) {
  return cards.map((card, index) => ({ ...card, position: index + 1 }));
}

export function AiFlashcardsPreview({ content, saving, onChange, onSave, onRegenerate, onCancel }: AiFlashcardsPreviewProps) {
  const updateCard = (position: number, field: keyof Pick<AiFlashcardItem, 'front' | 'back' | 'explanation'>, value: string) => {
    onChange({
      ...content,
      cards: content.cards.map((card) => (card.position === position ? { ...card, [field]: value } : card)),
    });
  };

  const moveCard = (position: number, direction: -1 | 1) => {
    const index = content.cards.findIndex((card) => card.position === position);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= content.cards.length) return;

    const nextCards = [...content.cards];
    const [card] = nextCards.splice(index, 1);
    nextCards.splice(targetIndex, 0, card);
    onChange({ ...content, cards: reorderCards(nextCards) });
  };

  const removeCard = (position: number) => {
    if (content.cards.length <= 1) return;
    onChange({ ...content, cards: reorderCards(content.cards.filter((card) => card.position !== position)) });
  };

  const addCard = () => {
    onChange({
      ...content,
      cards: [
        ...content.cards,
        {
          front: '',
          back: '',
          explanation: '',
          position: content.cards.length + 1,
        },
      ],
    });
  };

  const hasInvalidCards = content.cards.some((card) => !card.front.trim() || !card.back.trim());

  return (
    <div className="ai-preview ai-preview--flashcards">
      <header className="ai-preview__header">
        <div>
          <span className="ai-badge"><Sparkles size={14} /> Gerado com inteligência artificial</span>
          <label>
            Título
            <input value={content.title} maxLength={100} onChange={(event) => onChange({ ...content, title: event.target.value })} />
          </label>
          <label>
            Descrição
            <input value={content.description} maxLength={240} onChange={(event) => onChange({ ...content, description: event.target.value })} />
          </label>
        </div>
        <p>Revise informações importantes antes de estudar. Você pode editar tudo antes de salvar.</p>
      </header>

      <div className="ai-flashcards-list">
        {content.cards.map((card, index) => (
          <article className="ai-flashcard-editor" key={card.position}>
            <div className="ai-flashcard-editor__index">
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <div>
                <button type="button" onClick={() => moveCard(card.position, -1)} disabled={index === 0} aria-label="Mover card para cima"><ArrowUp size={15} /></button>
                <button type="button" onClick={() => moveCard(card.position, 1)} disabled={index === content.cards.length - 1} aria-label="Mover card para baixo"><ArrowDown size={15} /></button>
                <button type="button" onClick={() => removeCard(card.position)} disabled={content.cards.length === 1} aria-label="Excluir card"><Trash2 size={15} /></button>
              </div>
            </div>
            <label>
              Frente
              <textarea value={card.front} maxLength={300} onChange={(event) => updateCard(card.position, 'front', event.target.value)} placeholder="Pergunta do flashcard" />
            </label>
            <label>
              Verso
              <textarea value={card.back} maxLength={700} onChange={(event) => updateCard(card.position, 'back', event.target.value)} placeholder="Resposta direta" />
            </label>
            <label>
              Explicação
              <textarea value={card.explanation} maxLength={700} onChange={(event) => updateCard(card.position, 'explanation', event.target.value)} placeholder="Explicação complementar" />
            </label>
          </article>
        ))}
      </div>

      <footer className="ai-preview__actions">
        <Button type="button" variant="secondary" icon={<Plus size={17} />} onClick={addCard}>Adicionar card</Button>
        <div>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="button" variant="secondary" onClick={onRegenerate}>Gerar novamente</Button>
          <Button type="button" loading={saving} disabled={hasInvalidCards || !content.title.trim()} onClick={onSave}>Salvar no StudyFlow</Button>
        </div>
      </footer>
    </div>
  );
}
