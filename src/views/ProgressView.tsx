import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  Flame,
  Layers3,
  RotateCcw,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { StatCard } from '../components/cards/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { StudySet } from '../types';
import { getOverallProgress, getSetProgress } from '../utils/study';

const masteryLabels = ['Esquecidos', 'Ainda aprendendo', 'Próximos da revisão', 'Dominados'];
const weekLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

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

function getMonday(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function getWeekActivity(cards: StudySet['cards']) {
  const monday = getMonday(new Date());

  return weekLabels.map((label, index) => {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + index);
    const activityCount = cards.filter((card) => {
      if (!card.lastReviewedAt) return false;
      const reviewedAt = new Date(card.lastReviewedAt);
      return reviewedAt.toDateString() === currentDay.toDateString();
    }).length;

    return { label, activityCount };
  });
}

function getDomainTimeline(cards: StudySet['cards']) {
  const points = new Map<string, { label: string; timestamp: number; totalMastery: number; totalCards: number }>();

  cards.forEach((card) => {
    if (!card.lastReviewedAt) return;

    const reviewedAt = new Date(card.lastReviewedAt);
    if (Number.isNaN(reviewedAt.getTime())) return;

    const weekStart = getMonday(reviewedAt);
    const key = weekStart.toISOString();
    const label = `Semana de ${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
    const current = points.get(key);

    if (!current) {
      points.set(key, {
        label,
        timestamp: weekStart.getTime(),
        totalMastery: card.mastery,
        totalCards: 1,
      });
      return;
    }

    points.set(key, {
      ...current,
      totalMastery: current.totalMastery + card.mastery,
      totalCards: current.totalCards + 1,
    });
  });

  return [...points.values()]
    .sort((firstPoint, secondPoint) => firstPoint.timestamp - secondPoint.timestamp)
    .map((point) => ({
      label: point.label,
      progress: Math.round((point.totalMastery / (point.totalCards * 3)) * 100),
    }));
}

export function ProgressView({ studySets }: { studySets: StudySet[] }) {
  const cards = studySets.flatMap((studySet) => studySet.cards);
  const mastered = cards.filter((card) => card.mastery === 3).length;
  const practiced = cards.filter((card) => card.mastery > 0).length;
  const forgotten = cards.filter((card) => card.mastery === 0).length;
  const learning = cards.filter((card) => card.mastery === 1).length;
  const almost = cards.filter((card) => card.mastery === 2).length;
  const review = forgotten + learning + almost;
  const reviewedCards = cards.filter((card) => (card.timesSeen ?? 0) > 0);
  const overall = getOverallProgress(studySets);
  const masteryCounts = [0, 1, 2, 3].map((level) => cards.filter((card) => card.mastery === level).length);
  const subjects = groupSubjects(studySets);
  const weekActivity = getWeekActivity(cards);
  const domainTimeline = getDomainTimeline(cards);
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
        <StatCard icon={<RotateCcw size={23} />} value={review} label="cards para revisar" detail={`${forgotten} esquecidos · ${learning} ainda aprendendo · ${almost} próximos da revisão`} tone="orange" />
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

        <section className="chart-card activity-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ATIVIDADE</span>
              <h2>Últimos 7 dias</h2>
            </div>
            <CalendarDays size={21} />
          </div>
          <div className="weekly-activity" aria-label="Atividade dos últimos 7 dias">
            {weekActivity.map((day) => (
              <div key={day.label} className={day.activityCount ? 'active' : ''}>
                <span>{day.label}</span>
                <strong>{day.activityCount}</strong>
              </div>
            ))}
          </div>
          <div className="activity-summary">
            <div><strong>{reviewedCards.length}</strong><span>Cards revisados</span></div>
            <div><strong>{mastered}</strong><span>Cards dominados</span></div>
            <div><strong>—</strong><span>Minutos estudados</span><small>Tempo ainda não registrado</small></div>
          </div>
        </section>
      </div>

      <div className="progress-dashboard-grid">
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

        <section className="chart-card domain-timeline-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EVOLUÇÃO</span>
              <h2>Evolução do domínio</h2>
            </div>
            <TrendingUp size={21} />
          </div>
          {domainTimeline.length ? (
            <div className="domain-timeline">
              {domainTimeline.map((point) => (
                <div key={point.label}>
                  <span>{point.label}</span>
                  <div><i style={{ width: `${point.progress}%` }} /></div>
                  <strong>{point.progress}%</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="progress-empty-note">
              <Timer size={22} />
              <strong>Histórico temporal ainda não disponível</strong>
              <span>Depois das próximas revisões, a evolução por semana aparecerá aqui.</span>
            </div>
          )}
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
        <section className="chart-card progress-subject-learning-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">APRENDIZADO</span>
              <h2>Evolução por matéria</h2>
            </div>
            <Layers3 size={21} />
          </div>
          <p className="learning-chart-note">Mostra quanto você já avançou em cada matéria com base nas respostas dos flashcards.</p>
          <div className="subject-learning-list">
            {subjects.map((subject) => (
              <div key={subject.subject}>
                <div>
                  <span className="subject-dot" style={{ background: subject.color }} />
                  <strong>{subject.subject}</strong>
                  <small>{subject.progress}% aprendido</small>
                </div>
                <div className="subject-learning-track" aria-label={`${subject.subject}: ${subject.progress}% aprendido`}>
                  <span style={{ width: `${subject.progress}%`, background: subject.color }} />
                </div>
              </div>
            ))}
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
