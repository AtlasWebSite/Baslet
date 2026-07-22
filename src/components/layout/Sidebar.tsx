import { BrainCircuit, Crown } from 'lucide-react';
import type { ViewId } from '../../types';
import { navigationItems } from './navigation';
import { Logo } from '../logo/Logo';

export function Sidebar({ activeView, onNavigate, name, avatarUrl, isPremium }: { activeView: ViewId; onNavigate: (view: ViewId) => void; name: string; avatarUrl?: string | null; isPremium: boolean }) {
  const visibleItems = isPremium ? navigationItems : navigationItems.filter(({ id }) => id === 'billing' || id === 'profile');
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate('home')} aria-label="Ir para o início"><Logo /></button>
      <nav aria-label="Navegação principal">
        {visibleItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={activeView === id ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(id)}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-tip sidebar-tip--empty">
        <span className="sidebar-tip__icon"><BrainCircuit size={20} /></span>
        <strong>Seu ritmo começa aqui</strong><p>Crie conjuntos e estude um pouco por dia para construir sua evolução.</p>
      </div>
      <div className="sidebar-user">{avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer"/> : <span>{name.slice(0, 2).toUpperCase()}</span>}<div><strong>{name}</strong><small>{isPremium ? <><Crown size={11}/> Premium ativo</> : 'Assinatura inativa'}</small></div></div>
    </aside>
  );
}
