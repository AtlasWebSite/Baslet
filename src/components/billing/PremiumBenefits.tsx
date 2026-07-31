import { BarChart3, BookOpen, Cloud, Network, SearchCheck } from 'lucide-react';

const benefits = [
  { icon: BookOpen, label: 'Transforme qualquer assunto em flashcards' },
  { icon: SearchCheck, label: 'Descubra rapidamente o que ainda precisa revisar' },
  { icon: Network, label: 'Visualize assuntos complexos com mapas mentais' },
  { icon: BarChart3, label: 'Acompanhe sua evolução' },
  { icon: Cloud, label: 'Estude de qualquer dispositivo' },
];

export function PremiumBenefits() {
  return <div className="premium-benefits">{benefits.map(({ icon: Icon, label }) => <div key={label}><span><Icon size={18}/></span><strong>{label}</strong></div>)}</div>;
}
