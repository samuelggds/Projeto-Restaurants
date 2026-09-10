import {
  BarChart3,
  Building2,
  CreditCard,
  FileSearch,
  Headphones,
  Inbox,
  Layers3,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  AdministratorDetails,
  AuditDetails,
  CreateAdministratorDialog,
  EditPlanDialog,
  InvoiceDetails,
  SupportConversation,
} from './components/ActionDialogs';
import { RestaurantDetailsSecure } from './components/RestaurantDetailsSecure';
import {
  AdministratorsPage,
  AuditPage,
  BillingPage,
  OverviewPage,
  PlansPage,
  RestaurantsPage,
  SettingsPage,
  SubscriptionsPage,
  SupportPage,
} from './pages';
import type { SuperAdminModuleProps, SuperAdminView } from './types';
import { SalesLeadsPage } from './pages/SalesLeadsPage';
import * as S from './SuperAdmin.styles';
import { QuickSearch } from './components/QuickSearch';
import type { QuickSearchTarget } from './domain/quickSearch';

const navigation = [
  ['overview', 'Visão geral', BarChart3],
  ['sales-leads', 'Contatos comerciais', Inbox],
  ['restaurants', 'Restaurantes', Building2],
  ['subscriptions', 'Assinaturas', CreditCard],
  ['plans', 'Planos', Layers3],
  ['billing', 'Faturamento', WalletCards],
  ['administrators', 'Administradores', Users],
  ['support', 'Suporte', Headphones],
  ['audit', 'Auditoria', FileSearch],
  ['settings', 'Configurações', Settings],
] as const;

const navigationSections: Partial<Record<SuperAdminView, string>> = {
  overview: 'Visão da plataforma',
  restaurants: 'Gestão',
  support: 'Administração',
};

const titles: Record<SuperAdminView, [title: string, description: string]> = {
  'sales-leads': [
    'Contatos comerciais',
    'Acompanhe o interesse de novos restaurantes e organize o retorno da equipe comercial.',
  ],
  overview: [
    'Visão geral da plataforma',
    'Acompanhe restaurantes, assinaturas, cobranças e pontos que exigem atenção.',
  ],
  restaurants: [
    'Restaurantes',
    'Consulte cada tenant, seu responsável, plano, acesso e histórico operacional.',
  ],
  subscriptions: [
    'Assinaturas',
    'Gerencie ciclos, trials, renovações, atrasos e bloqueios de acesso.',
  ],
  plans: ['Planos', 'Defina preço, período de teste e recursos aplicados às próximas cobranças.'],
  billing: ['Faturamento', 'Acompanhe valores gerados, recebíveis e faturas que precisam de ação.'],
  administrators: [
    'Administradores',
    'Crie acessos individuais e acompanhe senha, MFA e último login por restaurante.',
  ],
  support: [
    'Suporte',
    'Leia o histórico real das conversas e responda aos restaurantes pela plataforma.',
  ],
  audit: [
    'Auditoria',
    'Investigue ações sensíveis com usuário, recurso, IP, resultado e rastreabilidade.',
  ],
  settings: [
    'Configurações da plataforma',
    'Defina identidade, regras globais e manutenção; confira políticas do ambiente.',
  ],
};

type Notice = { message: string; error: boolean } | null;

