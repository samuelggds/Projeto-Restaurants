import {
  BellRing,
  AlertTriangle,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Menu,
  QrCode,
  RefreshCw,
  ShoppingBag,
  X,
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
import * as S from './Waiter.styles';
import { EmployeeHelpCenter } from '../../features/employee-help/EmployeeHelpCenter';
import { reportEmployeeIssue } from '../../features/employee-help/reportEmployeeIssue';
import { useEmployeeIssueNotifications } from '../../features/employee-help/useEmployeeIssueNotifications';

export type WaiterView = 'overview' | 'deliveries' | 'tables' | 'calls';
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
  const { employee, restaurant, onLogout, onRefresh, workspaceState, orders, tables, calls } =
    useWaiterWorkspace();
  const [view, setView] = useState<WaiterView | 'help'>(initialView);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const clearFocusedOrder = useCallback(() => setFocusedOrderId(null), []);
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 820);
  const navigate = (next: WaiterView | 'help') => {
    setView(next);
    if (window.innerWidth <= 820) setOpen(false);
    if (next !== 'help') onViewChange?.(next);
  };
  const nav = [
    ['overview', 'Visão geral', LayoutGrid],
    ['deliveries', 'Para entregar', ShoppingBag],
    ['tables', 'Mesas e QR Codes', QrCode],
    ['calls', 'Chamados', BellRing],
  ] as const;
  const titles: Record<WaiterView | 'help', [string, string]> = {
    overview: ['Visão geral', 'Área operacional exclusiva do garçom'],
    deliveries: ['Pedidos para entregar', 'Veja os pedidos prontos e leve-os até a mesa'],
    tables: ['Mesas e QR Codes', 'Abra e feche as mesas cadastradas pelo administrador'],
    calls: ['Chamados', 'Atenda rapidamente as solicitações do salão'],
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
        }[view];
  const [title, subtitle] = titles[view];
  return (
    <S.Root $primary={restaurant.primaryColor} $sidebarOpen={open}>
      <S.Sidebar $open={open}>
        <S.CollapseBtn type="button" aria-label="Recolher menu" onClick={() => setOpen(false)}>
          <ChevronLeft />
        </S.CollapseBtn>
        <S.Brand>
          <span>{restaurant.monogram}</span>
          <b>{restaurant.restaurantName}</b>
          <small>ÁREA DO GARÇOM</small>
        </S.Brand>
        <S.CloseMenu type="button" aria-label="Fechar menu" onClick={() => setOpen(false)}>
          <X />
        </S.CloseMenu>
        <S.Nav aria-label="Navegação do garçom">
          {nav.map(([id, label, Icon]) => (
            <button
              type="button"
              key={id}
              className={view === id ? 'active' : ''}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </S.Nav>
        <S.BottomNav>
          <button
            type="button"
            className={view === 'help' ? 'active' : ''}
            aria-current={view === 'help' ? 'page' : undefined}
            onClick={() => navigate('help')}
          >
            <CircleHelp />
            Central de ajuda
          </button>
        </S.BottomNav>
        <S.User>
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
        </S.User>
      </S.Sidebar>
      {open && <S.Overlay onClick={() => setOpen(false)} />}
      {!open && (
        <S.SidebarOpenTab type="button" aria-label="Expandir menu" onClick={() => setOpen(true)}>
          <ChevronRight />
        </S.SidebarOpenTab>
      )}
      <S.Main>
        <S.Top>
          <S.MobileMenu type="button" aria-label="Abrir menu" onClick={() => setOpen(true)}>
            <Menu />
          </S.MobileMenu>
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
