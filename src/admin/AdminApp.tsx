import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { ApiError } from '../lib/apiClient';
import { signOut } from '../services/authService';
import {
  buildAdminQuery,
  getAdminOverview,
  getAdminSection,
  getAdminSession,
  getAdminSubscriptions,
  getAdminUser,
  getAdminUsers,
  updateAdminErrorStatus,
  updateAdminSettings,
} from '../services/adminService';
import type {
  AdminErrorItem,
  AdminMetric,
  AdminOverview,
  AdminPeriodSelection,
  AdminPaginatedSubscriptions,
  AdminPaginatedUsers,
  AdminSeriesPoint,
} from '../types/admin';
import './admin.css';

interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface AdminAppProps {
  authenticated: boolean;
  authError?: string;
  authLoading: boolean;
}

const periodOptions = [
  ['today', 'Hoje'],
  ['yesterday', 'Ontem'],
  ['7d', 'Últimos 7 dias'],
  ['30d', 'Últimos 30 dias'],
  ['90d', 'Últimos 90 dias'],
  ['month', 'Este mês'],
  ['previous_month', 'Mês anterior'],
  ['year', 'Este ano'],
  ['custom', 'Período personalizado'],
] as const;

const navigation = [
  { path: '/admin', label: 'Início', icon: LayoutDashboard },
  { path: '/admin/visao-geral', label: 'Visão geral', icon: BarChart3 },
  { path: '/admin/usuarios', label: 'Usuários', icon: Users },
  { path: '/admin/assinaturas', label: 'Assinaturas', icon: WalletCards },
  { path: '/admin/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { path: '/admin/engajamento', label: 'Engajamento', icon: Activity },
  { path: '/admin/recursos', label: 'Recursos', icon: BookOpen },
  { path: '/admin/financeiro', label: 'Financeiro', icon: CircleDollarSign },
  { path: '/admin/erros', label: 'Erros', icon: AlertTriangle },
  { path: '/admin/relatorios', label: 'Relatórios', icon: FileText },
  { path: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Início',
  '/admin/visao-geral': 'Visão geral',
  '/admin/usuarios': 'Usuários',
  '/admin/assinaturas': 'Assinaturas',
  '/admin/pagamentos': 'Pagamentos',
  '/admin/engajamento': 'Engajamento',
  '/admin/recursos': 'Recursos',
  '/admin/financeiro': 'Financeiro',
  '/admin/erros': 'Erros',
  '/admin/relatorios': 'Relatórios',
  '/admin/configuracoes': 'Configurações',
};


function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysWithoutAccess(value: string | null) {
  if (!value) return 'Nunca acessou';
  const days = Math.max(Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000), 0);
  return days === 1 ? '1 dia' : `${days} dias`;
}

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function navigateTo(path: string) {
  window.history.pushState({}, document.title, path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Não registrado';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}

function formatMetric(value: number | null, format: AdminMetric['format']) {
  if (value === null) return 'Dados indisponíveis';
  if (format === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  if (format === 'percent') return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
}

function usePathname() {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));
  useEffect(() => {
    const update = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return pathname;
}

export function AdminApp({ authenticated, authError, authLoading }: AdminAppProps) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [accessError, setAccessError] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [customStart, setCustomStart] = useState(() => dateInputValue(new Date(Date.now() - 29 * 86_400_000)));
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(new Date()));
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      setIsChecking(false);
      return;
    }

    getAdminSession()
      .then(({ admin: identity }) => setAdmin(identity))
      .catch((error: Error) => {
        if (error instanceof ApiError && error.status === 403) {
          window.location.replace('/');
          return;
        }
        setAccessError(error.message);
      })
      .finally(() => setIsChecking(false));
  }, [authenticated, authLoading]);

  const periodSelection: AdminPeriodSelection = period === 'custom' ? { period, start: customStart, end: customEnd } : { period };


  useEffect(() => {
    if (!admin) return;

    // Pré-carrega as seções mais acessadas depois que a tela inicial já começou
    // a renderizar. O cache também elimina requisições duplicadas ao trocar de aba.
    const timer = window.setTimeout(() => {
      const periodDependencies = [periodSelection.period, periodSelection.start, periodSelection.end, refreshKey];
      const prefetch = <T,>(key: string, loader: () => Promise<T>) => {
        void fetchWithAdminCache(key, loader).catch(() => undefined);
      };

      prefetch(adminCacheKey('overview', periodDependencies), () => getAdminOverview(periodSelection));
      prefetch(adminCacheKey('engagement', periodDependencies), () => getAdminSection<EngagementResponse>('engagement', periodSelection));
      prefetch(adminCacheKey('resources', periodDependencies), () => getAdminSection<ResourcesResponse>('resources', periodSelection));
      prefetch(adminCacheKey('finance', [refreshKey]), () => getAdminSection<FinanceResponse>('finance'));
      prefetch(adminCacheKey('payments', [refreshKey]), () => getAdminSection<PaymentsResponse>('payments'));
      prefetch(adminCacheKey('reports', [refreshKey]), () => getAdminSection<ReportsResponse>('reports'));
      prefetch(adminCacheKey('settings', [refreshKey]), () => getAdminSection<SettingsResponse>('settings'));
    }, 900);

    return () => window.clearTimeout(timer);
  }, [admin, periodSelection.period, periodSelection.start, periodSelection.end, refreshKey]);

  if (authLoading || isChecking) return <AdminLoading label="Validando acesso administrativo..." />;
  if (authError) return <AdminError message={authError} onRetry={() => window.location.reload()} />;
  if (!authenticated) return <AdminLoginRedirect />;
  if (accessError || !admin) return <AdminError message={accessError || 'Não foi possível validar o proprietário.'} onRetry={() => window.location.reload()} />;

  const basePath = pathname.startsWith('/admin/usuarios/') ? '/admin/usuarios' : pathname;
  const title = pathname.startsWith('/admin/usuarios/') ? 'Perfil do usuário' : pageTitles[basePath] ?? 'Painel administrativo';

  return (
    <div className="admin-shell">
      <AdminSidebar pathname={basePath} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__title">
            <button className="admin-icon-button admin-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
            <div><span>StudyFlow / Admin</span><h1>{title}</h1></div>
          </div>
          <div className="admin-topbar__actions">
            <label className="admin-global-search"><Search size={16} /><input value={globalSearch} onChange={(event: ChangeEvent<HTMLInputElement>) => setGlobalSearch(event.target.value)} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key !== 'Enter' || !globalSearch.trim()) return; window.location.assign(`/admin/usuarios${buildAdminQuery({ search: globalSearch.trim() })}`); }} placeholder="Buscar usuário" /></label>
            <label className="admin-period-field">
              <span>Período</span>
              <select value={period} onChange={(event: ChangeEvent<HTMLSelectElement>) => setPeriod(event.target.value)}>
                {periodOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {period === 'custom' && <div className="admin-custom-period"><label><span>Início</span><input type="date" value={customStart} max={customEnd} onChange={(event: ChangeEvent<HTMLInputElement>) => setCustomStart(event.target.value)} /></label><label><span>Fim</span><input type="date" value={customEnd} min={customStart} onChange={(event: ChangeEvent<HTMLInputElement>) => setCustomEnd(event.target.value)} /></label></div>}
            <button className="admin-secondary-button" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw size={16} /> Atualizar</button>
            <div className="admin-owner"><strong>{admin.name}</strong><span>{admin.email}</span></div>
          </div>
        </header>
        <main className="admin-content">
          <AdminRoute pathname={pathname} periodSelection={periodSelection} refreshKey={refreshKey} onPeriodChange={setPeriod} />
        </main>
      </div>
    </div>
  );
}

