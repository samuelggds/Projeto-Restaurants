import { useCallback, useEffect, useMemo, useState } from 'react';
import { House, Search, ShoppingBag, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import ordersService, { getGuestOwnedOrderProofs } from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { connectGuestOrdersSocket } from '../../Services/socketService';
import { OrderSupportDialog, type OrderSupportOrder } from '../../features/order-support/OrderSupportDialog';
import { CustomerDesktopFooter } from '../Home/components/CustomerDesktopFooter';
import { buildTenantPublicPath } from '../../shared/navigation/authNavigation';
import { useResolvedTenantSlug } from '../../shared/tenant/useCustomDomainTenant';
import { GuestOrderHistory, GuestOrderMobileHeader } from './GuestOrderHistory';
import { GuestOrdersFrame } from './GuestOrderHistory.styles';
import { orderSummary, toGuestOrderCard, type GuestOrder } from './guestOrderCard';

export default function GuestOrdersPage() {
  const navigate = useNavigate();
  const { restaurantSlug = '' } = useParams();
  const resolvedRestaurantSlug = useResolvedTenantSlug(restaurantSlug);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [search, setSearch] = useState('');
  const [supportOrderId, setSupportOrderId] = useState<number | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const restaurant = ((settings?.restaurant || {}) as Record<string, unknown>);
  const restaurantId = Number(settings?.restaurantId || restaurant.id || 0) || null;
  const restaurantName = String(restaurant.name || 'Restaurante');
  const restaurantLogo = String(restaurant.logo || '');
  const primary = String(restaurant.primaryColor || '#e85a2b');

  const loadOrders = useCallback(
    async (query = search) => {
      try {
        const result = await ordersService.listGuestOrders({
          restaurantId,
          search: query,
        });
        setOrders(Array.isArray(result.orders) ? (result.orders as GuestOrder[]) : []);
      } finally {
        setLoading(false);
      }
    },
    [restaurantId, search],
  );

  useEffect(() => {
    let active = true;
    restaurantSettingsService
      .getPublicSettingsBySlug(resolvedRestaurantSlug)
      .then((value) => {
        if (active) setSettings((value || null) as Record<string, unknown> | null);
      })
      .catch(() => {
        if (active) setSettings(null);
      });
    return () => {
      active = false;
    };
  }, [resolvedRestaurantSlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(search), 250);
    return () => window.clearTimeout(timer);
  }, [loadOrders, search]);

  useEffect(() => {
    const proofs = getGuestOwnedOrderProofs();
    const socket = connectGuestOrdersSocket(proofs, 'guest-orders-page');

    const refresh = () => void loadOrders(search);
    socket?.on('order:status-changed', refresh);
    socket?.on('new-order', refresh);

    const fallback = window.setInterval(refresh, 20_000);

    return () => {
      socket?.off('order:status-changed', refresh);
      socket?.off('new-order', refresh);
      socket?.disconnect();
      window.clearInterval(fallback);
    };
  }, [loadOrders, search]);

  const supportOrders = useMemo<OrderSupportOrder[]>(
    () =>
      orders.map((order) => ({
        id: Number(order.id || 0),
        status: String(order.status || ''),
        total: Number(order.total || 0),
        createdAt: String(order.createdAt || ''),
        summary: orderSummary(order),
      })),
    [orders],
  );

  return (
    <GuestOrdersFrame $primary={primary}>
      <DesktopHeader>
        <button className="brand" type="button" onClick={() => navigate(buildTenantPublicPath(resolvedRestaurantSlug))}>
          <span className="logo">
            {restaurantLogo ? <img src={restaurantLogo} alt="" /> : restaurantName.slice(0, 1)}
          </span>
          <span>
            <b>{restaurantName}</b>
            <small>Pedidos recentes</small>
          </span>
        </button>

        <button
          className="menu-search"
          type="button"
          onClick={() =>
            navigate('/' + restaurantSlug, {
              state: { openSearch: true },
            })
          }
        >
          <Search aria-hidden="true" />
          <span>Buscar no cardápio de {restaurantName}...</span>
        </button>

        <div className="actions">
          <button
            className="account"
            type="button"
            onClick={() => navigate(buildTenantPublicPath(resolvedRestaurantSlug, '/login'))}
          >
            <UserRound aria-hidden="true" />
            Entrar ou Cadastrar
          </button>
          <button
            className="cart"
            type="button"
            onClick={() =>
              navigate('/' + restaurantSlug, {
                state: { openCart: true },
              })
            }
          >
            <ShoppingBag aria-hidden="true" />
            Meu Carrinho
          </button>
        </div>
      </DesktopHeader>

      <GuestOrderMobileHeader
        restaurantName={restaurantName}
        restaurantLogo={restaurantLogo}
        onHome={() => navigate(buildTenantPublicPath(resolvedRestaurantSlug))}
        onSearch={() => navigate('/' + restaurantSlug, { state: { openSearch: true } })}
      />

      <GuestOrderHistory
        orders={orders.map(toGuestOrderCard)}
        restaurantName={restaurantName}
        search={search}
        onSearch={setSearch}
        loading={loading}
        onTrack={(id) => navigate('/orders/' + id + '/tracking')}
        onHelp={(id) => {
          setSupportOrderId(id);
          setSupportOpen(true);
        }}
      />

      <CustomerDesktopFooter
        restaurantName={restaurantName}
        restaurantLogoUrl={restaurantLogo}
        primaryColor={primary}
        description={String(restaurant.description || '')}
        onMenu={() => navigate(buildTenantPublicPath(resolvedRestaurantSlug))}
        onSupport={() => {
          setSupportOrderId(orders[0] ? Number(orders[0].id || 0) : null);
          setSupportOpen(true);
        }}
      />

      <BottomNav>
        <button type="button" onClick={() => navigate(buildTenantPublicPath(resolvedRestaurantSlug))}>
          <House /><span>Início</span>
        </button>
        <button className="active" type="button">
          <ShoppingBag /><span>Pedidos</span>
        </button>
        <button type="button" onClick={() => navigate(buildTenantPublicPath(resolvedRestaurantSlug, '/login'))}>
          <UserRound /><span>Conta</span>
        </button>
      </BottomNav>

      <OrderSupportDialog
        open={supportOpen}
        onClose={() => {
          setSupportOpen(false);
          setSupportOrderId(null);
        }}
        orders={supportOrders}
        initialOrderId={supportOrderId}
        visitor
      />
    </GuestOrdersFrame>
  );
}

