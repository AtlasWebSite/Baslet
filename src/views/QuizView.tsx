import { Check, CheckCircle2, CircleX, Layers3, PartyPopper, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { StudySet } from '../types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { saveQuizResult } from '../services/quizService';

type AnswerState = { selected: string; correct: boolean } | undefined;

function createQuestions(studySet?: StudySet) {
  const cards = studySet?.cards ?? [];
  if (!cards.length) return [];

  return cards.slice(0, 5).map((card, index) => {
    const distractors = cards
      .filter((candidate) => candidate.id !== card.id)
      .slice(index, index + 3)
      .map((candidate) => candidate.definition);

    while (distractors.length < 3 && cards.length > 1) {
      distractors.push(cards[(index + distractors.length + 1) % cards.length].definition);
    }

    return {
      id: card.id,
      term: card.term,
      answer: card.definition,
      options: [card.definition, ...distractors].sort((first, second) => first.localeCompare(second)),
    };
  });
}

export function QuizView({ studySets, userId, isPremium, onRequirePremium, onError }: { studySets: StudySet[]; userId: string; isPremium: boolean; onRequirePremium: (message?: string) => void; onError: (message: string) => void }) {
  const setsWithCards = useMemo(() => studySets.filter((studySet) => studySet.cards.length > 0), [studySets]);
  const [selectedSetId, setSelectedSetId] = useState(() => setsWithCards[0]?.id ?? '');
  const selectedSet = setsWithCards.find((studySet) => studySet.id === selectedSetId) ?? setsWithCards[0];
  const questions = useMemo(() => createQuestions(selectedSet), [selectedSet]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<AnswerState>();
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (selectedSetId || !setsWithCards[0]) return;
    setSelectedSetId(setsWithCards[0].id);
  }, [selectedSetId, setsWithCards]);

  const restart = () => {
    setCurrent(0);
    setScore(0);
    setAnswer(undefined);
    setFinished(false);
  };

  const changeSet = (studySetId: string) => {
    setSelectedSetId(studySetId);
    restart();
  };

  if (!setsWithCards.length) {
    return <div className="view"><EmptyState icon={<CircleX size={32} />} title="Teste indisponível" description="Crie um conjunto com flashcards para gerar seu primeiro teste." /></div>;
  }

  if (!isPremium) {
    return (
      <div className="view quiz-view">
        <QuizSetSelector studySets={setsWithCards} selectedSetId={selectedSetId || setsWithCards[0].id} onChange={changeSet} />
        <EmptyState
          icon={<Sparkles size={32} />}
          title="Testes completos são Premium"
          description="Você pode ver os conteúdos disponíveis, mas precisa assinar para responder testes e salvar resultados."
          action={<Button onClick={() => onRequirePremium('Assine para liberar testes completos e salvar seus resultados.')}>Assinar para testar</Button>}
        />
      </div>
    );
  }

  if (!questions.length || !selectedSet) {
    return (
      <div className="view quiz-view">
        <QuizSetSelector studySets={setsWithCards} selectedSetId={selectedSetId} onChange={changeSet} />
        <EmptyState icon={<Layers3 size={32} />} title="Escolha outro conteúdo" description="Este conjunto ainda não tem cards suficientes para gerar um teste." />
      </div>
    );
  }

  const question = questions[current];

  const select = (option: string) => {
    if (answer) return;

    const correct = option === question.answer;
    setAnswer({ selected: option, correct });
    if (correct) setScore((value) => value + 1);
  };

  const next = () => {
    if (current !== questions.length - 1) {
      setCurrent((value) => value + 1);
      setAnswer(undefined);
      return;
    }

    setFinished(true);
    const finalScore = score;
    if (!isPremium) {
      onRequirePremium('Você pode fazer o teste de demonstração, mas precisa assinar para salvar resultados e progresso.');
      return;
    }

    void saveQuizResult(userId, selectedSet.id, finalScore, questions.length).catch((reason: Error) => onError(reason.message));
  };

  if (finished) {
    return (
      <div className="view quiz-view">
        <QuizSetSelector studySets={setsWithCards} selectedSetId={selectedSet.id} onChange={changeSet} />
        <section className="quiz-result">
          <span><PartyPopper size={34} /></span>
          <small>TESTE CONCLUÍDO · {selectedSet.title}</small>
          <h2>{score >= Math.ceil(questions.length * 0.8) ? 'Mandou muito bem!' : 'Um ótimo ponto de partida!'}</h2>
          <p>Você acertou <strong>{score} de {questions.length}</strong> perguntas.</p>
          <div className="score-ring"><strong>{Math.round(score / questions.length * 100)}%</strong><span>de acerto</span></div>
          <Button icon={<RotateCcw size={18} />} onClick={restart}>Refazer teste</Button>
        </section>
      </div>
    );
  }

  return (
    <div className="view quiz-view">
      <QuizSetSelector studySets={setsWithCards} selectedSetId={selectedSet.id} onChange={changeSet} />
      <div className="quiz-shell">
        <div className="quiz-header">
          <div><span>{selectedSet.title} · Questão {current + 1} de {questions.length}</span><strong>{score} acertos</strong></div>
          <div className="session-progress"><span style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
        </div>
        <div className="quiz-question">
          <span className="eyebrow">ESCOLHA A DEFINIÇÃO CORRETA</span>
          <h2>O que significa “{question.term}”?</h2>
          <div className="options-list">{question.options.map((option, index) => {
            const isCorrect = answer && option === question.answer;
            const isWrong = answer && option === answer.selected && !answer.correct;
            return <button key={`${option}-${index}`} onClick={() => select(option)} className={isCorrect ? 'correct' : isWrong ? 'wrong' : ''} disabled={Boolean(answer)}><span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong>{isCorrect && <CheckCircle2 size={20} />}{isWrong && <CircleX size={20} />}</button>;
          })}</div>
        </div>
        <div className="quiz-footer"><p className={answer?.correct ? 'success-text' : answer ? 'error-text' : ''}>{answer?.correct ? <><Check size={17} /> Resposta certa!</> : answer ? `A resposta correta é: ${question.answer}` : 'Selecione uma alternativa para continuar.'}</p><Button onClick={next} disabled={!answer}>{current === questions.length - 1 ? 'Ver resultado' : 'Próxima questão'}</Button></div>
      </div>
    </div>
  );
}

function QuizSetSelector({ studySets, selectedSetId, onChange }: { studySets: StudySet[]; selectedSetId: string; onChange: (studySetId: string) => void }) {
  const selectedSet = studySets.find((studySet) => studySet.id === selectedSetId) ?? studySets[0];

  return (
    <section className="quiz-set-selector">
      <span><Shuffle size={21} /></span>
      <div>
        <small>CONTEÚDO DO TESTE</small>
        <strong>{selectedSet?.title ?? 'Selecione um conteúdo'}</strong>
      </div>
      <label>
        <span>Escolher outro conteúdo</span>
        <select value={selectedSetId} onChange={(event) => onChange(event.target.value)}>
          {studySets.map((studySet) => <option key={studySet.id} value={studySet.id}>{studySet.title} · {studySet.cards.length} cards</option>)}
        </select>
      </label>
    </section>
  );
}
