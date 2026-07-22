import { Atom, BookOpenText, Calculator, Languages, MoreHorizontal, Play, ScrollText } from 'lucide-react';
import type { StudySet } from '../../types';
import { getSetProgress } from '../../utils/study';
import { ProgressBar } from '../ui/ProgressBar';

const icons = { language: Languages, biology: Atom, history: ScrollText, math: Calculator, general: BookOpenText };

export function StudySetCard({ studySet, onStudy }: { studySet: StudySet; onStudy: (studySet: StudySet) => void }) {
  const Icon = icons[studySet.icon];
  const progress = getSetProgress(studySet);
  return (
    <article className="set-card" style={{ '--set-color': studySet.color } as React.CSSProperties}>
      <div className="set-card__top">
        <span className="set-card__icon"><Icon size={23} /></span>
        <button className="icon-button icon-button--small" aria-label={`Opções de ${studySet.title}`}><MoreHorizontal size={19} /></button>
      </div>
      <div className="set-card__content"><span>{studySet.subject}</span><h3>{studySet.title}</h3><p>{studySet.cards.length} termos</p></div>
      <ProgressBar value={progress} color={studySet.color} />
      <div className="set-card__footer"><span>{progress}% concluído</span><button onClick={() => onStudy(studySet)}>Estudar <Play size={15} fill="currentColor" /></button></div>
    </article>
  );
}
