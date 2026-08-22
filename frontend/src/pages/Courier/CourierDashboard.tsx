import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle,
  Clock,
  RefreshCw,
  User,
  Bike,
  LocateFixed,
  Navigation,
  MapPinOff,
  ShieldAlert,
  LogOut,
  X,
  CircleHelp,
} from 'lucide-react';
import * as S from './styles';
import ordersService from '../../Services/ordersService';
import { connectSocket, disconnectSocket } from '../../Services/socketService';
import { useAuth } from '../../contexts/authContext';
import { EmployeeHelpCenter } from '../../features/employee-help/EmployeeHelpCenter';
import { reportEmployeeIssue } from '../../features/employee-help/reportEmployeeIssue';
import { useEmployeeIssueNotifications } from '../../features/employee-help/useEmployeeIssueNotifications';
import {
  compareReadyForPickupOrders,
  getNormalizedOrderStatus,
  isCourierDeliveryOrder,
  isReadyForCourierPickup,
} from './domain/courierOrders';

const ProfilePanel = lazy(() => import('./components/ProfilePanel'));
const OrderCard = lazy(() => import('./components/OrderCard'));

const STATUS_LABEL = {
  PRONTO: { label: 'Pronto p/ retirada', color: '#f59e0b' },
  SAIU_PARA_ENTREGA: { label: 'Em entrega', color: '#3b82f6' },
  ENTREGUE: { label: 'Entregue', color: '#22c55e' },
};

const PAYMENT_LABEL = {
  PIX: 'PIX',
  CARTAO: 'Cartão',
  CARTAO_DEBITO: 'Débito',
  CARTAO_CREDITO: 'Crédito',
};
const DIGITAL_PAYMENT_METHODS = new Set(['PIX', 'CARTAO', 'CARTAO_DEBITO', 'CARTAO_CREDITO']);
const LOCATION_UPDATE_INTERVAL_MS = 2000;

type GeoStatus = 'checking' | 'enabled' | 'blocked' | 'unsupported';

