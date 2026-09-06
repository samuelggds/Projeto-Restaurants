import { useState } from 'react';
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  History,
  LayoutGrid,
  LogOut,
  MapPinned,
  MoreHorizontal,
  PackageCheck,
  User,
  X,
} from 'lucide-react';
import { createRestaurantMonogram } from '../../utils/restaurantMonogram';
import * as L from '../kitchen/Kitchen.styles';
import * as S from './CourierNavigation.styles';
import { CourierChatNotifications } from './components/CourierChatNotifications';
import { CourierChatResponsiveStyles } from './components/CourierChatResponsiveStyles';
import type { CourierView } from './courierViewMeta';

type Props = {
  view: CourierView;
  restaurantName: string;
  userName: string;
  readyCount: number;
  routeCount: number;
  deliveredCount: number;
  sidebarOpen: boolean;
  onSidebarOpen: () => void;
  onSidebarClose: () => void;
  onGo: (view: CourierView) => void;
  onLogout: () => void;
};

export function CourierNavigation({
  view,
  restaurantName,
  userName,
  readyCount,
  routeCount,
  deliveredCount,
  sidebarOpen,
  onSidebarOpen,
  onSidebarClose,
  onGo,
  onLogout,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const secondaryActive = ['history', 'profile', 'help'].includes(view);
  const go = (next: CourierView) => {
    setMoreOpen(false);
    onGo(next);
  };

  return (
    <>
      <CourierChatResponsiveStyles />
      <CourierChatNotifications />

      <S.Sidebar>
        <L.CollapseBtn onClick={onSidebarClose} aria-label="Recolher navegação">
          <ChevronLeft />
        </L.CollapseBtn>
        <S.Brand>
          <span>{createRestaurantMonogram(restaurantName)}</span>
          <b>{restaurantName}</b>
          <small>Área do motoqueiro</small>
        </S.Brand>
        <S.Nav aria-label="Navegação do motoqueiro">
          {(
            [
              ['overview', 'Visão geral', LayoutGrid, readyCount + routeCount],
              ['ready', 'Para retirar', PackageCheck, readyCount],
              ['route', 'Em entrega', Bike, routeCount],
              ['map', 'Minha rota', MapPinned, routeCount],
              ['history', 'Histórico', History, deliveredCount],
              ['profile', 'Meu perfil', User, 0],
            ] as const
          ).map(([id, label, Icon, count]) => (
            <button
              key={id}
              type="button"
              className={view === id ? 'active' : ''}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => go(id)}
            >
              <Icon /> {label} {count > 0 && <S.NavBadge>{count}</S.NavBadge>}
            </button>
          ))}
        </S.Nav>
        <S.SupportNav aria-label="Suporte do motoqueiro">
          <button
            type="button"
            className={view === 'help' ? 'active' : ''}
            aria-current={view === 'help' ? 'page' : undefined}
            onClick={() => go('help')}
          >
            <CircleHelp /> Central de ajuda
          </button>
        </S.SupportNav>
        <S.UserBlock>
          <span className="avatar">{createRestaurantMonogram(userName)}</span>
          <span>
            <b>{userName}</b>
            <small>Motoqueiro</small>
          </span>
          <button type="button" onClick={onLogout} aria-label="Sair da área do motoqueiro">
            <LogOut />
          </button>
        </S.UserBlock>
      </S.Sidebar>

      {!sidebarOpen && (
        <S.SidebarOpenControl onClick={onSidebarOpen} aria-label="Expandir navegação">
          <ChevronRight />
        </S.SidebarOpenControl>
      )}

      <S.MobileNav aria-label="Navegação móvel do motoqueiro">
        {(
          [
            ['overview', 'Início', LayoutGrid, 0],
            ['ready', 'Retirar', PackageCheck, readyCount],
            ['route', 'Entregas', Bike, routeCount],
            ['map', 'Rota', MapPinned, 0],
          ] as const
        ).map(([id, label, Icon, count]) => (
          <button
            key={id}
            type="button"
            aria-label={label}
            className={view === id ? 'active' : ''}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => go(id)}
          >
            <span>
              <Icon />
              {count > 0 && <i>{count}</i>}
            </span>
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-label="Mais"
          className={secondaryActive || moreOpen ? 'active' : ''}
          aria-expanded={moreOpen}
          aria-controls="courier-mobile-more"
          onClick={() => setMoreOpen((current) => !current)}
        >
          <span>
            <MoreHorizontal />
          </span>
          Mais
        </button>
      </S.MobileNav>

      {moreOpen && (
        <>
          <S.MoreBackdrop
            type="button"
            aria-label="Fechar mais opções"
            onClick={() => setMoreOpen(false)}
          />
          <S.MoreSheet
            id="courier-mobile-more"
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções do motoqueiro"
          >
            <header>
              <h2>Mais opções</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar mais opções"
              >
                <X />
              </button>
            </header>
            <button
              type="button"
              className={view === 'history' ? 'active' : ''}
              onClick={() => go('history')}
            >
              <History /> Histórico
            </button>
            <button
              type="button"
              className={view === 'profile' ? 'active' : ''}
              onClick={() => go('profile')}
            >
              <User /> Meu perfil
            </button>
            <button
              type="button"
              className={view === 'help' ? 'active' : ''}
              onClick={() => go('help')}
            >
              <CircleHelp /> Central de ajuda
            </button>
            <button type="button" className="logout" onClick={onLogout}>
              <LogOut /> Sair da conta
            </button>
          </S.MoreSheet>
        </>
      )}
    </>
  );
}
