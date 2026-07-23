import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  GraduationCap,
  Languages,
  Layers3,
  LibraryBig,
  RotateCw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Logo } from '../logo/Logo';

type QuestionId = 'goal' | 'frequency' | 'learningStyle' | 'studyArea';

interface OnboardingOption {
  id: string;
  label: string;
  icon: ReactNode;
}

interface OnboardingQuestion {
  id: QuestionId;
  title: string;
  options: OnboardingOption[];
}

const APP_NAME = 'StudyFlow';

const questions: OnboardingQuestion[] = [
  {
    id: 'goal',
    title: 'Qual é o seu principal objetivo?',
    options: [
      { id: 'exams', label: 'Estudar para provas.', icon: <GraduationCap size={18} /> },
      { id: 'memorize', label: 'Memorizar conteúdos.', icon: <BrainCircuit size={18} /> },
      { id: 'learn', label: 'Aprender algo novo.', icon: <Sparkles size={18} /> },
      { id: 'organize', label: 'Organizar meus estudos.', icon: <LibraryBig size={18} /> },
      { id: 'review', label: 'Revisar conteúdos rapidamente.', icon: <RotateCw size={18} /> },
    ],
  },
  {
    id: 'frequency',
    title: 'Com que frequência você costuma estudar?',
    options: [
      { id: 'daily', label: 'Todos os dias.', icon: <CalendarDays size={18} /> },
      { id: 'weekly', label: 'Algumas vezes por semana.', icon: <CheckCircle2 size={18} /> },
      { id: 'before_exams', label: 'Somente antes das provas.', icon: <Target size={18} /> },
      { id: 'when_possible', label: 'Quando tenho tempo.', icon: <BookOpen size={18} /> },
      { id: 'starting', label: 'Estou começando agora.', icon: <Sparkles size={18} /> },
    ],
  },
  {
    id: 'learningStyle',
    title: 'Como você aprende melhor?',
    options: [
      { id: 'flashcards', label: 'Flashcards.', icon: <Layers3 size={18} /> },
      { id: 'qa', label: 'Perguntas e respostas.', icon: <BrainCircuit size={18} /> },
      { id: 'summaries', label: 'Resumos.', icon: <BookOpen size={18} /> },
      { id: 'quick_reviews', label: 'Revisões rápidas.', icon: <RotateCw size={18} /> },
      { id: 'mixed', label: 'Uma combinação de tudo.', icon: <Sparkles size={18} /> },
    ],
  },
  {
    id: 'studyArea',
    title: `O que você pretende estudar no ${APP_NAME}?`,
    options: [
      { id: 'school', label: 'Matérias escolares.', icon: <BookOpen size={18} /> },
      { id: 'college', label: 'Faculdade.', icon: <GraduationCap size={18} /> },
      { id: 'languages', label: 'Idiomas.', icon: <Languages size={18} /> },
      { id: 'public_exams', label: 'Concursos.', icon: <Trophy size={18} /> },
      { id: 'general', label: 'Conhecimentos gerais.', icon: <LibraryBig size={18} /> },
      { id: 'other', label: 'Outro.', icon: <Sparkles size={18} /> },
    ],
  },
];

interface OnboardingFlowProps {
  onComplete: () => Promise<void> | void;
  onBypass: () => void;
}

