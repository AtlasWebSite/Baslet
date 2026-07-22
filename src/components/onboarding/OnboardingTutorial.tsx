import { ArrowLeft, ArrowRight, BarChart3, BookOpen, CheckCircle2, Layers3, Sparkles, Target, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Logo } from '../logo/Logo';

const steps = [
  { icon: Sparkles, title: 'Bem-vindo ao seu app de estudos', text: 'Organize suas matérias, crie flashcards e acompanhe sua evolução em um só lugar.' },
  { icon: BookOpen, title: 'Crie conjuntos de estudo', text: 'Separe seus conteúdos por matéria, prova ou tema para estudar com mais organização.' },
  { icon: Layers3, title: 'Adicione flashcards', text: 'Escreva um termo na frente do card e a explicação no verso para revisar rapidamente.' },
  { icon: Target, title: 'Estude e marque seu desempenho', text: 'Use “Não sei”, “Quase sei” e “Sei” para acompanhar o que você já domina.' },
  { icon: BarChart3, title: 'Acompanhe seu progresso', text: 'Veja seus avanços, cards revisados e matérias que precisam de mais atenção.' },
  { icon: CheckCircle2, title: 'Pronto para começar', text: 'Você já tem alguns flashcards iniciais para testar o app. Depois, crie seus próprios conjuntos personalizados.' },
];

export function OnboardingTutorial({ onComplete }: { onComplete: () => Promise<void> | void }) {
  const [step, setStep] = useState(0); const [saving, setSaving] = useState(false); const [error, setError] = useState<string>();
  const current = steps[step]; const Icon = current.icon; const isLast = step === steps.length - 1;
  const finish = async () => { setSaving(true); setError(undefined); try { await onComplete(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar.'); setSaving(false); } };
  return <div className="onboarding-backdrop"><section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><header><Logo compact/><span>{step + 1} de {steps.length}</span><button onClick={() => void finish()} aria-label="Pular tutorial"><X size={19}/></button></header><div className="step-track">{steps.map((_, index) => <span key={index} className={index <= step ? 'active' : ''}/>)}</div><div className="onboarding-content" key={step}><div className="onboarding-illustration"><span className="orb orb--one"/><span className="orb orb--two"/><Icon size={44}/></div><span className="eyebrow">PASSO {String(step + 1).padStart(2, '0')}</span><h2 id="onboarding-title">{current.title}</h2><p>{current.text}</p>{error && <small className="error-text">{error}</small>}</div><footer><button className="skip-button" onClick={() => void finish()} disabled={saving}>Pular</button><div>{step > 0 && <Button variant="ghost" icon={<ArrowLeft size={17}/>} onClick={() => setStep((value) => value - 1)}>Voltar</Button>}{isLast ? <Button loading={saving} icon={<CheckCircle2 size={17}/>} onClick={() => void finish()}>Começar agora</Button> : <Button icon={<ArrowRight size={17}/>} onClick={() => setStep((value) => value + 1)}>Próximo</Button>}</div></footer></section></div>;
}
