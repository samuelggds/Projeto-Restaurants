import {
  BellRing,
  AlertTriangle,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  QrCode,
  RefreshCw,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { WaiterProvider, type WaiterModuleProps as BaseProps } from './WaiterContext';
import { useWaiterWorkspace } from './useWaiterWorkspace';
import {
  WaiterCallsPage,
  WaiterDeliveriesPage,
  WaiterOverviewPage,
  WaiterTablesPage,
} from './pages/WaiterPages';
import { WaiterPaymentsPage } from './pages/WaiterPaymentsPage';
import * as S from './Waiter.styles';
import * as N from './WaiterNavigation.styles';
import { EmployeeHelpCenter } from '../../features/employee-help/EmployeeHelpCenter';
import { reportEmployeeIssue } from '../../features/employee-help/reportEmployeeIssue';
import { useEmployeeIssueNotifications } from '../../features/employee-help/useEmployeeIssueNotifications';
import { useDialogFocusManagement } from '../../shared/hooks/useDialogFocusManagement';

export type WaiterView = 'overview' | 'deliveries' | 'tables' | 'calls' | 'payments';
export interface WaiterModuleProps extends BaseProps {
  initialView?: WaiterView;
  onViewChange?: (view: WaiterView) => void;
  employeeHelp?: {
    notificationsEnabled?: boolean;
    onReport?: typeof reportEmployeeIssue;
  };
}

export function WaiterModule({
  initialView = 'overview',
  onViewChange,
  employeeHelp,
  ...props
}: WaiterModuleProps) {
  return (
    <WaiterProvider {...props}>
      <WaiterShell
        initialView={initialView}
        onViewChange={onViewChange}
        employeeHelp={employeeHelp}
      />
    </WaiterProvider>
  );
}

function WaiterShell({
  initialView,
  onViewChange,
  employeeHelp,
}: {
  initialView: WaiterView;
  onViewChange?: WaiterModuleProps['onViewChange'];
  employeeHelp?: WaiterModuleProps['employeeHelp'];
}) {
  useEmployeeIssueNotifications(employeeHelp?.notificationsEnabled);
  const {
    employee,
    restaurant,
    onLogout,
    onRefresh,
    workspaceState,
    orders,
    tables,
    calls,
    accounts,
  } = useWaiterWorkspace();
  const [view, setView] = useState<WaiterView | 'help'>(initialView);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const clearFocusedOrder = useCallback(() => setFocusedOrderId(null), []);
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 820);
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  const morePanel = useDialogFocusManagement<HTMLElement>(closeMore, moreOpen);
  useEffect(() => {
    if (!moreOpen) return;
    const closeOnDesktop = () => {
      if (window.innerWidth > 820) closeMore();
    };
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, [closeMore, moreOpen]);
  const hasWorkspaceData = Boolean(
    orders.length || tables.length || calls.length || accounts.length,
  );
  const initialLoadFailed = Boolean(
    workspaceState?.error && !workspaceState.lastUpdatedAt && !hasWorkspaceData,
  );
  const navigate = (next: WaiterView | 'help') => {
    setView(next);
    setMoreOpen(false);
    if (next !== 'help') onViewChange?.(next);
  };
  const readyCount = orders.filter(
    (order) => order.channel === 'TABLE' && order.status === 'PRONTO',
  ).length;
  const waitingCallCount = calls.filter((call) => call.status === 'WAITING').length;
  const pendingPaymentCount = accounts.reduce(
    (total, account) => total + account.pendingManualPayments.length,
    0,
  );
  const nav = [
    ['overview', 'Visão geral', 'Início', LayoutGrid, 0],
    ['deliveries', 'Para entregar', 'Entregas', ShoppingBag, readyCount],
    ['tables', 'Mesas e QR Codes', 'Mesas', QrCode, 0],
    ['calls', 'Chamados', 'Chamados', BellRing, waitingCallCount],
    ['payments', 'Pagamentos', 'Pagamentos', CreditCard, pendingPaymentCount],
  ] as const;
  const titles: Record<WaiterView | 'help', [string, string]> = {
    overview: ['Visão geral', 'Área operacional exclusiva do garçom'],
    deliveries: ['Pedidos para entregar', 'Veja os pedidos prontos e leve-os até a mesa'],
    tables: ['Mesas e QR Codes', 'Abra e feche as mesas cadastradas pelo administrador'],
    calls: ['Chamados', 'Atenda rapidamente as solicitações do salão'],
    payments: ['Pagamentos', 'Confira contas e confirme recebimentos presenciais'],
    help: ['Central de ajuda', 'Manual visual da operação do garçom'],
  };
  const Page =
    view === 'help'
      ? null
      : {
          overview: WaiterOverviewPage,
          deliveries: WaiterDeliveriesPage,
          tables: WaiterTablesPage,
          calls: WaiterCallsPage,
          payments: WaiterPaymentsPage,
        }[view];
  const [title, subtitle] = titles[view];
  return (
    <S.Root $primary={restaurant.primaryColor} $sidebarOpen={open}>
      {open && (
        <N.Sidebar inert={moreOpen}>
          <N.CollapseButton type="button" aria-label="Recolher menu" onClick={() => setOpen(false)}>
            <ChevronLeft />
          </N.CollapseButton>
          <N.Brand>
            <span>{restaurant.monogram}</span>
            <b>{restaurant.restaurantName}</b>
            <small>Área do garçom</small>
          </N.Brand>
          <N.Nav aria-label="Navegação do garçom">
            {nav.map(([id, label, , Icon, count]) => (
              <button
                type="button"
                key={id}
                aria-label={label}
                className={view === id ? 'active' : ''}
                aria-current={view === id ? 'page' : undefined}
                onClick={() => navigate(id)}
              >
                <Icon />
                {label}
                {count > 0 && <N.NavBadge>{count}</N.NavBadge>}
              </button>
            ))}
          </N.Nav>
          <N.SupportNav>
            <button
              type="button"
              className={view === 'help' ? 'active' : ''}
              aria-current={view === 'help' ? 'page' : undefined}
              onClick={() => navigate('help')}
            >
              <CircleHelp />
              Central de ajuda
            </button>
          </N.SupportNav>
          <N.User>
            <span className="avatar">
              {employee.name
                .split(' ')
                .map((x) => x[0])
                .slice(0, 2)
                .join('')}
            </span>
            <span>
              <b>{employee.name}</b>
              <small>Garçom</small>
            </span>
            <button type="button" aria-label="Sair da área do garçom" onClick={onLogout}>
              <LogOut />
            </button>
          </N.User>
        </N.Sidebar>
      )}
      {!open && (
        <N.SidebarOpenButton
          inert={moreOpen}
          type="button"
          aria-label="Expandir menu"
          onClick={() => setOpen(true)}
        >
          <ChevronRight />
        </N.SidebarOpenButton>
      )}
      <N.MobileNav aria-label="Navegação móvel do garçom" inert={moreOpen}>
        {nav.map(([id, label, mobileLabel, Icon, count]) => (
          <button
            type="button"
            key={id}
            aria-label={label}
            className={view === id ? 'active' : ''}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => navigate(id)}
          >
            <span>
              <Icon />
              {count > 0 && <i>{count}</i>}
            </span>
            {mobileLabel}
          </button>
        ))}
      </N.MobileNav>
      {moreOpen && (
        <>
          <N.MoreBackdrop type="button" tabIndex={-1} aria-hidden="true" onClick={closeMore} />
          <N.MoreSheet
            ref={morePanel}
            id="waiter-more-options"
            role="dialog"
            aria-modal="true"
            aria-label="Opções do garçom"
          >
            <header>
              <span>
                <b>{employee.name}</b>
                <small>Garçom • turno iniciado às {employee.shift}</small>
              </span>
              <button type="button" aria-label="Fechar opções do garçom" onClick={closeMore}>
                <X />
              </button>
            </header>
            <button
              type="button"
              className={view === 'help' ? 'active' : ''}
              onClick={() => navigate('help')}
            >
              <CircleHelp /> Central de ajuda
            </button>
            <button type="button" className="logout" onClick={onLogout}>
              <LogOut /> Sair da conta
            </button>
          </N.MoreSheet>
        </>
      )}
      <S.Main inert={moreOpen}>
        <S.Top>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <S.Live
            type="button"
            onClick={() => void onRefresh?.()}
            disabled={!onRefresh || workspaceState?.loading || workspaceState?.refreshing}
            aria-label="Atualizar dados do salão"
            title="Atualizar dados do salão"
          >
            <RefreshCw className={workspaceState?.refreshing ? 'spinning' : ''} />
            {workspaceState?.refreshing ? 'Atualizando' : 'Atualizar'} <i /> {employee.shift}
          </S.Live>
          <N.MobileMoreButton
            type="button"
            aria-label="Abrir opções do garçom"
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? 'waiter-more-options' : undefined}
            aria-haspopup="dialog"
            onClick={() => setMoreOpen((current) => !current)}
          >
            <MoreHorizontal />
          </N.MobileMoreButton>
        </S.Top>
        <S.Content>
          {workspaceState?.error && (
            <S.WorkspaceNotice role="alert">
              <AlertTriangle />
              <span>
                <b>
                  {initialLoadFailed
                    ? 'Não foi possível carregar o salão.'
                    : 'Não foi possível atualizar todos os dados.'}
                </b>
                <small>{workspaceState.error}</small>
              </span>
              {onRefresh && (
                <button
                  type="button"
                  disabled={workspaceState.loading || workspaceState.refreshing}
                  onClick={() => void onRefresh()}
                >
                  {workspaceState.loading || workspaceState.refreshing
                    ? 'Atualizando...'
                    : 'Tentar novamente'}
                </button>
              )}
            </S.WorkspaceNotice>
          )}
          {view === 'help' ? (
            <EmployeeHelpCenter
              role="waiter"
              onReport={employeeHelp?.onReport ?? reportEmployeeIssue}
              notificationsEnabled={employeeHelp?.notificationsEnabled}
            />
          ) : workspaceState?.loading && !hasWorkspaceData ? (
            <S.WorkspaceLoading role="status" aria-live="polite">
              <RefreshCw />
              <b>Carregando o salão...</b>
              <span>Buscando pedidos, mesas e chamados do seu restaurante.</span>
            </S.WorkspaceLoading>
          ) : initialLoadFailed ? (
            <S.WorkspaceUnavailable>
              <b>Os dados do salão ainda não estão disponíveis.</b>
              <span>Tente novamente para consultar pedidos, mesas, chamados e pagamentos.</span>
            </S.WorkspaceUnavailable>
          ) : view === 'overview' ? (
            <WaiterOverviewPage
              onOpenOrder={(orderId) => {
                setFocusedOrderId(orderId);
                navigate('deliveries');
              }}
              onOpenPayments={() => navigate('payments')}
            />
          ) : view === 'deliveries' ? (
            <WaiterDeliveriesPage
              focusedOrderId={focusedOrderId}
              onFocusComplete={clearFocusedOrder}
            />
          ) : (
            Page && <Page />
          )}
        </S.Content>
      </S.Main>
    </S.Root>
  );
}
