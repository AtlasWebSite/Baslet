import { BookOpen, LayoutGrid, List, Sparkles, SlidersHorizontal } from 'lucide-react';
import type { StudySet } from '../types';
import { StudySetCard } from '../components/cards/StudySetCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export function StudiesView({ studySets, isPremium, onStudy, onCreate, onCreateWithAi }: { studySets: StudySet[]; isPremium: boolean; onStudy: (studySet: StudySet) => void; onCreate: () => void; onCreateWithAi: () => void }) {
  return (
    <div className="view">
      <div className="filter-row"><div className="filter-pills"><button className="active">Todos <span>{studySets.length}</span></button><button>Em andamento</button><button>Concluídos</button></div><div className="view-controls"><Button variant="secondary" icon={<Sparkles size={16} />} onClick={onCreateWithAi}>Criar com IA</Button><button><SlidersHorizontal size={17} /> Filtrar</button><button className="active" aria-label="Visualização em grade"><LayoutGrid size={18} /></button><button aria-label="Visualização em lista"><List size={18} /></button></div></div>
      {studySets.length > 0 ? <div className="set-grid set-grid--wide">{studySets.map((studySet) => <StudySetCard key={studySet.id} studySet={studySet} isPremium={isPremium} onStudy={onStudy} />)}</div> : <EmptyState icon={<BookOpen size={32} />} title="Você ainda não criou nenhum conjunto" description="Crie seu primeiro conjunto de flashcards para começar a estudar." action={<div className="empty-actions"><Button onClick={onCreate}>Criar manualmente</Button><Button variant="secondary" icon={<Sparkles size={17}/>} onClick={onCreateWithAi}>Criar com IA</Button></div>} />}
    </div>
  );
}