function AdminSidebar({ pathname, mobileOpen, onClose }: { pathname: string; mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      {mobileOpen && <button className="admin-backdrop" onClick={onClose} aria-label="Fechar menu" />}
      <aside className={`admin-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar__brand"><div className="admin-brand-mark">SF</div><div><strong>StudyFlow</strong><span>Admin privado</span></div><button className="admin-icon-button admin-sidebar__close" onClick={onClose}><X size={18} /></button></div>
        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path;
            return <button key={item.path} className={`admin-nav-item ${active ? 'is-active' : ''}`} onClick={() => { navigateTo(item.path); onClose(); }}><Icon size={18} /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="admin-sidebar__footer">
          <button className="admin-nav-item" onClick={() => window.location.assign('/')}><ArrowLeft size={18} /><span>Voltar ao aplicativo</span></button>
          <button className="admin-nav-item" onClick={() => void signOut()}><LogOut size={18} /><span>Sair</span></button>
        </div>
      </aside>
    </>
  );
}

function AdminRoute({ pathname, periodSelection, refreshKey, onPeriodChange }: { pathname: string; periodSelection: AdminPeriodSelection; refreshKey: number; onPeriodChange: (period: string) => void }) {
  const userMatch = pathname.match(/^\/admin\/usuarios\/([^/]+)$/);
  if (userMatch) return <UserDetailPage userId={decodeURIComponent(userMatch[1])} refreshKey={refreshKey} />;
  if (pathname === '/admin') return <HomePage periodSelection={periodSelection} refreshKey={refreshKey} onPeriodChange={onPeriodChange} />;
  if (pathname === '/admin/visao-geral') return <OverviewPage periodSelection={periodSelection} refreshKey={refreshKey} />;
  if (pathname === '/admin/usuarios') return <UsersPage refreshKey={refreshKey} />;
  if (pathname === '/admin/assinaturas') return <SubscriptionsPage refreshKey={refreshKey} />;
  if (pathname === '/admin/pagamentos') return <PaymentsPage refreshKey={refreshKey} />;
  if (pathname === '/admin/engajamento') return <EngagementPage periodSelection={periodSelection} refreshKey={refreshKey} />;
  if (pathname === '/admin/recursos') return <ResourcesPage periodSelection={periodSelection} refreshKey={refreshKey} />;
  if (pathname === '/admin/financeiro') return <FinancePage refreshKey={refreshKey} />;
  if (pathname === '/admin/erros') return <ErrorsPage refreshKey={refreshKey} />;
  if (pathname === '/admin/relatorios') return <ReportsPage periodSelection={periodSelection} refreshKey={refreshKey} />;
  if (pathname === '/admin/configuracoes') return <SettingsPage refreshKey={refreshKey} />;
  return <AdminEmpty title="Página não encontrada" description="Esta rota administrativa não existe." />;
}

function findOverviewMetric(overview: AdminOverview, id: string) {
  return overview.metrics.find((metric) => metric.id === id) ?? null;
}

function HomeMetricCard({ metric, icon }: { metric: AdminMetric | null; icon: ReactNode }) {
  if (!metric) {
    return <article className="admin-home-metric is-unavailable"><div className="admin-home-metric__icon">{icon}</div><span>Dados indisponíveis</span><strong>—</strong><small>Esta métrica ainda não está disponível.</small></article>;
  }

  const positive = (metric.changePercent ?? 0) >= 0;
  return (
    <article className={`admin-home-metric ${metric.status === 'unavailable' ? 'is-unavailable' : ''}`} title={metric.explanation}>
      <div className="admin-home-metric__icon">{icon}</div>
      <span>{metric.label}</span>
      <div className="admin-home-metric__value">
        <strong>{formatMetric(metric.value, metric.format)}</strong>
        {metric.changePercent !== null ? (
          <small className={positive ? 'is-positive' : 'is-negative'}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{positive ? '+' : '-'}{Math.abs(metric.changePercent).toFixed(1)}%</small>
        ) : <small className="is-neutral">Sem comparação</small>}
      </div>
      <p>Em relação ao período anterior</p>
    </article>
  );
}

function HomePage({ periodSelection, refreshKey, onPeriodChange }: { periodSelection: AdminPeriodSelection; refreshKey: number; onPeriodChange: (period: string) => void }) {
  const state = useAsyncData('overview', () => getAdminOverview(periodSelection), [periodSelection.period, periodSelection.start, periodSelection.end, refreshKey]);
  if (state.loading) return <div className="admin-home"><AdminSkeleton rows={7} /></div>;
  if (state.error || !state.data) return <div className="admin-home"><AdminError message={state.error || 'Dados indisponíveis.'} onRetry={state.retry} /></div>;

  const overview = state.data;
  const premiumUsers = findOverviewMetric(overview, 'premium-users')?.value ?? 0;
  const freeUsers = findOverviewMetric(overview, 'free-users')?.value ?? 0;
  const quickPeriods = [
    ['year', '12 meses'],
    ['30d', '30 dias'],
    ['7d', '7 dias'],
    ['today', '24 horas'],
  ] as const;

  const cards = [
    { metric: findOverviewMetric(overview, 'mrr'), icon: <CircleDollarSign size={20} /> },
    { metric: findOverviewMetric(overview, 'active-users'), icon: <Users size={20} /> },
    { metric: findOverviewMetric(overview, 'conversion'), icon: <BarChart3 size={20} /> },
    { metric: findOverviewMetric(overview, 'average-sessions'), icon: <Activity size={20} /> },
  ];

  return (
    <div className="admin-home">
      <div className="admin-home__metrics">
        {cards.map((item, index) => <HomeMetricCard key={item.metric?.id ?? index} metric={item.metric} icon={item.icon} />)}
      </div>

      <div className="admin-home__dashboard-grid">
        <section className="admin-home-panel admin-home-panel--analytics">
          <header>
            <div><h2>Analytics</h2><p>Crescimento real de usuários no período selecionado</p></div>
            <div className="admin-home-periods">
              {quickPeriods.map(([value, label]) => <button key={value} className={periodSelection.period === value ? 'is-active' : ''} onClick={() => onPeriodChange(value)}>{label}</button>)}
            </div>
          </header>
          <div className="admin-home-panel__body"><BarChart points={overview.userGrowth} period={periodSelection.period} /></div>
        </section>

        <section className="admin-home-panel admin-home-panel--distribution">
          <header><div><h2>Usuários por plano</h2><p>Distribuição atual entre gratuito e Premium</p></div></header>
          <div className="admin-home-panel__body"><DonutChart segments={[{ label: 'Premium', value: Number(premiumUsers) }, { label: 'Gratuitos', value: Number(freeUsers) }]} centerLabel="Usuários" /></div>
        </section>
      </div>
    </div>
  );
}

function OverviewPage({ periodSelection, refreshKey }: { periodSelection: AdminPeriodSelection; refreshKey: number }) {
  const state = useAsyncData('overview', () => getAdminOverview(periodSelection), [periodSelection.period, periodSelection.start, periodSelection.end, refreshKey]);
  if (state.loading) return <AdminSkeleton />;
  if (state.error || !state.data) return <AdminError message={state.error || 'Dados indisponíveis.'} onRetry={state.retry} />;
  const overview = state.data;
  return (
    <div className="admin-stack">
      <AdminNotice>{overview.instrumentation.activityAvailableSince}. {overview.instrumentation.paymentsReason}</AdminNotice>
      <div className="admin-metric-grid">{overview.metrics.map((item) => <MetricCard key={item.id} metric={item} />)}</div>
      <div className="admin-grid-2">
        <AdminPanel title="Crescimento de usuários" subtitle="Cadastros reais no período selecionado"><BarChart points={overview.userGrowth} /></AdminPanel>
        <AdminPanel title="Uso acumulado dos recursos" subtitle="Dados existentes nas tabelas atuais"><ResourceSummary overview={overview} /></AdminPanel>
      </div>
    </div>
  );
}

function ResourceSummary({ overview }: { overview: AdminOverview }) {
  const entries = [
    ['Flashcards', overview.resources.flashcards],
    ['Revisões', overview.resources.reviews],
    ['Mapas mentais', overview.resources.mentalMaps],
    ['Testes', overview.resources.quizzes],
  ];
  return <div className="admin-summary-list">{entries.map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{new Intl.NumberFormat('pt-BR').format(Number(value))}</strong></div>)}</div>;
}

function UsersPage({ refreshKey }: { refreshKey: number }) {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [search, setSearch] = useState(initialParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialParams.get('search') ?? '');
  const [filter, setFilter] = useState(initialParams.get('filter') ?? 'all');
  const [sort, setSort] = useState(initialParams.get('sort') ?? 'created');
  const [direction, setDirection] = useState(initialParams.get('direction') ?? 'desc');
  const [page, setPage] = useState(Math.max(Number(initialParams.get('page')) || 1, 1));
  useEffect(() => { const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    const query = buildAdminQuery({ search: debouncedSearch, filter: filter === 'all' ? undefined : filter, sort, direction, page });
    window.history.replaceState({}, document.title, `/admin/usuarios${query}`);
  }, [debouncedSearch, filter, sort, direction, page]);
  const state = useAsyncData('users', () => getAdminUsers({ search: debouncedSearch, filter, sort, direction, page, pageSize: 25 }), [debouncedSearch, filter, sort, direction, page, refreshKey]);
  return (
    <div className="admin-stack">
      <div className="admin-toolbar">
        <label className="admin-search"><Search size={17} /><input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Nome, e-mail, ID ou assinatura" /></label>
        <select value={filter} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setFilter(event.target.value); setPage(1); }}>
          <option value="all">Todos</option><option value="premium">Premium</option><option value="free">Gratuitos</option><option value="active">Ativos</option><option value="inactive">Inativos pelo limite configurado</option><option value="inactive_7d">Sem acesso há 7 dias</option><option value="inactive_14d">Sem acesso há 14 dias</option><option value="never_accessed">Nunca acessaram</option><option value="new">Novos em 7 dias</option><option value="high_engagement">Alto engajamento (10+ eventos)</option><option value="low_engagement">Baixo engajamento (até 2 eventos)</option><option value="cancelled">Assinatura cancelada</option><option value="rejected">Assinatura recusada</option>
        </select>
        <select value={`${sort}:${direction}`} onChange={(event: ChangeEvent<HTMLSelectElement>) => { const [nextSort, nextDirection] = event.target.value.split(':'); setSort(nextSort); setDirection(nextDirection); setPage(1); }}><option value="created:desc">Mais recentes</option><option value="created:asc">Mais antigos</option><option value="name:asc">Nome A–Z</option><option value="name:desc">Nome Z–A</option><option value="last_login:desc">Acesso mais recente</option><option value="last_login:asc">Acesso mais antigo</option></select>
        <a className="admin-secondary-button" href={`/api/admin/report${buildAdminQuery({ type: 'users', search: debouncedSearch, filter: filter === 'all' ? undefined : filter })}`}><Download size={16} /> Exportar CSV</a>
      </div>
      {state.loading && <AdminSkeleton rows={8} />}
      {state.error && <AdminError message={state.error} onRetry={state.retry} />}
      {state.data && <UsersTable result={state.data} page={page} onPage={setPage} />}
    </div>
  );
}

function UsersTable({ result, page, onPage }: { result: AdminPaginatedUsers; page: number; onPage: (page: number) => void }) {
  if (!result.users.length) return <AdminEmpty title="Nenhum usuário encontrado" description="Altere os filtros ou aguarde novos cadastros." />;
  return <AdminPanel title={`${result.total} usuários`} subtitle="Busca, filtro e paginação executados no servidor">
    <div className="admin-table-wrap"><table><thead><tr><th>Usuário</th><th>Plano</th><th>Cadastro</th><th>Último acesso</th><th>Dias sem acessar</th><th>Progresso médio</th><th>Flashcards</th><th>Mapas</th><th>Testes</th><th>Sessões</th></tr></thead><tbody>
      {result.users.map((user) => <tr key={user.id} onClick={() => navigateTo(`/admin/usuarios/${encodeURIComponent(user.id)}`)} className="admin-clickable-row"><td><strong>{user.name}</strong><span>{user.email}</span></td><td><strong>{user.plan}</strong><span>{user.subscriptionStatus}</span></td><td>{formatDate(user.createdAt)}</td><td>{formatDate(user.lastLoginAt)}</td><td>{daysWithoutAccess(user.lastLoginAt)}</td><td>{formatMetric(user.progressPercentage, 'percent')}</td><td>{user.flashcards}</td><td>{user.mentalMaps}</td><td>{user.quizzes}</td><td>{user.sessions}</td></tr>)}
    </tbody></table></div><Pagination page={page} pageSize={result.pageSize} total={result.total} onPage={onPage} />
  </AdminPanel>;
}

function UserDetailPage({ userId, refreshKey }: { userId: string; refreshKey: number }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const state = useAsyncData(`user:${userId}`, () => getAdminUser(userId), [userId, refreshKey]);
  if (state.loading) return <AdminSkeleton />;
  if (state.error || !state.data) return <AdminError message={state.error || 'Usuário não encontrado.'} onRetry={state.retry} />;
  const user = state.data;
  const copyId = async () => { await navigator.clipboard.writeText(user.id); setCopySuccess(true); window.setTimeout(() => setCopySuccess(false), 1800); };
  return <div className="admin-stack">
    <button className="admin-text-button" onClick={() => navigateTo('/admin/usuarios')}><ArrowLeft size={16} /> Voltar para usuários</button>
    <AdminPanel title={user.name} subtitle={user.email} action={<button className="admin-secondary-button" onClick={() => void copyId()}>{copySuccess ? 'ID copiado' : 'Copiar ID'}</button>}>
      <div className="admin-detail-grid"><Detail label="ID" value={user.id} /><Detail label="Cadastro" value={formatDate(user.createdAt)} /><Detail label="Último acesso" value={formatDate(user.lastLoginAt)} /><Detail label="Status" value={user.accountStatus} /></div>
    </AdminPanel>
    <div className="admin-metric-grid">{Object.entries(user.stats).map(([key, value]) => <MetricCard key={key} metric={{ id: key, label: statLabel(key), value, previous: null, changePercent: null, format: key === 'quizAccuracy' ? 'percent' : 'number', explanation: 'Calculado a partir dos registros reais do usuário.', status: 'available' }} />)}</div>
    <div className="admin-grid-2">
      <AdminPanel title="Assinatura" subtitle="Status sincronizado com a estrutura atual do Mercado Pago">{user.subscription ? <div className="admin-summary-list"><Detail label="Plano" value={user.subscription.planName} /><Detail label="Status" value={user.subscription.status} /><Detail label="Valor" value={formatMetric(user.subscription.amount, 'currency')} /><Detail label="ID externo" value={user.subscription.externalId ?? 'Não informado'} /><Detail label="Próxima cobrança" value={formatDate(user.subscription.nextPaymentAt)} /></div> : <AdminEmpty title="Sem assinatura" description="Este usuário não possui registro de assinatura." />}</AdminPanel>
      <AdminPanel title="Pagamentos" subtitle="Histórico financeiro individual"> <AdminUnavailable reason={user.payments.reason} /></AdminPanel>
    </div>
    <AdminPanel title="Linha do tempo" subtitle="Eventos registrados a partir da implantação da instrumentação">{user.activity.length ? <div className="admin-timeline">{user.activity.map((event, index) => <div key={`${event.createdAt}-${index}`}><span>{formatDate(event.createdAt)}</span><strong>{event.type}</strong><small>{event.resourceType ?? 'atividade'}</small></div>)}</div> : <AdminEmpty title="Sem eventos registrados" description="O histórico começará a ser preenchido após a implantação." />}</AdminPanel>
  </div>;
}

function SubscriptionsPage({ refreshKey }: { refreshKey: number }) {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [search, setSearch] = useState(initialParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialParams.get('search') ?? '');
  const [status, setStatus] = useState(initialParams.get('status') ?? 'all');
  const [page, setPage] = useState(Math.max(Number(initialParams.get('page')) || 1, 1));
  useEffect(() => { const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    const query = buildAdminQuery({ search: debouncedSearch, status: status === 'all' ? undefined : status, page });
    window.history.replaceState({}, document.title, `/admin/assinaturas${query}`);
  }, [debouncedSearch, status, page]);
  const state = useAsyncData('subscriptions', () => getAdminSubscriptions({ search: debouncedSearch, status, page, pageSize: 25 }), [debouncedSearch, status, page, refreshKey]);
  return <div className="admin-stack">
    <AdminNotice>Nenhuma ação financeira manual foi criada. O status exibido vem do registro sincronizado com o Mercado Pago.</AdminNotice>
    <div className="admin-toolbar"><label className="admin-search"><Search size={17} /><input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Usuário, e-mail ou ID" /></label><select value={status} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setStatus(event.target.value); setPage(1); }}><option value="all">Todos os status</option><option value="active">Ativa</option><option value="pending">Pendente</option><option value="cancelled">Cancelada</option><option value="rejected">Recusada</option><option value="paused">Pausada</option></select><a className="admin-secondary-button" href={`/api/admin/report${buildAdminQuery({ type: 'subscriptions', search: debouncedSearch, status: status === 'all' ? undefined : status })}`}><Download size={16} /> Exportar CSV</a></div>
    {state.loading && <AdminSkeleton rows={8} />}{state.error && <AdminError message={state.error} onRetry={state.retry} />}{state.data && <SubscriptionsTable result={state.data} page={page} onPage={setPage} />}
  </div>;
}

function SubscriptionsTable({ result, page, onPage }: { result: AdminPaginatedSubscriptions; page: number; onPage: (page: number) => void }) {
  if (!result.subscriptions.length) return <AdminEmpty title="Nenhuma assinatura encontrada" description="Não existem registros para os filtros selecionados." />;
  return <AdminPanel title={`${result.total} assinaturas`} subtitle="Dados reais da tabela subscriptions"><div className="admin-table-wrap"><table><thead><tr><th>Usuário</th><th>Status</th><th>Valor</th><th>Início</th><th>Próxima cobrança</th><th>Cancelamento</th><th>ID Mercado Pago</th></tr></thead><tbody>{result.subscriptions.map((item) => <tr key={item.id}><td><strong>{item.userName}</strong><span>{item.email}</span></td><td>{item.status}</td><td>{formatMetric(item.amount, 'currency')}</td><td>{formatDate(item.startedAt)}</td><td>{formatDate(item.nextPaymentAt)}</td><td>{formatDate(item.cancelledAt)}</td><td><code>{item.externalId ?? '—'}</code></td></tr>)}</tbody></table></div><Pagination page={page} pageSize={result.pageSize} total={result.total} onPage={onPage} /></AdminPanel>;
}

interface PaymentsResponse { payments: { available: boolean; reason: string; implementationRequired: string } }
function PaymentsPage({ refreshKey }: { refreshKey: number }) {
  const state = useAsyncData('payments', () => getAdminSection<PaymentsResponse>('payments'), [refreshKey]);
  if (state.loading) return <AdminSkeleton />;
  if (state.error || !state.data) return <AdminError message={state.error || 'Erro ao carregar.'} onRetry={state.retry} />;
  return <AdminPanel title="Pagamentos individuais" subtitle="Receita, taxas, liquidações e reembolsos"><AdminUnavailable reason={`${state.data.payments.reason} ${state.data.payments.implementationRequired}`} /></AdminPanel>;
}

interface EngagementResponse { engagement: { metrics: { activeUsers: number; sessions: number; averageSessionsPerActiveUser: number; retentionD1: number | null; retentionD7: number | null; retentionD30: number | null }; notice: string; topUsers: Array<{ id: string; name: string; email: string; events: number }>; abandonedUsers: Array<{ id: string; name: string; email: string; lastLoginAt: string | null }>; activeSeries: AdminSeriesPoint[] } }
function EngagementPage({ periodSelection, refreshKey }: { periodSelection: AdminPeriodSelection; refreshKey: number }) {
  const state = useAsyncData('engagement', () => getAdminSection<EngagementResponse>('engagement', periodSelection), [periodSelection.period, periodSelection.start, periodSelection.end, refreshKey]);
  if (state.loading) return <AdminSkeleton />;
  if (state.error || !state.data) return <AdminError message={state.error || 'Erro ao carregar.'} onRetry={state.retry} />;
  const data = state.data.engagement;
  const metrics: AdminMetric[] = [
    { id: 'active', label: 'Usuários ativos', value: data.metrics.activeUsers, previous: null, changePercent: null, format: 'number', explanation: 'Usuários únicos com eventos no período.', status: 'available' },
    { id: 'sessions', label: 'Sessões', value: data.metrics.sessions, previous: null, changePercent: null, format: 'number', explanation: 'Eventos session_started.', status: 'available' },
    { id: 'avg', label: 'Sessões por usuário ativo', value: data.metrics.averageSessionsPerActiveUser, previous: null, changePercent: null, format: 'number', explanation: 'Sessões divididas pelos usuários ativos.', status: 'available' },
    { id: 'd1', label: 'Retenção D1', value: data.metrics.retentionD1, previous: null, changePercent: null, format: 'percent', explanation: 'Retorno um dia após o cadastro.', status: data.metrics.retentionD1 === null ? 'unavailable' : 'available' },
    { id: 'd7', label: 'Retenção D7', value: data.metrics.retentionD7, previous: null, changePercent: null, format: 'percent', explanation: 'Retorno sete dias após o cadastro.', status: data.metrics.retentionD7 === null ? 'unavailable' : 'available' },
    { id: 'd30', label: 'Retenção D30', value: data.metrics.retentionD30, previous: null, changePercent: null, format: 'percent', explanation: 'Retorno trinta dias após o cadastro.', status: data.metrics.retentionD30 === null ? 'unavailable' : 'available' },
  ];
  return <div className="admin-stack"><AdminNotice>{data.notice}</AdminNotice><div className="admin-metric-grid">{metrics.map((item) => <MetricCard key={item.id} metric={item} />)}</div><div className="admin-grid-2"><AdminPanel title="Ativos por dia"><BarChart points={data.activeSeries} /></AdminPanel><AdminPanel title="Usuários mais ativos"><SimpleUserList users={data.topUsers.map((user) => ({ ...user, value: `${user.events} eventos` }))} /></AdminPanel></div><AdminPanel title="Usuários sem acesso recente"><SimpleUserList users={data.abandonedUsers.map((user) => ({ ...user, value: formatDate(user.lastLoginAt) }))} /></AdminPanel></div>;
}

interface ResourcesResponse { resources: { flashcards: { created: number; reviewed: number; uniqueUsers: number }; mentalMaps: { created: number; uniqueUsers: number }; quizzes: { completed: number; uniqueUsers: number; averageAccuracy: number }; ai: { available: boolean; reason: string }; series: Array<{ date: string; flashcards: number; mentalMaps: number; quizzes: number }> } }
function ResourcesPage({ periodSelection, refreshKey }: { periodSelection: AdminPeriodSelection; refreshKey: number }) {
  const state = useAsyncData('resources', () => getAdminSection<ResourcesResponse>('resources', periodSelection), [periodSelection.period, periodSelection.start, periodSelection.end, refreshKey]);
  if (state.loading) return <AdminSkeleton />;
  if (state.error || !state.data) return <AdminError message={state.error || 'Erro ao carregar.'} onRetry={state.retry} />;
  const data = state.data.resources;
  return <div className="admin-stack"><div className="admin-grid-3"><AdminPanel title="Flashcards"><div className="admin-summary-list"><Detail label="Criados" value={String(data.flashcards.created)} /><Detail label="Revisões" value={String(data.flashcards.reviewed)} /><Detail label="Usuários únicos" value={String(data.flashcards.uniqueUsers)} /></div></AdminPanel><AdminPanel title="Mapas mentais"><div className="admin-summary-list"><Detail label="Criados" value={String(data.mentalMaps.created)} /><Detail label="Usuários únicos" value={String(data.mentalMaps.uniqueUsers)} /></div></AdminPanel><AdminPanel title="Testes"><div className="admin-summary-list"><Detail label="Realizados" value={String(data.quizzes.completed)} /><Detail label="Usuários únicos" value={String(data.quizzes.uniqueUsers)} /><Detail label="Média de acertos" value={formatMetric(data.quizzes.averageAccuracy, 'percent')} /></div></AdminPanel></div><AdminPanel title="Inteligência artificial"><AdminUnavailable reason={data.ai.reason} /></AdminPanel></div>;
}

interface FinanceResponse { finance: { contracted: { activeSubscriptions: number; pendingSubscriptions: number; cancelledSubscriptions: number; rejectedSubscriptions: number; mrr: number; averageContract: number }; realizedRevenue: { available: boolean; reason: string }; aiCosts: { available: boolean; reason: string } } }
function FinancePage({ refreshKey }: { refreshKey: number }) {
  const state = useAsyncData('finance', () => getAdminSection<FinanceResponse>('finance'), [refreshKey]);
  if (state.loading) return <AdminSkeleton />;
  if (state.error || !state.data) return <AdminError message={state.error || 'Erro ao carregar.'} onRetry={state.retry} />;
  const data = state.data.finance;
  const metrics: AdminMetric[] = [
    { id: 'mrr', label: 'MRR contratado', value: data.contracted.mrr, previous: null, changePercent: null, format: 'currency', explanation: 'Soma dos valores mensais das assinaturas ativas.', status: 'available' },
    { id: 'avg', label: 'Contrato médio', value: data.contracted.averageContract, previous: null, changePercent: null, format: 'currency', explanation: 'Média do valor das assinaturas ativas.', status: 'available' },
    { id: 'active', label: 'Assinaturas ativas', value: data.contracted.activeSubscriptions, previous: null, changePercent: null, format: 'number', explanation: 'Status active.', status: 'available' },
    { id: 'pending', label: 'Assinaturas pendentes', value: data.contracted.pendingSubscriptions, previous: null, changePercent: null, format: 'number', explanation: 'Status pending.', status: 'available' },
  ];
  const statusSegments: DonutSegment[] = [
    { label: 'Ativas', value: data.contracted.activeSubscriptions },
    { label: 'Pendentes', value: data.contracted.pendingSubscriptions },
    { label: 'Canceladas', value: data.contracted.cancelledSubscriptions },
    { label: 'Recusadas', value: data.contracted.rejectedSubscriptions },
  ];
  return <div className="admin-stack"><AdminNotice>Valores contratados não são tratados como receita liquidada.</AdminNotice><div className="admin-metric-grid">{metrics.map((item) => <MetricCard key={item.id} metric={item} />)}</div><div className="admin-grid-3"><AdminPanel title="Assinaturas por status" subtitle="Distribuição real das assinaturas cadastradas"><DonutChart segments={statusSegments} centerLabel="Total" /></AdminPanel><AdminPanel title="Receita realizada"><AdminUnavailable reason={data.realizedRevenue.reason} /></AdminPanel><AdminPanel title="Custos de IA"><AdminUnavailable reason={data.aiCosts.reason} /></AdminPanel></div></div>;
}

interface ErrorsResponse { result: { page: number; pageSize: number; total: number; errors: AdminErrorItem[]; notice: string } }
function ErrorsPage({ refreshKey }: { refreshKey: number }) {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [page, setPage] = useState(Math.max(Number(initialParams.get('page')) || 1, 1));
  const [status, setStatus] = useState(initialParams.get('status') ?? 'all');
  const [localRefresh, setLocalRefresh] = useState(0);
  const [actionError, setActionError] = useState('');
  const state = useAsyncData('errors', () => getAdminSection<ErrorsResponse>(`errors?status=${encodeURIComponent(status)}&page=${page}&pageSize=25`), [status, page, refreshKey, localRefresh]);
  useEffect(() => { const query = buildAdminQuery({ status: status === 'all' ? undefined : status, page }); window.history.replaceState({}, document.title, `/admin/erros${query}`); }, [status, page]);
  const changeStatus = async (id: string, nextStatus: string) => { setActionError(''); try { await updateAdminErrorStatus(id, nextStatus); setLocalRefresh((value) => value + 1); } catch (error) { setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar o status.'); } };
  if (state.loading) return <AdminSkeleton rows={8} />;
  if (state.error || !state.data) return <AdminError message={state.error || 'Erro ao carregar.'} onRetry={state.retry} />;
  const data = state.data.result;
  return <div className="admin-stack"><AdminNotice>{data.notice}</AdminNotice>{actionError && <p className="admin-error-message">{actionError}</p>}<div className="admin-toolbar"><select value={status} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setStatus(event.target.value); setPage(1); }}><option value="all">Todos</option><option value="new">Novos</option><option value="investigating">Investigando</option><option value="resolved">Resolvidos</option><option value="ignored">Ignorados</option></select><a className="admin-secondary-button" href={`/api/admin/report${buildAdminQuery({ type: 'errors', status: status === 'all' ? undefined : status })}`}><Download size={16} /> Exportar CSV</a></div>{data.errors.length ? <AdminPanel title={`${data.total} erros agrupados`}><div className="admin-table-wrap"><table><thead><tr><th>Mensagem</th><th>Categoria</th><th>Página</th><th>Navegador</th><th>Dispositivo</th><th>Ocorrências</th><th>Status</th><th>Última ocorrência</th></tr></thead><tbody>{data.errors.map((item) => <tr key={item.id}><td><strong>{item.message}</strong><span>{item.userId ?? 'Sem usuário'}</span></td><td>{item.category}</td><td>{item.page ?? '—'}</td><td><code>{item.browser ?? '—'}</code></td><td>{item.device ?? '—'}</td><td>{item.occurrences}</td><td><select value={item.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => void changeStatus(item.id, event.target.value)}><option value="new">Novo</option><option value="investigating">Investigando</option><option value="resolved">Resolvido</option><option value="ignored">Ignorado</option></select></td><td>{formatDate(item.lastOccurredAt)}</td></tr>)}</tbody></table></div><Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} /></AdminPanel> : <AdminEmpty title="Nenhum erro registrado" description="O monitoramento começa após a implantação desta versão." />}</div>;
}

interface ReportsResponse { reports: Array<{ type: string; label: string; available: boolean; reason?: string }> }
function ReportsPage({ periodSelection, refreshKey }: { periodSelection: AdminPeriodSelection; refreshKey: number }) {
  const state = useAsyncData('reports', () => getAdminSection<ReportsResponse>('reports'), [refreshKey]);
  if (state.loading) return <AdminSkeleton />;
  if (state.error || !state.data) return <AdminError message={state.error || 'Erro ao carregar.'} onRetry={state.retry} />;
  return <div className="admin-report-grid">{state.data.reports.map((report) => <AdminPanel key={report.type} title={report.label} subtitle={report.available ? 'CSV gerado no servidor com autorização revalidada' : report.reason}>{report.available ? <a className="admin-primary-button" href={`/api/admin/report${buildAdminQuery({ type: report.type, period: periodSelection.period, start: periodSelection.start, end: periodSelection.end })}`}><Download size={16} /> Baixar CSV</a> : <AdminUnavailable reason={report.reason ?? 'Indisponível'} />}</AdminPanel>)}</div>;
}

interface SettingsResponse { settings: { values: Record<string, unknown>; editableKeys: string[] } }
function SettingsPage({ refreshKey }: { refreshKey: number }) {
  const state = useAsyncData('settings', () => getAdminSection<SettingsResponse>('settings'), [refreshKey]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  useEffect(() => { if (state.data) setValues(state.data.settings.values); }, [state.data]);
  const save = async () => {
    setSaving(true); setSuccess(''); setSaveError('');
    try {
      const result = await updateAdminSettings(values);
      setValues(result.settings.values);
      adminDataCache.set(adminCacheKey('settings', [refreshKey]), result);
      setSuccess('Configurações salvas e registradas na auditoria.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };
  if (state.loading) return <AdminSkeleton />;
  if (state.error || !state.data) return <AdminError message={state.error || 'Erro ao carregar.'} onRetry={state.retry} />;
  return <AdminPanel title="Configurações administrativas" subtitle="Somente preferências realmente utilizadas pelo painel. Segredos não são exibidos."><div className="admin-form-grid"><label><span>Dias para considerar inatividade</span><input type="number" min="1" max="365" value={Number(values.inactivity_days ?? 30)} onChange={(event: ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, inactivity_days: Number(event.target.value) }))} /><small>Este valor altera os filtros de usuários ativos e inativos no backend.</small></label></div>{success && <p className="admin-success-message">{success}</p>}{saveError && <p className="admin-error-message">{saveError}</p>}<button className="admin-primary-button" disabled={saving} onClick={() => void save()}>{saving ? 'Salvando...' : 'Salvar configurações'}</button></AdminPanel>;
}

// Cache em memória por sessão do painel: guarda o último resultado bem-sucedido
// de cada seção/filtro para que trocar de aba não refaça a mesma requisição.
// "Atualizar" (refreshKey) e qualquer mudança de filtro sempre geram uma nova
// chave, então nunca mostram dado desatualizado por engano.
const adminDataCache = new Map<string, unknown>();
const adminInFlightRequests = new Map<string, Promise<unknown>>();

function adminCacheKey(namespace: string, dependencies: ReadonlyArray<unknown>) {
  return `${namespace}:${JSON.stringify(dependencies)}`;
}

function fetchWithAdminCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (adminDataCache.has(key)) return Promise.resolve(adminDataCache.get(key) as T);
  const pending = adminInFlightRequests.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const request = loader()
    .then((value) => { adminDataCache.set(key, value); return value; })
    .finally(() => { adminInFlightRequests.delete(key); });
  adminInFlightRequests.set(key, request);
  return request;
}

function useAsyncData<T>(namespace: string, loader: () => Promise<T>, dependencies: ReadonlyArray<unknown>) {
  const key = adminCacheKey(namespace, dependencies);
  const [data, setData] = useState<T | undefined>(() => adminDataCache.get(key) as T | undefined);
  const [loading, setLoading] = useState(() => !adminDataCache.has(key));
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let mounted = true;
    const cached = adminDataCache.has(key) ? (adminDataCache.get(key) as T) : undefined;
    setData(cached);
    setLoading(!adminDataCache.has(key));
    setError('');
    fetchWithAdminCache(key, loaderRef.current)
      .then((value) => { if (mounted) setData(value); })
      .catch((reason: Error) => { if (mounted) setError(reason.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [key, retryKey]);

  return {
    data,
    loading,
    error,
    retry: () => { adminDataCache.delete(key); setRetryKey((value) => value + 1); },
  };
}

function MetricCard({ metric }: { metric: AdminMetric }) {
  const positive = (metric.changePercent ?? 0) >= 0;
  return <article className={`admin-metric-card ${metric.status === 'unavailable' ? 'is-unavailable' : ''}`} title={metric.explanation}><span>{metric.label}</span><strong>{formatMetric(metric.value, metric.format)}</strong>{metric.changePercent !== null && <small className={positive ? 'is-positive' : 'is-negative'}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(metric.changePercent).toFixed(1)}% vs. período anterior</small>}<p>{metric.explanation}</p></article>;
}

function formatChartNumber(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value / 1_000_000)}M`;
  if (Math.abs(value) >= 1_000) return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value / 1_000)}K`;
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
}

function parseChartDate(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  return new Date(normalized);
}

function chartDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function niceChartMaximum(value: number) {
  if (value <= 1) return 4;
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

interface PreparedChartPoint {
  date: string;
  label: string;
  fullLabel: string;
  value: number;
}

function prepareChartPoints(points: AdminSeriesPoint[], period?: string): PreparedChartPoint[] {
  if (!period) {
    return points.map((point) => ({
      date: point.date,
      label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(parseChartDate(point.date)),
      fullLabel: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(parseChartDate(point.date)),
      value: point.value,
    }));
  }

  const sourceByDay = new Map<string, number>();
  for (const point of points) {
    const date = parseChartDate(point.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = chartDateKey(date);
    sourceByDay.set(key, (sourceByDay.get(key) ?? 0) + point.value);
  }

  if (period === 'year') {
    const now = new Date();
    const result: PreparedChartPoint[] = [];
    for (let offset = 11; offset >= 0; offset -= 1) {
      const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1, 12));
      const year = monthDate.getUTCFullYear();
      const month = monthDate.getUTCMonth();
      let value = 0;
      for (const point of points) {
        const pointDate = parseChartDate(point.date);
        if (pointDate.getUTCFullYear() === year && pointDate.getUTCMonth() === month) value += point.value;
      }
      result.push({
        date: chartDateKey(monthDate),
        label: new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(monthDate).replace('.', ''),
        fullLabel: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate),
        value,
      });
    }
    return result;
  }

  const dayCount = period === '7d' ? 7 : period === '30d' ? 30 : 1;
  const end = new Date();
  end.setUTCHours(12, 0, 0, 0);
  const result: PreparedChartPoint[] = [];
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - offset);
    const key = chartDateKey(date);
    result.push({
      date: key,
      label: dayCount > 1 ? String(dayCount - offset) : 'Hoje',
      fullLabel: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(date),
      value: sourceByDay.get(key) ?? 0,
    });
  }
  return result;
}

function BarChart({ points, period }: { points: AdminSeriesPoint[]; period?: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartPoints = useMemo(() => prepareChartPoints(points, period), [points, period]);
  const maxValue = Math.max(...chartPoints.map((point) => point.value), 0);
  const axisMax = niceChartMaximum(maxValue);
  const width = 1120;
  const height = 330;
  const margin = { top: 22, right: 14, bottom: 42, left: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const slotWidth = plotWidth / Math.max(chartPoints.length, 1);
  const barWidth = Math.min(Math.max(slotWidth * 0.48, 8), 18);
  const tickCount = 4;
  const labelEvery = chartPoints.length > 31 ? Math.ceil(chartPoints.length / 12) : 1;

  if (!chartPoints.length) return <AdminEmpty title="Sem registros no período" description="O gráfico será preenchido quando houver dados." />;

  return (
    <div className="admin-chart admin-barchart" onMouseLeave={() => setHoveredIndex(null)}>
      <svg className="admin-barchart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Crescimento de usuários no período">
        {Array.from({ length: tickCount + 1 }, (_, index) => {
          const ratio = index / tickCount;
          const y = margin.top + plotHeight * ratio;
          const value = Math.round(axisMax * (1 - ratio));
          return (
            <g key={index}>
              <line className="admin-barchart__grid-line" x1={margin.left} x2={width - margin.right} y1={y} y2={y} />
              <text className="admin-barchart__y-label" x={margin.left - 16} y={y + 4} textAnchor="end">{formatChartNumber(value)}</text>
            </g>
          );
        })}

        {chartPoints.map((point, index) => {
          const barHeight = point.value > 0 ? Math.max((point.value / axisMax) * plotHeight, 3) : 0;
          const x = margin.left + slotWidth * index + (slotWidth - barWidth) / 2;
          const y = margin.top + plotHeight - barHeight;
          const active = hoveredIndex === index;
          const showLabel = index % labelEvery === 0 || index === chartPoints.length - 1;
          return (
            <g key={`${point.date}-${index}`} className={`admin-barchart__datum ${active ? 'is-active' : ''}`} onMouseEnter={() => setHoveredIndex(index)}>
              <rect className="admin-barchart__hit-area" x={margin.left + slotWidth * index} y={margin.top} width={slotWidth} height={plotHeight + 30} />
              {point.value > 0 && <rect className="admin-barchart__bar" x={x} y={y} width={barWidth} height={barHeight} rx="4" ry="4" />}
              {showLabel && <text className="admin-barchart__x-label" x={margin.left + slotWidth * index + slotWidth / 2} y={height - 13} textAnchor="middle">{point.label}</text>}
              <title>{`${point.fullLabel}: ${new Intl.NumberFormat('pt-BR').format(point.value)}`}</title>
            </g>
          );
        })}

        {hoveredIndex !== null && (() => {
          const point = chartPoints[hoveredIndex];
          const centerX = margin.left + slotWidth * hoveredIndex + slotWidth / 2;
          const barHeight = point.value > 0 ? Math.max((point.value / axisMax) * plotHeight, 3) : 0;
          const topY = margin.top + plotHeight - barHeight;
          const tooltipWidth = 134;
          const tooltipHeight = 52;
          const tooltipX = Math.min(Math.max(centerX - tooltipWidth / 2, margin.left), width - margin.right - tooltipWidth);
          const tooltipY = Math.max(topY - tooltipHeight - 10, 4);
          return (
            <g className="admin-barchart__tooltip" pointerEvents="none">
              <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="8" />
              <text x={tooltipX + 12} y={tooltipY + 20}>{point.fullLabel}</text>
              <text className="admin-barchart__tooltip-value" x={tooltipX + 12} y={tooltipY + 39}>{new Intl.NumberFormat('pt-BR').format(point.value)} usuários</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

const donutPalette = ['#3b5bfd', '#86a7ff', '#d7e0ff', '#6884ff', '#aebfff'];

interface DonutSegment { label: string; value: number }
function DonutChart({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) return <AdminEmpty title="Sem dados para exibir" description="Este gráfico será preenchido quando houver registros." />;

  const size = 240;
  const center = size / 2;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="admin-donut">
      <div className="admin-donut__visual" onMouseLeave={() => setActiveIndex(null)}>
        <svg className="admin-donut__svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Distribuição de ${centerLabel}`}>
          <circle className="admin-donut__track" cx={center} cy={center} r={radius} />
          {segments.map((segment, index) => {
            const ratio = segment.value / total;
            const segmentLength = Math.max(circumference * ratio - (segment.value > 0 ? 3 : 0), 0);
            const dashOffset = -accumulated;
            accumulated += circumference * ratio;
            return (
              <circle
                key={segment.label}
                className={`admin-donut__segment ${activeIndex === index ? 'is-active' : ''}`}
                cx={center}
                cy={center}
                r={radius}
                stroke={donutPalette[index % donutPalette.length]}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={dashOffset}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <title>{`${segment.label}: ${segment.value} (${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(ratio * 100)}%)`}</title>
              </circle>
            );
          })}
          <text className="admin-donut__center-label" x={center} y={center - 9} textAnchor="middle">{centerLabel}</text>
          <text className="admin-donut__center-value" x={center} y={center + 22} textAnchor="middle">{new Intl.NumberFormat('pt-BR').format(total)}</text>
        </svg>
      </div>
      <div className="admin-donut__legend">
        {segments.map((segment, index) => {
          const percentage = (segment.value / total) * 100;
          return (
            <button key={segment.label} type="button" className={`admin-donut__legend-item ${activeIndex === index ? 'is-active' : ''}`} onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)}>
              <i style={{ background: donutPalette[index % donutPalette.length] }} />
              <span>{segment.label}</span>
              <b>{new Intl.NumberFormat('pt-BR').format(segment.value)}</b>
              <small>{new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(percentage)}%</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AdminPanel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="admin-panel"><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header><div className="admin-panel__body">{children}</div></section>;
}

function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  return <div className="admin-pagination"><span>Página {page} de {pages}</span><div><button disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /> Anterior</button><button disabled={page >= pages} onClick={() => onPage(page + 1)}>Próxima <ChevronRight size={16} /></button></div></div>;
}


