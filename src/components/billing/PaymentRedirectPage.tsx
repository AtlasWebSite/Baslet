import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, CreditCard, LockKeyhole, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import { signInWithGoogle } from '../../services/authService';
import type { Subscription } from '../../types/subscription';
import { Logo } from '../logo/Logo';
import { Button } from '../ui/Button';
import { BillingButton } from './BillingButton';
import { PricingCard } from './PricingCard';

type PaymentPageMode = 'guest' | 'checkout' | 'active';

interface PaymentRedirectPageProps {
  mode: PaymentPageMode;
  subscription?: Subscription | null;
  errorMessage?: string;
  isStarting?: boolean;
  isRefreshing?: boolean;
  onSubscribe?: () => void;
  onRefresh?: () => void;
  onEnterApp?: () => void;
}

const planFeatures = [
  'Flashcards e revisões em uma conta segura.',
  'Mapas mentais automáticos para estudar visualmente.',
  'Testes rápidos e progresso sincronizado.',
];

export function PaymentRedirectPage({
  mode,
  subscription,
  errorMessage = '',
  isStarting = false,
  isRefreshing = false,
  onSubscribe,
  onRefresh,
  onEnterApp,
}: PaymentRedirectPageProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const signInLock = useRef(false);
  const isActive = mode === 'active';

  const handleLogin = async () => {
    if (isSigningIn || signInLock.current) return;

    signInLock.current = true;
    setIsSigningIn(true);
    setLoginError('');

    try {
      await signInWithGoogle('/pagamento');
    } catch (error) {
      console.error('Erro ao iniciar login para pagamento:', error);
      setLoginError('Não foi possível abrir o login com Google. Tente novamente.');
      signInLock.current = false;
      setIsSigningIn(false);
    }
  };

  const action = (() => {
    if (mode === 'guest') {
      return (
        <Button className="billing-button" icon={<LogIn size={19} />} loading={isSigningIn} onClick={handleLogin}>
          Entrar com Google para assinar
        </Button>
      );
    }

    if (isActive) {
      return (
        <Button className="billing-button" icon={<ArrowRight size={19} />} onClick={onEnterApp}>
          Entrar no app
        </Button>
      );
    }

    return <BillingButton loading={isStarting} onClick={() => onSubscribe?.()}>Ir para pagamento</BillingButton>;
  })();

  return (
    <main className="payment-redirect-page">
      <div className="payment-redirect-page__glow payment-redirect-page__glow--one" />
      <div className="payment-redirect-page__glow payment-redirect-page__glow--two" />
      <section className="payment-redirect-shell">
        <header className="payment-redirect-header">
          <Logo />
          <span><ShieldCheck size={16} /> Pagamento seguro</span>
        </header>

        <div className="payment-redirect-grid">
          <section className="payment-redirect-copy">
            <span className="subscription-hero__badge"><Sparkles size={14} /> STUDYFLOW PREMIUM</span>
            <h1>Finalize sua assinatura e desbloqueie seus estudos.</h1>
            <p>
              Assine por R$ 11,90 ao mês para usar flashcards, mapas mentais, testes e progresso salvo na sua conta.
            </p>

            <div className="payment-redirect-steps" aria-label="Etapas do pagamento">
              <div className={mode !== 'guest' ? 'active' : ''}><span>1</span><strong>Entrar com Google</strong></div>
              <div className={mode === 'checkout' || isActive ? 'active' : ''}><span>2</span><strong>Confirmar pagamento</strong></div>
              <div className={isActive ? 'active' : ''}><span>3</span><strong>Acesso liberado</strong></div>
            </div>

            <ul className="payment-redirect-benefits">
              {planFeatures.map((feature) => <li key={feature}><CheckCircle2 size={17} />{feature}</li>)}
            </ul>
          </section>

          <section className="payment-redirect-card">
            {isActive && (
              <div className="payment-active-note" role="status">
                <CheckCircle2 size={18} />
                <span>Premium ativo{subscription?.nextPaymentAt ? ` · próximo ciclo em ${new Date(subscription.nextPaymentAt).toLocaleDateString('pt-BR')}` : ''}</span>
              </div>
            )}
            {(errorMessage || loginError) && <div className="billing-error" role="alert">{errorMessage || loginError}</div>}
            <PricingCard action={action} />
            {mode === 'checkout' && (
              <Button variant="secondary" icon={<CreditCard size={16} />} loading={isRefreshing} onClick={onRefresh}>
                Verificar assinatura
              </Button>
            )}
            <p className="payment-redirect-disclaimer">
              <LockKeyhole size={14} />
              O acesso Premium só é liberado após confirmação real do pagamento.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
