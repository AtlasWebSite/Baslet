import { useState } from 'react';
import { BrainCircuit, CreditCard, Crown, UserRound } from 'lucide-react';
import type { ViewId } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Logo } from '../logo/Logo';
import { navigationItems } from './navigation';

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  isPremium: boolean;
}

export function Sidebar({ activeView, onNavigate, name, email, avatarUrl, isPremium }: SidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  const navigateFromModal = (view: ViewId) => {
    setProfileOpen(false);
    onNavigate(view);
  };

  return (
    <>
      <aside className="sidebar" data-tour="main-navigation">
        <button className="brand" onClick={() => onNavigate('home')} aria-label="Ir para o início"><Logo /></button>
        <nav aria-label="Navegação principal">
          {navigationItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeView === id ? 'nav-item active' : 'nav-item'} data-tour={`nav-${id}`} onClick={() => onNavigate(id)}>
              <Icon size={20} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-tip sidebar-tip--empty">
          <span className="sidebar-tip__icon"><BrainCircuit size={20} /></span>
          <strong>Seu ritmo começa aqui</strong><p>Crie conjuntos e estude um pouco por dia para construir sua evolução.</p>
        </div>
        <button type="button" className="sidebar-user" onClick={() => setProfileOpen(true)} aria-label="Abrir perfil do usuário">
          {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span>{name.slice(0, 2).toUpperCase()}</span>}
          <div>
            <strong>{name}</strong>
            <small>{isPremium ? <><Crown size={11} /> Premium ativo</> : 'Assinatura inativa'}</small>
          </div>
        </button>
      </aside>

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Perfil do cliente"
        eyebrow="Conta"
        description="Resumo da sua conta no StudyFlow."
        className="modal--sidebar-profile"
      >
        <div className="sidebar-profile-modal">
          <div className="sidebar-profile-modal__hero">
            {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span>{name.slice(0, 2).toUpperCase()}</span>}
            <div>
              <h3>{name}</h3>
              {email && <p>{email}</p>}
              <small className={isPremium ? 'level-badge level-badge--premium' : 'level-badge'}>{isPremium ? <><Crown size={13} /> Premium ativo</> : 'Assinatura inativa'}</small>
            </div>
          </div>

          <div className="sidebar-profile-modal__actions">
            <Button variant="secondary" icon={<UserRound size={18} />} onClick={() => navigateFromModal('profile')}>Ver perfil completo</Button>
            <Button variant={isPremium ? 'secondary' : 'primary'} icon={<CreditCard size={18} />} onClick={() => navigateFromModal('billing')}>
              {isPremium ? 'Ver assinatura' : 'Assinar Premium'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
