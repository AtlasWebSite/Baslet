import type { ViewId } from '../../types';
import { navigationItems } from './navigation';

export function BottomNavigation({ activeView, onNavigate, isPremium }: { activeView: ViewId; onNavigate: (view: ViewId) => void; isPremium: boolean }) {
  const visibleItems = isPremium ? navigationItems : navigationItems.filter(({ id }) => id === 'billing' || id === 'profile');
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {visibleItems.map(({ id, label, icon: Icon }) => (
        <button key={id} className={activeView === id ? 'active' : ''} onClick={() => onNavigate(id)} aria-label={label}>
          <Icon size={20} /><span>{id === 'studies' ? 'Estudos' : id === 'mindmaps' ? 'Mapas' : label}</span>
        </button>
      ))}
    </nav>
  );
}
