import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { Header } from './components/layout/Header';
import { Modal } from './components/ui/Modal';
import { Toast } from './components/ui/Toast';
import { LoadingState } from './components/ui/LoadingState';
import { AuthGuard } from './components/auth/AuthGuard';
import { AuthCallbackPage } from './components/auth/AuthCallbackPage';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { CreateStudySetForm } from './components/forms/CreateStudySetForm';
import { SubscriptionPaywall } from './components/billing/SubscriptionPaywall';
import { SubscriptionStatusCard } from './components/billing/SubscriptionStatusCard';
import { PaymentStatusScreen } from './components/billing/PaymentStatusScreen';
import { PaymentRedirectPage } from './components/billing/PaymentRedirectPage';
import { AiCreationModal } from './components/ai/AiCreationModal';
import { Button } from './components/ui/Button';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useStudySets } from './hooks/useStudySets';
import { useSubscription } from './hooks/useSubscription';
import { signOut } from './services/authService';
import { createMentalMap } from './services/mentalMapService';
import { saveCardProgress } from './services/progressService';
import type { StudySet, ToastMessage, ViewId } from './types';
import type { AiContentType, AiFlashcardsContent, AiMindMapContent } from './types/ai';
import type { MindMapEdge, MindMapMode, MindMapNode } from './types/mentalMap';
import type { PaymentReturnStatus } from './types/subscription';
import { newId } from './utils/study';
import { HomeView } from './views/HomeView';
import { StudiesView } from './views/StudiesView';
import { FlashcardsView } from './views/FlashcardsView';
import { QuizView } from './views/QuizView';
import { ProgressView } from './views/ProgressView';
import { ProfileView } from './views/ProfileView';
import { MindMapsView } from './views/MindMapsView';

const LEGACY_KEY = 'studyflow_sets_v1';
const INITIAL_VIEW: ViewId = 'home';
const nonStudyActionViews = new Set<ViewId>(['billing', 'profile']);

function getPaymentReturnStatus(pathname: string): PaymentReturnStatus | undefined {
  if (pathname === '/billing/success') return 'success';
  if (pathname === '/billing/pending') return 'pending';
  if (pathname === '/billing/failure') return 'failure';
  return undefined;
}

function isPaymentRedirectPath(pathname: string) {
  return ['/pagamento', '/pagamento/', '/checkout', '/checkout/', '/payment', '/payment/'].includes(pathname);
}

function composeAiFlashcardDefinition(card: AiFlashcardsContent['cards'][number]) {
  const answer = card.back.trim();
  const explanation = card.explanation.trim();
  if (!explanation) return answer;
  return `${answer}\n\nExplicação: ${explanation}`;
}

function createAiFlashcardsDraft(content: AiFlashcardsContent, generationId: string): Omit<StudySet, 'id' | 'updatedAt'> {
  return {
    title: content.title.trim(),
    subject: content.topic.trim() || 'IA',
    description: content.description.trim() || `Conteúdo gerado com IA sobre ${content.topic}.`,
    color: '#6758e8',
    icon: 'general',
    createdByAi: true,
    aiTopic: content.topic,
    aiGenerationId: generationId,
    cards: content.cards
      .filter((card) => card.front.trim() && card.back.trim())
      .map((card) => ({
        id: newId('ai-card'),
        term: card.front.trim(),
        definition: composeAiFlashcardDefinition(card),
        mastery: 0,
      })),
  };
}

function getNodeDefinition(node: MindMapNode, nodes: MindMapNode[], edges: MindMapEdge[]) {
  const directDefinition = nodes.find((candidate) => {
    if (candidate.type !== 'definition') return false;
    return edges.some((edge) => edge.source === node.id && edge.target === candidate.id);
  });

  return directDefinition?.fullText || node.fullText || node.subtitle || node.label;
}

