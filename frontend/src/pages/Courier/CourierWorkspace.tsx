import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  LocateFixed,
  MapPinOff,
  Navigation,
  PackageCheck,
  RefreshCw,
  Search,
  User,
  DollarSign,
  MapPinned,
} from 'lucide-react';
import { useAuth } from '../../contexts/authContext';
import ordersService from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { acquireSocket } from '../../Services/socketService';
import { EmployeeHelpCenter } from '../../features/employee-help/EmployeeHelpCenter';
import { reportEmployeeIssue } from '../../features/employee-help/reportEmployeeIssue';
import { useEmployeeIssueNotifications } from '../../features/employee-help/useEmployeeIssueNotifications';
import { getAccessToken } from '../../modules/auth/session/authSession';
import * as L from '../kitchen/Kitchen.styles';
import * as S from './styles';
import * as V from './CourierViews.styles';
import { CourierNavigation } from './CourierNavigation';
import { CourierListControls } from './components/CourierListControls';
import { COURIER_VIEW_TITLES, getCourierListViewMeta, type CourierView } from './courierViewMeta';
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
const CourierSettlementsPanel = lazy(() => import('./components/CourierSettlementsPanel'));

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
    financeStatus?: string;
    settlement?: { publicId: string; status: string } | null;
  }>;
  pendingSettlements?: number;
  timezone?: string;
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
const LIST_BATCH_SIZE = 10;

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
  const [visibleOrderLimit, setVisibleOrderLimit] = useState(LIST_BATCH_SIZE);
  const [visibleFinanceLimit, setVisibleFinanceLimit] = useState(LIST_BATCH_SIZE);
  const [refresh, setRefresh] = useState(0);
  const [brand, setBrand] = useState({ name: 'Restaurante', color: '#d64d08' });
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [locationTrackingRequested, setLocationTrackingRequested] = useState(false);
  const [trackingAttempt, setTrackingAttempt] = useState(0);
  const [geoMessage, setGeoMessage] = useState(
    'A localização é opcional e permite que o cliente acompanhe a entrega em tempo real.',
  );
  const [geoHint, setGeoHint] = useState(
    'Você pode ativar agora, ao retirar um pedido ou durante uma entrega em andamento.',
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
  const socketRef = useRef<ReturnType<typeof acquireSocket>['socket'] | null>(null);
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
      setGeoHint('Você pode ativar a localização quando iniciar outra entrega.');
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
    setGeoMessage('Confirmando a posição para iniciar o rastreamento...');
    setGeoHint('Mantenha a localização precisa ativada durante toda a entrega.');

    return new Promise<CourierRoutePoint>((resolve, reject) => {
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        setGeoStatus('unsupported');
        setGeoMessage('A localização do celular exige uma conexão segura (HTTPS).');
        setGeoHint('Abra o endereço oficial com HTTPS para usar o rastreamento.');
        reject(new Error('Abra o sistema pelo endereço HTTPS para ativar a localização.'));
        return;
      }
      if (!navigator.geolocation) {
        setGeoStatus('unsupported');
        setGeoMessage('Este aparelho não oferece geolocalização neste navegador.');
        setGeoHint('Você pode continuar a entrega sem rastreamento.');
        reject(new Error('Este aparelho não oferece acesso ao GPS.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const point = routePointFromPosition(position);
          if (!point) {
            setGeoStatus('error');
            setGeoMessage('O celular retornou uma posição inválida.');
            setGeoHint('Confira o GPS ou continue sem localização.');
            reject(new Error('Não foi possível validar a posição atual.'));
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
          setGeoHint(`${failure.hint} Você também pode continuar sem localização.`);
          reject(new Error(`${failure.message} ${failure.hint}`));
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
      );
    });
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !accountId) return;
    const { socket, release } = acquireSocket(token, `courier-workspace:${accountId}`);
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
      release();
    };
  }, [accountId, emitLocationForOrders, restaurantId]);

  useEffect(() => {
    if (!locationTrackingRequested || !inRoute.length) return;
    if (!navigator.geolocation) {
      const unsupportedTimer = window.setTimeout(() => {
        setGeoStatus('unsupported');
        setGeoMessage('Este aparelho não oferece geolocalização neste navegador.');
        setGeoHint('A entrega continua normalmente sem rastreamento.');
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
        setGeoHint(`${failure.hint} A entrega continua sem rastreamento.`);
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
  const displayedOrders = visibleOrders.slice(0, visibleOrderLimit);

  const [title, subtitle] = COURIER_VIEW_TITLES[view];
  const listViewMeta = getCourierListViewMeta(
    view === 'ready' || view === 'route' ? view : 'history',
    { ready: ready.length, route: inRoute.length, history: delivered.length },
  );
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
    setVisibleOrderLimit(LIST_BATCH_SIZE);
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
  const claimDelivery = async (orderId: number, options: { shareLocation: boolean }) => {
    let initialPoint: CourierRoutePoint | null = null;
    let initialLocation:
      | {
          latitude: number;
          longitude: number;
          heading: number | null;
          speed: number | null;
          accuracy: number | null;
          sentAt: string;
        }
      | undefined;

    if (options.shareLocation) {
      initialPoint = await requestInitialPosition();
      const payload = buildCourierLocationPayload(orderId, initialPoint);
      if (!payload) throw new Error('Não foi possível validar a posição inicial desta entrega.');
      const { orderId: _orderId, ...locationPayload } = payload;
      initialLocation = locationPayload;
    }

    const order = updateLocalOrder(await ordersService.claimDelivery(orderId, initialLocation));
    setSelectedRouteOrderId(order.id || orderId);
    setView('route');
    setSearch('');
    setVisibleOrderLimit(LIST_BATCH_SIZE);

    if (options.shareLocation && initialPoint) {
      latestPositionRef.current = initialPoint;
      localStorage.setItem(trackingPreferenceKey, 'enabled');
      setLocationTrackingRequested(true);
      setTrackingAttempt((value) => value + 1);
      setGeoStatus('enabled');
      setGeoMessage(`Entrega #${orderId} iniciada com rastreamento ativo.`);
      setGeoHint(
        'Mantenha esta página aberta e a localização precisa ligada até concluir a entrega.',
      );
      setRoutePoints((current) => mergeCourierRoutePoints(current, [initialPoint]));
      return;
    }

    if (!locationTrackingRequested) {
      latestPositionRef.current = null;
      localStorage.removeItem(trackingPreferenceKey);
      setGeoStatus('idle');
      setGeoMessage(`Entrega #${orderId} iniciada sem compartilhamento de localização.`);
      setGeoHint('A entrega segue normalmente. Você pode ativar a localização a qualquer momento.');
      setRoutePoints([]);
    }
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
      <CourierNavigation
        view={view}
        restaurantName={brand.name}
        userName={user?.name || 'Motoqueiro'}
        readyCount={ready.length}
        routeCount={inRoute.length}
        deliveredCount={delivered.length}
        sidebarOpen={sidebarOpen}
        onSidebarOpen={() => setSidebarOpen(true)}
        onSidebarClose={() => setSidebarOpen(false)}
        onGo={go}
        onLogout={() => {
          logout();
          navigate('/login', { replace: true });
        }}
      />

      <S.CourierMain>
        <S.CourierTop>
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
                      : 'Rastreamento em tempo real opcional'}
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
                  <p>Rastreamento desativado. Ative a localização se quiser compartilhar sua rota.</p>
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
                  <button type="button" onClick={() => go('ready')}>
                    <PackageCheck />
                    <b>{ready.length}</b>
                    <small>Para retirar</small>
                  </button>
                  <button type="button" onClick={() => go('route')}>
                    <Bike />
                    <b>{inRoute.length}</b>
                    <small>Em rota</small>
                  </button>
                  <button type="button" onClick={() => go('history')}>
                    <CheckCircle2 />
                    <b>{delivered.length}</b>
                    <small>Entregues</small>
                  </button>
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
                          <small>
                            Ganho:{' '}
                            {(
                              order.courierEarningPreview as
                                { available?: boolean; amount?: number } | undefined
                            )?.available
                              ? Number(
                                  (order.courierEarningPreview as { amount?: number }).amount || 0,
                                ).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })
                              : 'aguardando cálculo'}
                          </small>
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
              <Suspense fallback={null}>
                <CourierSettlementsPanel />
              </Suspense>
              {finance?.deliveries.length ? (
                <S.PickupPanel>
                  <S.EarningsHeading>
                    <div>
                      <History />
                      <span>
                        <small>EXTRATO RECENTE</small>
                        <h2>Ganhos por entrega</h2>
                      </span>
                    </div>
                  </S.EarningsHeading>
                  <S.CompactOrders>
                    {finance.deliveries.slice(0, visibleFinanceLimit).map((delivery) => (
                      <S.CompactOrderButton key={delivery.id} as="div">
                        <span>
                          <DollarSign />
                          <b>Pedido #{delivery.id}</b>
                          <small>
                            {delivery.financeStatus === 'PAID'
                              ? 'Pago'
                              : delivery.financeStatus === 'DISPUTED'
                                ? 'Em divergência'
                                : delivery.financeStatus === 'AWAITING_COURIER_CONFIRMATION'
                                  ? 'Aguardando sua confirmação'
                                  : 'A receber'}
                          </small>
                        </span>
                        <strong>
                          {delivery.courierEarning.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </strong>
                      </S.CompactOrderButton>
                    ))}
                  </S.CompactOrders>
                  <CourierListControls
                    visibleCount={Math.min(visibleFinanceLimit, finance.deliveries.length)}
                    totalCount={finance.deliveries.length}
                    itemLabel="lançamentos"
                    onShowMore={() =>
                      setVisibleFinanceLimit((current) =>
                        Math.min(current + LIST_BATCH_SIZE, finance.deliveries.length),
                      )
                    }
                    onReset={() => setVisibleFinanceLimit(LIST_BATCH_SIZE)}
                  />
                </S.PickupPanel>
              ) : null}
            </>
          )}

          {view === 'help' ? (
            <V.HelpFrame>
              <EmployeeHelpCenter role="courier" onReport={reportEmployeeIssue} />
            </V.HelpFrame>
          ) : view === 'profile' ? (
            <V.ProfileFrame>
              <V.ProfileAside>
                <User />
                <div>
                  <h2>Conta de trabalho</h2>
                  <p>Mantenha seus dados de contato corretos para a operação e para os clientes.</p>
                </div>
                <ul>
                  <li>Acesso exclusivo do motoqueiro</li>
                  <li>CPF protegido contra edição</li>
                  <li>Alterações salvas na sua conta</li>
                </ul>
              </V.ProfileAside>
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
            </V.ProfileFrame>
          ) : isDedicatedView ? null : (
            <V.ViewStack>
              <V.ContextBand $tone={listViewMeta.tone}>
                <V.ContextIcon $tone={listViewMeta.tone}>
                  <listViewMeta.icon />
                </V.ContextIcon>
                <V.ContextCopy>
                  <small>{listViewMeta.eyebrow}</small>
                  <h2>{listViewMeta.heading}</h2>
                  <p>{listViewMeta.description}</p>
                </V.ContextCopy>
                <V.ContextCount $tone={listViewMeta.tone}>
                  <strong>{listViewMeta.count}</strong>
                  <span>{listViewMeta.countLabel}</span>
                </V.ContextCount>
              </V.ContextBand>
              <V.Toolbar>
                <V.SearchField>
                  <Search />
                  <input
                    aria-label="Buscar pedido"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value.replace(/\D/g, ''));
                      setVisibleOrderLimit(LIST_BATCH_SIZE);
                    }}
                    placeholder="Buscar pelo número do pedido"
                  />
                </V.SearchField>
                <S.RefreshButton
                  onClick={() => {
                    setLoading(true);
                    setLoadError('');
                    setRefresh((value) => value + 1);
                  }}
                >
                  <RefreshCw /> Atualizar
                </S.RefreshButton>
              </V.Toolbar>
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
                  <listViewMeta.icon />
                  <p>
                    {view === 'ready'
                      ? 'Nenhum pedido aguardando retirada.'
                      : view === 'route'
                        ? 'Nenhuma entrega em andamento.'
                        : 'Nenhuma entrega concluída neste período.'}
                  </p>
                </S.EmptyState>
              ) : (
                <Suspense
                  fallback={
                    <S.EmptyState>
                      <RefreshCw className="spinning" />
                    </S.EmptyState>
                  }
                >
                  <V.ListSurface>
                    <S.OrdersList>
                      {displayedOrders.map((order) => (
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
                    <CourierListControls
                      visibleCount={displayedOrders.length}
                      totalCount={visibleOrders.length}
                      itemLabel="pedidos"
                      onShowMore={() =>
                        setVisibleOrderLimit((current) =>
                          Math.min(current + LIST_BATCH_SIZE, visibleOrders.length),
                        )
                      }
                      onReset={() => setVisibleOrderLimit(LIST_BATCH_SIZE)}
                    />
                  </V.ListSurface>
                </Suspense>
              )}
            </V.ViewStack>
          )}
        </S.CourierContent>
      </S.CourierMain>
    </S.CourierShell>
  );
}
