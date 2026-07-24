import { Crown, LogOut, RefreshCw, Sparkles } from 'lucide-react';
import type { Subscription } from '../../types/subscription';
import { BillingButton } from './BillingButton';
import { PricingCard } from './PricingCard';
import { Button } from '../ui/Button';

const messages = {
  pending: { title: 'Pagamento em análise', text: 'O Mercado Pago ainda está processando sua assinatura. O acesso será liberado automaticamente após a confirmação.' },
  rejected: { title: 'Pagamento não aprovado', text: 'A cobrança não foi aprovada. Você pode iniciar uma nova tentativa com segurança.' },
  paused: { title: 'Assinatura pausada', text: 'Seu acesso Premium está pausado. Reative o plano para continuar estudando.' },
  cancelled: { title: 'Assinatura cancelada', text: 'Sua assinatura não está mais ativa. Você pode assinar novamente quando quiser.' },
  inactive: { title: 'Desbloqueie seus estudos', text: 'Use flashcards, mapas mentais, testes e progresso por apenas R$ 11,90 por mês.' },
};

interface SubscriptionPaywallProps {
  subscription: Subscription | null;
  isStarting: boolean;
  isRefreshing: boolean;
  errorMessage: string;
  onSubscribe: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
  showSignOut?: boolean;
}

export function SubscriptionPaywall({
  subscription,
  isStarting,
  isRefreshing,
  errorMessage,
  onSubscribe,
  onRefresh,
  onSignOut,
  showSignOut = true,
}: SubscriptionPaywallProps) {
  const status = subscription?.status === 'active' ? 'inactive' : subscription?.status ?? 'inactive';
  const message = messages[status];
  const pending = status === 'pending';
  const actionLabel = pending
    ? 'Pagar novamente'
    : status === 'rejected'
      ? 'Tentar novamente'
      : status === 'cancelled' || status === 'paused'
        ? 'Reativar Premium'
        : 'Assinar agora';

  return (
    <div className="subscription-page">
      <div className="subscription-page__orb subscription-page__orb--one" />
      <div className="subscription-page__orb subscription-page__orb--two" />
      <section className="subscription-hero">
        <span className="subscription-hero__badge"><Sparkles size={14} /> ESTUDE SEM LIMITES</span>
        <div className="subscription-hero__icon"><Crown size={28} /></div>
        <h1>{message.title}</h1>
        <p>{message.text}</p>
        {errorMessage && <div className="billing-error" role="alert">{errorMessage}</div>}
        <PricingCard action={<BillingButton loading={isStarting} onClick={onSubscribe}>{actionLabel}</BillingButton>} />
        {pending && <Button variant="secondary" icon={<RefreshCw size={16} />} loading={isRefreshing} onClick={onRefresh}>Verificar pagamento novamente</Button>}
        {showSignOut && <button className="billing-signout" onClick={onSignOut}><LogOut size={15} /> Sair da conta</button>}
      </section>
    </div>
  );
}
