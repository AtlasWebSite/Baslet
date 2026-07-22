import { Check, CheckCircle2, CircleX, PartyPopper, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { StudySet } from '../types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { saveQuizResult } from '../services/quizService';

type AnswerState = { selected: string; correct: boolean } | undefined;

export function QuizView({ studySets, userId, onError }: { studySets: StudySet[]; userId: string; onError: (message: string) => void }) {
  const questions = useMemo(() => {
    const cards = studySets[0]?.cards ?? [];
    return cards.slice(0, 5).map((card, index) => {
      const distractors = cards.filter((candidate) => candidate.id !== card.id).slice(index, index + 3).map((candidate) => candidate.definition);
      while (distractors.length < 3 && cards.length > 1) distractors.push(cards[(index + distractors.length + 1) % cards.length].definition);
      return { id: card.id, term: card.term, answer: card.definition, options: [card.definition, ...distractors].sort((a, b) => a.localeCompare(b)) };
    });
  }, [studySets]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<AnswerState>();
  const [finished, setFinished] = useState(false);

  if (!questions.length) return <div className="view"><EmptyState icon={<CircleX size={32} />} title="Teste indisponível" description="Crie um conjunto com flashcards para gerar seu primeiro teste." /></div>;
  const question = questions[current];
  const select = (option: string) => {
    if (answer) return;
    const correct = option === question.answer;
    setAnswer({ selected: option, correct });
    if (correct) setScore((value) => value + 1);
  };
  const next = () => {
    if (current === questions.length - 1) { setFinished(true); const finalScore = score; const setId = studySets[0]?.id; if (setId) void saveQuizResult(userId, setId, finalScore, questions.length).catch((reason: Error) => onError(reason.message)); return; }
    setCurrent((value) => value + 1); setAnswer(undefined);
  };
  const restart = () => { setCurrent(0); setScore(0); setAnswer(undefined); setFinished(false); };

  if (finished) return <div className="view quiz-result"><span><PartyPopper size={34} /></span><small>TESTE CONCLUÍDO</small><h2>{score >= 4 ? 'Mandou muito bem!' : 'Um ótimo ponto de partida!'}</h2><p>Você acertou <strong>{score} de {questions.length}</strong> perguntas.</p><div className="score-ring"><strong>{Math.round(score / questions.length * 100)}%</strong><span>de acerto</span></div><Button icon={<RotateCcw size={18} />} onClick={restart}>Refazer teste</Button></div>;
  return (
    <div className="view quiz-view">
      <div className="quiz-shell"><div className="quiz-header"><div><span>Questão {current + 1} de {questions.length}</span><strong>{score} acertos</strong></div><div className="session-progress"><span style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div></div>
        <div className="quiz-question"><span className="eyebrow">ESCOLHA A DEFINIÇÃO CORRETA</span><h2>O que significa “{question.term}”?</h2><div className="options-list">{question.options.map((option, index) => {
          const isCorrect = answer && option === question.answer;
          const isWrong = answer && option === answer.selected && !answer.correct;
          return <button key={`${option}-${index}`} onClick={() => select(option)} className={isCorrect ? 'correct' : isWrong ? 'wrong' : ''} disabled={Boolean(answer)}><span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong>{isCorrect && <CheckCircle2 size={20} />}{isWrong && <CircleX size={20} />}</button>;
        })}</div></div>
        <div className="quiz-footer"><p className={answer?.correct ? 'success-text' : answer ? 'error-text' : ''}>{answer?.correct ? <><Check size={17} /> Resposta certa!</> : answer ? `A resposta correta é: ${question.answer}` : 'Selecione uma alternativa para continuar.'}</p><Button onClick={next} disabled={!answer}>{current === questions.length - 1 ? 'Ver resultado' : 'Próxima questão'}</Button></div>
      </div>
    </div>
  );
}
