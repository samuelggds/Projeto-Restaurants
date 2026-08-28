import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useEmployeeIssueNotifications } from '../../features/employee-help/useEmployeeIssueNotifications';
import { getAccessToken } from '../../modules/auth/session/authSession';
import * as L from '../kitchen/Kitchen.styles';
import * as S from './styles';
import {
  compareReadyForPickupOrders,
  getNormalizedOrderStatus,
  isCourierDeliveryOrder,
  isCourierOrderVisibleToAccount,
  normalizeCourierOrders,
  type CourierOrder,
} from './domain/courierOrders';
import {
  buildCourierLocationPayload,
  courierTrackingPreferenceKey,
  describeGeolocationFailure,
  isValidCourierRoutePoint,
  mergeCourierRoutePoints,
  routePointFromPosition,
  type CourierRoutePoint,
} from './domain/courierLocation';

const OrderCard = lazy(() => import('./components/OrderCard'));
const ProfilePanel = lazy(() => import('./components/ProfilePanel'));
const DeliveryMap = lazy(() => import('./components/DeliveryMap'));

type CourierView = 'overview' | 'ready' | 'route' | 'map' | 'history' | 'profile' | 'help';
type GeoStatus = 'idle' | 'checking' | 'enabled' | 'blocked' | 'timeout' | 'error' | 'unsupported';
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
type TrackingDestination = CourierRoutePoint & { label?: string };
type WakeLockSentinelLike = { released?: boolean; release: () => Promise<void> };
type TrackingResult = {
  locations?: unknown[];
  order?: {
    routeEstimate?: {
      destination?: TrackingDestination | null;
      routeCoordinates?: unknown[];
    } | null;
  };
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
const LOCATION_UPDATE_INTERVAL_MS = 4_000;

function monogram(name: string) {
  return createRestaurantMonogram(name);
}

export default function CourierWorkspace() {
  useEmployeeIssueNotifications();
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
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [locationTrackingRequested, setLocationTrackingRequested] = useState(false);
  const [trackingAttempt, setTrackingAttempt] = useState(0);
  const [geoMessage, setGeoMessage] = useState(
    'Ative a localização para o cliente acompanhar a entrega.',
  );
  const [geoHint, setGeoHint] = useState(
    'Ao retirar um pedido, o celular solicitará a permissão antes de iniciar a entrega.',
  );
  const [socketConnected, setSocketConnected] = useState(false);
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [financeError, setFinanceError] = useState('');
  const [routePoints, setRoutePoints] = useState<CourierRoutePoint[]>([]);
  const [routePath, setRoutePath] = useState<CourierRoutePoint[]>([]);
  const [routeDestination, setRouteDestination] = useState<TrackingDestination | null>(null);
  const [routeError, setRouteError] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeRetry, setRouteRetry] = useState(0);
  const [selectedRouteOrderId, setSelectedRouteOrderId] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const ordersRef = useRef<CourierOrder[]>([]);
  const selectedRouteOrderIdRef = useRef<number | null>(null);
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const latestPositionRef = useRef<CourierRoutePoint | null>(null);
  const hadActiveRouteRef = useRef(false);
  const ordersRequestRef = useRef(0);
  const routeRequestRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const restaurantId = Number(user?.restaurantId || 0);
  const accountId = Number(user?.id || 0);
  const trackingPreferenceKey = courierTrackingPreferenceKey(accountId || 'unknown');
  const ready = useMemo(
    () =>
      orders
        .filter(
          (order) => isCourierDeliveryOrder(order) && getNormalizedOrderStatus(order) === 'PRONTO',
        )
        .sort(compareReadyForPickupOrders),
    [orders],
  );
  const inRoute = useMemo(
    () =>
      orders.filter(
        (order) =>
          isCourierDeliveryOrder(order) && getNormalizedOrderStatus(order) === 'SAIU_PARA_ENTREGA',
      ),
    [orders],
  );
  const delivered = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            isCourierDeliveryOrder(order) && getNormalizedOrderStatus(order) === 'ENTREGUE',
        )
        .sort((left, right) => {
          const leftDate = Date.parse(String(left.deliveredAt || left.createdAt || '')) || 0;
          const rightDate = Date.parse(String(right.deliveredAt || right.createdAt || '')) || 0;
          return rightDate - leftDate;
        }),
    [orders],
  );
  const effectiveRouteOrderId = inRoute.some((order) => order.id === selectedRouteOrderId)
    ? selectedRouteOrderId
    : inRoute[0]?.id || null;

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    selectedRouteOrderIdRef.current = effectiveRouteOrderId;
  }, [effectiveRouteOrderId]);

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
    const requestId = ++ordersRequestRef.current;
    ordersService
      .listRestaurantOrders()
      .then((data) => {
        if (active && requestId === ordersRequestRef.current) {
          setOrders(
            normalizeCourierOrders(data).filter((order) => {
              const incomingRestaurantId = Number(order.restaurantId || 0);
              return (
                (!incomingRestaurantId || incomingRestaurantId === restaurantId) &&
                isCourierOrderVisibleToAccount(order, accountId)
              );
            }),
          );
          setLoadError('');
          setLastUpdatedAt(new Date());
        }
      })
      .catch((error) => {
        console.error('[courier] Falha ao carregar entregas', error);
        if (active && requestId === ordersRequestRef.current) {
          setLoadError(
            'Não foi possível carregar as entregas. Confira a conexão e tente novamente.',
          );
        }
      })
      .finally(() => {
        if (active && requestId === ordersRequestRef.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accountId, refresh, restaurantId]);

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
    const activeOrder = orders.find(
      (order) =>
        order.id === effectiveRouteOrderId &&
        getNormalizedOrderStatus(order) === 'SAIU_PARA_ENTREGA',
    );
    if (view !== 'map' || !activeOrder?.id) return;
    const requestId = ++routeRequestRef.current;
    ordersService
      .getDeliveryTracking(activeOrder.id)
      .then((data) => {
        if (requestId !== routeRequestRef.current) return;
        const tracking = (data || {}) as TrackingResult;
        setRoutePoints(mergeCourierRoutePoints([], tracking.locations || []));
        setRoutePath(
          mergeCourierRoutePoints([], tracking.order?.routeEstimate?.routeCoordinates || []),
        );
        const destination = tracking.order?.routeEstimate?.destination || null;
        setRouteDestination(
          destination && isValidCourierRoutePoint(destination) ? destination : null,
        );
        setRouteError('');
        setLastUpdatedAt(new Date());
      })
      .catch((error) => {
        console.error('[courier] Falha ao carregar percurso', error);
        if (requestId === routeRequestRef.current) {
          setRouteError('Não foi possível carregar o percurso deste pedido.');
        }
      })
      .finally(() => {
        if (requestId === routeRequestRef.current) setRouteLoading(false);
      });
  }, [view, orders, effectiveRouteOrderId, routeRetry]);

  const emitLocationForOrders = useCallback((point: CourierRoutePoint, orderIds: number[]) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setGeoHint(
        'Sem conexão com o restaurante. A posição atual será enviada assim que reconectar.',
      );
      return;
    }

    orderIds.forEach((orderId) => {
      const payload = buildCourierLocationPayload(orderId, point);
      if (!payload) return;
      socket.volatile.emit(
        'delivery:location:update',
        payload,
        (result?: { ok?: boolean; error?: string }) => {
          if (result?.ok === false) {
            console.error('[courier] Localização rejeitada pelo servidor', result.error);
            setGeoHint(
              result.error ||
                'O GPS está ativo, mas não foi possível atualizar este pedido no servidor.',
            );
          }
        },
      );
    });
  }, []);

  const stopLocationTracking = useCallback(
    (message = 'Rastreamento encerrado porque não há entrega em andamento.') => {
      setLocationTrackingRequested(false);
      setGeoStatus('idle');
      setGeoMessage(message);
      setGeoHint('Retire outro pedido para iniciar um novo acompanhamento.');
      latestPositionRef.current = null;
      localStorage.removeItem(trackingPreferenceKey);
      setSelectedRouteOrderId(null);
      setRoutePoints([]);
      setRoutePath([]);
      setRouteDestination(null);
      setRouteError('');
      setRouteLoading(false);
    },
    [trackingPreferenceKey],
  );

  const requestInitialPosition = useCallback(() => {
    setGeoStatus('checking');
    setGeoMessage('Confirmando a posição inicial antes de retirar o pedido...');
    setGeoHint('Mantenha a localização precisa ativada durante toda a entrega.');

    return new Promise<CourierRoutePoint>((resolve, reject) => {
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        setGeoStatus('unsupported');
        setGeoMessage('A localização do celular exige uma conexão segura (HTTPS).');
        setGeoHint('Abra o endereço oficial com HTTPS antes de iniciar a entrega.');
        reject(new Error('Abra o sistema pelo endereço HTTPS para ativar a localização.'));
        return;
      }
      if (!navigator.geolocation) {
        setGeoStatus('unsupported');
        setGeoMessage('Este aparelho não oferece geolocalização neste navegador.');
        setGeoHint('Abra o sistema em um navegador com acesso ao GPS.');
        reject(new Error('Ative a localização em um aparelho compatível antes de retirar.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const point = routePointFromPosition(position);
          if (!point) {
            setGeoStatus('error');
            setGeoMessage('O celular retornou uma posição inválida.');
            setGeoHint('Confira o GPS e tente novamente.');
            reject(new Error('Não foi possível validar a posição inicial. Tente novamente.'));
            return;
          }
          latestPositionRef.current = point;
          setGeoStatus('enabled');
          setGeoMessage('Posição confirmada. O rastreamento será iniciado com a entrega.');
          setGeoHint(`Precisão informada pelo aparelho: ${Math.round(point.accuracy || 0)} m.`);
          resolve(point);
        },
        (error) => {
          const failure = describeGeolocationFailure(error);
          setGeoStatus(failure.status);
          setGeoMessage(failure.message);
          setGeoHint(failure.hint);
          reject(new Error(`${failure.message} ${failure.hint}`));
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
      );
    });
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !accountId) return;
    const socket = connectSocket(token, `courier-workspace:${accountId}`);
    socketRef.current = socket;

    const onConnect = () => {
      setSocketConnected(true);
      const latest = latestPositionRef.current;
      if (!latest) return;
      const activeIds = ordersRef.current.flatMap((order) =>
        getNormalizedOrderStatus(order) === 'SAIU_PARA_ENTREGA' && order.id ? [order.id] : [],
      );
      emitLocationForOrders(latest, activeIds);
    };
    const onDisconnect = () => setSocketConnected(false);
    const onChanged = (rawOrder: unknown) => {
      const wrapped = rawOrder as { order?: unknown };
      const candidate = (wrapped?.order || rawOrder) as { restaurantId?: unknown };
      const incomingRestaurantId = Number(candidate?.restaurantId || 0);
      if (incomingRestaurantId && incomingRestaurantId !== restaurantId) return;
      const updated = normalizeCourierOrders([candidate])[0];
      if (!updated?.id) {
        setRefresh((value) => value + 1);
        return;
      }

      const belongsToThisCourier = isCourierOrderVisibleToAccount(updated, accountId);
      setOrders((current) => {
        if (!belongsToThisCourier) return current.filter((order) => order.id !== updated.id);
        return current.some((order) => order.id === updated.id)
          ? current.map((order) => (order.id === updated.id ? updated : order))
          : [updated, ...current];
      });
      setLastUpdatedAt(new Date());
    };
    const onLocation = (rawPoint: unknown) => {
      const point = rawPoint as CourierRoutePoint & {
        orderId?: number;
        restaurantId?: number;
      };
      if (
        (point.restaurantId && Number(point.restaurantId) !== restaurantId) ||
        point.orderId !== selectedRouteOrderIdRef.current ||
        !isValidCourierRoutePoint(point)
      ) {
        return;
      }
      setRoutePoints((current) => mergeCourierRoutePoints(current, [point]));
      setLastUpdatedAt(new Date());
    };

    let active = true;
    queueMicrotask(() => {
      if (active) setSocketConnected(Boolean(socket.connected));
    });
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order:status-changed', onChanged);
    socket.on('order:delivery-location', onLocation);
    return () => {
      active = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:status-changed', onChanged);
      socket.off('order:delivery-location', onLocation);
      socketRef.current = null;
      disconnectSocket();
    };
  }, [accountId, emitLocationForOrders, restaurantId]);

  useEffect(() => {
    if (!locationTrackingRequested || !inRoute.length) return;
    if (!navigator.geolocation) {
      const unsupportedTimer = window.setTimeout(() => {
        setGeoStatus('unsupported');
        setGeoMessage('Este aparelho não oferece geolocalização neste navegador.');
        setGeoHint('Abra o sistema em um navegador com acesso ao GPS.');
        setLocationTrackingRequested(false);
      }, 0);
      return () => window.clearTimeout(unsupportedTimer);
    }

    let watchId: number | null = null;
    let lastSentAt = latestPositionRef.current ? Date.now() : 0;
    const sendLatest = () => {
      const point = latestPositionRef.current;
      if (!point) return;
      const orderIds = ordersRef.current.flatMap((order) =>
        getNormalizedOrderStatus(order) === 'SAIU_PARA_ENTREGA' && order.id ? [order.id] : [],
      );
      if (!orderIds.length) return;
      emitLocationForOrders(point, orderIds);
      lastSentAt = Date.now();
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const point = routePointFromPosition(position);
        if (!point) return;
        latestPositionRef.current = point;
        localStorage.setItem(trackingPreferenceKey, 'enabled');
        setGeoStatus('enabled');
        setGeoMessage('Rastreamento ativo durante a entrega.');
        setGeoHint(
          `${socketRef.current?.connected ? 'Conectado ao restaurante' : 'Reconectando ao restaurante'} · precisão de ${Math.round(point.accuracy || 0)} m.`,
        );
        setRoutePoints((current) => mergeCourierRoutePoints(current, [point]));
        setLastUpdatedAt(new Date());
        if (Date.now() - lastSentAt >= LOCATION_UPDATE_INTERVAL_MS) sendLatest();
      },
      (error) => {
        const failure = describeGeolocationFailure(error);
        setGeoStatus(failure.status);
        setGeoMessage(failure.message);
        setGeoHint(failure.hint);
        if (error.code === 1) {
          setLocationTrackingRequested(false);
          localStorage.removeItem(trackingPreferenceKey);
        }
      },
      { enableHighAccuracy: true, maximumAge: 1_000, timeout: 10_000 },
    );
    const timer = window.setInterval(sendLatest, LOCATION_UPDATE_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [
    emitLocationForOrders,
    inRoute.length,
    locationTrackingRequested,
    trackingAttempt,
    trackingPreferenceKey,
  ]);

  useEffect(() => {
    if (inRoute.length) {
      hadActiveRouteRef.current = true;
      if (!locationTrackingRequested && localStorage.getItem(trackingPreferenceKey) === 'enabled') {
        const resumeTimer = window.setTimeout(() => {
          setLocationTrackingRequested(true);
          setTrackingAttempt((value) => value + 1);
        }, 0);
        return () => window.clearTimeout(resumeTimer);
      }
      return;
    }

    if (hadActiveRouteRef.current) {
      hadActiveRouteRef.current = false;
      stopLocationTracking();
    }
  }, [inRoute.length, locationTrackingRequested, stopLocationTracking, trackingPreferenceKey]);

  useEffect(() => {
    if (!locationTrackingRequested || !inRoute.length) return;
    let active = true;
    const wakeLockApi = (
      navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;

    const requestWakeLock = async () => {
      if (!wakeLockApi || document.visibilityState !== 'visible') return;
      try {
        const sentinel = await wakeLockApi.request('screen');
        if (!active) {
          await sentinel.release();
          return;
        }
        wakeLockRef.current = sentinel;
      } catch {
        // Alguns aparelhos não permitem Wake Lock. O watchPosition segue funcionando.
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void requestWakeLock();
      const latest = latestPositionRef.current;
      if (latest) {
        const activeIds = ordersRef.current.flatMap((order) =>
          getNormalizedOrderStatus(order) === 'SAIU_PARA_ENTREGA' && order.id ? [order.id] : [],
        );
        emitLocationForOrders({ ...latest, recordedAt: new Date().toISOString() }, activeIds);
      }
      setRefresh((value) => value + 1);
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => {});
    };
  }, [emitLocationForOrders, inRoute.length, locationTrackingRequested]);
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
    if (next === 'map') {
      setRoutePoints([]);
      setRoutePath([]);
      setRouteDestination(null);
      setRouteError('');
      setRouteLoading(Boolean(effectiveRouteOrderId));
    }
    setView(next);
    setSearch('');
    if (window.innerWidth <= 820) setSidebarOpen(false);
  };
  const requestLocation = async () => {
    try {
      const point = await requestInitialPosition();
      latestPositionRef.current = point;
      localStorage.setItem(trackingPreferenceKey, 'enabled');
      setLocationTrackingRequested(true);
      setTrackingAttempt((value) => value + 1);
      const activeIds = inRoute.flatMap((order) => (order.id ? [order.id] : []));
      if (activeIds.length) emitLocationForOrders(point, activeIds);
    } catch {
      // A mensagem e a orientação já são definidas por requestInitialPosition.
    }
  };
  const updateLocalOrder = (updated: unknown) => {
    const wrapped = updated as { order?: unknown };
    const order = normalizeCourierOrders([wrapped?.order || updated])[0];
    if (!order?.id) {
      throw new Error('O servidor retornou dados inválidos para o pedido. Atualize a tela.');
    }
    setOrders((items) => {
      const next = items.some((item) => item.id === order.id)
        ? items.map((item) => (item.id === order.id ? order : item))
        : [order, ...items];
      ordersRef.current = next;
      return next;
    });
    return order;
  };
  const claimDelivery = async (orderId: number) => {
    const initialPoint = await requestInitialPosition();
    const payload = buildCourierLocationPayload(orderId, initialPoint);
    if (!payload) throw new Error('Não foi possível validar a posição inicial desta entrega.');
    const { orderId: _orderId, ...initialLocation } = payload;
    const order = updateLocalOrder(await ordersService.claimDelivery(orderId, initialLocation));
    latestPositionRef.current = initialPoint;
    localStorage.setItem(trackingPreferenceKey, 'enabled');
    setLocationTrackingRequested(true);
    setTrackingAttempt((value) => value + 1);
    setSelectedRouteOrderId(order.id || orderId);
    setView('route');
    setSearch('');
    setGeoStatus('enabled');
    setGeoMessage(`Entrega #${orderId} iniciada com rastreamento ativo.`);
    setGeoHint(
      'Mantenha esta página aberta e a localização precisa ligada até concluir a entrega.',
    );
    setRoutePoints((current) => mergeCourierRoutePoints(current, [initialPoint]));
  };
  const markDelivered = async (orderId: number, code: string) => {
    updateLocalOrder(await ordersService.updateStatus(orderId, 'ENTREGUE', code));
    const remainingRoutes = ordersRef.current.filter(
      (order) => getNormalizedOrderStatus(order) === 'SAIU_PARA_ENTREGA',
    );
    if (!remainingRoutes.length)
      stopLocationTracking('Entrega concluída. O compartilhamento foi encerrado.');
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
          {view !== 'help' &&
          view !== 'profile' &&
          geoStatus === 'enabled' &&
          locationTrackingRequested ? (
            <S.LocationActiveCard role="status" aria-live="polite">
              <S.LocationAlertIcon>
                <LocateFixed />
              </S.LocationAlertIcon>
              <S.LocationAlertContent>
                <strong>Localização ativa nesta conta</strong>
                <p>{geoMessage}</p>
                <small>{geoHint}</small>
              </S.LocationAlertContent>
              <S.TrackingConnection $connected={socketConnected}>
                <i /> {socketConnected ? 'Conectado' : 'Reconectando'}
              </S.TrackingConnection>
            </S.LocationActiveCard>
          ) : view !== 'help' && view !== 'profile' ? (
            <S.LocationAlertCard>
              <S.LocationAlertIcon>
                {geoStatus === 'unsupported' ? <MapPinOff /> : <LocateFixed />}
              </S.LocationAlertIcon>
              <S.LocationAlertContent>
                <strong>
                  {geoStatus === 'checking'
                    ? 'Confirmando sua localização'
                    : geoStatus === 'blocked' || geoStatus === 'timeout' || geoStatus === 'error'
                      ? 'A localização precisa de atenção'
                      : 'Ative a localização antes da entrega'}
                </strong>
                <p>{geoMessage}</p>
                <small>{geoHint}</small>
              </S.LocationAlertContent>
              {geoStatus !== 'unsupported' && (
                <S.LocationAlertButton
                  type="button"
                  onClick={() => void requestLocation()}
                  disabled={geoStatus === 'checking'}
                >
                  <Navigation />
                  {geoStatus === 'checking' ? 'Aguardando GPS...' : 'Ativar localização'}
                </S.LocationAlertButton>
              )}
            </S.LocationAlertCard>
          ) : null}

          {view === 'map' ? (
            <S.RouteSection>
              <S.SectionHeader>
                <div>
                  <h2>Minha rota</h2>
                  <p>Acompanhe sua posição e o caminho até o endereço do pedido.</p>
                </div>
                {inRoute.length > 1 ? (
                  <S.RouteOrderSelect
                    aria-label="Escolher entrega para visualizar no mapa"
                    value={effectiveRouteOrderId || ''}
                    onChange={(event) => {
                      setRoutePoints([]);
                      setRoutePath([]);
                      setRouteDestination(null);
                      setRouteError('');
                      setRouteLoading(true);
                      setSelectedRouteOrderId(Number(event.target.value));
                    }}
                  >
                    {inRoute.map((order) => (
                      <option key={order.id} value={order.id}>
                        Pedido #{order.id}
                      </option>
                    ))}
                  </S.RouteOrderSelect>
                ) : inRoute.length === 1 ? (
                  <S.LocationStatusChip>Pedido #{inRoute[0]?.id}</S.LocationStatusChip>
                ) : null}
              </S.SectionHeader>
              {routeError ? (
                <S.RouteError>
                  <span>{routeError}</span>
                  <S.RefreshButton
                    onClick={() => {
                      setRoutePoints([]);
                      setRoutePath([]);
                      setRouteDestination(null);
                      setRouteError('');
                      setRouteLoading(true);
                      setRouteRetry((value) => value + 1);
                    }}
                  >
                    <RefreshCw /> Tentar novamente
                  </S.RefreshButton>
                </S.RouteError>
              ) : null}
              {routeLoading ? (
                <S.EmptyState role="status" aria-live="polite">
                  <RefreshCw className="spinning" />
                  <p>Carregando posição, rota e destino deste pedido...</p>
                </S.EmptyState>
              ) : inRoute.length && routePoints.length ? (
                <Suspense
                  fallback={
                    <S.EmptyState>
                      <RefreshCw className="spinning" />
                    </S.EmptyState>
                  }
                >
                  <DeliveryMap
                    points={routePoints}
                    routePath={routePath}
                    destination={routeDestination || undefined}
                    label={user?.name || 'Motoqueiro'}
                    statusMessage="Sua rota está em andamento"
                    statusDetail={
                      routeDestination
                        ? 'O destino exibido corresponde ao endereço salvo no pedido.'
                        : 'Sua localização está sendo compartilhada; calculando o destino.'
                    }
                  />
                </Suspense>
              ) : inRoute.length ? (
                <S.EmptyState>
                  <LocateFixed />
                  <p>Aguardando a primeira posição válida do GPS.</p>
                </S.EmptyState>
              ) : (
                <S.EmptyState>
                  <MapPinned />
                  <p>Retire um pedido para iniciar a rota.</p>
                </S.EmptyState>
              )}
            </S.RouteSection>
          ) : null}

          {loadError && isDedicatedView && view !== 'help' ? (
            <S.RouteError role="alert">
              <span>{loadError}</span>
              <S.RefreshButton
                onClick={() => {
                  setLoading(true);
                  setLoadError('');
                  setRefresh((value) => value + 1);
                }}
              >
                <RefreshCw /> Tentar novamente
              </S.RefreshButton>
            </S.RouteError>
          ) : null}

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
                  const token = getAccessToken();
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
              {loadError ? (
                <S.RouteError role="alert">
                  <span>{loadError}</span>
                  <S.RefreshButton
                    onClick={() => {
                      setLoading(true);
                      setLoadError('');
                      setRefresh((value) => value + 1);
                    }}
                  >
                    <RefreshCw /> Tentar novamente
                  </S.RefreshButton>
                </S.RouteError>
              ) : loading ? (
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
                        onClaimDelivery={claimDelivery}
                        onMarkDelivered={markDelivered}
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
