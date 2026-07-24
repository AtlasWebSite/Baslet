import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Eye, HelpCircle, LayoutDashboard, Map, MousePointerClick, Play, Sparkles, X } from 'lucide-react';
import type { ViewId } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface TourStep {
  id: string;
  view: ViewId;
  target: string;
  title: string;
  description: string;
  placement?: TourPlacement;
  actionHint?: string;
  interactionSelector?: string;
  autoAdvanceAfterInteraction?: boolean;
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
    actionHint: 'Clique no botão Estudar para continuar.',
    interactionSelector: '[data-tour="study-set-study-button"]',
    autoAdvanceAfterInteraction: true,
  },
  {
    id: 'flip-card',
    view: 'flashcards',
    target: '[data-tour="flashcard-card"]',
    title: 'Vire o flashcard',
    description: 'Primeiro leia o termo, tente lembrar a resposta e depois vire o card para conferir a definição.',
    placement: 'bottom',
    actionHint: 'Clique no card para visualizar a resposta.',
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
    interactionSelector: '[data-tour="quiz-answer"]',
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

function getVisibleTarget(selector: string) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

  return elements.find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  });
}

function getHighlightRect(element: HTMLElement): HighlightRect {
  const rect = element.getBoundingClientRect();
  const padding = 10;

  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
    height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
  };
}

function getCardPosition(rect: HighlightRect | undefined, placement: TourPlacement) {
  const cardWidth = Math.min(360, window.innerWidth - 28);
  const cardHeight = 245;
  const gap = 18;

  if (!rect || placement === 'center') {
    return {
      top: Math.max(14, (window.innerHeight - cardHeight) / 2),
      left: Math.max(14, (window.innerWidth - cardWidth) / 2),
      placement: 'center' as TourPlacement,
    };
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const positions = {
    bottom: { top: rect.top + rect.height + gap, left: centerX - cardWidth / 2 },
    top: { top: rect.top - cardHeight - gap, left: centerX - cardWidth / 2 },
    right: { top: centerY - cardHeight / 2, left: rect.left + rect.width + gap },
    left: { top: centerY - cardHeight / 2, left: rect.left - cardWidth - gap },
    center: { top: (window.innerHeight - cardHeight) / 2, left: (window.innerWidth - cardWidth) / 2 },
  };
  const preferred = positions[placement];

  return {
    top: Math.min(Math.max(14, preferred.top), window.innerHeight - cardHeight - 14),
    left: Math.min(Math.max(14, preferred.left), window.innerWidth - cardWidth - 14),
    placement,
  };
}

export function GuidedTour({ active, onNavigate, onComplete, onSkip }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect>();
  const [interactionDone, setInteractionDone] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const step = tourSteps[stepIndex];
  const Icon = stepIcons[stepIndex] ?? Sparkles;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tourSteps.length - 1;
  const mustInteract = Boolean(step.interactionSelector);
  const canContinue = !mustInteract || interactionDone;

  const refreshHighlight = useCallback(() => {
    const target = getVisibleTarget(step.target);

    if (!target) {
      setHighlight(undefined);
      return;
    }

    target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    window.setTimeout(() => setHighlight(getHighlightRect(target)), 180);
  }, [step.target]);

  useEffect(() => {
    if (!active) return;
    onNavigate(step.view);
    setInteractionDone(false);
    const timer = window.setTimeout(refreshHighlight, 260);
    return () => window.clearTimeout(timer);
  }, [active, onNavigate, refreshHighlight, step.id, step.view]);

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
    if (!active || !step.interactionSelector) return;

    const trackInteraction = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(step.interactionSelector ?? '')) return;

      setInteractionDone(true);

      if (!step.autoAdvanceAfterInteraction) return;
      window.setTimeout(() => setStepIndex((current) => Math.min(current + 1, tourSteps.length - 1)), 420);
    };

    document.addEventListener('click', trackInteraction, true);
    return () => document.removeEventListener('click', trackInteraction, true);
  }, [active, step]);

  const complete = async (callback: () => Promise<void> | void) => {
    setIsSaving(true);
    try {
      await callback();
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = () => {
    if (!canContinue) return;

    if (isLast) {
      void complete(onComplete);
      return;
    }

    setStepIndex((current) => current + 1);
  };

  const goBack = () => {
    if (isFirst) return;
    setStepIndex((current) => current - 1);
  };

  const cardPosition = useMemo(() => getCardPosition(highlight, step.placement ?? 'bottom'), [highlight, step.placement]);
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
        <section
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
          <p>{step.description}</p>
          {step.actionHint && <div className={interactionDone ? 'guided-tour-hint completed' : 'guided-tour-hint'}><MousePointerClick size={15} />{interactionDone ? 'Interação concluída.' : step.actionHint}</div>}
          <footer>
            <button type="button" className="skip-button" onClick={() => setShowSkipDialog(true)}>Pular tutorial</button>
            <div>
              <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={goBack} disabled={isFirst || isSaving}>Voltar</Button>
              <Button icon={isLast ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />} onClick={goNext} disabled={!canContinue || isSaving} loading={isSaving}>
                {isLast ? 'Finalizar' : 'Próximo'}
              </Button>
            </div>
          </footer>
        </section>
      </div>
      <Modal open={showSkipDialog} onClose={() => setShowSkipDialog(false)} title="Pular tour guiado" description="Você pode explorar o StudyFlow por conta própria e reiniciar este tour pelo perfil quando quiser." className="modal--tour-skip">
        <div className="tour-skip-dialog">
          <Button variant="secondary" onClick={() => setShowSkipDialog(false)}>Continuar tutorial</Button>
          <Button variant="primary" onClick={() => void complete(onSkip)} loading={isSaving}>Pular</Button>
        </div>
      </Modal>
    </>
  );
}
