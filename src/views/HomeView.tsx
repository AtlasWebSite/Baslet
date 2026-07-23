import { ArrowRight, BookOpen, BrainCircuit, Clock3, Layers3, Play, Sparkles } from 'lucide-react';
import type { StudySet, ViewId } from '../types';
import { getOverallProgress } from '../utils/study';
import { StudySetCard } from '../components/cards/StudySetCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';

export function HomeView({ studySets, isPremium, onStudy, onNavigate, onCreate }: { studySets: StudySet[]; isPremium: boolean; onStudy: (studySet: StudySet) => void; onNavigate: (view: ViewId) => void; onCreate: () => void }) {
  const progress = getOverallProgress(studySets);
  const cards = studySets.flatMap((studySet) => studySet.cards);
  const reviewCount = cards.filter((flashcard) => flashcard.mastery < 2).length;
  if (!studySets.length) return <div className="view home-view"><section className="hero-card hero-card--empty"><span className="hero-card__shape hero-card__shape--one"/><div className="hero-card__content"><span className="eyebrow eyebrow--light"><Sparkles size={14}/> Seu primeiro passo</span><h2>Comece criando seu<br/>primeiro conjunto.</h2><p>Transforme qualquer matéria em flashcards rápidos de revisar.</p><Button variant="secondary" onClick={onCreate}>Criar primeiro conjunto</Button></div><div className="empty-preview"><Layers3 size={31}/><strong>0 conjuntos</strong><span>Seu espaço está pronto</span></div></section><section className="how-it-works"><span className="eyebrow">COMO FUNCIONA</span><h2>Do conteúdo ao domínio, sem complicação.</h2><div><article><span>01</span><BookOpen size={22}/><strong>Crie</strong><p>Organize termos por tema ou matéria.</p></article><article><span>02</span><Layers3 size={22}/><strong>Revise</strong><p>Vire cards e responda no seu ritmo.</p></article><article><span>03</span><BrainCircuit size={22}/><strong>Evolua</strong><p>Acompanhe o que já domina.</p></article></div></section><section className="empty-dashboard-summary"><div><strong>0</strong><span>Conjuntos</span></div><div><strong>0</strong><span>Flashcards</span></div><div><strong>0%</strong><span>Progresso geral</span></div><div><strong>0</strong><span>Estudados hoje</span></div></section></div>;
  return (
    <div className="view home-view">
      <section className="hero-card">
        <span className="hero-card__shape hero-card__shape--one" /><span className="hero-card__shape hero-card__shape--two" />
        <div className="hero-card__content"><span className="eyebrow eyebrow--light"><Sparkles size={14} /> Meta de hoje</span><h2>Mais perto do que<br />você quer aprender.</h2><p>Uma sessão curta já mantém seu ritmo vivo.</p><Button variant="secondary" icon={<Play size={17} fill="currentColor" />} onClick={() => studySets[0] && onStudy(studySets[0])} disabled={!studySets.length}>Continuar estudando</Button></div>
        <div className="hero-card__progress"><div className="progress-orbit"><strong>{progress}%</strong><span>domínio geral</span></div></div>
      </section>

      <section className="quick-grid">
        <button className="quick-card quick-card--purple" onClick={() => studySets[0] && onStudy(studySets[0])}><span><Layers3 size={22} /></span><div><strong>Estudar agora</strong><small>Retome seus flashcards</small></div><ArrowRight size={19} /></button>
        <button className="quick-card quick-card--cyan" onClick={() => onNavigate('quiz')}><span><BrainCircuit size={22} /></span><div><strong>Teste rápido</strong><small>5 perguntas · 3 min</small></div><ArrowRight size={19} /></button>
        <button className="quick-card quick-card--orange" onClick={() => onNavigate('studies')}><span><Clock3 size={22} /></span><div><strong>Revisar</strong><small>{reviewCount} cards aguardando</small></div><ArrowRight size={19} /></button>
      </section>

      <div className="dashboard-grid">
        <section className="content-section recent-section"><div className="section-heading"><div><span className="eyebrow">Continue aprendendo</span><h2>Estudos recentes</h2></div><button onClick={() => onNavigate('studies')}>Ver todos <ArrowRight size={16} /></button></div>
          {studySets.length ? <div className="set-grid">{studySets.slice(0, 3).map((studySet) => <StudySetCard key={studySet.id} studySet={studySet} isPremium={isPremium} onStudy={onStudy} />)}</div> : <div className="mini-empty"><BookOpen size={25} /><span>Nenhum conjunto ainda.</span><button onClick={onCreate}>Criar agora</button></div>}
        </section>
        <aside className="daily-card"><div className="daily-card__top"><span><BrainCircuit size={22} /></span><div><small>SEU ACERVO</small><strong>{cards.length} flashcards</strong></div></div><p>{reviewCount ? `${reviewCount} cards ainda precisam de mais prática.` : 'Você dominou todos os cards deste acervo.'}</p><ProgressBar value={progress} color="#6758e8" /><div className="daily-card__footer"><span>Progresso real sincronizado</span><strong>{progress}%</strong></div></aside>
      </div>
    </div>
  );
}
