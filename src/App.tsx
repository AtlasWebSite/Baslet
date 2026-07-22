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
import { OnboardingTutorial } from './components/onboarding/OnboardingTutorial';
import { CreateStudySetForm } from './components/forms/CreateStudySetForm';
import { SubscriptionGuard } from './components/billing/SubscriptionGuard';
import { SubscriptionPaywall } from './components/billing/SubscriptionPaywall';
import { SubscriptionStatusCard } from './components/billing/SubscriptionStatusCard';
import { PaymentStatusScreen } from './components/billing/PaymentStatusScreen';
import { Button } from './components/ui/Button';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useStudySets } from './hooks/useStudySets';
import { useSubscription } from './hooks/useSubscription';
import { signOut } from './services/authService';
import { saveCardProgress } from './services/progressService';
import type { StudySet, ToastMessage, ViewId } from './types';
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
const freeViews = new Set<ViewId>(['billing', 'profile']);

function getPaymentReturnStatus(pathname: string): PaymentReturnStatus | undefined {
  if (pathname === '/billing/success') return 'success';
  if (pathname === '/billing/pending') return 'pending';
  if (pathname === '/billing/failure') return 'failure';
  return undefined;
}

export function App() {
  const auth = useAuth();
  if (window.location.pathname === '/auth/callback') return <AuthCallbackPage />;
  return <AuthGuard session={auth.session} isLoading={auth.isLoading} error={auth.error}>{auth.user && <AuthenticatedApp user={auth.user}/>}</AuthGuard>;
}

