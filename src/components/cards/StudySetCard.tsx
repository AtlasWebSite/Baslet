import { Atom, BookOpenText, Calculator, Crown, Languages, MoreHorizontal, Play, ScrollText } from 'lucide-react';
import type { StudySet } from '../../types';
import { getSetProgress } from '../../utils/study';
import { ProgressBar } from '../ui/ProgressBar';

const icons = { language: Languages, biology: Atom, history: ScrollText, math: Calculator, general: BookOpenText };

export function StudySetCard({ studySet, onStudy, isPremium = true }: { studySet: StudySet; onStudy: (studySet: StudySet) => void; isPremium?: boolean }) {
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
      <div className="set-card__footer"><span>{progress}% concluído</span><button className={!isPremium ? 'premium-action-inline' : undefined} onClick={() => onStudy(studySet)}>{isPremium ? 'Estudar' : 'Premium'} {isPremium ? <Play size={15} fill="currentColor" /> : <Crown size={14} />}</button></div>
    </article>
  );
}
