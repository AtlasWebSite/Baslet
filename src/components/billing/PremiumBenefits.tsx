import { BarChart3, BookOpen, Brain, Cloud, Network, Sparkles } from 'lucide-react';

const benefits = [
  { icon: BookOpen, label: 'Flashcards ilimitados' },
  { icon: Network, label: 'Mapas mentais automáticos' },
  { icon: Brain, label: 'Testes de revisão' },
  { icon: BarChart3, label: 'Progresso salvo na conta' },
  { icon: Cloud, label: 'Acesso em qualquer dispositivo' },
  { icon: Sparkles, label: 'Conteúdo organizado por matérias' },
];

export function PremiumBenefits() {
  return <div className="premium-benefits">{benefits.map(({ icon: Icon, label }) => <div key={label}><span><Icon size={18}/></span><strong>{label}</strong></div>)}</div>;
}
