import { CalendarDays, Crown, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import type { Subscription } from '../../types/subscription';
import { Button } from '../ui/Button';

const statusLabels = {
  inactive: 'Acesso inativo',
  pending: 'Pagamento em análise',
  active: 'Premium ativo',
  paused: 'Acesso pausado',
  cancelled: 'Acesso encerrado',
  rejected: 'Pagamento não aprovado',
};

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export function SubscriptionStatusCard({
  subscription,
  refreshing,
  cancelling,
  onRefresh,
  onCancel,
  onSubscribe,
}: {
  subscription: Subscription | null;
  refreshing: boolean;
  cancelling: boolean;
  onRefresh: () => void;
  onCancel: () => void;
  onSubscribe: () => void;
}) {
  const status = subscription?.status ?? 'inactive';
  const cancellationScheduled = status === 'active' && Boolean(subscription?.cancelledAt);
  const label = cancellationScheduled ? 'Premium até o fim do período' : statusLabels[status];

  return (
    <section className={`subscription-status subscription-status--${status}`}>
      <header>
        <span><Crown size={21} /></span>
        <div><small>SEU PLANO</small><h2>{subscription?.planName ?? 'StudyFlow Premium'}</h2></div>
        <strong><ShieldCheck size={15} />{label}</strong>
      </header>
      <div className="subscription-status__grid">
        <div><small>Valor</small><strong>R$ 11,90 / 30 dias</strong></div>
        <div><small>Ativação</small><strong><CalendarDays size={14} />{formatDate(subscription?.startedAt ?? null)}</strong></div>
        <div><small>Acesso até</small><strong>{formatDate(subscription?.nextPaymentAt ?? null)}</strong></div>
      </div>
      {cancellationScheduled && <p className="subscription-status__note">O app continua liberado até o fim do período já pago.</p>}
      <div className="subscription-status__actions">
        <Button variant="secondary" icon={<RefreshCw size={16} />} loading={refreshing} onClick={onRefresh}>Verificar novamente</Button>
        {status === 'active' && !cancellationScheduled ? <Button variant="ghost" icon={<XCircle size={16} />} loading={cancelling} onClick={onCancel}>Encerrar após período pago</Button> : <Button onClick={onSubscribe}>{cancellationScheduled ? 'Pagar novo período' : 'Pagar ou reativar'}</Button>}
      </div>
    </section>
  );
}
