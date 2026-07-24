import { CheckCircle2, Clock3, ShieldCheck, XCircle } from 'lucide-react';
import type { PaymentReturnStatus } from '../../types/subscription';
import { Button } from '../ui/Button';

const content = {
  success: { icon: CheckCircle2, title: 'Pagamento recebido', text: 'Estamos confirmando sua assinatura com o Mercado Pago. O acesso será liberado somente após a confirmação segura.', tone: 'success' },
  pending: { icon: Clock3, title: 'Pagamento em processamento', text: 'Seu pagamento ainda está sendo analisado. Você pode verificar novamente em alguns instantes.', tone: 'pending' },
  failure: { icon: XCircle, title: 'Pagamento não concluído', text: 'Não foi possível concluir o pagamento. Nenhuma assinatura foi liberada.', tone: 'failure' },
};

export function PaymentStatusScreen({ status, isPremium, checking, errorMessage, onCheck, onContinue }: { status: PaymentReturnStatus; isPremium: boolean; checking: boolean; errorMessage: string; onCheck: () => void; onContinue: () => void }) {
  const details = content[status]; const Icon = details.icon;
  return <div className="payment-status-page"><section className={`payment-status-card payment-status-card--${details.tone}`}><span><Icon size={30}/></span><small>RETORNO DO PAGAMENTO</small><h1>{isPremium ? 'Premium ativado!' : details.title}</h1><p>{isPremium ? 'A confirmação chegou com segurança. Todos os recursos do StudyFlow estão disponíveis.' : details.text}</p>{errorMessage && <div className="billing-error" role="alert">{errorMessage}</div>}<div><Button loading={checking} onClick={onCheck}>Verificar assinatura</Button><Button variant="secondary" onClick={onContinue}>{isPremium ? 'Entrar no StudyFlow' : 'Voltar ao plano'}</Button></div><footer><ShieldCheck size={15}/> O retorno desta página não ativa o plano. A confirmação vem do webhook.</footer></section></div>;
}
