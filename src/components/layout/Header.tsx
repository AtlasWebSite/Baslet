import { Bell, Plus, Search } from 'lucide-react';
import type { ViewId } from '../../types';
import { Button } from '../ui/Button';

const titles: Record<ViewId, { title: string; subtitle: string }> = {
  home: { title: 'Olá! 👋', subtitle: 'Pronto para avançar um pouco hoje?' },
  studies: { title: 'Meus estudos', subtitle: 'Tudo o que você está aprendendo, em um só lugar.' },
  flashcards: { title: 'Flashcards', subtitle: 'Revise no seu ritmo e fortaleça a memória.' },
  mindmaps: { title: 'Mapas Mentais', subtitle: 'Transforme seus flashcards em mapas visuais para revisar melhor.' },
  quiz: { title: 'Testes rápidos', subtitle: 'Descubra o que já sabe e o que merece revisão.' },
  progress: { title: 'Seu progresso', subtitle: 'Cada sessão conta. Veja o quanto você avançou.' },
  billing: { title: 'StudyFlow Premium', subtitle: 'Seu plano, pagamentos e acesso aos recursos.' },
  profile: { title: 'Seu perfil', subtitle: 'Preferências, conquistas e dados da sua jornada.' },
};

export function Header({ view, search, onSearch, onCreate, userName, showStudyActions = true }: { view: ViewId; search: string; onSearch: (value: string) => void; onCreate: () => void; userName: string; showStudyActions?: boolean }) {
  return (
    <header className="topbar">
      <div className="topbar__title"><h1>{view === 'home' ? `Olá, ${userName.split(' ')[0]}! 👋` : titles[view].title}</h1><p>{titles[view].subtitle}</p></div>
      {showStudyActions && <div className="topbar__actions">
        <label className="search"><Search size={18} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar conjuntos..." aria-label="Buscar conjuntos" /></label>
        <button className="icon-button notification" aria-label="Notificações"><Bell size={20} /><span /></button>
        <span data-tour="create-study-set"><Button icon={<Plus size={18} />} onClick={onCreate}>Novo conjunto</Button></span>
      </div>}
    </header>
  );
}
