import {
  BellRing,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  History,
  CircleHelp,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { KitchenProvider, type KitchenModuleProps as BaseProps } from './KitchenContext';
import { useKitchenWorkspace } from './useKitchenWorkspace';
import { KitchenHistoryPage, KitchenQueuePage, KitchenReadyPage } from './pages/KitchenPages';
import { KitchenOverviewPage } from './pages/KitchenOverviewPage';
import * as S from './Kitchen.styles';
import * as N from './KitchenNavigation.styles';
import { EmployeeHelpCenter } from '../../features/employee-help/EmployeeHelpCenter';
import { reportEmployeeIssue } from '../../features/employee-help/reportEmployeeIssue';
import { useEmployeeIssueNotifications } from '../../features/employee-help/useEmployeeIssueNotifications';
import { useDialogFocusManagement } from '../../shared/hooks/useDialogFocusManagement';

export type KitchenView = 'overview' | 'queue' | 'ready' | 'history';
const INITIAL_SHIFT_TIME = new Date();
export interface KitchenModuleProps extends BaseProps {
  initialView?: KitchenView;
  onViewChange?: (view: KitchenView) => void;
  employeeHelp?: {
    notificationsEnabled?: boolean;
    onReport?: typeof reportEmployeeIssue;
  };
}
export function KitchenModule({
  initialView = 'overview',
  onViewChange,
  employeeHelp,
  ...props
}: KitchenModuleProps) {
  return (
    <KitchenProvider {...props}>
      <KitchenShell
        initialView={initialView}
        onViewChange={onViewChange}
        employeeHelp={employeeHelp}
      />
    </KitchenProvider>
  );
}

function KitchenShell({
  initialView,
  onViewChange,
  employeeHelp,
}: {
  initialView: KitchenView;
  onViewChange?: KitchenModuleProps['onViewChange'];
  employeeHelp?: KitchenModuleProps['employeeHelp'];
}) {
  useEmployeeIssueNotifications(employeeHelp?.notificationsEnabled);
  const { employee, restaurant, orders, workspaceState, onRefresh, onLogout } =
    useKitchenWorkspace();
  const [currentTime, setCurrentTime] = useState(INITIAL_SHIFT_TIME);
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [view, setView] = useState<KitchenView | 'help'>(initialView);
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
  const navigate = (next: KitchenView | 'help') => {
    setView(next);
    setMoreOpen(false);
    if (next !== 'help') onViewChange?.(next);
  };
  const queueCount = orders.filter(
    (order) => order.status === 'PENDENTE' || order.status === 'PREPARANDO',
  ).length;
  const readyCount = orders.filter((order) => order.status === 'PRONTO').length;
  const nav = [
    ['overview', 'Visão geral', 'Início', LayoutGrid, 0],
    ['queue', 'Fila de pedidos', 'Fila', ChefHat, queueCount],
    ['ready', 'Prontos', 'Prontos', CheckCircle2, readyCount],
    ['history', 'Histórico', 'Histórico', History, 0],
  ] as const;
  const titles: Record<KitchenView | 'help', [string, string]> = {
    overview: ['Visão geral', 'Área operacional exclusiva da cozinha'],
    queue: ['Fila da cozinha', 'Prepare os pedidos na ordem correta'],
    ready: ['Pedidos prontos', 'Acompanhe os pedidos que aguardam retirada'],
    history: ['Histórico', 'Consulte os pedidos concluídos no turno'],
    help: ['Central de ajuda', 'Manual visual da operação da cozinha'],
  };
  const [title, subtitle] = titles[view];
  return (
    <S.Root $primary={restaurant.primaryColor} $sidebarOpen={open}>
      {open && (
        <N.Sidebar inert={moreOpen}>
          <N.CollapseButton
            type="button"
            aria-label="Recolher menu lateral"
            onClick={() => setOpen(false)}
          >
            <ChevronLeft />
          </N.CollapseButton>
          <N.Brand>
            <span>{restaurant.monogram}</span>
            <b>{restaurant.restaurantName}</b>
            <small>Área da cozinha</small>
          </N.Brand>
          <N.Nav aria-label="Navegação da cozinha">
            {nav.map(([id, label, , Icon, count]) => (
              <button
                key={id}
                type="button"
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
              <small>Cozinha</small>
            </span>
            <button type="button" aria-label="Sair da área da cozinha" onClick={onLogout}>
              <LogOut />
            </button>
          </N.User>
        </N.Sidebar>
      )}
      {!open && (
        <N.SidebarOpenButton
          inert={moreOpen}
          type="button"
          aria-label="Expandir menu lateral"
          onClick={() => setOpen(true)}
        >
          <ChevronRight />
        </N.SidebarOpenButton>
      )}
      <N.MobileNav aria-label="Navegação móvel da cozinha" inert={moreOpen}>
        {nav.map(([id, label, mobileLabel, Icon, count]) => (
          <button
            key={id}
            type="button"
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
            id="kitchen-more-options"
            role="dialog"
            aria-modal="true"
            aria-label="Opções da cozinha"
          >
            <header>
              <span>
                <b>{employee.name}</b>
                <small>Cozinha • turno iniciado às {employee.shift}</small>
              </span>
              <button type="button" aria-label="Fechar opções da cozinha" onClick={closeMore}>
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
            aria-label="Atualizar pedidos da cozinha"
            title={
              workspaceState?.lastUpdatedAt
                ? `Última atualização às ${new Date(
                    workspaceState.lastUpdatedAt,
                  ).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}`
                : 'Atualizar pedidos da cozinha'
            }
          >
            <RefreshCw className={workspaceState?.refreshing ? 'spinning' : ''} />
            {workspaceState?.refreshing ? 'Atualizando' : 'Atualizar'} <i />{' '}
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </S.Live>
          <N.MobileMoreButton
            type="button"
            aria-label="Abrir opções da cozinha"
            aria-haspopup="dialog"
            aria-controls={moreOpen ? 'kitchen-more-options' : undefined}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((current) => !current)}
          >
            <MoreHorizontal />
          </N.MobileMoreButton>
        </S.Top>
        <S.Content>
          {workspaceState?.newOrderNotice && (
            <S.WorkspaceNotice className="new-order-notice" role="status" aria-live="assertive">
              <BellRing />
              <span>
                <b>Novo pedido na cozinha</b>
                <small>{workspaceState.newOrderNotice}</small>
              </span>
              <button type="button" onClick={() => navigate('queue')}>
                Abrir fila
              </button>
            </S.WorkspaceNotice>
          )}
          {workspaceState?.error && (
            <S.WorkspaceNotice role="alert">
              <AlertTriangle />
              <span>
                <b>Não foi possível atualizar os pedidos.</b>
                <small>{workspaceState.error}</small>
              </span>
              {onRefresh && (
                <button type="button" onClick={() => void onRefresh()}>
                  Tentar novamente
                </button>
              )}
            </S.WorkspaceNotice>
          )}
          {workspaceState?.loading && !orders.length ? (
            <S.WorkspaceLoading role="status" aria-live="polite">
              <RefreshCw />
              <b>Carregando pedidos...</b>
              <span>Buscando a fila atual do restaurante.</span>
            </S.WorkspaceLoading>
          ) : workspaceState?.error &&
            !workspaceState.lastUpdatedAt &&
            !orders.length ? null : view === 'overview' ? (
            <KitchenOverviewPage
              onOpenOrder={(orderId) => {
                setFocusedOrderId(orderId);
                navigate('queue');
              }}
            />
          ) : view === 'queue' ? (
            <KitchenQueuePage focusedOrderId={focusedOrderId} onFocusComplete={clearFocusedOrder} />
          ) : view === 'ready' ? (
            <KitchenReadyPage />
          ) : view === 'history' ? (
            <KitchenHistoryPage />
          ) : (
            <EmployeeHelpCenter
              role="kitchen"
              onReport={employeeHelp?.onReport ?? reportEmployeeIssue}
              notificationsEnabled={employeeHelp?.notificationsEnabled}
            />
          )}
        </S.Content>
      </S.Main>
    </S.Root>
  );
}