export function SuperAdminModule({
  currentUser,
  data,
  currentView,
  onViewChange,
  actions,
  onCreateRestaurant,
  onLogout,
  refreshing = false,
  loadError = null,
  updatedAt = null,
}: SuperAdminModuleProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [salesLeadsRevision, setSalesLeadsRevision] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedAdministratorId, setSelectedAdministratorId] = useState<number | null>(null);
  const [selectedSupportRestaurantId, setSelectedSupportRestaurantId] = useState<number | null>(
    null,
  );
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<number | null>(null);
  const [creatingAdministrator, setCreatingAdministrator] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const focusSidebarClose = useCallback(
    (element: HTMLButtonElement | null) => {
      if (sidebarOpen) element?.focus();
    },
    [sidebarOpen],
  );

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    const opener = menuButton.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      sidebar.current?.querySelector<HTMLElement>('[aria-label="Fechar menu"]')?.focus();
    }, 260);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      opener?.focus();
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (currentUser.role !== 'SUPER_ADMIN') return;
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'k')
        return;
      if (sidebarOpen || document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      searchButton.current?.focus();
      setSearchOpen(true);
    };
    document.addEventListener('keydown', handleSearchShortcut);
    return () => document.removeEventListener('keydown', handleSearchShortcut);
  }, [currentUser.role, sidebarOpen]);

  const notify = useCallback((message: string, error = false) => {
    setNotice({ message, error });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const selectedRestaurant = data.restaurants.find((item) => item.id === selectedRestaurantId);
  const selectedPlan = data.plans.find((item) => item.code === selectedPlanCode);
  const selectedInvoice = data.invoices.find((item) => item.id === selectedInvoiceId);
  const selectedAdministrator = data.administrators.find(
    (item) => item.id === selectedAdministratorId,
  );
  const selectedTicket = data.tickets.find(
    (item) => item.restaurantId === selectedSupportRestaurantId,
  );
  const selectedAuditLog = data.auditLogs.find((item) => item.id === selectedAuditLogId);

  const navigate = (nextView: SuperAdminView) => {
    setSidebarOpen(false);
    onViewChange(nextView);
  };

  const closeRecord = (close: () => void) => {
    close();
    window.requestAnimationFrame(() => {
      // A atualização pode remover da fila o botão que abriu o caso resolvido.
      if (document.activeElement === document.body) searchButton.current?.focus();
    });
  };

  const openRecord = useCallback(
    (target: QuickSearchTarget) => {
      setSearchOpen(false);
      switch (target.kind) {
        case 'restaurant':
          setSelectedRestaurantId(target.id);
          break;
        case 'invoice':
          setSelectedInvoiceId(target.id);
          break;
        case 'administrator':
          setSelectedAdministratorId(target.id);
          break;
        case 'support': {
          const ticket = data.tickets.find((item) => item.id === target.id);
          if (ticket) setSelectedSupportRestaurantId(ticket.restaurantId);
          break;
        }
      }
    },
    [data.tickets],
  );

  const page = useMemo(() => {
    switch (currentView) {
      case 'sales-leads':
        return <SalesLeadsPage refreshKey={salesLeadsRevision} />;
      case 'overview':
        return (
          <OverviewPage
            data={data}
            onSelect={(item) => setSelectedRestaurantId(item.id)}
            onOpenRecord={openRecord}
            onRefresh={actions.refresh}
            refreshing={refreshing}
            updatedAt={updatedAt}
          />
        );
      case 'restaurants':
        return (
          <RestaurantsPage data={data} onSelect={(item) => setSelectedRestaurantId(item.id)} />
        );
      case 'subscriptions':
        return (
          <SubscriptionsPage data={data} onSelect={(item) => setSelectedRestaurantId(item.id)} />
        );
      case 'plans':
        return <PlansPage data={data} onEdit={(item) => setSelectedPlanCode(item.code)} />;
      case 'billing':
        return <BillingPage data={data} onSelect={(item) => setSelectedInvoiceId(item.id)} />;
      case 'administrators':
        return (
          <AdministratorsPage
            data={data}
            onSelect={(item) => setSelectedAdministratorId(item.id)}
            onCreate={() => setCreatingAdministrator(true)}
          />
        );
      case 'support':
        return (
          <SupportPage
            data={data}
            onSelect={(item) => setSelectedSupportRestaurantId(item.restaurantId)}
          />
        );
      case 'audit':
        return <AuditPage data={data} onSelect={(item) => setSelectedAuditLogId(item.id)} />;
      case 'settings':
        return <SettingsPage data={data} onSave={actions.updateSettings} />;
    }
  }, [
    actions.updateSettings,
    actions.refresh,
    currentView,
    data,
    salesLeadsRevision,
    openRecord,
    refreshing,
    updatedAt,
  ]);

  const primaryAction =
    currentView === 'overview' || currentView === 'restaurants'
      ? {
          label: 'Novo restaurante',
          icon: <Plus size={17} />,
          run: onCreateRestaurant,
          disabled: false,
        }
      : currentView === 'administrators'
        ? {
            label: 'Novo administrador',
            icon: <Plus size={17} />,
            run: () => setCreatingAdministrator(true),
            disabled: data.restaurants.length === 0,
          }
        : {
            label: refreshing ? 'Atualizando…' : 'Atualizar dados',
            icon: <RefreshCw size={16} className={refreshing ? 'spin' : undefined} />,
            run: () => {
              if (currentView === 'sales-leads') setSalesLeadsRevision((value) => value + 1);
              else void actions.refresh();
            },
            disabled: refreshing,
          };

  if (currentUser.role !== 'SUPER_ADMIN') {
    return (
      <S.AccessDenied>
        <ShieldAlert aria-hidden="true" />
        <h1>Acesso negado</h1>
        <p>
          Esta área é exclusiva para a conta SUPER_ADMIN da plataforma. Entre novamente com uma
          conta autorizada.
        </p>
      </S.AccessDenied>
    );
  }

  const [title, subtitle] = titles[currentView];
  const brandName = data.settings.platformName.trim() || 'GastroNexa';

  return (
    <S.Root style={{ '--brand': data.settings.primaryColor || '#e9530b' } as CSSProperties}>
      <S.Sidebar ref={sidebar} $open={sidebarOpen} aria-label="Navegação do painel SUPER_ADMIN">
        <S.Brand>
          <span>
            <img src="/gastronexa-logo.svg" alt="" width="40" height="36" /> {brandName}
          </span>
          <small>PAINEL SUPER ADMIN</small>
        </S.Brand>
        <S.Close
          ref={focusSidebarClose}
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        >
          <X />
        </S.Close>
        <S.Nav>
          {navigation.map(([id, label, Icon]) => (
            <Fragment key={id}>
              {navigationSections[id] ? (
                <span className="nav-label">{navigationSections[id]}</span>
              ) : null}
              <button
                type="button"
                className={currentView === id ? 'active' : ''}
                aria-current={currentView === id ? 'page' : undefined}
                onClick={() => navigate(id)}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
                {currentView === id ? <i className="nav-indicator" aria-hidden="true" /> : null}
              </button>
            </Fragment>
          ))}
        </S.Nav>
        <S.User>
          <span className="avatar" aria-hidden="true">
            {currentUser.name
              .split(' ')
              .filter(Boolean)
              .map((part) => part[0])
              .slice(0, 2)
              .join('') || 'SA'}
          </span>
          <span className="info">
            <b>{currentUser.name}</b>
            <small>SUPER_ADMIN</small>
          </span>
          <button type="button" className="logout" aria-label="Sair" onClick={onLogout}>
            <LogOut aria-hidden="true" />
          </button>
        </S.User>
      </S.Sidebar>
      {sidebarOpen ? (
        <S.Overlay
          data-testid="super-admin-menu-overlay"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <S.Main>
        <S.Header>
          <S.MobileMenu
            ref={menuButton}
            type="button"
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu aria-hidden="true" />
          </S.MobileMenu>
          <div className="title">
            <span className="crumb">PLATAFORMA / {title}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="header-actions">
            <button
              ref={searchButton}
              type="button"
              className="quick-search"
              aria-label="Buscar no painel"
              aria-keyshortcuts="Control+k Meta+k"
              onClick={() => setSearchOpen(true)}
              title="Buscar no painel (Ctrl+K ou ⌘K)"
            >
              <Search size={17} aria-hidden="true" />
              <span>Buscar no painel</span>
              <kbd aria-hidden="true">Ctrl K</kbd>
            </button>
            <button
              type="button"
              className="primary"
              disabled={primaryAction.disabled}
              onClick={primaryAction.run}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </button>
          </div>
        </S.Header>
        <S.Content>
          {loadError ? (
            <S.InlineAlert $tone="error" role="alert" style={{ marginBottom: 16 }}>
              <b>Os dados exibidos podem estar desatualizados.</b> {loadError}{' '}
              <button type="button" onClick={() => void actions.refresh()}>
                Tentar novamente
              </button>
            </S.InlineAlert>
          ) : null}
          {page}
        </S.Content>
      </S.Main>

      {searchOpen ? (
        <QuickSearch data={data} onClose={() => setSearchOpen(false)} onSelect={openRecord} />
      ) : null}
      {selectedRestaurant ? (
        <RestaurantDetailsSecure
          restaurant={selectedRestaurant}
          plans={data.plans}
          actions={actions}
          onClose={() => closeRecord(() => setSelectedRestaurantId(null))}
          notify={notify}
        />
      ) : null}
      {selectedPlan ? (
        <EditPlanDialog
          plan={selectedPlan}
          actions={actions}
          onClose={() => setSelectedPlanCode(null)}
          notify={notify}
        />
      ) : null}
      {selectedInvoice ? (
        <InvoiceDetails
          invoice={selectedInvoice}
          onClose={() => closeRecord(() => setSelectedInvoiceId(null))}
        />
      ) : null}
      {selectedAdministrator ? (
        <AdministratorDetails
          administrator={selectedAdministrator}
          actions={actions}
          onClose={() => closeRecord(() => setSelectedAdministratorId(null))}
          notify={notify}
        />
      ) : null}
      {creatingAdministrator ? (
        <CreateAdministratorDialog
          restaurants={data.restaurants}
          actions={actions}
          onClose={() => setCreatingAdministrator(false)}
          notify={notify}
        />
      ) : null}
      {selectedTicket ? (
        <SupportConversation
          ticket={selectedTicket}
          actions={actions}
          onClose={() => closeRecord(() => setSelectedSupportRestaurantId(null))}
          notify={notify}
        />
      ) : null}
      {selectedAuditLog ? (
        <AuditDetails log={selectedAuditLog} onClose={() => setSelectedAuditLogId(null)} />
      ) : null}
      {notice ? (
        <S.Notice $error={notice.error} role="status" aria-live="polite">
          {notice.message}
        </S.Notice>
      ) : null}
    </S.Root>
  );
}
