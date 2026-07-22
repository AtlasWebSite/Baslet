import { BookOpen, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import type { StudySet } from '../types';
import { StudySetCard } from '../components/cards/StudySetCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export function StudiesView({ studySets, onStudy, onCreate }: { studySets: StudySet[]; onStudy: (studySet: StudySet) => void; onCreate: () => void }) {
  return (
    <div className="view">
      <div className="filter-row"><div className="filter-pills"><button className="active">Todos <span>{studySets.length}</span></button><button>Em andamento</button><button>Concluídos</button></div><div className="view-controls"><button><SlidersHorizontal size={17} /> Filtrar</button><button className="active" aria-label="Visualização em grade"><LayoutGrid size={18} /></button><button aria-label="Visualização em lista"><List size={18} /></button></div></div>
      {studySets.length > 0 ? <div className="set-grid set-grid--wide">{studySets.map((studySet) => <StudySetCard key={studySet.id} studySet={studySet} onStudy={onStudy} />)}</div> : <EmptyState icon={<BookOpen size={32} />} title="Você ainda não criou nenhum conjunto" description="Crie seu primeiro conjunto de flashcards para começar a estudar." action={<Button onClick={onCreate}>Criar primeiro conjunto</Button>} />}
    </div>
  );
}