function prepareAiMindMapForSaving(nodes: MindMapNode[], edges: MindMapEdge[]) {
  const termNodes = nodes.filter((node) => node.type === 'term');
  const cardIdByTermId = new Map<string, string>();

  for (const termNode of termNodes) {
    cardIdByTermId.set(termNode.id, termNode.flashcardId || newId('ai-card'));
  }

  const parentByTarget = new Map(edges.map((edge) => [edge.target, edge.source]));
  const findRelatedTermId = (node: MindMapNode) => {
    if (node.type === 'term') return node.id;

    let parentId = parentByTarget.get(node.id);
    while (parentId) {
      const parentNode = nodes.find((candidate) => candidate.id === parentId);
      if (!parentNode) return undefined;
      if (parentNode.type === 'term') return parentNode.id;
      parentId = parentByTarget.get(parentNode.id);
    }

    return undefined;
  };

  const normalizedNodes = nodes.map((node) => {
    const relatedTermId = findRelatedTermId(node);
    const flashcardId = relatedTermId ? cardIdByTermId.get(relatedTermId) : node.flashcardId;
    return flashcardId ? { ...node, flashcardId } : node;
  });

  const cards = termNodes.map((termNode) => ({
    id: cardIdByTermId.get(termNode.id) ?? newId('ai-card'),
    term: termNode.label.trim() || 'Conceito',
    definition: getNodeDefinition(termNode, normalizedNodes, edges).trim() || termNode.fullText,
    mastery: 0 as const,
  }));

  return { nodes: normalizedNodes, cards };
}

export function App() {
  const auth = useAuth();
  if (window.location.pathname === '/auth/callback') return <AuthCallbackPage />;
  if (isPaymentRedirectPath(window.location.pathname)) return <PaymentEntryPage auth={auth} />;
  return <AuthGuard session={auth.session} isLoading={auth.isLoading} error={auth.error}>{auth.user && <AuthenticatedApp user={auth.user}/>}</AuthGuard>;
}

function PaymentEntryPage({ auth }: { auth: ReturnType<typeof useAuth> }) {
  if (auth.isLoading) return <LoadingState label="Preparando pagamento..."/>;
  if (auth.user) return <AuthenticatedPaymentEntryPage user={auth.user}/>;

  return <PaymentRedirectPage mode="guest" errorMessage={auth.error ?? ''} />;
}

