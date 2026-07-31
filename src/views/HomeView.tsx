import { ArrowRight, BookOpen, BrainCircuit, Clock3, Layers3, Play, Sparkles, Target } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { StudySet, ViewId } from '../types';
import { getOverallProgress } from '../utils/study';
import { StudySetCard } from '../components/cards/StudySetCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';

interface HomeViewProps {
  studySets: StudySet[];
  isPremium: boolean;
  onStudy: (studySet: StudySet) => void;
  onNavigate: (view: ViewId) => void;
  onCreate: () => void;
}

interface HomeRecommendation {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  icon: ReactNode;
  onClick: () => void;
}

function getReviewCount(studySet: StudySet) {
  return studySet.cards.filter((flashcard) => flashcard.mastery < 2).length;
}

export function HomeView({ studySets, isPremium, onStudy, onNavigate, onCreate }: HomeViewProps) {
  const progress = getOverallProgress(studySets);
  const progressOrbitStyle = { '--orbit-progress': `${Math.min(100, Math.max(0, progress))}%` } as CSSProperties;
  const cards = studySets.flatMap((studySet) => studySet.cards);
  const reviewCount = cards.filter((flashcard) => flashcard.mastery < 2).length;
  const practicedCount = cards.filter((flashcard) => flashcard.mastery > 0).length;

  if (!studySets.length) {
    return (
      <div className="view home-view">
        <section className="hero-card hero-card--empty">
          <span className="hero-card__shape hero-card__shape--one" />
          <div className="hero-card__content">
            <span className="eyebrow eyebrow--light"><Sparkles size={14} /> Seu primeiro passo</span>
            <h2>Comece criando seu<br />primeiro conjunto.</h2>
            <p>Transforme qualquer matéria em flashcards rápidos de revisar.</p>
            <Button variant="secondary" onClick={onCreate}>Criar primeiro conjunto</Button>
          </div>
          <div className="empty-preview"><Layers3 size={31} /><strong>0 conjuntos</strong><span>Seu espaço está pronto</span></div>
        </section>
        <section className="how-it-works">
          <span className="eyebrow">COMO FUNCIONA</span>
          <h2>Do conteúdo ao domínio, sem complicação.</h2>
          <div>
            <article><span>01</span><BookOpen size={22} /><strong>Crie</strong><p>Organize termos por tema ou matéria.</p></article>
            <article><span>02</span><Layers3 size={22} /><strong>Revise</strong><p>Vire cards e responda no seu ritmo.</p></article>
            <article><span>03</span><BrainCircuit size={22} /><strong>Evolua</strong><p>Acompanhe o que já domina.</p></article>
          </div>
        </section>
        <section className="empty-dashboard-summary">
          <div><strong>0</strong><span>Conjuntos</span></div>
          <div><strong>0</strong><span>Flashcards</span></div>
          <div><strong>0%</strong><span>Progresso geral</span></div>
          <div><strong>0</strong><span>Estudados hoje</span></div>
        </section>
      </div>
    );
  }

  const setsByReviewNeed = [...studySets].sort((firstSet, secondSet) => getReviewCount(secondSet) - getReviewCount(firstSet));
  const recommendedSet = setsByReviewNeed[0] ?? studySets[0];

  const recommendation: HomeRecommendation = (() => {
    if (reviewCount > 0) {
      return {
        eyebrow: 'Próximo passo recomendado',
        title: `Você tem ${reviewCount} ${reviewCount === 1 ? 'card' : 'cards'} para revisar hoje.`,
        description: `Comece por “${recommendedSet.title}” para fortalecer o que ainda precisa de prática.`,
        buttonLabel: 'Revisar agora',
        icon: <Clock3 size={17} />,
        onClick: () => onStudy(recommendedSet),
      };
    }

    if (progress < 100) {
      return {
        eyebrow: 'Próximo passo recomendado',
        title: 'Continue construindo seu domínio.',
        description: `Você já praticou ${practicedCount} de ${cards.length} cards. Uma sessão curta mantém o ritmo vivo.`,
        buttonLabel: 'Continuar estudando',
        icon: <Play size={17} fill="currentColor" />,
        onClick: () => onStudy(recommendedSet),
      };
    }

    return {
      eyebrow: 'Próximo passo recomendado',
      title: 'Você está em dia com seus flashcards.',
      description: 'Faça um teste rápido para confirmar o que aprendeu e manter a memória ativa.',
      buttonLabel: 'Fazer teste rápido',
      icon: <Target size={17} />,
      onClick: () => onNavigate('quiz'),
    };
  })();

  return (
    <div className="view home-view">
      <section className="hero-card hero-card--next-step">
        <span className="hero-card__shape hero-card__shape--one" />
        <span className="hero-card__shape hero-card__shape--two" />
        <div className="hero-card__content">
          <span className="eyebrow eyebrow--light"><Sparkles size={14} /> {recommendation.eyebrow}</span>
          <h2>{recommendation.title}</h2>
          <p>{recommendation.description}</p>
          <Button variant="secondary" icon={recommendation.icon} onClick={recommendation.onClick}>
            {recommendation.buttonLabel}
          </Button>
        </div>
        <div className="hero-card__progress">
          <div
            className="progress-orbit"
            style={progressOrbitStyle}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Domínio geral"
          >
            <strong>{progress}%</strong>
            <span>domínio geral</span>
          </div>
        </div>
      </section>

      <section className="home-secondary-actions" aria-label="Ações secundárias">
        <div>
          <span className="eyebrow">Depois disso</span>
          <h2>Outros caminhos rápidos</h2>
        </div>
        <div className="quick-grid">
          <button className="quick-card quick-card--purple" onClick={() => onStudy(recommendedSet)}>
            <span><Layers3 size={22} /></span>
            <div><strong>Estudar conjunto</strong><small>Retome seus flashcards</small></div>
            <ArrowRight size={19} />
          </button>
          <button className="quick-card quick-card--cyan" onClick={() => onNavigate('quiz')}>
            <span><BrainCircuit size={22} /></span>
            <div><strong>Teste rápido</strong><small>Pratique com perguntas</small></div>
            <ArrowRight size={19} />
          </button>
          <button className="quick-card quick-card--orange" onClick={() => onNavigate('studies')}>
            <span><BookOpen size={22} /></span>
            <div><strong>Meus estudos</strong><small>Ver todos os conjuntos</small></div>
            <ArrowRight size={19} />
          </button>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="content-section recent-section">
          <div className="section-heading">
            <div><span className="eyebrow">Continue aprendendo</span><h2>Estudos recentes</h2></div>
            <button onClick={() => onNavigate('studies')}>Ver todos <ArrowRight size={16} /></button>
          </div>
          <div className="set-grid">
            {studySets.slice(0, 3).map((studySet) => <StudySetCard key={studySet.id} studySet={studySet} isPremium={isPremium} onStudy={onStudy} />)}
          </div>
        </section>
        <aside className="daily-card">
          <div className="daily-card__top"><span><BrainCircuit size={22} /></span><div><small>SEU ACERVO</small><strong>{cards.length} flashcards</strong></div></div>
          <p>{reviewCount ? `${reviewCount} cards ainda precisam de mais prática.` : 'Você dominou todos os cards deste acervo.'}</p>
          <ProgressBar value={progress} color="#6758e8" />
          <div className="daily-card__footer"><span>Progresso real sincronizado</span><strong>{progress}%</strong></div>
        </aside>
      </div>
    </div>
  );
}
