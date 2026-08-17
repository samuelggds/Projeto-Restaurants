import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bike,
  CircleHelp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  LayoutGrid,
  LocateFixed,
  LogOut,
  MapPinOff,
  Menu,
  Navigation,
  PackageCheck,
  RefreshCw,
  Search,
  User,
  DollarSign,
  MapPinned,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/authContext';
import ordersService from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { connectSocket, disconnectSocket } from '../../Services/socketService';
import { createRestaurantMonogram } from '../../utils/restaurantMonogram';
import { EmployeeHelpCenter } from '../../features/employee-help/EmployeeHelpCenter';
import { reportEmployeeIssue } from '../../features/employee-help/reportEmployeeIssue';
import * as L from '../kitchen/Kitchen.styles';
import * as S from './styles';

const OrderCard = lazy(() => import('./components/OrderCard'));
const ProfilePanel = lazy(() => import('./components/ProfilePanel'));
const DeliveryMap = lazy(() => import('./components/DeliveryMap'));

type CourierView = 'overview' | 'ready' | 'route' | 'map' | 'history' | 'profile' | 'help';
type GeoStatus = 'checking' | 'enabled' | 'blocked' | 'unsupported';
type CourierOrder = {
  id: number;
  status: string;
  type?: string;
  createdAt?: string;
  deliveredAt?: string;
  [key: string]: unknown;
};
type FinanceData = {
  today: { amount: number; deliveries: number };
  week: { amount: number; deliveries: number };
  month: { amount: number; deliveries: number };
  pending: { amount: number; deliveries: number };
  deliveries: Array<{
    id: number;
    courierEarning: number;
    courierPaidAt?: string | null;
    deliveredAt?: string | null;
    district?: string | null;
    city?: string | null;
  }>;
};
type RoutePoint = {
  latitude: number;
  longitude: number;
  recordedAt?: string;
  speed?: number | null;
};

const PAYMENT_LABEL: Record<string, string> = {
  PIX: 'PIX',
  CARTAO: 'Cartão',
  CARTAO_DEBITO: 'Débito',
  CARTAO_CREDITO: 'Crédito',
  DINHEIRO: 'Dinheiro',
};
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PRONTO: { label: 'Pronto para retirada', color: '#f59e0b' },
  SAIU_PARA_ENTREGA: { label: 'Em entrega', color: '#2563eb' },
  ENTREGUE: { label: 'Entregue', color: '#16a34a' },
};
const DIGITAL_PAYMENT_METHODS = new Set(['PIX', 'CARTAO', 'CARTAO_DEBITO', 'CARTAO_CREDITO']);
const LOCATION_UPDATE_INTERVAL_MS = 2_000;

function monogram(name: string) {
  return createRestaurantMonogram(name);
}