function AuthenticatedPaymentEntryPage({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const billing = useSubscription(user.id);

  if (billing.isLoading) return <LoadingState label="Verificando assinatura..."/>;

  return (
    <PaymentRedirectPage
      mode={billing.isPremium ? 'active' : 'checkout'}
      subscription={billing.subscription}
      errorMessage={billing.errorMessage}
      isStarting={billing.isStarting}
      isRefreshing={billing.isRefreshing}
      onSubscribe={() => void billing.startSubscription()}
      onRefresh={() => void billing.refresh()}
      onEnterApp={() => window.location.assign('/')}
    />
  );
}

function AuthenticatedApp({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const billing = useSubscription(user.id);
  const { profile, isLoading: profileLoading, error: profileError, finishOnboarding } = useProfile(user);
  const { studySets, isLoading: setsLoading, error: setsError, starterSetsCreated, starterWarning, addStudySet, updateStudySet, clearStudySets, clearSensitiveState } = useStudySets(user.id, true);
  const [activeView, setActiveView] = useState<ViewId>(INITIAL_VIEW); const [activeSetId, setActiveSetId] = useState<string>(); const [activeCardId, setActiveCardId] = useState<string>();
  const [search, setSearch] = useState(''); const [createOpen, setCreateOpen] = useState(false); const [premiumOpen, setPremiumOpen] = useState(false); const [replayTutorial, setReplayTutorial] = useState(false); const [onboardingBypassed, setOnboardingBypassed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false); const [aiInitialType, setAiInitialType] = useState<AiContentType>('flashcards'); const [aiSaving, setAiSaving] = useState(false); const [mindMapsVersion, setMindMapsVersion] = useState(0);
  const [toast, setToast] = useState<ToastMessage>(); const [legacySets, setLegacySets] = useState<StudySet[]>(); const [importing, setImporting] = useState(false);
  const paymentReturnStatus = getPaymentReturnStatus(window.location.pathname);
  const visibleView = activeView;
  const activeSet = studySets.find((set) => set.id === activeSetId) ?? studySets[0];
  const filteredSets = useMemo(() => studySets.filter((set) => `${set.title} ${set.subject}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [studySets, search]);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(undefined), 3500); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    setActiveView(INITIAL_VIEW);
    setActiveCardId(undefined);

    if (getPaymentReturnStatus(window.location.pathname)) return;
    if (window.location.pathname === '/') return;

    window.history.replaceState({}, document.title, '/');
  }, [user.id]);
  useEffect(() => { if (!starterSetsCreated) return; setToast({ id: newId('toast'), type: 'success', message: 'Criamos alguns flashcards iniciais para você começar.' }); }, [starterSetsCreated]);
  useEffect(() => { try { const raw = localStorage.getItem(LEGACY_KEY); if (!raw) return; const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length) setLegacySets(parsed as StudySet[]); } catch { localStorage.removeItem(LEGACY_KEY); } }, []);
  useEffect(() => { if (billing.isPremium) setPremiumOpen(false); }, [billing.isPremium]);

  if (profileLoading || billing.isLoading || setsLoading) return <LoadingState label={billing.isLoading ? 'Verificando assinatura...' : 'Sincronizando seus estudos...'}/>;
  if (profileError || !profile || setsError) return <div className="auth-error-screen"><h1>Não foi possível carregar sua conta</h1><p>{profileError ?? setsError ?? 'Perfil indisponível.'}</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>;
  const shouldShowFirstRunOnboarding = !profile.onboarding_completed && starterSetsCreated && !onboardingBypassed;

  const notify = (type: ToastMessage['type'], message: string) => setToast({ id: newId('toast'), type, message });
  const navigate = (view: ViewId) => { setActiveView(view); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const requirePremium = (message = 'Assine o StudyFlow Premium para salvar seus estudos e usar este recurso.') => {
    notify('info', message);
    setPremiumOpen(true);
  };
  const openCreate = () => {
    if (!billing.isPremium) {
      requirePremium('Você pode explorar o app, mas precisa assinar para criar conjuntos próprios.');
      return;
    }

    setCreateOpen(true);
  };
  const openAiCreation = (initialType: AiContentType = 'flashcards') => {
    setAiInitialType(initialType);
    setAiOpen(true);
  };
  const saveAiFlashcards = async (content: AiFlashcardsContent, generationId: string) => {
    setAiSaving(true);
    try {
      const draft = createAiFlashcardsDraft(content, generationId);
      if (!draft.cards.length) throw new Error('Adicione pelo menos um flashcard antes de salvar.');

      const created = await addStudySet(draft);
      setActiveSetId(created.id);
      setAiOpen(false);
      notify('success', 'Seu material foi criado com sucesso.');
      navigate('studies');
    } catch (reason) {
      notify('error', reason instanceof Error ? reason.message : 'Não foi possível salvar o material gerado.');
    } finally {
      setAiSaving(false);
    }
  };
  const saveAiMindMap = async (content: AiMindMapContent, generationId: string, nodes: MindMapNode[], edges: MindMapEdge[], mode: MindMapMode) => {
    setAiSaving(true);
    try {
      const prepared = prepareAiMindMapForSaving(nodes, edges);
      if (!prepared.cards.length) throw new Error('O mapa precisa ter pelo menos um conceito para ser salvo.');

      const createdSet = await addStudySet({
        title: content.title.trim(),
        subject: content.topic.trim() || 'Mapa mental',
        description: content.description.trim() || `Mapa mental gerado com IA sobre ${content.topic}.`,
        color: '#6758e8',
        icon: 'general',
        cards: prepared.cards,
        createdByAi: true,
        aiTopic: content.topic,
        aiGenerationId: generationId,
      });

      await createMentalMap({
        userId: user.id,
        studySetId: createdSet.id,
        title: content.title.trim(),
        nodes: prepared.nodes,
        edges,
        mode,
        createdByAi: true,
        aiTopic: content.topic,
        aiGenerationId: generationId,
      });

      setActiveSetId(createdSet.id);
      setMindMapsVersion((current) => current + 1);
      setAiOpen(false);
      notify('success', 'Seu material foi criado com sucesso.');
      navigate('mindmaps');
    } catch (reason) {
      notify('error', reason instanceof Error ? reason.message : 'Não foi possível salvar o mapa gerado.');
    } finally {
      setAiSaving(false);
    }
  };
  const study = (set: StudySet, flashcardId?: string) => {
    if (!billing.isPremium) {
      setActiveSetId(set.id);
      setActiveCardId(flashcardId);
      requirePremium('Assine para iniciar sessões de estudo com flashcards.');
      return;
    }

    setActiveSetId(set.id);
    setActiveCardId(flashcardId);
    navigate('flashcards');
  };
  const saveSet = async (draft: Omit<StudySet, 'id'|'updatedAt'>) => { if (!billing.isPremium) { requirePremium('Assine para criar e salvar seus próprios conjuntos.'); return; } const created = await addStudySet(draft); setActiveSetId(created.id); setCreateOpen(false); notify('success', 'Conjunto salvo com segurança!'); navigate('studies'); };
  const rateCard = async (set: StudySet, cardId: string, mastery: 1|2|3) => { if (!billing.isPremium) { requirePremium('Assine para salvar seu progresso nos flashcards.'); throw new Error('Premium necessário.'); } await saveCardProgress(user.id, set, cardId, mastery); notify('success', 'Progresso sincronizado.'); };
  const clear = async () => { if (!billing.isPremium) { requirePremium('Assine para gerenciar seus dados de estudo.'); return; } if (!window.confirm('Excluir todos os seus conjuntos, flashcards e progresso? Esta ação não pode ser desfeita.')) return; await clearStudySets(); notify('info', 'Seus dados de estudo foram removidos.'); };
  const logout = async () => { clearSensitiveState(); await signOut(); };
  const finishTutorial = async () => { if (!profile.onboarding_completed) await finishOnboarding(); setActiveView(INITIAL_VIEW); setReplayTutorial(false); };
  const cancelPlan = async () => { if (!window.confirm('Cancelar a renovação do StudyFlow Premium? Você continua com acesso até o fim do período pago.')) return; await billing.cancel(); notify('info', 'Renovação cancelada. Seu acesso continua até o fim do período pago.'); };
  const importLegacy = async () => { if (!legacySets) return; if (!billing.isPremium) { requirePremium('Assine para importar estudos antigos para sua conta.'); return; } setImporting(true); try { const existingTitles = new Set(studySets.map((set) => set.title.trim().toLowerCase())); const unique = legacySets.filter((set) => !existingTitles.has(set.title.trim().toLowerCase())); for (const set of unique) await addStudySet({ title: set.title, subject: set.subject, description: set.description, color: set.color || '#6758e8', icon: set.icon || 'general', cards: set.cards.map((card) => ({ ...card, mastery: 0 })) }); localStorage.removeItem(LEGACY_KEY); setLegacySets(undefined); notify('success', `${unique.length} conjunto(s) importado(s).`); } catch (reason) { notify('error', reason instanceof Error ? reason.message : 'Falha ao importar.'); } finally { setImporting(false); } };

  const paywall = <SubscriptionPaywall subscription={billing.subscription} isStarting={billing.isStarting} isRefreshing={billing.isRefreshing} errorMessage={billing.errorMessage} onSubscribe={() => void billing.startSubscription()} onRefresh={() => void billing.refresh()} onSignOut={() => void logout()}/>;
  const premiumWindow = <SubscriptionPaywall subscription={billing.subscription} isStarting={billing.isStarting} isRefreshing={billing.isRefreshing} errorMessage={billing.errorMessage} onSubscribe={() => void billing.startSubscription()} onRefresh={() => void billing.refresh()} onSignOut={() => void logout()} showSignOut={false}/>;
  const premiumContent = () => {
    if (visibleView === 'home') return <>{starterWarning && <div className="starter-warning" role="status"><AlertTriangle size={17}/><span>{starterWarning}</span></div>}<HomeView studySets={filteredSets} isPremium={billing.isPremium} onStudy={study} onNavigate={navigate} onCreate={openCreate}/></>;
    if (visibleView === 'studies') return <StudiesView studySets={filteredSets} isPremium={billing.isPremium} onStudy={study} onCreate={openCreate} onCreateWithAi={() => openAiCreation('flashcards')}/>;
    if (visibleView === 'flashcards') return <FlashcardsView studySet={activeSet} startCardId={activeCardId} studySets={studySets} isPremium={billing.isPremium} onRequirePremium={requirePremium} onChange={study} onUpdate={updateStudySet} onRate={rateCard} onBack={() => navigate('studies')}/>;
    if (visibleView === 'mindmaps') return <MindMapsView key={mindMapsVersion} userId={user.id} studySets={studySets} isPremium={billing.isPremium} onRequirePremium={requirePremium} onCreateSet={openCreate} onCreateWithAi={() => openAiCreation('mind_map')} onStudyFlashcard={study} notify={notify}/>;
    if (visibleView === 'quiz') return <QuizView studySets={studySets} userId={user.id} isPremium={billing.isPremium} onRequirePremium={requirePremium} onError={(message) => notify('error', message)}/>;
    return <ProgressView studySets={studySets}/>;
  };
  const content = () => {
    if (visibleView === 'billing') {
      if (!billing.isPremium) return paywall;
      return <div className="view billing-view"><SubscriptionStatusCard subscription={billing.subscription} refreshing={billing.isRefreshing} cancelling={billing.isCancelling} onRefresh={() => void billing.refresh()} onCancel={() => void cancelPlan()} onSubscribe={() => void billing.startSubscription()}/></div>;
    }
    if (visibleView === 'profile') return <ProfileView profile={profile} studySets={studySets} isPremium={billing.isPremium} onBilling={() => navigate('billing')} onClear={clear} onReplayTutorial={() => setReplayTutorial(true)} onSignOut={logout}/>;
    return premiumContent();
  };

  if (paymentReturnStatus) return <PaymentStatusScreen status={paymentReturnStatus} isPremium={billing.isPremium} checking={billing.isRefreshing} errorMessage={billing.errorMessage} onCheck={() => void billing.refresh()} onContinue={() => { window.history.replaceState({}, document.title, '/'); setActiveView('home'); }}/>;
  if (shouldShowFirstRunOnboarding) return <OnboardingFlow onComplete={finishTutorial} onBypass={() => setOnboardingBypassed(true)} />;

  return <div className="app-shell"><Sidebar activeView={visibleView} onNavigate={navigate} name={profile.full_name} avatarUrl={profile.avatar_url} isPremium={billing.isPremium}/><main className="main-content"><Header view={visibleView} search={search} onSearch={setSearch} onCreate={openCreate} userName={profile.full_name} showStudyActions={!nonStudyActionViews.has(visibleView)}/>{content()}</main><BottomNavigation activeView={visibleView} onNavigate={navigate} isPremium={billing.isPremium}/><Modal open={premiumOpen} onClose={() => setPremiumOpen(false)} hideHeader className="modal--premium" title="Assine o StudyFlow"><div className="premium-window">{premiumWindow}</div></Modal><Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Crie seu conjunto" description="Os dados serão salvos na sua conta."><CreateStudySetForm onSave={saveSet} onCancel={() => setCreateOpen(false)}/></Modal><AiCreationModal open={aiOpen} initialType={aiInitialType} saving={aiSaving} onClose={() => setAiOpen(false)} onSaveFlashcards={saveAiFlashcards} onSaveMindMap={saveAiMindMap}/>{replayTutorial && <OnboardingFlow onComplete={finishTutorial} onBypass={() => setReplayTutorial(false)} />}<Modal open={Boolean(legacySets)} onClose={() => { localStorage.removeItem(LEGACY_KEY); setLegacySets(undefined); }} title="Encontramos estudos neste navegador" description="Você decide se quer levá-los para sua conta."><div className="legacy-import"><p>Os dados antigos não serão enviados sem sua autorização. Conjuntos com o mesmo nome serão ignorados.</p><div><Button variant="ghost" onClick={() => { localStorage.removeItem(LEGACY_KEY); setLegacySets(undefined); }}>Descartar dados locais</Button><Button loading={importing} onClick={() => void importLegacy()}>Importar para minha conta</Button></div></div></Modal>{toast && <Toast toast={toast} onClose={() => setToast(undefined)}/>}</div>;
}
