import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
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
import { GuidedTour } from './components/onboarding/GuidedTour';
import { CreateStudySetForm } from './components/forms/CreateStudySetForm';
import { SubscriptionPaywall } from './components/billing/SubscriptionPaywall';
import { SubscriptionStatusCard } from './components/billing/SubscriptionStatusCard';
import { PaymentStatusScreen } from './components/billing/PaymentStatusScreen';
import { PaymentRedirectPage } from './components/billing/PaymentRedirectPage';
import { Button } from './components/ui/Button';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useStudySets } from './hooks/useStudySets';
import { useSubscription } from './hooks/useSubscription';
import { deleteAccount as deleteAccountService, signOut } from './services/authService';
import { saveCardProgress } from './services/progressService';
import type { StudySet, ToastMessage, ViewId } from './types';
import type { PaymentReturnStatus } from './types/subscription';
import { newId } from './utils/study';
import { HomeView } from './views/HomeView';
import { AdminApp } from './admin/AdminApp';

const LEGACY_KEY = 'studyflow_sets_v1';
const INITIAL_VIEW: ViewId = 'home';
const nonStudyActionViews = new Set<ViewId>(['billing', 'profile']);
const loadStudiesView = () => import('./views/StudiesView');
const loadFlashcardsView = () => import('./views/FlashcardsView');
const loadQuizView = () => import('./views/QuizView');
const loadProgressView = () => import('./views/ProgressView');
const loadProfileView = () => import('./views/ProfileView');
const loadMindMapsView = () => import('./views/MindMapsView');
const StudiesView = lazy(() => loadStudiesView().then((module) => ({ default: module.StudiesView })));
const FlashcardsView = lazy(() => loadFlashcardsView().then((module) => ({ default: module.FlashcardsView })));
const QuizView = lazy(() => loadQuizView().then((module) => ({ default: module.QuizView })));
const ProgressView = lazy(() => loadProgressView().then((module) => ({ default: module.ProgressView })));
const ProfileView = lazy(() => loadProfileView().then((module) => ({ default: module.ProfileView })));
const MindMapsView = lazy(() => loadMindMapsView().then((module) => ({ default: module.MindMapsView })));

function getPaymentReturnStatus(pathname: string): PaymentReturnStatus | undefined {
  if (pathname === '/billing/success') return 'success';
  if (pathname === '/billing/pending') return 'pending';
  if (pathname === '/billing/failure') return 'failure';
  return undefined;
}

function isPaymentRedirectPath(pathname: string) {
  return ['/pagamento', '/pagamento/', '/checkout', '/checkout/', '/payment', '/payment/'].includes(pathname);
}

export function App() {
  const auth = useAuth();
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', updatePathname);
    return () => window.removeEventListener('popstate', updatePathname);
  }, []);

  const isAdminPath = pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/');
  if (pathname === '/auth/callback') return <AuthCallbackPage />;
  if (isAdminPath) return <StealthAdminEntry auth={auth} />;
  if (isPaymentRedirectPath(pathname)) return <PaymentEntryPage auth={auth} />;
  return <AuthGuard session={auth.session} isLoading={auth.isLoading} error={auth.error}>{auth.user && <AuthenticatedApp user={auth.user}/>}</AuthGuard>;
}