export function OnboardingFlow({ onComplete, onBypass }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, string>>>({});
  const [showCompletion, setShowCompletion] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const currentQuestion = questions[step];
  const selectedOptionId = currentQuestion ? answers[currentQuestion.id] : undefined;
  const progress = showCompletion ? 100 : Math.round(((step + 1) / questions.length) * 100);

  const focusableSelector = useMemo(() => [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(','), []);

  useEffect(() => {
    titleRef.current?.focus();
  }, [step, showCompletion]);

  useEffect(() => () => setAnswers({}), []);

  const complete = async () => {
    if (saving) return;

    setSaving(true);
    setError('');

    try {
      await onComplete();
      setAnswers({});
    } catch {
      setError('Não foi possível salvar a conclusão agora.');
      setSaving(false);
    }
  };

  const bypassAfterError = () => {
    setAnswers({});
    onBypass();
  };

  const confirmSkip = async () => {
    setSkipOpen(false);
    await complete();
  };

  const selectOption = (optionId: string) => {
    if (!currentQuestion) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: optionId }));
  };

  const continueFlow = () => {
    if (!currentQuestion || !selectedOptionId) return;

    if (step === questions.length - 1) {
      setShowCompletion(true);
      return;
    }

    setStep((current) => current + 1);
  };

  const goBack = () => {
    if (showCompletion) {
      setShowCompletion(false);
      return;
    }

    setStep((current) => Math.max(current - 1, 0));
  };

  const handleTrapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusableElements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div className="onboarding-backdrop onboarding-backdrop--questionnaire">
      <section ref={dialogRef} className="onboarding-card onboarding-card--questionnaire" role="dialog" aria-modal="true" aria-labelledby="onboarding-flow-title" onKeyDown={handleTrapFocus}>
        <header>
          <Logo compact />
          <span>{showCompletion ? 'Concluído' : `Etapa ${step + 1} de ${questions.length}`}</span>
          <button onClick={() => setSkipOpen(true)} aria-label="Pular onboarding">Pular</button>
        </header>

        <div className="step-track" aria-hidden="true">
          <span className="active" style={{ width: `${progress}%` }} />
        </div>

        {showCompletion ? (
          <OnboardingCompletion titleRef={titleRef} saving={saving} error={error} onComplete={() => void complete()} onBypass={bypassAfterError} />
        ) : (
          <OnboardingQuestionStep
            question={currentQuestion}
            selectedOptionId={selectedOptionId}
            titleRef={titleRef}
            onSelect={selectOption}
          />
        )}

        <footer>
          <button className="skip-button" onClick={() => setSkipOpen(true)} disabled={saving}>Pular por enquanto</button>
          <div>
            {(step > 0 || showCompletion) && <Button variant="ghost" icon={<ArrowLeft size={17} />} onClick={goBack} disabled={saving}>Voltar</Button>}
            {showCompletion ? (
              <Button loading={saving} icon={<CheckCircle2 size={17} />} onClick={() => void complete()}>Começar a estudar</Button>
            ) : (
              <Button icon={<ArrowRight size={17} />} onClick={continueFlow} disabled={!selectedOptionId}>Continuar</Button>
            )}
          </div>
        </footer>
      </section>

      <Modal open={skipOpen} onClose={() => setSkipOpen(false)} title="Pular configuração" description={`Você pode começar agora e explorar o ${APP_NAME} por conta própria.`} className="modal--skip-onboarding">
        <div className="skip-onboarding-dialog">
          <Button variant="secondary" onClick={() => setSkipOpen(false)}>Continuar configuração</Button>
          <Button loading={saving} onClick={() => void confirmSkip()}>Pular</Button>
        </div>
      </Modal>
    </div>
  );
}

function OnboardingQuestionStep({
  question,
  selectedOptionId,
  titleRef,
  onSelect,
}: {
  question: OnboardingQuestion;
  selectedOptionId?: string;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="onboarding-content onboarding-content--questionnaire" key={question.id}>
      <span className="eyebrow">Vamos preparar sua experiência</span>
      <h2 ref={titleRef} id="onboarding-flow-title" tabIndex={-1}>{question.title}</h2>
      <p>Conte um pouco sobre seus estudos. Isso nos ajuda a apresentar o aplicativo da melhor forma para você.</p>
      <fieldset className="onboarding-options">
        <legend className="sr-only">{question.title}</legend>
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={selected ? 'onboarding-option selected' : 'onboarding-option'}
              aria-pressed={selected}
              onClick={() => onSelect(option.id)}
            >
              <span>{option.icon}</span>
              <strong>{option.label}</strong>
              {selected && <Check size={17} aria-hidden="true" />}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}

function OnboardingCompletion({
  titleRef,
  saving,
  error,
  onComplete,
  onBypass,
}: {
  titleRef: RefObject<HTMLHeadingElement | null>;
  saving: boolean;
  error: string;
  onComplete: () => void;
  onBypass: () => void;
}) {
  return (
    <div className="onboarding-content onboarding-content--questionnaire onboarding-content--complete">
      <div className="onboarding-illustration">
        <span className="orb orb--one" />
        <span className="orb orb--two" />
        <CheckCircle2 size={44} />
      </div>
      <span className="eyebrow">Pronto para começar</span>
      <h2 ref={titleRef} id="onboarding-flow-title" tabIndex={-1}>Tudo pronto!</h2>
      <p>Seu espaço de estudos está preparado. Agora você já pode criar seu primeiro conjunto e começar a revisar.</p>
      {error && (
        <div className="onboarding-error" role="alert">
          <span>{error}</span>
          <div>
            <Button loading={saving} onClick={onComplete}>Tentar novamente</Button>
            <Button variant="secondary" onClick={onBypass}>Ir para o painel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