export default function CourierWorkspace() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<CourierView>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth > 820,
  );
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [brand, setBrand] = useState({ name: 'Restaurante', color: '#d64d08' });
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('checking');
  const [locationTrackingRequested, setLocationTrackingRequested] = useState(false);
  const [geoMessage, setGeoMessage] = useState(
    'Ative a localização para o cliente acompanhar a entrega.',
  );
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [financeError, setFinanceError] = useState('');
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const ordersRef = useRef<CourierOrder[]>([]);
  const restaurantId = Number(user?.restaurantId || 0);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (!restaurantId) return;
    restaurantSettingsService
      .getPublicSettings(restaurantId)
      .then((settings: Record<string, unknown>) => {
        const restaurant = (settings.restaurant as Record<string, unknown>) || {};
        setBrand({
          name: String(restaurant.name || settings.restaurantName || 'Restaurante'),
          color: String(settings.primaryColor || '#d64d08'),
        });
      })
      .catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    let active = true;
    ordersService
      .listRestaurantOrders()
      .then((data) => {
        if (active) {
          setOrders((Array.isArray(data) ? data : []) as CourierOrder[]);
          setLastUpdatedAt(new Date());
        }
      })
      .catch(() => {
        if (active) setLoadError('Não foi possível carregar as entregas.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (view !== 'overview') return;
    ordersService
      .getCourierFinance()
      .then((data) => {
        setFinance(data as FinanceData);
        setFinanceError('');
        setLastUpdatedAt(new Date());
      })
      .catch(() => setFinanceError('Não foi possível carregar seus dados financeiros.'));
  }, [view, refresh]);

  useEffect(() => {
    const activeOrder = orders.find((order) => order.status === 'SAIU_PARA_ENTREGA');
    if (view !== 'map' || !activeOrder) return;
    ordersService
      .getDeliveryTracking(activeOrder.id)
      .then((data) => {
        setRoutePoints((data?.locations || []) as RoutePoint[]);
        setLastUpdatedAt(new Date());
      })
      .catch(() => setLoadError('Não foi possível carregar o percurso.'));
  }, [view, orders]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket = connectSocket(token, 'courier-workspace');
    let watchId: number | null = null;
    let latestPosition: GeolocationPosition | null = null;

    const sendLocation = () => {
      if (!latestPosition) return;
      ordersRef.current
        .filter((order) => order.status === 'SAIU_PARA_ENTREGA')
        .forEach((order) => {
          socket.emit('delivery:location:update', {
            orderId: order.id,
            latitude: latestPosition?.coords.latitude,
            longitude: latestPosition?.coords.longitude,
            heading: latestPosition?.coords.heading,
            speed: latestPosition?.coords.speed,
            accuracy: latestPosition?.coords.accuracy,
            sentAt: new Date().toISOString(),
          });
        });
    };

    if (locationTrackingRequested && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          latestPosition = position;
          setRoutePoints((current) =>
            [
              ...current,
              {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                recordedAt: new Date().toISOString(),
              },
            ].slice(-1000),
          );
          setGeoStatus('enabled');
          setGeoMessage('Rastreamento ativo durante as entregas em andamento.');
          setLastUpdatedAt(new Date());
          sendLocation();
        },
        (error) => {
          setGeoStatus('blocked');
          setGeoMessage(
            error.code === 1
              ? 'Permita a localização no navegador para iniciar o rastreamento.'
              : 'Não foi possível obter sua localização. Verifique o GPS e a internet.',
          );
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 6_000 },
      );
    } else if (locationTrackingRequested) {
      window.setTimeout(() => {
        setGeoStatus('unsupported');
        setGeoMessage('Este aparelho não oferece geolocalização neste navegador.');
      }, 0);
    }

    const timer = locationTrackingRequested
      ? window.setInterval(sendLocation, LOCATION_UPDATE_INTERVAL_MS)
      : null;
    const onChanged = (_updated: CourierOrder) => {
      setLastUpdatedAt(new Date());
      setRefresh((value) => value + 1);
    };
    const onLocation = (point: RoutePoint & { orderId: number }) => {
      if (ordersRef.current.some((order) => order.id === point.orderId)) {
        setRoutePoints((current) => [...current, point].slice(-1000));
        setLastUpdatedAt(new Date());
      }
    };
    socket.on('order:status-changed', onChanged);
    socket.on('order:delivery-location', onLocation);
    return () => {
      if (timer) window.clearInterval(timer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      socket.off('order:status-changed', onChanged);
      socket.off('order:delivery-location', onLocation);
      disconnectSocket();
    };
  }, [locationTrackingRequested]);

  const ready = useMemo(() => orders.filter((order) => order.status === 'PRONTO'), [orders]);
  const inRoute = useMemo(
    () => orders.filter((order) => order.status === 'SAIU_PARA_ENTREGA'),
    [orders],
  );
  const delivered = useMemo(() => orders.filter((order) => order.status === 'ENTREGUE'), [orders]);
  const current =
    view === 'ready'
      ? ready
      : view === 'route'
        ? inRoute
        : view === 'history'
          ? delivered
          : [...inRoute, ...ready];
  const visibleOrders = current.filter((order) =>
    String(order.id).includes(search.replace(/\D/g, '')),
  );

  const titles: Record<CourierView, [string, string]> = {
    overview: ['Visão geral', 'Acompanhe seu turno e as próximas entregas'],
    ready: ['Prontos para retirada', 'Assuma um pedido quando ele estiver com você'],
    route: ['Entregas em andamento', 'Pedidos atribuídos a você e em rota'],
    history: ['Histórico', 'Entregas concluídas por você'],
    map: ['Minha rota', 'Acompanhe seu percurso e sua posição atual'],
    profile: ['Meu perfil', 'Dados da sua conta de motoqueiro'],
    help: ['Central de ajuda', 'Manual visual da operação de entrega'],
  };
  const [title, subtitle] = titles[view];
  const isDedicatedView = view === 'map' || view === 'overview' || view === 'help';
  const go = (next: CourierView) => {
    setView(next);
    setSearch('');
    if (window.innerWidth <= 820) setSidebarOpen(false);
  };
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('unsupported');
      setGeoMessage('Este navegador não oferece suporte à localização.');
      return;
    }
    setGeoStatus('checking');
    setGeoMessage('Aguardando sua permissão para ativar o rastreamento.');
    setLocationTrackingRequested(true);
  };
  const updateLocalOrder = (updated: unknown) => {
    const order = updated as CourierOrder;
    setOrders((items) => items.map((item) => (item.id === order.id ? order : item)));
  };

  return (
    <S.CourierShell $primary={brand.color} $sidebarOpen={sidebarOpen}>
      <S.CourierSidebar $open={sidebarOpen}>
        <L.CollapseBtn onClick={() => setSidebarOpen(false)}>
          <ChevronLeft />
        </L.CollapseBtn>
        <S.CourierBrand>
          <span>{monogram(brand.name)}</span>
          <b>{brand.name}</b>
          <small>ÁREA DO MOTOQUEIRO</small>
        </S.CourierBrand>
        <L.CloseMenu onClick={() => setSidebarOpen(false)}>
          <X />
        </L.CloseMenu>
        <S.CourierNav>
          {(
            [
              ['overview', 'Visão geral', LayoutGrid, ready.length + inRoute.length],
              ['ready', 'Para retirar', PackageCheck, ready.length],
              ['route', 'Em entrega', Bike, inRoute.length],
              ['map', 'Minha rota', MapPinned, inRoute.length],
              ['history', 'Histórico', History, delivered.length],
              ['profile', 'Meu perfil', User, 0],
            ] as const
          ).map(([id, label, Icon, count]) => (
            <a key={id} className={view === id ? 'active' : ''} onClick={() => go(id)}>
              <Icon /> {label} {count > 0 && <S.NavBadge>{count}</S.NavBadge>}
            </a>
          ))}
        </S.CourierNav>
        <S.CourierBottomNav>
          <a className={view === 'help' ? 'active' : ''} onClick={() => go('help')}>
            <CircleHelp />
            Central de ajuda
          </a>
        </S.CourierBottomNav>
        <S.CourierUser>
          <span className="avatar">{monogram(user?.name || 'Motoqueiro')}</span>
          <span>
            <b>{user?.name || 'Motoqueiro'}</b>
            <small>Motoqueiro</small>
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Sair"
          >
            <LogOut />
          </button>
        </S.CourierUser>
      </S.CourierSidebar>
      {sidebarOpen && <L.Overlay onClick={() => setSidebarOpen(false)} />}
      {!sidebarOpen && (
        <L.SidebarOpenTab onClick={() => setSidebarOpen(true)}>
          <ChevronRight />
        </L.SidebarOpenTab>
      )}

      <S.CourierMain>
        <S.CourierTop>
          <L.MobileMenu onClick={() => setSidebarOpen(true)}>
            <Menu />
          </L.MobileMenu>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <L.Live title="Horário da atualização mais recente dos dados">
            <Clock3 /> Última atualização <i />{' '}
            {lastUpdatedAt.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </L.Live>
        </S.CourierTop>
        <S.CourierContent>
          {view === 'help' ? null : view === 'map' && geoStatus !== 'enabled' ? (
            <S.LocationAlertCard>
              <S.LocationAlertIcon>
                {geoStatus === 'unsupported' ? <MapPinOff /> : <LocateFixed />}
              </S.LocationAlertIcon>
              <S.LocationAlertContent>
                <strong>Localização necessária durante a rota</strong>
                <p>{geoMessage}</p>
              </S.LocationAlertContent>
              {geoStatus !== 'unsupported' && (
                <S.LocationAlertButton onClick={requestLocation}>
                  <Navigation /> Ativar localização
                </S.LocationAlertButton>
              )}
            </S.LocationAlertCard>
          ) : view === 'map' ? (
            <S.RouteSection>
              <S.SectionHeader>
                <div>
                  <h2>Minha rota</h2>
                  <p>Acompanhe sua posicao e as entregas em andamento.</p>
                </div>
                <S.LocationStatusChip>
                  <LocateFixed /> Localizacao ativa
                </S.LocationStatusChip>
              </S.SectionHeader>
              {inRoute.length ? (
                <Suspense
                  fallback={
                    <S.EmptyState>
                      <RefreshCw className="spinning" />
                    </S.EmptyState>
                  }
                >
                  <DeliveryMap
                    points={routePoints}
                    label={user?.name || 'Motoqueiro'}
                    statusMessage="Sua rota está em andamento"
                    statusDetail="Sua localização está sendo compartilhada com o cliente."
                  />
                </Suspense>
              ) : (
                <S.EmptyState>
                  <MapPinned />
                  <p>Retire um pedido para iniciar a rota.</p>
                </S.EmptyState>
              )}
            </S.RouteSection>
          ) : (
            <S.LocationStatusChip>
              <LocateFixed /> {geoMessage}
            </S.LocationStatusChip>
          )}

          {view === 'overview' && (
            <>
              <S.OverviewHero>
                <div>
                  <small>RESUMO DO TURNO</small>
                  <h2>Olá, {user?.name?.split(' ')[0] || 'Motoqueiro'}</h2>
                  <p>Acompanhe entregas e ganhos em um só lugar.</p>
                </div>
                <S.OverviewCounters>
                  <span>
                    <PackageCheck />
                    <b>{ready.length}</b>
                    <small>Para retirar</small>
                  </span>
                  <span>
                    <Bike />
                    <b>{inRoute.length}</b>
                    <small>Em rota</small>
                  </span>
                  <span>
                    <CheckCircle2 />
                    <b>{delivered.length}</b>
                    <small>Entregues</small>
                  </span>
                </S.OverviewCounters>
              </S.OverviewHero>
              <S.EarningsPanel>
                <S.EarningsHeading>
                  <div>
                    <DollarSign />
                    <span>
                      <small>SEUS GANHOS</small>
                      <h2>Resumo financeiro</h2>
                    </span>
                  </div>
                  <S.RefreshButton onClick={() => setRefresh((value) => value + 1)}>
                    <RefreshCw /> Atualizar
                  </S.RefreshButton>
                </S.EarningsHeading>
                {financeError && <S.ErrorMsg>{financeError}</S.ErrorMsg>}
                {!finance && !financeError ? (
                  <S.EmptyState>
                    <RefreshCw className="spinning" />
                    <p>Carregando ganhos...</p>
                  </S.EmptyState>
                ) : (
                  finance && (
                    <S.EarningsGrid>
                      {(
                        [
                          ['Hoje', finance.today],
                          ['Semana', finance.week],
                          ['Mês', finance.month],
                          ['A receber', finance.pending],
                        ] as const
                      ).map(([label, value], index) => (
                        <S.EarningCard key={label} $featured={index === 0}>
                          <span>{label}</span>
                          <strong>
                            {value.amount.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </strong>
                          <small>
                            {value.deliveries} {value.deliveries === 1 ? 'entrega' : 'entregas'}
                          </small>
                        </S.EarningCard>
                      ))}
                    </S.EarningsGrid>
                  )
                )}
              </S.EarningsPanel>
              <S.PickupPanel>
                <S.EarningsHeading>
                  <div>
                    <PackageCheck />
                    <span>
                      <small>PRÓXIMAS RETIRADAS</small>
                      <h2>Pedidos aguardando você</h2>
                    </span>
                  </div>
                  <S.PickupCount>{ready.length}</S.PickupCount>
                </S.EarningsHeading>
                {ready.length ? (
                  <S.CompactOrders>
                    {ready.slice(0, 5).map((order) => (
                      <S.CompactOrderButton
                        key={order.id}
                        type="button"
                        onClick={() => {
                          setView('ready');
                          setSearch(String(order.id));
                        }}
                      >
                        <span>
                          <PackageCheck />
                          <b>Pedido #{order.id}</b>
                          <small>Pronto para retirada</small>
                        </span>
                        <ChevronRight />
                      </S.CompactOrderButton>
                    ))}
                  </S.CompactOrders>
                ) : (
                  <S.CompactEmpty>
                    <CheckCircle2 />
                    <span>
                      <b>Tudo certo por aqui</b>
                      <small>Nenhum pedido aguardando retirada.</small>
                    </span>
                  </S.CompactEmpty>
                )}
              </S.PickupPanel>
            </>
          )}

          {view === 'help' ? (
            <EmployeeHelpCenter role="courier" onReport={reportEmployeeIssue} />
          ) : view === 'profile' ? (
            <Suspense
              fallback={
                <S.EmptyState>
                  <RefreshCw className="spinning" />
                </S.EmptyState>
              }
            >
              <ProfilePanel
                user={user}
                onUpdated={(updated) => {
                  const token = localStorage.getItem('token');
                  if (token) login(updated, token);
                }}
              />
            </Suspense>
          ) : isDedicatedView ? null : (
            <>
              <S.TopBar>
                <div style={{ position: 'relative', width: 'min(340px, 100%)' }}>
                  <Search
                    size={17}
                    style={{ position: 'absolute', left: 12, top: 11, color: '#718096' }}
                  />
                  <input
                    aria-label="Buscar pedido"
                    value={search}
                    onChange={(event) => setSearch(event.target.value.replace(/\D/g, ''))}
                    placeholder="Buscar pelo número do pedido"
                    style={{
                      width: '100%',
                      height: 40,
                      border: '1px solid #e5e1dc',
                      borderRadius: 10,
                      padding: '0 12px 0 38px',
                    }}
                  />
                </div>
                <S.RefreshButton
                  onClick={() => {
                    setLoading(true);
                    setLoadError('');
                    setRefresh((value) => value + 1);
                  }}
                >
                  <RefreshCw /> Atualizar
                </S.RefreshButton>
              </S.TopBar>
              {loadError && <S.ErrorMsg>{loadError}</S.ErrorMsg>}
              {loading ? (
                <S.EmptyState>
                  <RefreshCw className="spinning" />
                  <p>Carregando entregas...</p>
                </S.EmptyState>
              ) : visibleOrders.length === 0 ? (
                <S.EmptyState>
                  <Bike />
                  <p>Nenhuma entrega nesta área.</p>
                </S.EmptyState>
              ) : (
                <Suspense
                  fallback={
                    <S.EmptyState>
                      <RefreshCw className="spinning" />
                    </S.EmptyState>
                  }
                >
                  <S.OrdersList>
                    {visibleOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order as never}
                        onClaimDelivery={async (id) =>
                          updateLocalOrder(await ordersService.claimDelivery(id))
                        }
                        onMarkDelivered={async (id, code) =>
                          updateLocalOrder(await ordersService.updateStatus(id, 'ENTREGUE', code))
                        }
                        digitalPaymentMethods={DIGITAL_PAYMENT_METHODS}
                        paymentLabel={PAYMENT_LABEL}
                        statusLabel={STATUS_LABEL}
                      />
                    ))}
                  </S.OrdersList>
                </Suspense>
              )}
            </>
          )}
        </S.CourierContent>
      </S.CourierMain>
    </S.CourierShell>
  );
}
