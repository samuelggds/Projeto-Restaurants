import {
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  CircleHelp,
  LayoutGrid,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { KitchenProvider, type KitchenModuleProps as BaseProps } from './KitchenContext';
import { useKitchenWorkspace } from './useKitchenWorkspace';
import {
  KitchenHistoryPage,
  KitchenOverviewPage,
  KitchenQueuePage,
  KitchenReadyPage,
} from './pages/KitchenPages';
import * as S from './Kitchen.styles';
import { EmployeeHelpCenter } from '../../features/employee-help/EmployeeHelpCenter';
import { reportEmployeeIssue } from '../../features/employee-help/reportEmployeeIssue';
import { useEmployeeIssueNotifications } from '../../features/employee-help/useEmployeeIssueNotifications';

export type KitchenView = 'overview' | 'queue' | 'ready' | 'history';
const INITIAL_SHIFT_TIME = new Date();
export interface KitchenModuleProps extends BaseProps {
  initialView?: KitchenView;
  onViewChange?: (view: KitchenView) => void;
}
export function KitchenModule({
  initialView = 'overview',
  onViewChange,
  ...props
}: KitchenModuleProps) {
  return (
    <KitchenProvider {...props}>
      <KitchenShell initialView={initialView} onViewChange={onViewChange} />
    </KitchenProvider>
  );
}

function KitchenShell({
  initialView,
  onViewChange,
}: {
  initialView: KitchenView;
  onViewChange?: KitchenModuleProps['onViewChange'];
}) {
  useEmployeeIssueNotifications();
  const { employee, restaurant, onLogout } = useKitchenWorkspace();
  const [currentTime, setCurrentTime] = useState(INITIAL_SHIFT_TIME);
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [view, setView] = useState<KitchenView | 'help'>(initialView);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const clearFocusedOrder = useCallback(() => setFocusedOrderId(null), []);
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 820);
  const navigate = (next: KitchenView | 'help') => {
    setView(next);
    if (window.innerWidth <= 820) setOpen(false);
    if (next !== 'help') onViewChange?.(next);
  };
  const nav = [
    ['overview', 'Visão geral', LayoutGrid],
    ['queue', 'Fila de pedidos', ChefHat],
    ['ready', 'Prontos', CheckCircle2],
    ['history', 'Histórico', History],
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
      <S.Sidebar $open={open}>
        <S.CollapseBtn onClick={() => setOpen(false)}>
          <ChevronLeft />
        </S.CollapseBtn>
        <S.Brand>
          <span>{restaurant.monogram}</span>
          <b>{restaurant.restaurantName}</b>
          <small>ÁREA DA COZINHA</small>
        </S.Brand>
        <S.CloseMenu onClick={() => setOpen(false)}>
          <X />
        </S.CloseMenu>
        <S.Nav>
          {nav.map(([id, label, Icon]) => (
            <a key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)}>
              <Icon />
              {label}
            </a>
          ))}
        </S.Nav>
        <S.BottomNav>
          <a className={view === 'help' ? 'active' : ''} onClick={() => navigate('help')}>
            <CircleHelp />
            Central de ajuda
          </a>
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
            <small>Cozinha</small>
          </span>
          <button onClick={onLogout}>
            <LogOut />
          </button>
        </S.User>
      </S.Sidebar>
      {open && <S.Overlay onClick={() => setOpen(false)} />}
      {!open && (
        <S.SidebarOpenTab onClick={() => setOpen(true)}>
          <ChevronRight />
        </S.SidebarOpenTab>
      )}
      <S.Main>
        <S.Top>
          <S.MobileMenu onClick={() => setOpen(true)}>
            <Menu />
          </S.MobileMenu>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <S.Live>
            <Clock3 />
            Em turno <i />{' '}
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </S.Live>
        </S.Top>
        <S.Content>
          {view === 'overview' && (
            <KitchenOverviewPage
              onOpenOrder={(orderId) => {
                setFocusedOrderId(orderId);
                navigate('queue');
              }}
            />
          )}
          {view === 'queue' && (
            <KitchenQueuePage focusedOrderId={focusedOrderId} onFocusComplete={clearFocusedOrder} />
          )}
          {view === 'ready' && <KitchenReadyPage />}
          {view === 'history' && <KitchenHistoryPage />}
          {view === 'help' && <EmployeeHelpCenter role="kitchen" onReport={reportEmployeeIssue} />}
        </S.Content>
      </S.Main>
    </S.Root>
  );
}
