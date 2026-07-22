import { Crown, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { PremiumBenefits } from './PremiumBenefits';

export function PricingCard({ action }: { action: ReactNode }) {
  return <article className="pricing-card"><div className="pricing-card__glow"/><header><span><Crown size={22}/></span><div><small>PLANO MENSAL</small><h2>StudyFlow Premium</h2></div></header><div className="pricing-card__price"><strong><sup>R$</sup>11,90</strong><span>por mês</span></div><PremiumBenefits/>{action}<footer><ShieldCheck size={15}/> Pagamento seguro via Mercado Pago</footer></article>;
}
