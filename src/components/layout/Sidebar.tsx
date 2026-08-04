import { useState } from 'react';
import { CreditCard, Crown, UserRound } from 'lucide-react';
import type { Profile, ViewId } from '../../types';
import type { Subscription, SubscriptionStatus } from '../../types/subscription';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Logo } from '../logo/Logo';
import { sidebarFooterItems, sidebarPerformanceItems, sidebarPrimaryItem, sidebarStudyItems } from './navigation';
import type { NavigationItem } from './navigation';

const subscriptionStatusLabels: Record<SubscriptionStatus | 'inactive', string> = {
  inactive: 'Assinatura inativa',
  pending: 'Pagamento em análise',
  active: 'Ativa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  rejected: 'Pagamento recusado',
};

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  onBilling?: () => void;
  profile: Profile;
  subscription: Subscription | null;
  isPremium: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return 'Não disponível';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getUsername(email: string) {
  return email.split('@')[0] || 'usuário';
}

function getCurrentPlan(subscription: Subscription | null, isPremium: boolean) {
  if (isPremium) return subscription?.planName ?? 'StudyFlow Premium';
  if (subscription?.status === 'pending') return subscription.planName;
  return 'Gratuito';
}

export function Sidebar({ activeView, onNavigate, onBilling, profile, subscription, isPremium }: SidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const subscriptionStatus = subscription?.status ?? 'inactive';
  const name = profile.full_name;
  const username = getUsername(profile.email);

  const navigateFromModal = (view: ViewId) => {
    setProfileOpen(false);
    onNavigate(view);
  };

  const openBillingFromModal = () => {
    setProfileOpen(false);
    if (onBilling) {
      onBilling();
      return;
    }

    if (isPremium) {
      onNavigate('billing');
      return;
    }

    window.dispatchEvent(new Event('studyflow:open-premium'));
  };

  const openBillingFromSidebar = () => {
    if (onBilling) {
      onBilling();
      return;
    }

    onNavigate('billing');
  };

  const renderNavigationButton = ({ id, label, icon: Icon }: NavigationItem) => {
    const isActive = activeView === id;
    const handleClick = () => {
      if (id === 'billing') {
        openBillingFromSidebar();
        return;
      }

      onNavigate(id);
    };

    return (
      <button key={id} className={isActive ? 'nav-item active' : 'nav-item'} data-tour={`nav-${id}`} onClick={handleClick}>
        <Icon size={20} /><span>{label}</span>
      </button>
    );
  };

  return (
    <>
      <aside className="sidebar" data-tour="main-navigation">
        <button className="brand" onClick={() => onNavigate('home')} aria-label="Ir para o início"><Logo /></button>
        <nav aria-label="Navegação principal">
          {renderNavigationButton(sidebarPrimaryItem)}
          <div className="sidebar-nav-section" aria-label="Estudos">
            <span>ESTUDOS</span>
            {sidebarStudyItems.map(renderNavigationButton)}
          </div>
          <div className="sidebar-nav-section" aria-label="Desempenho">
            <span>DESEMPENHO</span>
            {sidebarPerformanceItems.map(renderNavigationButton)}
          </div>
        </nav>
        <div className="sidebar-bottom-actions" aria-label="Conta e plano">
          {sidebarFooterItems.map(renderNavigationButton)}
        </div>
        <button type="button" className="sidebar-user" onClick={() => setProfileOpen(true)} aria-label="Abrir perfil do usuário">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span>{name.slice(0, 2).toUpperCase()}</span>}
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
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span>{name.slice(0, 2).toUpperCase()}</span>}
            <div>
              <h3>{name}</h3>
              <p>@{username}</p>
              <small className={isPremium ? 'level-badge level-badge--premium' : 'level-badge'}>{isPremium ? <><Crown size={13} /> Premium ativo</> : 'Assinatura inativa'}</small>
            </div>
          </div>

          <div className="sidebar-profile-modal__grid">
            <section>
              <h4>Informações principais</h4>
              <dl>
                <div><dt>Nome</dt><dd>{name}</dd></div>
                <div><dt>Nome de usuário</dt><dd>@{username}</dd></div>
                <div><dt>Email</dt><dd>{profile.email}</dd></div>
                <div><dt>Data de criação da conta</dt><dd>{formatDate(profile.created_at)}</dd></div>
                <div><dt>Último acesso</dt><dd>Sessão atual ativa</dd></div>
                <div><dt>Status da conta</dt><dd><span className="account-status-dot" />Ativo</dd></div>
              </dl>
            </section>

            <section>
              <h4>Conta</h4>
              <dl>
                <div><dt>ID do usuário</dt><dd className="sidebar-profile-modal__id">{profile.id}</dd></div>
                <div><dt>Plano atual</dt><dd>{getCurrentPlan(subscription, isPremium)}</dd></div>
                <div><dt>Status da assinatura</dt><dd>{subscriptionStatusLabels[subscriptionStatus]}</dd></div>
                <div><dt>Próxima cobrança</dt><dd>{formatDate(subscription?.nextPaymentAt)}</dd></div>
                <div><dt>Expiração do plano</dt><dd>{subscription?.cancelledAt ? formatDate(subscription.nextPaymentAt) : isPremium ? 'Renovação ativa' : 'Não aplicável'}</dd></div>
              </dl>
            </section>
          </div>

          <div className="sidebar-profile-modal__actions">
            <Button variant="secondary" icon={<UserRound size={18} />} onClick={() => navigateFromModal('profile')}>Editar perfil</Button>
            <Button variant={isPremium ? 'secondary' : 'primary'} icon={<CreditCard size={18} />} onClick={openBillingFromModal}>
              {isPremium ? 'Ver assinatura' : 'Assinar Premium'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
