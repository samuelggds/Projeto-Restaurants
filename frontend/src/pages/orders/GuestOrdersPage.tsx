import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Headphones,
  House,
  MapPin,
  Search,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import ordersService, { getGuestOwnedOrderProofs } from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { connectGuestOrdersSocket } from '../../Services/socketService';
import { OrderSupportDialog, type OrderSupportOrder } from '../../features/order-support/OrderSupportDialog';
import { CustomerDesktopFooter } from '../Home/components/CustomerDesktopFooter';

type GuestOrder = Record<string, unknown>;

function money(value: unknown) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function statusLabel(value: unknown) {
  const status = String(value || '').toUpperCase();
  if (status === 'PREPARANDO') return 'Em preparo';
  if (status === 'PRONTO') return 'Pronto';
  if (status === 'SAIU_PARA_ENTREGA') return 'A caminho';
  if (status === 'ENTREGUE') return 'Entregue';
  if (status === 'CANCELADO') return 'Cancelado';
  return 'Confirmado';
}

function statusClass(value: unknown) {
  const status = String(value || '').toUpperCase();
  if (status === 'SAIU_PARA_ENTREGA') return 'on-the-way';
  if (status === 'ENTREGUE') return 'delivered';
  if (status === 'CANCELADO') return 'cancelled';
  return 'preparing';
}

function progressIndex(value: unknown) {
  const status = String(value || '').toUpperCase();
  if (status === 'ENTREGUE') return 3;
  if (status === 'SAIU_PARA_ENTREGA') return 2;
  if (status === 'PREPARANDO' || status === 'PRONTO') return 1;
  return 0;
}

function orderSummary(order: GuestOrder) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items
    .map((item) => {
      const record = (item || {}) as Record<string, unknown>;
      const product = (record.product || {}) as Record<string, unknown>;
      const quantity = Math.max(1, Number(record.quantity || 1));
      const name = String(product.name || record.productName || 'Item');
      return `${quantity}x ${name}`;
    })
    .join(', ');
}