const DesktopHeader = styled.header`
  height: 80px;
  padding: 0 8vw;
  border-bottom: 1px solid #efece6;
  background: #fff;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(300px, 420px) minmax(300px, 1fr);
  align-items: center;
  gap: 28px;

  button { border: 0; background: transparent; color: inherit; cursor: pointer; }
  .brand { display: flex; align-items: center; gap: 12px; text-align: left; justify-self:start; }
  .logo {
    width: 40px; height: 40px; border-radius: 12px; overflow: hidden;
    display: grid; place-items: center; background: var(--guest-primary); color: #fff; font-weight: 800;
  }
  .logo img { width: 100%; height: 100%; object-fit: cover; }
  .brand > span:last-child { display: grid; gap: 2px; }
  .brand b { font-family: Gabarito, Inter, sans-serif; font-size: 18px; }
  .brand small { color: #72706b; font-size: 12px; }

  .menu-search {
    min-width:0;height:40px;padding:0 16px;border:1px solid #efece6;border-radius:999px;
    background:#fafaf8;display:flex;align-items:center;gap:10px;color:#72706b;text-align:left;
  }
  .menu-search svg{width:16px;height:16px;flex:0 0 16px}
  .menu-search span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .actions{justify-self:end;display:flex;align-items:center;gap:14px}
  .account,.cart{display:flex;align-items:center;gap:8px;font-weight:700;white-space:nowrap}
  .account svg,.cart svg{width:18px;height:18px}
  .cart{padding:10px 16px;border-radius:999px;background:var(--guest-primary);color:#fff}

  @media(max-width: 1000px){
    grid-template-columns:1fr auto;
    .menu-search{display:none}
  }

  @media(max-width: 760px){ display:none; }
`;

const BottomNav = styled.nav`
  display:none;
  @media(max-width:760px){
    position:fixed;left:0;right:0;bottom:0;z-index:30;height:68px;padding-bottom:env(safe-area-inset-bottom,0);
    border-top:1px solid #efece6;background:#fff;display:grid;grid-template-columns:repeat(3,1fr);
    button{border:0;background:transparent;color:#72706b;display:grid;place-items:center;align-content:center;gap:3px;font-size:10px}
    button.active{color:var(--guest-primary)}
    svg{width:20px;height:20px}
  }
`;
