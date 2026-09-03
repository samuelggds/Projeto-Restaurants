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
} from 'lucide-react';
import { useCallback, useState } from 'react';
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

export type WaiterView = 'overview' | 'deliveries' | 'tables' | 'calls' | 'payments';
export interface WaiterModuleProps extends BaseProps {
  initialView?: WaiterView;
  onViewChange?: (view: WaiterView) => void;
}

export function WaiterModule({
  initialView = 'overview',
  onViewChange,
  ...props
}: WaiterModuleProps) {
  return (
    <WaiterProvider {...props}>
      <WaiterShell initialView={initialView} onViewChange={onViewChange} />
    </WaiterProvider>
  );
}

function WaiterShell({
  initialView,
  onViewChange,
}: {
  initialView: WaiterView;
  onViewChange?: WaiterModuleProps['onViewChange'];
}) {
  useEmployeeIssueNotifications();
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
        <N.Sidebar>
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
        <N.SidebarOpenButton type="button" aria-label="Expandir menu" onClick={() => setOpen(true)}>
          <ChevronRight />
        </N.SidebarOpenButton>
      )}
      <N.MobileNav aria-label="Navegação móvel do garçom">
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
          <N.MoreBackdrop
            type="button"
            aria-label="Fechar opções do garçom"
            onClick={() => setMoreOpen(false)}
          />
          <N.MoreSheet role="dialog" aria-modal="true" aria-label="Opções do garçom">
            <header>
              <span>
                <b>{employee.name}</b>
                <small>Garçom • turno iniciado às {employee.shift}</small>
              </span>
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
      <S.Main>
        <S.Top>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <S.Live
            type="button"
            onClick={() => void onRefresh?.()}
            disabled={!onRefresh || workspaceState?.refreshing}
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
                <b>Não foi possível atualizar todos os dados.</b>
                <small>{workspaceState.error}</small>
              </span>
              {onRefresh && (
                <button type="button" onClick={() => void onRefresh()}>
                  Tentar novamente
                </button>
              )}
            </S.WorkspaceNotice>
          )}
          {workspaceState?.loading && !orders.length && !tables.length && !calls.length ? (
            <S.WorkspaceLoading role="status" aria-live="polite">
              <RefreshCw />
              <b>Carregando o salão...</b>
              <span>Buscando pedidos, mesas e chamados do seu restaurante.</span>
            </S.WorkspaceLoading>
          ) : view === 'help' ? (
            <EmployeeHelpCenter role="waiter" onReport={reportEmployeeIssue} />
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
