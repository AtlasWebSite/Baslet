import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Flame,
  Layers3,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { StatCard } from '../components/cards/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { StudySet } from '../types';
import { getOverallProgress, getSetProgress } from '../utils/study';

const masteryLabels = ['Novos', 'Aprendendo', 'Quase lá', 'Dominados'];

function groupSubjects(studySets: StudySet[]) {
  const subjects = new Map<string, { color: string; cards: number; progressSum: number; sets: number }>();

  studySets.forEach((studySet) => {
    const current = subjects.get(studySet.subject);
    const progress = getSetProgress(studySet);

    if (!current) {
      subjects.set(studySet.subject, {
        color: studySet.color,
        cards: studySet.cards.length,
        progressSum: progress,
        sets: 1,
      });
      return;
    }

    subjects.set(studySet.subject, {
      ...current,
      cards: current.cards + studySet.cards.length,
      progressSum: current.progressSum + progress,
      sets: current.sets + 1,
    });
  });

  return [...subjects.entries()]
    .map(([subject, value]) => ({
      subject,
      color: value.color,
      cards: value.cards,
      progress: Math.round(value.progressSum / value.sets),
    }))
    .sort((first, second) => second.cards - first.cards);
}

export function ProgressView({ studySets }: { studySets: StudySet[] }) {
  const cards = studySets.flatMap((studySet) => studySet.cards);
  const mastered = cards.filter((card) => card.mastery === 3).length;
  const practiced = cards.filter((card) => card.mastery > 0).length;
  const review = cards.filter((card) => card.mastery < 2).length;
  const overall = getOverallProgress(studySets);
  const masteryCounts = [0, 1, 2, 3].map((level) => cards.filter((card) => card.mastery === level).length);
  const subjects = groupSubjects(studySets);
  const rankedSets = [...studySets].sort((first, second) => getSetProgress(second) - getSetProgress(first));
  const focusSets = [...studySets]
    .filter((studySet) => studySet.cards.some((card) => card.mastery < 2))
    .sort((first, second) => getSetProgress(first) - getSetProgress(second))
    .slice(0, 3);

  if (!cards.length) {
    return (
      <div className="view">
        <EmptyState
          icon={<TrendingUp size={32} />}
          title="Seu progresso aparecerá aqui"
          description="Depois que você estudar seus primeiros cards, suas estatísticas serão exibidas nesta tela."
        />
      </div>
    );
  }

  return (
    <div className="view progress-view">
      <div className="stats-grid">
        <StatCard icon={<Target size={23} />} value={`${overall}%`} label="Domínio geral" detail="Baseado nas suas respostas" tone="purple" />
        <StatCard icon={<BookOpenCheck size={23} />} value={mastered} label="Cards dominados" detail={`de ${cards.length} cards`} tone="cyan" />
        <StatCard icon={<RotateCcw size={23} />} value={review} label="Para revisar" detail="Revisão recomendada" tone="orange" />
        <StatCard icon={<Flame size={23} />} value={practiced} label="Cards praticados" detail="Com progresso salvo" tone="pink" />
      </div>

      <div className="progress-dashboard-grid">
        <section className="chart-card progress-ring-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PANORAMA</span>
              <h2>Domínio geral</h2>
            </div>
            <span className="trend"><TrendingUp size={16} /> Dados reais</span>
          </div>

          <div className="progress-ring-wrap">
            <div className="progress-ring" style={{ '--progress': `${overall}%` } as CSSProperties}>
              <div>
                <strong>{overall}%</strong>
                <span>concluído</span>
              </div>
            </div>
            <div className="progress-ring-notes">
              <strong>{practiced} de {cards.length}</strong>
              <span>cards já receberam alguma prática.</span>
              <small>{mastered} cards estão dominados no momento.</small>
            </div>
          </div>
        </section>

        <section className="chart-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">VISÃO GERAL</span>
              <h2>Distribuição de domínio</h2>
            </div>
          </div>
          <div className="mastery-chart">
            {masteryCounts.map((count, level) => (
              <div key={level}>
                <span>{masteryLabels[level]}</span>
                <div><i style={{ width: `${cards.length ? (count / cards.length) * 100 : 0}%` }} /></div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="progress-layout progress-layout--expanded">
        <section className="subject-progress">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DESEMPENHO</span>
              <h2>Por matéria</h2>
            </div>
          </div>
          <div className="subject-list subject-list--large">
            {subjects.map((subject) => (
              <div key={subject.subject}>
                <div>
                  <span className="subject-dot" style={{ background: subject.color }} />
                  <strong>{subject.subject}</strong>
                  <small>{subject.cards} cards</small>
                </div>
                <ProgressBar value={subject.progress} color={subject.color} />
              </div>
            ))}
          </div>
        </section>

        <section className="chart-card progress-bars-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CONJUNTOS</span>
              <h2>Ranking de avanço</h2>
            </div>
            <BarChart3 size={21} />
          </div>
          <div className="set-progress-list">
            {rankedSets.map((studySet) => {
              const setProgress = getSetProgress(studySet);
              return (
                <div key={studySet.id} className="set-progress-row">
                  <div>
                    <span style={{ background: studySet.color }} />
                    <strong>{studySet.title}</strong>
                    <small>{studySet.cards.length} cards</small>
                  </div>
                  <ProgressBar value={setProgress} color={studySet.color} />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="progress-focus-grid">
        <section className="chart-card progress-column-chart">
          <div className="section-heading">
            <div>
              <span className="eyebrow">VOLUME</span>
              <h2>Cards por matéria</h2>
            </div>
            <Layers3 size={21} />
          </div>
          <div className="subject-columns">
            {subjects.map((subject) => {
              const height = Math.max(12, Math.round((subject.cards / cards.length) * 100));
              return (
                <div key={subject.subject}>
                  <div><span style={{ height: `${height}%`, background: subject.color }} /></div>
                  <strong>{subject.cards}</strong>
                  <small>{subject.subject}</small>
                </div>
              );
            })}
          </div>
        </section>

        <section className="insight-card progress-focus-card">
          <span><BrainCircuit size={23} /></span>
          <div>
            <strong>Foco recomendado</strong>
            <p>Priorize os conjuntos com mais cards novos ou em revisão.</p>
            <div className="focus-list">
              {focusSets.length ? focusSets.map((studySet) => (
                <span key={studySet.id}>
                  <i style={{ background: studySet.color }} />
                  {studySet.title}
                  <strong>{getSetProgress(studySet)}%</strong>
                </span>
              )) : <small>Todos os conjuntos estão em bom ritmo.</small>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
