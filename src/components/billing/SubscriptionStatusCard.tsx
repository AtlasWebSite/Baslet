import { CalendarDays, Crown, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import type { Subscription } from '../../types/subscription';
import { Button } from '../ui/Button';

const statusLabels = { inactive: 'Assinatura inativa', pending: 'Pagamento em análise', active: 'Premium ativo', paused: 'Assinatura pausada', cancelled: 'Assinatura cancelada', rejected: 'Pagamento não aprovado' };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export function SubscriptionStatusCard({ subscription, refreshing, cancelling, onRefresh, onCancel, onSubscribe }: { subscription: Subscription | null; refreshing: boolean; cancelling: boolean; onRefresh: () => void; onCancel: () => void; onSubscribe: () => void }) {
  const status = subscription?.status ?? 'inactive';
  return <section className={`subscription-status subscription-status--${status}`}><header><span><Crown size={21}/></span><div><small>SEU PLANO</small><h2>{subscription?.planName ?? 'StudyFlow Premium'}</h2></div><strong><ShieldCheck size={15}/>{statusLabels[status]}</strong></header><div className="subscription-status__grid"><div><small>Valor mensal</small><strong>R$ 11,90</strong></div><div><small>Ativação</small><strong><CalendarDays size={14}/>{formatDate(subscription?.startedAt ?? null)}</strong></div><div><small>Próxima cobrança</small><strong>{formatDate(subscription?.nextPaymentAt ?? null)}</strong></div></div><div className="subscription-status__actions"><Button variant="secondary" icon={<RefreshCw size={16}/>} loading={refreshing} onClick={onRefresh}>Verificar novamente</Button>{status === 'active' ? <Button variant="ghost" icon={<XCircle size={16}/>} loading={cancelling} onClick={onCancel}>Cancelar assinatura</Button> : <Button onClick={onSubscribe}>Assinar ou reativar</Button>}</div></section>;
}