function orderImage(order: GuestOrder) {
  const items = Array.isArray(order.items) ? order.items : [];
  const first = (items[0] || {}) as Record<string, unknown>;
  const product = (first.product || {}) as Record<string, unknown>;
  return String(product.image || '').trim();
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = now.toDateString() === date.toDateString();
  const day = sameDay
    ? 'Hoje'
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${day} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function GuestOrdersPage() {
  const navigate = useNavigate();
  const { restaurantSlug = '' } = useParams();
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
      .getPublicSettingsBySlug(restaurantSlug)
      .then((value) => {
        if (active) setSettings((value || null) as Record<string, unknown> | null);
      })
      .catch(() => {
        if (active) setSettings(null);
      });
    return () => {
      active = false;
    };
  }, [restaurantSlug]);

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
    <Page $primary={primary}>
      <DesktopHeader>
        <button className="brand" type="button" onClick={() => navigate('/' + restaurantSlug)}>
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
            onClick={() => navigate('/' + restaurantSlug + '/login')}
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

      <MobileHeader>
        <button className="brand" type="button" onClick={() => navigate('/' + restaurantSlug)}>
          <span className="logo">
            {restaurantLogo ? <img src={restaurantLogo} alt="" /> : restaurantName.slice(0, 1)}
          </span>
          <span>
            <b>{restaurantName}</b>
            <small>Pedidos recentes</small>
          </span>
        </button>
        <button
          className="search"
          type="button"
          aria-label="Buscar no cardápio"
          onClick={() =>
            navigate('/' + restaurantSlug, {
              state: { openSearch: true },
            })
          }
        >
          <Search aria-hidden="true" />
        </button>
      </MobileHeader>

      <Main>
        <TitleBlock>
          <div>
            <h1 className="desktop-title">Seus Pedidos Recentes</h1>
            <h1 className="mobile-title">Acompanhar Pedido</h1>
            <p>Acompanhe seus pedidos recentes feitos como visitante</p>
          </div>
          <SearchBox>
            <Search aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por número do pedido ou telefone..."
              aria-label="Buscar pedido"
            />
          </SearchBox>
        </TitleBlock>

        <OrderStack>
          {loading ? (
            <Empty>Carregando seus pedidos...</Empty>
          ) : orders.length ? (
            orders.map((order) => {
              const id = Number(order.id || 0);
              const current = progressIndex(order.status);
              const image = orderImage(order);
              const status = String(order.status || '').toUpperCase();
              return (
                <OrderCard key={id}>
                  <div className="order-head">
                    <div className="restaurant-info">
                      <span className="thumb">
                        {image ? <img src={image} alt="" /> : restaurantName.slice(0, 1)}
                      </span>
                      <span>
                        <b>{restaurantName}</b>
                        <small>Pedido #{id} · {formatDate(order.createdAt)}</small>
                      </span>
                    </div>
                    <span className={'status ' + statusClass(order.status)}>
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="divider" />

                  <div className="order-body">
                    <p>{orderSummary(order) || 'Pedido sem itens disponíveis para exibição.'}</p>
                    <strong>{money(order.total)}</strong>
                  </div>

                  {status !== 'CANCELADO' ? (
                    <div className="progress">
                      <div className="line">
                        {[0, 1, 2, 3].map((index) => (
                          <span className="segment" key={index}>
                            <i className={index <= current ? 'done' : ''} />
                            {index < 3 ? <em className={index < current ? 'done' : ''} /> : null}
                          </span>
                        ))}
                      </div>
                      <div className="labels">
                        {['Confirmado', 'Em preparo', 'A caminho', 'Entregue'].map((label, index) => (
                          <span key={label} className={index === current ? 'current' : ''}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {String(order.type || '').toUpperCase() === 'DELIVERY' &&
                  !['ENTREGUE', 'CANCELADO'].includes(status) ? (
                    <button
                      className="track"
                      type="button"
                      onClick={() => navigate('/orders/' + id + '/tracking')}
                    >
                      <MapPin aria-hidden="true" />
                      Acompanhar em tempo real
                    </button>
                  ) : null}

                  <button
                    className="help"
                    type="button"
                    onClick={() => {
                      setSupportOrderId(id);
                      setSupportOpen(true);
                    }}
                  >
                    <Headphones aria-hidden="true" />
                    Precisa de ajuda?
                  </button>
                </OrderCard>
              );
            })
          ) : (
            <Empty>
              <ShoppingBag />
              <strong>Nenhum pedido encontrado</strong>
              <span>Os pedidos feitos como visitante neste navegador aparecerão aqui.</span>
            </Empty>
          )}
        </OrderStack>
      </Main>

      <CustomerDesktopFooter
        restaurantName={restaurantName}
        restaurantLogoUrl={restaurantLogo}
        primaryColor={primary}
        description={String(restaurant.description || '')}
        onMenu={() => navigate('/' + restaurantSlug)}
        onSupport={() => {
          setSupportOrderId(orders[0] ? Number(orders[0].id || 0) : null);
          setSupportOpen(true);
        }}
      />

      <BottomNav>
        <button type="button" onClick={() => navigate('/' + restaurantSlug)}>
          <House /><span>Início</span>
        </button>
        <button className="active" type="button">
          <ShoppingBag /><span>Pedidos</span>
        </button>
        <button type="button" onClick={() => navigate('/' + restaurantSlug + '/login')}>
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
    </Page>
  );
}

const Page = styled.main<{ $primary: string }>`
  --guest-primary: ${({ $primary }) => $primary};
  min-height: 100vh;
  background: #fdfcf9;
  color: #1f1e1a;
  font-family: Inter, system-ui, sans-serif;
`;

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

const MobileHeader = styled.header`
  display:none;
  @media(max-width:760px){
    height:64px;padding:0 20px;border-bottom:1px solid #efece6;background:#fff;
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    button{border:0;background:transparent;color:inherit;cursor:pointer}
    .brand{min-width:0;display:flex;align-items:center;gap:10px;text-align:left}
    .logo{width:34px;height:34px;flex:0 0 34px;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:var(--guest-primary);color:#fff;font-weight:800}
    .logo img{width:100%;height:100%;object-fit:cover}
    .brand>span:last-child{min-width:0;display:grid;gap:1px}
    b{overflow:hidden;font-family:Gabarito,Inter,sans-serif;font-size:15px;text-overflow:ellipsis;white-space:nowrap}
    small{font-size:10px;color:#72706b}
    .search{width:38px;height:38px;flex:0 0 38px;border-radius:50%;background:#fafaf8;display:grid;place-items:center}
    .search svg{width:18px;height:18px}
  }
`;

const Main = styled.section`
  width:min(1220px,calc(100% - 40px));margin:0 auto;padding:56px 0 80px;
  @media(max-width:760px){width:100%;padding:20px 20px 96px}
`;

const TitleBlock = styled.div`
  display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:28px;
  h1{margin:0 0 4px;font-family:Gabarito,Inter,sans-serif;font-size:30px}
  p{margin:0;color:#72706b;font-size:14px}
  .mobile-title{display:none}
  @media(max-width:760px){
    display:grid;align-items:stretch;margin-bottom:14px;
    .desktop-title{display:none}.mobile-title{display:block;font-size:26px}
    p{font-size:13px}
  }
`;

const SearchBox = styled.label`
  width:min(410px,100%);height:44px;padding:0 14px;border:1px solid var(--guest-primary);
  border-radius:999px;background:#fff;display:flex;align-items:center;gap:10px;
  svg{width:17px;color:var(--guest-primary)}
  input{width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:13px}
  input::placeholder{color:#89857f}
  @media(max-width:760px){width:100%;border-radius:12px}
`;

const OrderStack = styled.div`display:grid;gap:20px;@media(max-width:760px){gap:14px}`;

const OrderCard = styled.article`
  padding:24px;border:1px solid #efece6;border-radius:16px;background:#fff;display:grid;gap:16px;
  .order-head,.order-body{display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:0}
  .restaurant-info{display:flex;align-items:center;gap:12px;min-width:0}
  .restaurant-info>span:last-child{display:grid;gap:3px;min-width:0}
  .restaurant-info b{font-family:Gabarito,Inter,sans-serif;font-size:18px}
  .restaurant-info small{color:#72706b;font-size:13px;white-space:nowrap}
  .thumb{width:48px;height:48px;flex:0 0 48px;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:#f7f5f0;color:var(--guest-primary);font-weight:800}
  .thumb img{width:100%;height:100%;object-fit:cover}
  .status{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:800;white-space:nowrap}
  .status.preparing{background:#fdf2ec;color:var(--guest-primary)}
  .status.on-the-way{background:#ecf2fd;color:#2b6be8}
  .status.delivered{background:#eaf7ee;color:#268c43}
  .status.cancelled{background:#fff0ee;color:#c54436}
  .divider{height:1px;background:#efece6}
  .order-body p{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#72706b;font-size:15px}
  .order-body strong{font-size:16px;white-space:nowrap}
  .progress{display:grid;gap:9px}
  .line{display:flex;align-items:center;padding:0 12px}
  .segment{display:flex;align-items:center;flex:1;min-width:0}
  .segment:last-child{flex:0 0 12px}
  .segment i{width:12px;height:12px;flex:0 0 12px;border-radius:50%;background:#d8d5d0}
  .segment em{height:2px;flex:1;background:#efece6}
  .segment i.done,.segment em.done{background:var(--guest-primary)}
  .labels{display:grid;grid-template-columns:repeat(4,1fr);font-size:9px;text-align:center;color:#72706b}
  .labels .current{color:var(--guest-primary);font-weight:800}
  .track{min-height:38px;padding:9px 12px;border:1px solid var(--guest-primary);border-radius:999px;background:#fff;color:var(--guest-primary);display:flex;align-items:center;gap:8px;font-weight:700}
  .track svg,.help svg{width:14px;height:14px}
  .help{justify-self:start;padding:0;border:0;background:transparent;color:var(--guest-primary);display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700}
  @media(max-width:760px){
    padding:16px;gap:12px;
    .restaurant-info{gap:8px}.thumb{width:32px;height:32px;flex-basis:32px;border-radius:8px}
    .restaurant-info b{font-size:15px}.restaurant-info small{font-size:11px}
    .status{padding:4px 8px;font-size:10px}
    .order-body p{font-size:12px}.order-body strong{font-size:14px}
  }
`;

const Empty = styled.div`
  min-height:220px;padding:32px;border:1px dashed #ddd7cf;border-radius:16px;background:#fff;
  display:grid;place-items:center;align-content:center;gap:8px;text-align:center;color:#72706b;
  svg{width:28px;height:28px;color:var(--guest-primary)}strong{color:#1f1e1a}
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