function AuthenticatedApp({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const billing = useSubscription(user.id);
  const { profile, isLoading: profileLoading, error: profileError, finishOnboarding } = useProfile(user);
  const { studySets, isLoading: setsLoading, error: setsError, starterSetsCreated, starterWarning, addStudySet, updateStudySet, clearStudySets, clearSensitiveState } = useStudySets(user.id, billing.isPremium);
  const [activeView, setActiveView] = useState<ViewId>('home'); const [activeSetId, setActiveSetId] = useState<string>(); const [activeCardId, setActiveCardId] = useState<string>();
  const [search, setSearch] = useState(''); const [createOpen, setCreateOpen] = useState(false); const [replayTutorial, setReplayTutorial] = useState(false);
  const [toast, setToast] = useState<ToastMessage>(); const [legacySets, setLegacySets] = useState<StudySet[]>(); const [importing, setImporting] = useState(false);
  const paymentReturnStatus = getPaymentReturnStatus(window.location.pathname);
  const visibleView = !billing.isPremium && !freeViews.has(activeView) ? 'billing' : activeView;
  const activeSet = studySets.find((set) => set.id === activeSetId) ?? studySets[0];
  const filteredSets = useMemo(() => studySets.filter((set) => `${set.title} ${set.subject}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [studySets, search]);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(undefined), 3500); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!starterSetsCreated) return; setToast({ id: newId('toast'), type: 'success', message: 'Criamos alguns flashcards iniciais para você começar.' }); }, [starterSetsCreated]);
  useEffect(() => { try { const raw = localStorage.getItem(LEGACY_KEY); if (!raw) return; const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length) setLegacySets(parsed as StudySet[]); } catch { localStorage.removeItem(LEGACY_KEY); } }, []);

  if (profileLoading || billing.isLoading || (billing.isPremium && setsLoading)) return <LoadingState label={billing.isLoading ? 'Verificando assinatura...' : 'Sincronizando seus estudos...'}/>;
  if (profileError || !profile || (billing.isPremium && setsError)) return <div className="auth-error-screen"><h1>Não foi possível carregar sua conta</h1><p>{profileError ?? setsError ?? 'Perfil indisponível.'}</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>;

  const notify = (type: ToastMessage['type'], message: string) => setToast({ id: newId('toast'), type, message });
  const navigate = (view: ViewId) => { setActiveView(!billing.isPremium && !freeViews.has(view) ? 'billing' : view); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const study = (set: StudySet, flashcardId?: string) => { setActiveSetId(set.id); setActiveCardId(flashcardId); navigate('flashcards'); };
  const saveSet = async (draft: Omit<StudySet, 'id'|'updatedAt'>) => { const created = await addStudySet(draft); setActiveSetId(created.id); setCreateOpen(false); notify('success', 'Conjunto salvo com segurança!'); navigate('studies'); };
  const rateCard = async (set: StudySet, cardId: string, mastery: 1|2|3) => { await saveCardProgress(user.id, set, cardId, mastery); notify('success', 'Progresso sincronizado.'); };
  const clear = async () => { if (!window.confirm('Excluir todos os seus conjuntos, flashcards e progresso? Esta ação não pode ser desfeita.')) return; await clearStudySets(); notify('info', 'Seus dados de estudo foram removidos.'); };
  const logout = async () => { clearSensitiveState(); await signOut(); };
  const finishTutorial = async () => { if (!profile.onboarding_completed) await finishOnboarding(); setReplayTutorial(false); };
  const cancelPlan = async () => { if (!window.confirm('Cancelar a renovação do StudyFlow Premium? Seu acesso será bloqueado quando o cancelamento for confirmado.')) return; await billing.cancel(); };
  const importLegacy = async () => { if (!legacySets) return; setImporting(true); try { const existingTitles = new Set(studySets.map((set) => set.title.trim().toLowerCase())); const unique = legacySets.filter((set) => !existingTitles.has(set.title.trim().toLowerCase())); for (const set of unique) await addStudySet({ title: set.title, subject: set.subject, description: set.description, color: set.color || '#6758e8', icon: set.icon || 'general', cards: set.cards.map((card) => ({ ...card, mastery: 0 })) }); localStorage.removeItem(LEGACY_KEY); setLegacySets(undefined); notify('success', `${unique.length} conjunto(s) importado(s).`); } catch (reason) { notify('error', reason instanceof Error ? reason.message : 'Falha ao importar.'); } finally { setImporting(false); } };

  const paywall = <SubscriptionPaywall subscription={billing.subscription} isStarting={billing.isStarting} isRefreshing={billing.isRefreshing} errorMessage={billing.errorMessage} onSubscribe={() => void billing.startSubscription()} onRefresh={() => void billing.refresh()} onSignOut={() => void logout()}/>;
  const premiumContent = () => {
    if (visibleView === 'home') return <>{starterWarning && <div className="starter-warning" role="status"><AlertTriangle size={17}/><span>{starterWarning}</span></div>}<HomeView studySets={filteredSets} onStudy={study} onNavigate={navigate} onCreate={() => setCreateOpen(true)}/></>;
    if (visibleView === 'studies') return <StudiesView studySets={filteredSets} onStudy={study} onCreate={() => setCreateOpen(true)}/>;
    if (visibleView === 'flashcards') return <FlashcardsView studySet={activeSet} startCardId={activeCardId} studySets={studySets} onChange={study} onUpdate={updateStudySet} onRate={rateCard} onBack={() => navigate('studies')}/>;
    if (visibleView === 'mindmaps') return <MindMapsView userId={user.id} studySets={studySets} onCreateSet={() => setCreateOpen(true)} onStudyFlashcard={study} notify={notify}/>;
    if (visibleView === 'quiz') return <QuizView studySets={studySets} userId={user.id} onError={(message) => notify('error', message)}/>;
    return <ProgressView studySets={studySets}/>;
  };
  const content = () => {
    if (visibleView === 'billing') {
      if (!billing.isPremium) return paywall;
      return <div className="view billing-view"><SubscriptionStatusCard subscription={billing.subscription} refreshing={billing.isRefreshing} cancelling={billing.isCancelling} onRefresh={() => void billing.refresh()} onCancel={() => void cancelPlan()} onSubscribe={() => void billing.startSubscription()}/></div>;
    }
    if (visibleView === 'profile') return <ProfileView profile={profile} studySets={studySets} isPremium={billing.isPremium} onBilling={() => navigate('billing')} onClear={clear} onReplayTutorial={() => setReplayTutorial(true)} onSignOut={logout}/>;
    return <SubscriptionGuard isLoading={billing.isLoading} isPremium={billing.isPremium} fallback={paywall}>{premiumContent()}</SubscriptionGuard>;
  };

  if (paymentReturnStatus) return <PaymentStatusScreen status={paymentReturnStatus} isPremium={billing.isPremium} checking={billing.isRefreshing} errorMessage={billing.errorMessage} onCheck={() => void billing.refresh()} onContinue={() => { window.history.replaceState({}, document.title, '/'); setActiveView(billing.isPremium ? 'home' : 'billing'); }}/>;

  return <div className="app-shell"><Sidebar activeView={visibleView} onNavigate={navigate} name={profile.full_name} avatarUrl={profile.avatar_url} isPremium={billing.isPremium}/><main className="main-content"><Header view={visibleView} search={search} onSearch={setSearch} onCreate={() => setCreateOpen(true)} userName={profile.full_name} showStudyActions={billing.isPremium && !freeViews.has(visibleView)}/>{content()}</main><BottomNavigation activeView={visibleView} onNavigate={navigate} isPremium={billing.isPremium}/><Modal open={billing.isPremium && createOpen} onClose={() => setCreateOpen(false)} title="Crie seu conjunto" description="Os dados serão salvos na sua conta."><CreateStudySetForm onSave={saveSet} onCancel={() => setCreateOpen(false)}/></Modal>{billing.isPremium && (!profile.onboarding_completed || replayTutorial) && <OnboardingTutorial onComplete={finishTutorial}/>}<Modal open={billing.isPremium && Boolean(legacySets)} onClose={() => { localStorage.removeItem(LEGACY_KEY); setLegacySets(undefined); }} title="Encontramos estudos neste navegador" description="Você decide se quer levá-los para sua conta."><div className="legacy-import"><p>Os dados antigos não serão enviados sem sua autorização. Conjuntos com o mesmo nome serão ignorados.</p><div><Button variant="ghost" onClick={() => { localStorage.removeItem(LEGACY_KEY); setLegacySets(undefined); }}>Descartar dados locais</Button><Button loading={importing} onClick={() => void importLegacy()}>Importar para minha conta</Button></div></div></Modal>{toast && <Toast toast={toast} onClose={() => setToast(undefined)}/>}</div>;
}
