import { ArrowLeft, Check, ChevronLeft, ChevronRight, HelpCircle, MousePointerClick, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { StudySet } from '../types';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export function FlashcardsView({ studySet, startCardId, studySets, isPremium, onRequirePremium, onChange, onUpdate, onRate, onBack }: { studySet?: StudySet; startCardId?: string; studySets: StudySet[]; isPremium: boolean; onRequirePremium: (message?: string) => void; onChange: (studySet: StudySet) => void; onUpdate: (studySet: StudySet) => void; onRate: (studySet: StudySet, flashcardId: string, mastery: 1|2|3) => Promise<void>; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [feedback, setFeedback] = useState<string>();

  useEffect(() => {
    const requestedIndex = studySet?.cards.findIndex((card) => card.id === startCardId) ?? -1;
    setIndex(requestedIndex >= 0 ? requestedIndex : 0);
    setFlipped(false);
  }, [studySet?.id, studySet?.cards, startCardId]);
  if (!studySet || !studySet.cards.length) return <div className="view"><EmptyState icon={<HelpCircle size={32} />} title="Nenhum flashcard disponível" description="Escolha um conjunto com termos para começar a estudar." action={<Button onClick={onBack}>Ver meus estudos</Button>} /></div>;
  if (!isPremium) {
    return (
      <div className="view">
        <EmptyState
          icon={<Sparkles size={32} />}
          title="Sessões de flashcards são Premium"
          description="Você pode navegar pelo app e ver os conjuntos disponíveis, mas precisa assinar para estudar, virar cards e salvar progresso."
          action={<Button onClick={() => onRequirePremium('Assine para liberar as sessões completas de flashcards.')}>Assinar para estudar</Button>}
        />
      </div>
    );
  }

  const currentCard = studySet.cards[index];
  const rate = (mastery: 1 | 2 | 3, message: string) => {
    const cards = studySet.cards.map((card) => card.id === currentCard.id ? { ...card, mastery } : card);
    const updated = { ...studySet, cards, updatedAt: new Date().toISOString() };
    onUpdate(updated);
    void onRate(studySet, currentCard.id, mastery).catch(() => onUpdate(studySet));
    setFeedback(message);
    window.setTimeout(() => { setIndex((current) => (current + 1) % studySet.cards.length); setFlipped(false); setFeedback(undefined); }, 500);
  };
  const go = (direction: number) => { setIndex((current) => (current + direction + studySet.cards.length) % studySet.cards.length); setFlipped(false); };
  return (
    <div className="view flashcards-view">
      <div className="study-toolbar"><button onClick={onBack}><ArrowLeft size={18} /> Sair da sessão</button><label>Conjunto<select value={studySet.id} onChange={(event) => { const selected = studySets.find((set) => set.id === event.target.value); if (selected) onChange(selected); }}>{studySets.map((set) => <option key={set.id} value={set.id}>{set.title}</option>)}</select></label><button className="icon-button" onClick={() => { setIndex(0); setFlipped(false); }} aria-label="Reiniciar"><RotateCcw size={18} /></button></div>
      <div className="session-meta"><div><span className="eyebrow"><Sparkles size={14} /> Sessão em foco</span><h2>{studySet.title}</h2></div><div><strong>{index + 1}</strong><span> / {studySet.cards.length}</span></div></div>
      <div className="session-progress" data-tour="flashcard-progress"><span style={{ width: `${((index + 1) / studySet.cards.length) * 100}%` }} /></div>
      <button className={`flashcard ${flipped ? 'is-flipped' : ''}`} data-tour="flashcard-card" onClick={() => setFlipped((current) => !current)} aria-label="Virar flashcard">
        <div className="flashcard__inner">
          <div className="flashcard__face flashcard__front"><small>TERMO</small><strong>{currentCard.term}</strong><span><MousePointerClick size={16} /> Clique para ver a resposta</span></div>
          <div className="flashcard__face flashcard__back"><small>DEFINIÇÃO</small><strong>{currentCard.definition}</strong><span><MousePointerClick size={16} /> Clique para voltar</span></div>
        </div>
      </button>
      <div className="card-navigation"><button onClick={() => go(-1)} aria-label="Card anterior"><ChevronLeft size={22} /></button><span>{feedback ?? (flipped ? 'Como foi lembrar?' : 'Pense na resposta antes de virar')}</span><button data-tour="flashcard-next" onClick={() => go(1)} aria-label="Próximo card"><ChevronRight size={22} /></button></div>
      <div className="rating-buttons"><button className="rating rating--red" onClick={() => rate(1, 'Tudo bem — vamos rever!')}><span><RotateCcw size={19} /></span><div><strong>Não sei</strong><small>Rever em breve</small></div></button><button className="rating rating--amber" onClick={() => rate(2, 'Quase lá!')}><span><HelpCircle size={19} /></span><div><strong>Quase sei</strong><small>Praticar mais</small></div></button><button className="rating rating--green" onClick={() => rate(3, 'Boa! Card dominado.')}><span><Check size={19} /></span><div><strong>Sei</strong><small>Você dominou</small></div></button></div>
    </div>
  );
}
