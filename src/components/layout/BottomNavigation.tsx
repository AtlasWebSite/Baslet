import type { ViewId } from '../../types';
import { navigationItems } from './navigation';

export function BottomNavigation({ activeView, onNavigate }: { activeView: ViewId; onNavigate: (view: ViewId) => void; isPremium: boolean }) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal" data-tour="main-navigation">
      {navigationItems.map(({ id, label, icon: Icon }) => (
        <button key={id} className={activeView === id ? 'active' : ''} data-tour={`nav-${id}`} onClick={() => onNavigate(id)} aria-label={label}>
          <Icon size={20} /><span>{id === 'studies' ? 'Estudos' : id === 'mindmaps' ? 'Mapas' : label}</span>
        </button>
      ))}
    </nav>
  );
}