export default function CourierDashboard() {
  useEmployeeIssueNotifications();
  const INITIAL_VISIBLE_ORDERS = 12;
  const LOAD_MORE_STEP = 12;

  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PRONTO');
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_ORDERS);
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const ordersRef = useRef<Array<{ id?: number; status?: string }>>([]);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('checking');
  const [locationTrackingRequested, setLocationTrackingRequested] = useState(false);
  const [geoNotice, setGeoNotice] = useState(
    'Ative sua localização para que o cliente acompanhe a entrega em tempo real.',
  );
  const [geoActionHint, setGeoActionHint] = useState(
    'Toque em Ativar localização para abrir o aviso de permissão.',
  );

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  function handleProfileUpdated(updatedUser) {
    const token = localStorage.getItem('token');
    if (token) login(updatedUser, token);
  }

  function fetchOrders() {
    setRefreshKey((k) => k + 1);
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setOrderIdSearch('');
    setVisibleLimit(INITIAL_VISIBLE_ORDERS);
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await ordersService.listRestaurantOrders();
        if (!mounted) return;
        const allOrders = (Array.isArray(data) ? data : []) as Array<{
          id?: number;
          type?: string;
          status?: string;
          createdAt?: string;
        }>;
        const deliveryOrders = allOrders.filter(isCourierDeliveryOrder);
        setOrders(deliveryOrders);
        setDeliveredCount(deliveryOrders.filter((o) => o.status === 'ENTREGUE').length);
      } catch {
        // silently fail
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !locationTrackingRequested) return;

    const socket = connectSocket(token, 'courier-dashboard');
    let watchId: number | null = null;
    let emitTimer: ReturnType<typeof setInterval> | null = null;
    const latestPositionRef: {
      current: GeolocationPosition | null;
    } = {
      current: null,
    };

    const emitLocationForOrdersInRoute = () => {
      const currentPosition = latestPositionRef.current;

      if (!currentPosition) {
        return;
      }

      const deliveryInRoute = ordersRef.current.filter(
        (order) => String(order?.status || '').toUpperCase() === 'SAIU_PARA_ENTREGA',
      );

      if (deliveryInRoute.length === 0) {
        return;
      }

      for (const order of deliveryInRoute) {
        const orderId = Number(order?.id || 0);

        if (!Number.isInteger(orderId) || orderId <= 0) {
          continue;
        }

        socket.emit('delivery:location:update', {
          orderId,
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
          heading: Number.isFinite(currentPosition.coords.heading)
            ? currentPosition.coords.heading
            : null,
          speed: Number.isFinite(currentPosition.coords.speed)
            ? currentPosition.coords.speed
            : null,
          accuracy: currentPosition.coords.accuracy,
          sentAt: new Date().toISOString(),
        });
      }
    };

    if (typeof window !== 'undefined' && navigator?.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          latestPositionRef.current = position;
          setGeoStatus('enabled');
          setGeoNotice(
            'Localização ativa. O cliente recebe sua posição automaticamente a cada 2 segundos.',
          );
          setGeoActionHint('');
          emitLocationForOrdersInRoute();
        },
        (error) => {
          if (error?.code === 1) {
            setGeoStatus('blocked');
            setGeoNotice(
              'Sem acesso à localização. Ative a permissão no navegador para liberar o rastreio em tempo real.',
            );
            setGeoActionHint('Dica: clique no cadeado ao lado da URL e permita Localização.');
            return;
          }

          setGeoStatus('blocked');
          setGeoNotice(
            'Não foi possível obter sua localização agora. Verifique GPS/internet e tente novamente.',
          );
          setGeoActionHint('Se aparecer o aviso no navegador, confirme em Permitir.');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 6000,
        },
      );

      emitTimer = setInterval(() => {
        emitLocationForOrdersInRoute();
      }, LOCATION_UPDATE_INTERVAL_MS);
    } else {
      setTimeout(() => {
        setGeoStatus('unsupported');
        setGeoNotice('Seu dispositivo não oferece geolocalização neste navegador.');
        setGeoActionHint('');
      }, 0);
    }

    function onStatusChanged(updatedOrder) {
      setOrders((prev) => {
        const exists = prev.find((o) => o.id === updatedOrder.id);
        if (!exists) {
          if (String(updatedOrder.type || '').toUpperCase() !== 'DELIVERY') return prev;
          return [updatedOrder, ...prev];
        }
        return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      });
      if (updatedOrder.status === 'ENTREGUE') {
        setDeliveredCount((n) => n + 1);
      }
    }

    socket.on('order:status-changed', onStatusChanged);

    return () => {
      if (emitTimer) {
        clearInterval(emitTimer);
      }
      if (watchId !== null && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      socket.off('order:status-changed', onStatusChanged);
      disconnectSocket();
    };
  }, [locationTrackingRequested]);

  async function handleMarkDelivered(orderId, deliveryConfirmationCode) {
    const updated = await ordersService.updateStatus(orderId, 'ENTREGUE', deliveryConfirmationCode);
    const updatedOrder = updated?.order || updated;
    setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
  }

  const readyForPickupOrders = [...orders]
    .filter(isReadyForCourierPickup)
    .sort(compareReadyForPickupOrders);
  const inRouteOrders = orders.filter((o) => getNormalizedOrderStatus(o) === 'SAIU_PARA_ENTREGA');
  const deliveredOrders = orders.filter((o) => getNormalizedOrderStatus(o) === 'ENTREGUE');

  const filteredOrders =
    activeTab === 'PRONTO'
      ? readyForPickupOrders
      : activeTab === 'SAIU_PARA_ENTREGA'
        ? inRouteOrders
        : activeTab === 'ENTREGUE'
          ? deliveredOrders
          : [];
  const searchedOrders = filteredOrders.filter((order) => {
    const normalizedSearch = orderIdSearch.trim();

    if (!normalizedSearch) {
      return true;
    }

    return String(order?.id ?? '').includes(normalizedSearch);
  });
  const displayedOrders = searchedOrders.slice(0, visibleLimit);
  const hiddenOrdersCount = Math.max(searchedOrders.length - displayedOrders.length, 0);
  const prontoCount = readyForPickupOrders.length;
  const saiuCount = inRouteOrders.length;
  const entregueCount = deliveredOrders.length;

  const requestLocationPermission = () => {
    if (!navigator?.geolocation) {
      setGeoStatus('unsupported');
      setGeoNotice('Este navegador não suporta geolocalização.');
      setGeoActionHint('');
      return;
    }

    setLocationTrackingRequested(true);
    setGeoStatus('checking');
    setGeoNotice('Aguardando sua confirmação para ativar a localização.');
    setGeoActionHint(
      'Quando o navegador mostrar o aviso, clique em Permitir para liberar o rastreio.',
    );

    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoStatus('enabled');
        setGeoNotice(
          'Localização ativa. O cliente recebe sua posição automaticamente a cada 2 segundos.',
        );
        setGeoActionHint('');
      },
      (error) => {
        if (error?.code === 1) {
          setGeoStatus('blocked');
          setGeoNotice(
            'Permissão negada. Ative localização nas configurações do navegador para liberar o rastreio.',
          );
          setGeoActionHint('Dica: clique no cadeado ao lado da URL e permita Localização.');
          return;
        }

        setGeoStatus('blocked');
        setGeoNotice(
          'Não foi possível ativar a localização agora. Verifique o GPS e tente de novo.',
        );
        setGeoActionHint('Se aparecer o aviso do navegador, confirme em Permitir.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 6000,
      },
    );
  };

  return (
    <S.PageWrapper>
      {/* Sidebar */}
      <S.Sidebar>
        <S.SidebarHeader>
          <S.BikeIcon>
            <Bike size={28} />
          </S.BikeIcon>
          <div>
            <h2>Olá, {user?.name?.split(' ')[0] || 'Entregador'}</h2>
            <p>{user?.email || ''}</p>
          </div>
        </S.SidebarHeader>

        <S.SidebarStats>
          <S.SideStatItem>
            <Package size={18} />
            <div>
              <span>Prontos</span>
              <strong>{prontoCount}</strong>
            </div>
          </S.SideStatItem>
          <S.SideStatItem>
            <Clock size={18} />
            <div>
              <span>Em rota</span>
              <strong>{saiuCount}</strong>
            </div>
          </S.SideStatItem>
          <S.SideStatItem>
            <CheckCircle size={18} />
            <div>
              <span>Entregues hoje</span>
              <strong>{deliveredCount}</strong>
            </div>
          </S.SideStatItem>
        </S.SidebarStats>

        <S.SidebarNav>
          <S.SideNavItem $active={activeTab === 'PRONTO'} onClick={() => handleTabChange('PRONTO')}>
            <Package size={16} />
            Prontos para retirada
            {prontoCount > 0 && <S.NavBadge>{prontoCount}</S.NavBadge>}
          </S.SideNavItem>
          <S.SideNavItem
            $active={activeTab === 'SAIU_PARA_ENTREGA'}
            onClick={() => handleTabChange('SAIU_PARA_ENTREGA')}
          >
            <Bike size={16} />
            Em entrega
            {saiuCount > 0 && <S.NavBadge $urgent>{saiuCount}</S.NavBadge>}
          </S.SideNavItem>
          <S.SideNavItem
            $active={activeTab === 'ENTREGUE'}
            onClick={() => handleTabChange('ENTREGUE')}
          >
            <CheckCircle size={16} />
            Entregues
            {entregueCount > 0 && <S.NavBadge>{entregueCount}</S.NavBadge>}
          </S.SideNavItem>
          <S.SideNavItem $active={activeTab === 'PERFIL'} onClick={() => handleTabChange('PERFIL')}>
            <User size={16} />
            Meu Perfil
          </S.SideNavItem>
        </S.SidebarNav>

        <S.SidebarFooter>
          <S.SideNavItem $active={activeTab === 'AJUDA'} onClick={() => handleTabChange('AJUDA')}>
            <CircleHelp size={16} />
            Central de ajuda
          </S.SideNavItem>

          {user?.role === 'ADMIN' && (
            <S.LogoutButton onClick={() => navigate('/admin')}>
              <ShieldAlert size={16} />
              Entrar na tela de admin
            </S.LogoutButton>
          )}

          <S.LogoutButton
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={16} />
            Sair
          </S.LogoutButton>
        </S.SidebarFooter>
      </S.Sidebar>

      {/* Conteúdo principal */}
      <S.MainArea>
        {geoStatus !== 'enabled' ? (
          <S.LocationAlertCard>
            <S.LocationAlertIcon>
              {geoStatus === 'unsupported' ? <MapPinOff size={22} /> : <LocateFixed size={22} />}
            </S.LocationAlertIcon>
            <S.LocationAlertContent>
              <strong>Ative sua localização para liberar o rastreio ao cliente</strong>
              <p>{geoNotice}</p>
              {geoActionHint ? <small>{geoActionHint}</small> : null}
            </S.LocationAlertContent>
            {geoStatus !== 'unsupported' ? (
              <S.LocationAlertButton type="button" onClick={requestLocationPermission}>
                <Navigation size={16} />
                Ativar localização
              </S.LocationAlertButton>
            ) : null}
          </S.LocationAlertCard>
        ) : (
          <S.LocationStatusChip>
            <LocateFixed size={14} />
            Rastreamento ativo: envio automático a cada 2s
          </S.LocationStatusChip>
        )}

        <S.TopBar>
          <S.TopBarTitle>
            {activeTab === 'PRONTO'
              ? 'Prontos para retirada'
              : activeTab === 'SAIU_PARA_ENTREGA'
                ? 'Em entrega'
                : activeTab === 'ENTREGUE'
                  ? 'Pedidos Entregues'
                  : activeTab === 'AJUDA'
                    ? 'Central de ajuda'
                    : 'Meu Perfil'}
            {activeTab !== 'PERFIL' && activeTab !== 'AJUDA' && (
              <S.CountChip>{searchedOrders.length}</S.CountChip>
            )}
          </S.TopBarTitle>
          {activeTab !== 'PERFIL' && activeTab !== 'AJUDA' && (
            <S.RefreshButton onClick={fetchOrders} title="Atualizar">
              <RefreshCw size={16} />
              Atualizar
            </S.RefreshButton>
          )}
        </S.TopBar>

        {/* Tabs mobile */}
        <S.MobileTabs>
          <S.MobileTab $active={activeTab === 'PRONTO'} onClick={() => handleTabChange('PRONTO')}>
            <Package size={15} /> Prontos {prontoCount > 0 && `(${prontoCount})`}
          </S.MobileTab>
          <S.MobileTab
            $active={activeTab === 'SAIU_PARA_ENTREGA'}
            onClick={() => handleTabChange('SAIU_PARA_ENTREGA')}
          >
            <Bike size={15} /> Em rota {saiuCount > 0 && `(${saiuCount})`}
          </S.MobileTab>
          <S.MobileTab
            $active={activeTab === 'ENTREGUE'}
            onClick={() => handleTabChange('ENTREGUE')}
          >
            <CheckCircle size={15} /> Entregues {entregueCount > 0 && `(${entregueCount})`}
          </S.MobileTab>
          <S.MobileTab $active={activeTab === 'PERFIL'} onClick={() => handleTabChange('PERFIL')}>
            <User size={15} /> Perfil
          </S.MobileTab>
          <S.MobileTab $active={activeTab === 'AJUDA'} onClick={() => handleTabChange('AJUDA')}>
            <CircleHelp size={15} /> Ajuda
          </S.MobileTab>
        </S.MobileTabs>

        {activeTab === 'AJUDA' ? (
          <EmployeeHelpCenter role="courier" onReport={reportEmployeeIssue} />
        ) : activeTab === 'PERFIL' ? (
          <Suspense fallback={null}>
            <ProfilePanel user={user} onUpdated={handleProfileUpdated} />
          </Suspense>
        ) : loading ? (
          <S.EmptyState>
            <RefreshCw size={32} className="spinning" />
            <p>Carregando pedidos...</p>
          </S.EmptyState>
        ) : filteredOrders.length === 0 ? (
          <S.EmptyState>
            <Package size={40} />
            <p>
              {activeTab === 'PRONTO'
                ? 'Nenhum pedido pronto para retirada.'
                : activeTab === 'SAIU_PARA_ENTREGA'
                  ? 'Nenhum pedido em rota no momento.'
                  : 'Nenhum pedido entregue ainda.'}
            </p>
          </S.EmptyState>
        ) : (
          <Suspense fallback={null}>
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.65rem',
                  marginBottom: '0.9rem',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    width: 'min(320px, 100%)',
                    position: 'relative',
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={orderIdSearch}
                    onChange={(event) => {
                      setOrderIdSearch(event.target.value.replace(/\D/g, '').slice(0, 10));
                      setVisibleLimit(INITIAL_VISIBLE_ORDERS);
                    }}
                    placeholder="Buscar por ID do pedido"
                    style={{
                      width: '100%',
                      minHeight: 38,
                      borderRadius: 10,
                      border: '1px solid rgba(148, 163, 184, 0.45)',
                      padding: '0 2.2rem 0 0.75rem',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  />

                  {orderIdSearch ? (
                    <button
                      type="button"
                      aria-label="Limpar busca por ID"
                      title="Limpar"
                      onClick={() => {
                        setOrderIdSearch('');
                        setVisibleLimit(INITIAL_VISIBLE_ORDERS);
                      }}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        border: '1px solid rgba(148, 163, 184, 0.45)',
                        background: '#ffffff',
                        color: '#475569',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                <small style={{ opacity: 0.72, fontWeight: 600 }}>
                  Exibindo {displayedOrders.length} de {searchedOrders.length} pedidos
                </small>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {hiddenOrdersCount > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleLimit((prev) =>
                          Math.min(prev + LOAD_MORE_STEP, searchedOrders.length),
                        )
                      }
                      style={{
                        border: '1px solid rgba(148, 163, 184, 0.45)',
                        background: '#eef2f7',
                        color: '#0f172a',
                        borderRadius: 999,
                        padding: '0.38rem 0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Mostrar +{Math.min(LOAD_MORE_STEP, hiddenOrdersCount)}
                    </button>
                  ) : null}

                  {displayedOrders.length > INITIAL_VISIBLE_ORDERS ? (
                    <button
                      type="button"
                      onClick={() => setVisibleLimit(INITIAL_VISIBLE_ORDERS)}
                      style={{
                        border: '1px solid rgba(148, 163, 184, 0.45)',
                        background: '#ffffff',
                        color: '#334155',
                        borderRadius: 999,
                        padding: '0.38rem 0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Mostrar menos
                    </button>
                  ) : null}
                </div>
              </div>

              <S.OrdersList>
                {displayedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onMarkDelivered={handleMarkDelivered}
                    digitalPaymentMethods={DIGITAL_PAYMENT_METHODS}
                    paymentLabel={PAYMENT_LABEL}
                    statusLabel={STATUS_LABEL}
                  />
                ))}
              </S.OrdersList>
            </>
          </Suspense>
        )}
      </S.MainArea>
    </S.PageWrapper>
  );
}