function AdminLoginRedirect() {
  useEffect(() => {
    window.location.replace(`/api/auth/google?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
  }, []);
  return <AdminLoading label="Abrindo login seguro..." />;
}

function AdminLoading({ label }: { label: string }) { return <main className="admin-standalone-state"><RefreshCw className="spin" size={26} /><h1>{label}</h1></main>; }
function AdminError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="admin-state admin-state--error"><AlertTriangle size={28} /><h2>Não foi possível carregar</h2><p>{message}</p><button className="admin-primary-button" onClick={onRetry}>Tentar novamente</button></div>; }
function AdminEmpty({ title, description }: { title: string; description: string }) { return <div className="admin-state"><BarChart3 size={28} /><h3>{title}</h3><p>{description}</p></div>; }
function AdminUnavailable({ reason }: { reason: string }) { return <div className="admin-unavailable"><AlertTriangle size={22} /><div><strong>Dados ainda não disponíveis</strong><p>{reason}</p></div></div>; }
function AdminNotice({ children }: { children: ReactNode }) { return <div className="admin-notice"><AlertTriangle size={18} /><p>{children}</p></div>; }
function AdminSkeleton({ rows = 4 }: { rows?: number }) { return <div className="admin-skeleton" aria-label="Carregando dados">{Array.from({ length: rows }, (_, index) => <div key={index} />)}</div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="admin-detail"><span>{label}</span><strong>{value}</strong></div>; }
function SimpleUserList({ users }: { users: Array<{ id: string; name: string; email: string; value: string }> }) { return users.length ? <div className="admin-user-list">{users.map((user) => <button key={user.id} onClick={() => navigateTo(`/admin/usuarios/${encodeURIComponent(user.id)}`)}><div><strong>{user.name}</strong><span>{user.email}</span></div><b>{user.value}</b></button>)}</div> : <AdminEmpty title="Sem usuários" description="Não há dados para este período." />; }
function statLabel(key: string) { return ({ studySets: 'Conjuntos', flashcards: 'Flashcards', reviews: 'Revisões', mentalMaps: 'Mapas mentais', quizzes: 'Testes', quizAccuracy: 'Média de acertos', progressPercentage: 'Progresso médio', sessions: 'Sessões', activeDays: 'Dias ativos' } as Record<string, string>)[key] ?? key; }
