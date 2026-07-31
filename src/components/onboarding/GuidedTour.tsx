import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Eye, HelpCircle, LayoutDashboard, Map, MousePointerClick, Play, Sparkles, X } from 'lucide-react';
import type { ViewId } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';
type TourAdvanceMode = 'button' | 'action';

interface TourStep {
  id: string;
  view: ViewId;
  target: string;
  title: string;
  description: string;
  placement?: TourPlacement;
  actionHint?: string;
  advanceMode?: TourAdvanceMode;
  interactionSelector?: string;
  highlightAllTargets?: boolean;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuidedTourProps {
  active: boolean;
  onNavigate: (view: ViewId) => void;
  onPrepareStep?: (stepId: string, view: ViewId) => void;
  onComplete: () => Promise<void> | void;
  onSkip: () => Promise<void> | void;
}

const tourSteps: TourStep[] = [
  {
    id: 'navigation',
    view: 'home',
    target: '[data-tour="main-navigation"]',
    title: 'Este é seu menu de estudos',
    description: 'Use as abas para trocar entre início, estudos, flashcards, mapas mentais, testes, progresso e perfil sem sair do app.',
    placement: 'right',
  },
  {
    id: 'study-set',
    view: 'studies',
    target: '[data-tour="study-set-card"]',
    title: 'Aqui ficam seus conjuntos',
    description: 'Cada card representa um conjunto de flashcards. Os conteúdos iniciais ajudam você a testar o StudyFlow rapidamente.',
    placement: 'bottom',
  },
  {
    id: 'open-flashcard',
    view: 'studies',
    target: '[data-tour="study-set-study-button"]',
    title: 'Abra uma sessão de estudo',
    description: 'Clique em Estudar para abrir o primeiro flashcard do conjunto destacado.',
    placement: 'top',
    actionHint: 'Observe onde fica o botão Estudar. No tour, use Próximo para abrir a demonstração.',
  },
  {
    id: 'flip-card',
    view: 'flashcards',
    target: '[data-tour="flashcard-card"]',
    title: 'Vire o flashcard',
    description: 'Primeiro leia o termo, tente lembrar a resposta e depois vire o card para conferir a definição.',
    placement: 'bottom',
    actionHint: 'Clique no card para visualizar a resposta.',
    advanceMode: 'action',
    interactionSelector: '[data-tour="flashcard-card"]',
  },
  {
    id: 'next-card',
    view: 'flashcards',
    target: '[data-tour="flashcard-next"]',
    title: 'Avance para o próximo card',
    description: 'Use os controles para trocar de flashcard e manter sua revisão fluindo.',
    placement: 'left',
    actionHint: 'Clique na seta para ir ao próximo flashcard.',
    advanceMode: 'action',
    interactionSelector: '[data-tour="flashcard-next"]',
  },
  {
    id: 'flashcard-progress',
    view: 'flashcards',
    target: '[data-tour="flashcard-progress"]',
    title: 'Acompanhe seu avanço',
    description: 'Esta barra mostra quanto da sessão atual você já percorreu dentro do conjunto escolhido.',
    placement: 'bottom',
  },
  {
    id: 'quiz-area',
    view: 'quiz',
    target: '[data-tour="quiz-selector"]',
    title: 'Testes para revisar melhor',
    description: 'Na aba de testes, você escolhe o conteúdo e responde perguntas criadas a partir dos seus flashcards.',
    placement: 'bottom',
  },
  {
    id: 'answer-quiz',
    view: 'quiz',
    target: '[data-tour="quiz-answer"]',
    title: 'Responda uma questão',
    description: 'Escolha uma alternativa para ver o feedback imediato de acerto ou erro.',
    placement: 'bottom',
    actionHint: 'Clique em uma alternativa para continuar.',
    advanceMode: 'action',
    interactionSelector: '[data-tour="quiz-answer"]',
    highlightAllTargets: true,
  },
  {
    id: 'quiz-progress',
    view: 'quiz',
    target: '[data-tour="quiz-progress"]',
    title: 'Progresso do teste',
    description: 'A barra indica em qual parte do teste você está e ajuda a manter a revisão organizada.',
    placement: 'bottom',
  },
  {
    id: 'mindmap-source',
    view: 'mindmaps',
    target: '[data-tour="mindmap-selector"]',
    title: 'Transforme cards em mapas',
    description: 'Escolha um conjunto de flashcards para gerar um mapa mental com conceitos, categorias e conexões.',
    placement: 'bottom',
  },
  {
    id: 'mindmap-canvas',
    view: 'mindmaps',
    target: '[data-tour="mindmap-canvas"]',
    title: 'Visualize o mapa mental',
    description: 'O mapa organiza o conteúdo em blocos visuais. Você pode navegar, abrir detalhes e entender melhor as relações.',
    placement: 'top',
  },
  {
    id: 'mindmap-controls',
    view: 'mindmaps',
    target: '[data-tour="mindmap-toolbar"]',
    title: 'Controles do mapa',
    description: 'Use zoom, centralização, modo resumo e modo completo para ajustar a visualização do mapa mental.',
    placement: 'bottom',
  },
  {
    id: 'create-content',
    view: 'home',
    target: '[data-tour="create-study-set"]',
    title: 'Crie seus próprios materiais',
    description: 'Quando quiser, use este botão para criar seus conjuntos, estudar com flashcards e gerar novos mapas mentais.',
    placement: 'bottom',
  },
];

const stepIcons = [LayoutDashboard, Compass, Play, MousePointerClick, ArrowRight, Sparkles, HelpCircle, CheckCircle2, Eye, Map, Map, Sparkles, CheckCircle2];

function isVisibleElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function getVisibleTargets(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(isVisibleElement);
}

function getVisibleTarget(selector: string) {
  return getVisibleTargets(selector)[0];
}

function uniqueElements(elements: HTMLElement[]) {
  return Array.from(new Set(elements));
}

/**
 * A etapa 8 precisa permitir que o usuário escolha qualquer alternativa.
 * Em algumas telas apenas a alternativa A recebe data-tour="quiz-answer".
 * Nesse caso usamos A como âncora e encontramos os botões irmãos com o
 * mesmo tamanho/alinhamento, normalmente A, B, C e D.
 */
function getQuizAnswerTargets(selector: string) {
  const explicitTargets = getVisibleTargets(selector);
  if (!explicitTargets.length) return [];

  const explicitButtons = uniqueElements(
    explicitTargets.map((element) => element.closest<HTMLElement>('button, [role="button"]') ?? element),
  ).filter(isVisibleElement);

  if (explicitButtons.length > 1) return explicitButtons;

  const anchor = explicitButtons[0];
  if (!anchor) return explicitTargets;

  const anchorRect = anchor.getBoundingClientRect();
  let container = anchor.parentElement;

  for (let depth = 0; depth < 5 && container; depth += 1) {
    const candidates = Array.from(container.querySelectorAll<HTMLElement>('button, [role="button"]'))
      .filter(isVisibleElement)
      .filter((element) => !element.closest('.guided-tour-card, .modal'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const leftTolerance = Math.max(24, anchorRect.width * 0.08);
        const sameColumn = Math.abs(rect.left - anchorRect.left) <= leftTolerance;
        const similarWidth = rect.width >= anchorRect.width * 0.82 && rect.width <= anchorRect.width * 1.18;
        const similarHeight = rect.height >= anchorRect.height * 0.55 && rect.height <= anchorRect.height * 1.8;

        return sameColumn && similarWidth && similarHeight;
      });

    // Um quiz normal tem de 2 a 6 alternativas. Isso evita capturar botões
    // de navegação como “Próxima questão” quando subimos demais no DOM.
    if (candidates.length >= 2 && candidates.length <= 6) {
      return candidates;
    }

    container = container.parentElement;
  }

  return explicitButtons;
}

function getTargetsForStep(step: TourStep) {
  if (step.id === 'answer-quiz') {
    return getQuizAnswerTargets(step.target);
  }

  if (step.highlightAllTargets) {
    return getVisibleTargets(step.target);
  }

  const target = getVisibleTarget(step.target);
  return target ? [target] : [];
}

function getHighlightRect(element: HTMLElement): HighlightRect {
  return getHighlightRectForElements([element]);
}

function getHighlightRectForElements(elements: HTMLElement[]): HighlightRect {
  const padding = 10;
  const rects = elements.map((element) => element.getBoundingClientRect());
  const top = Math.min(...rects.map((rect) => rect.top));
  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  const boundedTop = Math.max(8, top - padding);
  const boundedLeft = Math.max(8, left - padding);
  const boundedRight = Math.min(window.innerWidth - 8, right + padding);
  const boundedBottom = Math.min(window.innerHeight - 8, bottom + padding);

  return {
    top: boundedTop,
    left: boundedLeft,
    width: Math.max(0, boundedRight - boundedLeft),
    height: Math.max(0, boundedBottom - boundedTop),
  };
}

function getCardPosition(rect: HighlightRect | undefined, placement: TourPlacement) {
  const cardWidth = Math.min(360, window.innerWidth - 28);
  const cardHeight = 300;
  const gap = 24;
  const margin = 14;

  if (!rect || placement === 'center') {
    return {
      top: Math.max(margin, (window.innerHeight - cardHeight) / 2),
      left: Math.max(margin, (window.innerWidth - cardWidth) / 2),
      placement: 'center' as TourPlacement,
    };
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const positions: Record<TourPlacement, { top: number; left: number }> = {
    bottom: { top: rect.top + rect.height + gap, left: centerX - cardWidth / 2 },
    top: { top: rect.top - cardHeight - gap, left: centerX - cardWidth / 2 },
    right: { top: centerY - cardHeight / 2, left: rect.left + rect.width + gap },
    left: { top: centerY - cardHeight / 2, left: rect.left - cardWidth - gap },
    center: { top: (window.innerHeight - cardHeight) / 2, left: (window.innerWidth - cardWidth) / 2 },
  };

  const wouldFit = ({ top, left }: { top: number; left: number }) => (
    top >= margin &&
    left >= margin &&
    top + cardHeight <= window.innerHeight - margin &&
    left + cardWidth <= window.innerWidth - margin
  );

  const wouldOverlapTarget = ({ top, left }: { top: number; left: number }) => {
    const card = { top, left, right: left + cardWidth, bottom: top + cardHeight };
    const target = {
      top: rect.top - gap / 2,
      left: rect.left - gap / 2,
      right: rect.left + rect.width + gap / 2,
      bottom: rect.top + rect.height + gap / 2,
    };

    return card.left < target.right && card.right > target.left && card.top < target.bottom && card.bottom > target.top;
  };

  const candidates = [placement, 'bottom', 'top', 'right', 'left', 'center'].filter((value, index, list) => list.indexOf(value) === index) as TourPlacement[];
  const availablePlacement = candidates.find((candidate) => wouldFit(positions[candidate]) && !wouldOverlapTarget(positions[candidate]));
  const preferred = positions[availablePlacement ?? placement];

  return {
    top: Math.min(Math.max(margin, preferred.top), window.innerHeight - cardHeight - margin),
    left: Math.min(Math.max(margin, preferred.left), window.innerWidth - cardWidth - margin),
    placement: availablePlacement ?? placement,
  };
}

export function GuidedTour({ active, onNavigate, onPrepareStep, onComplete, onSkip }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect>();
  const [interactionDone, setInteractionDone] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const activeStepIdRef = useRef('');
  const nextGestureRef = useRef(0);
  const consumedNextGestureRef = useRef<number | null>(null);
  const onNavigateRef = useRef(onNavigate);
  const onPrepareStepRef = useRef(onPrepareStep);
  const step = tourSteps[stepIndex];
  const Icon = stepIcons[stepIndex] ?? Sparkles;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tourSteps.length - 1;
  const advanceMode = step.advanceMode ?? 'button';
  const canUseNextButton = advanceMode === 'button';
  const canContinue = canUseNextButton && !isSaving;

  useEffect(() => {
    onNavigateRef.current = onNavigate;
    onPrepareStepRef.current = onPrepareStep;
  }, [onNavigate, onPrepareStep]);

  useEffect(() => {
    activeStepIdRef.current = step.id;
  }, [step.id]);


  const complete = useCallback(async (callback: () => Promise<void> | void) => {
    setIsSaving(true);
    try {
      await callback();
    } finally {
      setIsSaving(false);
    }
  }, []);

  const nextStep = useCallback((gestureId?: number) => {
    if (gestureId !== undefined) {
      if (consumedNextGestureRef.current === gestureId) return;
      consumedNextGestureRef.current = gestureId;
    }

    if (stepIndex >= tourSteps.length - 1) {
      void complete(onComplete);
      return;
    }

    // Remove o destaque da etapa atual no mesmo gesto que troca o índice.
    // Isso impede que a próxima etapa seja renderizada usando o retângulo anterior.
    setHighlight(undefined);

    setStepIndex((current) => {
      if (current !== stepIndex) return current;
      if (current >= tourSteps.length - 1) return current;
      return current + 1;
    });
  }, [complete, onComplete, stepIndex]);

  const retreatTour = useCallback(() => {
    if (stepIndex <= 0) return;

    setHighlight(undefined);

    setStepIndex((current) => {
      if (current !== stepIndex) return current;
      return Math.max(current - 1, 0);
    });
  }, [stepIndex]);

  const refreshHighlight = useCallback(() => {
    const stepId = step.id;
    const targets = getTargetsForStep(step);

    if (!targets.length) {
      if (activeStepIdRef.current === stepId) setHighlight(undefined);
      return;
    }

    targets[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });

    window.setTimeout(() => {
      // Um timeout iniciado por uma etapa antiga nunca pode atualizar a etapa atual.
      if (activeStepIdRef.current !== stepId) return;

      const currentTargets = getTargetsForStep(step).filter((target) => target.isConnected);
      if (!currentTargets.length) return;

      // Na etapa 8 o retângulo envolve todas as alternativas encontradas.
      const shouldGroupTargets = step.id === 'answer-quiz' || step.highlightAllTargets;
      setHighlight(
        shouldGroupTargets
          ? getHighlightRectForElements(currentTargets)
          : getHighlightRect(currentTargets[0]),
      );
    }, 180);
  }, [step]);

  useEffect(() => {
    if (!active) return;
    onPrepareStepRef.current?.(step.id, step.view);
    onNavigateRef.current(step.view);
    setInteractionDone(false);
    setHighlight(undefined);

    const timers = [180, 460, 820].map((delay) => window.setTimeout(refreshHighlight, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [active, refreshHighlight, step.id, step.view]);

  useLayoutEffect(() => {
    if (!active) return;
    refreshHighlight();
    titleRef.current?.focus();

    const update = () => refreshHighlight();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, refreshHighlight]);

  useEffect(() => {
    if (!active || advanceMode !== 'action' || !step.interactionSelector) return;

    // Salva o seletor em uma constante local após a validação.
    // Assim o TypeScript sabe que ele é sempre `string` dentro do callback.
    const interactionSelector = step.interactionSelector;

    const trackInteraction = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.guided-tour-card, .modal')) return;

      if (step.id === 'answer-quiz') {
        const quizAnswers = getQuizAnswerTargets(interactionSelector);
        const clickedAnswer = quizAnswers.some((answer) => answer === target || answer.contains(target));
        if (!clickedAnswer) return;
      } else if (!target.closest(interactionSelector)) {
        return;
      }

      setInteractionDone(true);
      nextStep();
    };

    document.addEventListener('click', trackInteraction, true);
    return () => document.removeEventListener('click', trackInteraction, true);
  }, [active, advanceMode, nextStep, step]);

  const beginPointerGesture = () => {
    nextGestureRef.current += 1;
  };

  const beginKeyboardGesture = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    nextGestureRef.current += 1;
  };

  const goNext = (event?: ReactMouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!canContinue) return;
    nextStep(nextGestureRef.current);
  };

  const goBack = (event?: ReactMouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (isFirst) return;
    retreatTour();
  };

  const cardPosition = useMemo(
    () => getCardPosition(highlight, step.placement ?? 'bottom'),
    [highlight, step.placement],
  );
  const progress = Math.round(((stepIndex + 1) / tourSteps.length) * 100);

  if (!active) return null;

  return (
    <>
      <div className="guided-tour-layer" aria-live="polite">
        {highlight && (
          <div
            className="guided-tour-highlight"
            style={{ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height }}
          />
        )}
        {highlight && <section
          className={`guided-tour-card guided-tour-card--${cardPosition.placement}`}
          style={{ top: cardPosition.top, left: cardPosition.left }}
          role="dialog"
          aria-modal="false"
          aria-labelledby="guided-tour-title"
        >
          <header>
            <span><Icon size={19} /></span>
            <button type="button" onClick={() => setShowSkipDialog(true)} aria-label="Pular tutorial"><X size={18} /></button>
          </header>
          <div className="guided-tour-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
          <small>Etapa {stepIndex + 1} de {tourSteps.length}</small>
          <h2 id="guided-tour-title" ref={titleRef} tabIndex={-1}>{step.title}</h2>
          <p style={{ fontSize: '16px', lineHeight: 1.55 }}>{step.description}</p>
          {step.actionHint && <div className={interactionDone ? 'guided-tour-hint completed' : 'guided-tour-hint'}><MousePointerClick size={15} />{interactionDone ? 'Interação concluída.' : step.actionHint}</div>}
          <footer>
            <button type="button" className="skip-button" onClick={() => setShowSkipDialog(true)}>Pular tutorial</button>
            <div onPointerDownCapture={beginPointerGesture} onKeyDownCapture={beginKeyboardGesture}>
              <Button type="button" variant="secondary" icon={<ArrowLeft size={16} />} onClick={goBack} disabled={isFirst || isSaving}>Voltar</Button>
              <Button type="button" icon={isLast ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />} onClick={goNext} disabled={!canContinue || isSaving} loading={isSaving}>
                {isLast ? 'Finalizar' : 'Próximo'}
              </Button>
            </div>
          </footer>
        </section>}
      </div>
      <Modal open={showSkipDialog} onClose={() => setShowSkipDialog(false)} title="Pular tour guiado" description="Você pode explorar o StudyFlow por conta própria e reiniciar este tour pelo perfil quando quiser." className="modal--tour-skip">
        <div className="tour-skip-dialog">
          <Button type="button" variant="secondary" onClick={() => setShowSkipDialog(false)}>Continuar tutorial</Button>
          <Button type="button" variant="primary" onClick={() => void complete(onSkip)} loading={isSaving}>Pular</Button>
        </div>
      </Modal>
    </>
  );
}
