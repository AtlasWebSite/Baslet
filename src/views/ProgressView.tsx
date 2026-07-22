import { BookOpenCheck, BrainCircuit, Flame, RotateCcw, Target, TrendingUp } from 'lucide-react';
import type { StudySet } from '../types';
import { getOverallProgress, getSetProgress } from '../utils/study';
import { StatCard } from '../components/cards/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';

export function ProgressView({ studySets }: { studySets: StudySet[] }) {
  const cards = studySets.flatMap((studySet) => studySet.cards);
  const mastered = cards.filter((card) => card.mastery === 3).length;
  const review = cards.filter((card) => card.mastery < 2).length;
  const overall = getOverallProgress(studySets);
  if (!cards.length) return <div className="view"><EmptyState icon={<TrendingUp size={32}/>} title="Seu progresso aparecerá aqui" description="Depois que você estudar seus primeiros cards, suas estatísticas serão exibidas nesta tela." /></div>;
  return (
    <div className="view progress-view">
      <div className="stats-grid"><StatCard icon={<Target size={23} />} value={`${overall}%`} label="Domínio geral" detail="Baseado nas suas respostas" tone="purple" /><StatCard icon={<BookOpenCheck size={23} />} value={mastered} label="Cards dominados" detail={`de ${cards.length} cards`} tone="cyan" /><StatCard icon={<RotateCcw size={23} />} value={review} label="Para revisar" detail="Revisão recomendada" tone="orange" /><StatCard icon={<Flame size={23} />} value={cards.filter((card) => card.mastery > 0).length} label="Cards praticados" detail="Com progresso salvo" tone="pink" /></div>
      <div className="progress-layout"><section className="chart-card"><div className="section-heading"><div><span className="eyebrow">VISÃO GERAL</span><h2>Distribuição de domínio</h2></div><span className="trend"><TrendingUp size={16} /> Dados reais</span></div><div className="mastery-chart">{[0,1,2,3].map((level) => { const count = cards.filter((card) => card.mastery === level).length; const labels = ['Novos','Aprendendo','Quase lá','Dominados']; return <div key={level}><span>{labels[level]}</span><div><i style={{width:`${cards.length ? (count/cards.length)*100 : 0}%`}}/></div><strong>{count}</strong></div>; })}</div><div className="chart-summary"><BrainCircuit size={17}/><span><strong>{cards.filter((card) => card.mastery > 0).length}</strong> cards já praticados</span></div></section>
        <section className="subject-progress"><div className="section-heading"><div><span className="eyebrow">DESEMPENHO</span><h2>Por matéria</h2></div></div><div className="subject-list">{studySets.slice(0, 4).map((studySet) => <div key={studySet.id}><div><span className="subject-dot" style={{ background: studySet.color }} /><strong>{studySet.subject}</strong><small>{studySet.cards.length} cards</small></div><ProgressBar value={getSetProgress(studySet)} color={studySet.color} /></div>)}</div></section></div>
      <section className="insight-card"><span><BrainCircuit size={23} /></span><div><strong>Continue construindo seu histórico</strong><p>Quanto mais você responder, mais preciso será o panorama do seu aprendizado.</p></div></section>
    </div>
  );
}