function StealthAdminEntry({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const [revealCancelled, setRevealCancelled] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [regularAppReady, setRegularAppReady] = useState(false);

  useEffect(() => {
    if (!auth.isLoading && (!auth.user || auth.error)) setRegularAppReady(true);
  }, [auth.error, auth.isLoading, auth.user]);

  useEffect(() => {
    if (revealed) return;
    const handleVisibility = () => { if (document.hidden) setRevealCancelled(true); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [revealed]);

  const regularApp = (
    <AuthGuard session={auth.session} isLoading={auth.isLoading} error={auth.error}>
      {auth.user && <AuthenticatedApp user={auth.user} preservePath onReady={() => setRegularAppReady(true)} onNavigateAway={() => setRevealCancelled(true)} />}
    </AuthGuard>
  );

  return (
    <AdminApp
      authenticated={Boolean(auth.user)}
      authLoading={auth.isLoading}
      authError={auth.error}
      verificationEnabled={regularAppReady}
      stealthFallback={regularApp}
      revealCancelled={revealCancelled}
      onReveal={() => setRevealed(true)}
    />
  );
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

function AuthenticatedApp({ user, preservePath = false, onReady, onNavigateAway }: { user: NonNullable<ReturnType<typeof useAuth>['user']>; preservePath?: boolean; onReady?: () => void; onNavigateAway?: () => void }) {
  const billing = useSubscription(user.id);
  const { profile, isLoading: profileLoading, error: profileError, finishOnboarding, finishWalkthrough } = useProfile(user);
  const { studySets, isLoading: setsLoading, error: setsError, starterSetsCreated, starterWarning, addStudySet, updateStudySet, clearStudySets, clearSensitiveState } = useStudySets(user.id, true);
  const [activeView, setActiveView] = useState<ViewId>(INITIAL_VIEW); const [activeSetId, setActiveSetId] = useState<string>(); const [activeCardId, setActiveCardId] = useState<string>();
  const [search, setSearch] = useState(''); const [createOpen, setCreateOpen] = useState(false); const [premiumOpen, setPremiumOpen] = useState(false); const [replayTutorial, setReplayTutorial] = useState(false); const [walkthroughActive, setWalkthroughActive] = useState(false); const [walkthroughDismissed, setWalkthroughDismissed] = useState(false); const [onboardingBypassed, setOnboardingBypassed] = useState(false);
  const [toast, setToast] = useState<ToastMessage>(); const [legacySets, setLegacySets] = useState<StudySet[]>(); const [importing, setImporting] = useState(false);
  const paymentReturnStatus = getPaymentReturnStatus(window.location.pathname);
  const visibleView = activeView;
  const activeSet = studySets.find((set) => set.id === activeSetId) ?? studySets[0];
  const filteredSets = useMemo(() => studySets.filter((set) => `${set.title} ${set.subject}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [studySets, search]);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(undefined), 3500); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    setActiveView(INITIAL_VIEW);
    setActiveCardId(undefined);

    if (preservePath || getPaymentReturnStatus(window.location.pathname)) return;
    if (window.location.pathname === '/') return;

    window.history.replaceState({}, document.title, '/');
  }, [preservePath, user.id]);
  useEffect(() => { if (!starterSetsCreated) return; setToast({ id: newId('toast'), type: 'success', message: 'Criamos alguns flashcards iniciais para você começar.' }); }, [starterSetsCreated]);
  useEffect(() => { try { const raw = localStorage.getItem(LEGACY_KEY); if (!raw) return; const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length) setLegacySets(parsed as StudySet[]); } catch { localStorage.removeItem(LEGACY_KEY); } }, []);
  useEffect(() => { if (billing.isPremium) setPremiumOpen(false); }, [billing.isPremium]);
  useEffect(() => {
    const openPremiumModal = () => setPremiumOpen(true);
    window.addEventListener('studyflow:open-premium', openPremiumModal);
    return () => window.removeEventListener('studyflow:open-premium', openPremiumModal);
  }, []);
  useEffect(() => {
    if (profileLoading || billing.isLoading || setsLoading || profileError || setsError || !profile) return;
    onReady?.();
  }, [billing.isLoading, onReady, profile, profileError, profileLoading, setsError, setsLoading]);
  useEffect(() => {
    if (profileLoading || billing.isLoading || setsLoading) return;
    const timer = window.setTimeout(() => {
      void Promise.all([loadStudiesView(), loadFlashcardsView(), loadQuizView(), loadProgressView(), loadProfileView(), loadMindMapsView()]);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [billing.isLoading, profileLoading, setsLoading]);
  useEffect(() => {    if (!profile || profileLoading || setsLoading || replayTutorial || walkthroughDismissed) return;
    if (profile.walkthrough_completed || !profile.onboarding_completed || !starterSetsCreated || !studySets.length) return;
    setWalkthroughActive(true);
  }, [profile, profileLoading, replayTutorial, setsLoading, starterSetsCreated, studySets.length, walkthroughDismissed]);

  if (profileLoading || billing.isLoading || setsLoading) return <LoadingState label={billing.isLoading ? 'Verificando assinatura...' : 'Sincronizando seus estudos...'}/>;
  if (profileError || !profile || setsError) return <div className="auth-error-screen"><h1>Não foi possível carregar sua conta</h1><p>{profileError ?? setsError ?? 'Perfil indisponível.'}</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>;
  const shouldShowFirstRunOnboarding = !profile.onboarding_completed && starterSetsCreated && !onboardingBypassed;
  const tourPremiumAccess = billing.isPremium || walkthroughActive;

  const notify = (type: ToastMessage['type'], message: string) => setToast({ id: newId('toast'), type, message });
  const navigate = (view: ViewId) => { onNavigateAway?.(); setActiveView(view); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const requirePremium = (message = 'Assine o StudyFlow Premium para salvar seus estudos e usar este recurso.') => {
    notify('info', message);
    setPremiumOpen(true);
  };
  const openCreate = () => {
    if (!billing.isPremium && !walkthroughActive) {
      requirePremium('Você pode explorar o app, mas precisa assinar para criar conjuntos próprios.');
      return;
    }

    setCreateOpen(true);
  };
  const onCancel = () => setCreateOpen(false);
  const study = (set: StudySet, flashcardId?: string) => {
    if (!billing.isPremium && !walkthroughActive) {
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
  const rateCard = async (set: StudySet, cardId: string, mastery: 1|2|3) => { if (walkthroughActive && !billing.isPremium) { notify('info', 'Demonstração concluída. Assine para salvar progresso real.'); return; } if (!billing.isPremium) { requirePremium('Assine para salvar seu progresso nos flashcards.'); throw new Error('Premium necessário.'); } await saveCardProgress(user.id, set, cardId, mastery); notify('success', 'Progresso sincronizado.'); };
  const clear = async () => { if (!billing.isPremium) { requirePremium('Assine para gerenciar seus dados de estudo.'); return; } if (!window.confirm('Excluir todos os seus conjuntos, flashcards e progresso? Esta ação não pode ser desfeita.')) return; await clearStudySets(); notify('info', 'Seus dados de estudo foram removidos.'); };
  const logout = async () => { clearSensitiveState(); await signOut(); };
  const deleteAccount = async () => { clearSensitiveState(); await deleteAccountService(); };
  const finishTutorial = async () => { if (!profile.onboarding_completed) await finishOnboarding(); setActiveView(INITIAL_VIEW); setReplayTutorial(false); };
  const finishGuidedTour = async () => { try { await finishWalkthrough(); } catch (reason) { notify('error', reason instanceof Error ? reason.message : 'Não foi possível salvar o status do tour.'); } setWalkthroughActive(false); setWalkthroughDismissed(true); setActiveView(INITIAL_VIEW); };
  const replayGuidedTour = () => {    setReplayTutorial(false);
    setWalkthroughDismissed(false);
    setWalkthroughActive(true);
    setActiveView(INITIAL_VIEW);
  };
  const cancelPlan = async () => { if (!window.confirm('Cancelar a renovação do StudyFlow Premium? Você continua com acesso até o fim do período pago.')) return; await billing.cancel(); notify('info', 'Renovação cancelada. Seu acesso continua até o fim do período pago.'); };
  const importLegacy = async () => { if (!legacySets) return; if (!billing.isPremium) { requirePremium('Assine para importar estudos antigos para sua conta.'); return; } setImporting(true); try { const existingTitles = new Set(studySets.map((set) => set.title.trim().toLowerCase())); const unique = legacySets.filter((set) => !existingTitles.has(set.title.trim().toLowerCase())); for (const set of unique) await addStudySet({ title: set.title, subject: set.subject, description: set.description, color: set.color || '#6758e8', icon: set.icon || 'general', cards: set.cards.map((card) => ({ ...card, mastery: 0 })) }); localStorage.removeItem(LEGACY_KEY); setLegacySets(undefined); notify('success', `${unique.length} conjunto(s) importado(s).`); } catch (reason) { notify('error', reason instanceof Error ? reason.message : 'Falha ao importar.'); } finally { setImporting(false); } };

  const paywall = <SubscriptionPaywall subscription={billing.subscription} isStarting={billing.isStarting} isRefreshing={billing.isRefreshing} errorMessage={billing.errorMessage} onSubscribe={() => void billing.startSubscription()} onRefresh={() => void billing.refresh()} onSignOut={() => void logout()}/>;
  const premiumWindow = <SubscriptionPaywall subscription={billing.subscription} isStarting={billing.isStarting} isRefreshing={billing.isRefreshing} errorMessage={billing.errorMessage} onSubscribe={() => void billing.startSubscription()} onRefresh={() => void billing.refresh()} onSignOut={() => void logout()} showSignOut={false}/>;
  const openBilling = () => { if (billing.isPremium) { navigate('billing'); return; } setPremiumOpen(true); };
  const prepareTourStep = (stepId: string) => {
    const firstSetWithCards = studySets.find((set) => set.cards.length > 0);
    if (!firstSetWithCards) return;

    if (stepId.includes('flashcard')) {
      setActiveSetId(firstSetWithCards.id);
      setActiveCardId(firstSetWithCards.cards[0]?.id);
      return;
    }

    if (stepId.includes('quiz') || stepId.includes('mindmap')) {
      setActiveSetId(firstSetWithCards.id);
    }
  };
  const premiumContent = () => {
    if (visibleView === 'home') return <>{starterWarning && <div className="starter-warning" role="status"><AlertTriangle size={17}/><span>{starterWarning}</span></div>}<HomeView studySets={filteredSets} isPremium={tourPremiumAccess} onStudy={study} onNavigate={navigate} onCreate={openCreate}/></>;
    if (visibleView === 'studies') return <StudiesView studySets={filteredSets} isPremium={tourPremiumAccess} onStudy={study} onCreate={openCreate}/>;
    if (visibleView === 'flashcards') return <FlashcardsView studySet={activeSet} startCardId={activeCardId} studySets={studySets} isPremium={tourPremiumAccess} onRequirePremium={requirePremium} onChange={study} onUpdate={updateStudySet} onRate={rateCard} onBack={() => navigate('studies')}/>;
    if (visibleView === 'mindmaps') return <MindMapsView userId={user.id} studySets={studySets} isPremium={tourPremiumAccess} onRequirePremium={requirePremium} onCreateSet={openCreate} onStudyFlashcard={study} notify={notify} tourActive={walkthroughActive}/>;
    if (visibleView === 'quiz') return <QuizView studySets={studySets} userId={user.id} isPremium={tourPremiumAccess} demoMode={walkthroughActive && !billing.isPremium} onRequirePremium={requirePremium} onError={(message) => notify('error', message)}/>;
    return <ProgressView studySets={studySets}/>;
  };
  const content = () => {
    if (visibleView === 'billing') {
      if (!billing.isPremium) return paywall;
      return <div className="view billing-view"><SubscriptionStatusCard subscription={billing.subscription} refreshing={billing.isRefreshing} cancelling={billing.isCancelling} onRefresh={() => void billing.refresh()} onCancel={() => void cancelPlan()} onSubscribe={() => void billing.startSubscription()}/></div>;
    }
    if (visibleView === 'profile') return <ProfileView profile={profile} studySets={studySets} isPremium={billing.isPremium} onBilling={openBilling} onClear={clear} onReplayTutorial={() => setReplayTutorial(true)} onReplayGuidedTour={replayGuidedTour} onSignOut={logout} onDeleteAccount={deleteAccount}/>;
    return premiumContent();
  };

  if (paymentReturnStatus) return <PaymentStatusScreen status={paymentReturnStatus} isPremium={billing.isPremium} checking={billing.isRefreshing} errorMessage={billing.errorMessage} onCheck={() => void billing.refresh()} onContinue={() => { window.history.replaceState({}, document.title, '/'); setActiveView('home'); }}/>;
  if (shouldShowFirstRunOnboarding) return <OnboardingFlow onComplete={finishTutorial} onBypass={() => setOnboardingBypassed(true)} />;

  return <div className="app-shell"><Sidebar activeView={visibleView} onNavigate={navigate} profile={profile} subscription={billing.subscription} isPremium={billing.isPremium}/><main className="main-content"><Header view={visibleView} search={search} onSearch={setSearch} onCreate={openCreate} userName={profile.full_name} showStudyActions={!nonStudyActionViews.has(visibleView)}/><Suspense fallback={null}>{content()}</Suspense></main><BottomNavigation activeView={visibleView} onNavigate={navigate} isPremium={billing.isPremium}/><Modal open={premiumOpen} onClose={() => setPremiumOpen(false)} hideHeader className="modal--premium" title="Assine o StudyFlow"><div className="premium-window">{premiumWindow}</div></Modal><Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Crie seu conjunto" description="Os dados serão salvos na sua conta."><CreateStudySetForm onSave={saveSet} onCancel={onCancel}/></Modal>{replayTutorial && <OnboardingFlow onComplete={finishTutorial} onBypass={() => setReplayTutorial(false)} />}<Modal open={Boolean(legacySets)} onClose={() => { localStorage.removeItem(LEGACY_KEY); setLegacySets(undefined); }} title="Encontramos estudos neste navegador" description="Você decide se quer levá-los para sua conta."><div className="legacy-import"><p>Os dados antigos não serão enviados sem sua autorização. Conjuntos com o mesmo nome serão ignorados.</p><div><Button variant="ghost" onClick={() => { localStorage.removeItem(LEGACY_KEY); setLegacySets(undefined); }}>Descartar dados locais</Button><Button loading={importing} onClick={() => void importLegacy()}>Importar para minha conta</Button></div></div></Modal><GuidedTour active={walkthroughActive} onNavigate={navigate} onPrepareStep={prepareTourStep} onComplete={finishGuidedTour} onSkip={finishGuidedTour}/> {toast && <Toast toast={toast} onClose={() => setToast(undefined)}/>}</div>;
}
