import {
  BarChart3,
  Building2,
  CreditCard,
  FileSearch,
  Headphones,
  Layers3,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  ShieldAlert,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
import * as S from './SuperAdmin.styles';

const navigation = [
  ['overview', 'Visão geral', BarChart3],
  ['restaurants', 'Restaurantes', Building2],
  ['subscriptions', 'Assinaturas', CreditCard],
  ['plans', 'Planos', Layers3],
  ['billing', 'Faturamento', WalletCards],
  ['administrators', 'Administradores', Users],
  ['support', 'Suporte', Headphones],
  ['audit', 'Auditoria', FileSearch],
  ['settings', 'Configurações', Settings],
] as const;

const titles: Record<SuperAdminView, [title: string, description: string]> = {
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
}: SuperAdminModuleProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedAdministratorId, setSelectedAdministratorId] = useState<number | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<number | null>(null);
  const [creatingAdministrator, setCreatingAdministrator] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
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
  const selectedTicket = data.tickets.find((item) => item.id === selectedTicketId);
  const selectedAuditLog = data.auditLogs.find((item) => item.id === selectedAuditLogId);

  const navigate = (nextView: SuperAdminView) => {
    setSidebarOpen(false);
    onViewChange(nextView);
  };

  const page = useMemo(() => {
    switch (currentView) {
      case 'overview':
        return <OverviewPage data={data} onSelect={(item) => setSelectedRestaurantId(item.id)} />;
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
        return <SupportPage data={data} onSelect={(item) => setSelectedTicketId(item.id)} />;
      case 'audit':
        return <AuditPage data={data} onSelect={(item) => setSelectedAuditLogId(item.id)} />;
      case 'settings':
        return <SettingsPage data={data} onSave={actions.updateSettings} />;
    }
  }, [actions.updateSettings, currentView, data]);

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
            run: () => void actions.refresh(),
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
  const brandParts = data.settings.platformName.trim().split(/\s+/);
  const brandMark = brandParts.shift() || 'S&C';
  const brandName = brandParts.join(' ') || 'Platform';

  return (
    <S.Root style={{ '--brand': data.settings.primaryColor || '#e9530b' } as CSSProperties}>
      <S.Sidebar ref={sidebar} $open={sidebarOpen} aria-label="Navegação do painel SUPER_ADMIN">
        <S.Brand>
          <span>
            <b>{brandMark}</b> {brandName}
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
            <button
              key={id}
              type="button"
              className={currentView === id ? 'active' : ''}
              aria-current={currentView === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
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
            <span className="crumb">PLATAFORMA / {currentView.toUpperCase()}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <span className="access">
            <LockKeyhole size={15} aria-hidden="true" />
            Acesso exclusivo SUPER_ADMIN
          </span>
          <button
            type="button"
            className="primary"
            disabled={primaryAction.disabled}
            onClick={primaryAction.run}
          >
            {primaryAction.icon}
            {primaryAction.label}
          </button>
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

      {selectedRestaurant ? (
        <RestaurantDetailsSecure
          restaurant={selectedRestaurant}
          plans={data.plans}
          actions={actions}
          onClose={() => setSelectedRestaurantId(null)}
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
        <InvoiceDetails invoice={selectedInvoice} onClose={() => setSelectedInvoiceId(null)} />
      ) : null}
      {selectedAdministrator ? (
        <AdministratorDetails
          administrator={selectedAdministrator}
          actions={actions}
          onClose={() => setSelectedAdministratorId(null)}
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
          onClose={() => setSelectedTicketId(null)}
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
