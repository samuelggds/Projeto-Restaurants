import {
  BellRing,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  LogOut,
  Menu,
  QrCode,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { WaiterProvider, type WaiterModuleProps as BaseProps } from './WaiterContext';
import { useWaiterWorkspace } from './useWaiterWorkspace';
import {
  WaiterCallsPage,
  WaiterDeliveriesPage,
  WaiterOverviewPage,
  WaiterTablesPage,
} from './pages/WaiterPages';
import * as S from './Waiter.styles';

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
  const { employee, restaurant, onLogout } = useWaiterWorkspace();
  const [view, setView] = useState(initialView);
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 820);
  const navigate = (next: WaiterView) => {
    setView(next);
    if (window.innerWidth <= 820) setOpen(false);
    onViewChange?.(next);
  };
  const nav = [
    ['overview', 'Visão geral', LayoutGrid],
    ['deliveries', 'Para entregar', ShoppingBag],
    ['tables', 'Mesas e códigos', QrCode],
    ['calls', 'Chamados', BellRing],
  ] as const;
  const titles: Record<WaiterView, [string, string]> = {
    overview: ['Visão geral', 'Área operacional exclusiva do garçom'],
    deliveries: ['Pedidos para entregar', 'Veja os pedidos prontos e leve-os até a mesa'],
    tables: ['Mesas e QR Codes', 'Gerencie códigos de acesso das mesas'],
    calls: ['Chamados', 'Atenda rapidamente as solicitações do salão'],
  };
  const Page = {
    overview: WaiterOverviewPage,
    deliveries: WaiterDeliveriesPage,
    tables: WaiterTablesPage,
    calls: WaiterCallsPage,
  }[view];
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
          <small>ÁREA DO GARÇOM</small>
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
            Em turno <i /> {employee.shift}
          </S.Live>
        </S.Top>
        <S.Content>
          <Page />
        </S.Content>
      </S.Main>
    </S.Root>
  );
}
