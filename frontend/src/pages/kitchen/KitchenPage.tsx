import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import ordersService from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { connectSocket, disconnectSocket } from '../../Services/socketService';
import { getAccessToken } from '../../modules/auth/session/authSession';
import { KitchenModule } from './KitchenModule';
import type { EmployeeWorkspaceData, KitchenWorkspaceState, RestaurantBrand } from './types';
import { mapOperationalOrders, mapRestaurantBrand } from '../operations/orderAdapter';

const POLL_MS = 30_000;

export default function KitchenPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeWorkspaceData>({
    orders: [],
    tables: [],
    calls: [],
  });
  const [restaurant, setRestaurant] = useState<RestaurantBrand>({
    restaurantName: 'Restaurante',
    monogram: 'R',
    primaryColor: '#d64d08',
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restaurantId = Number((user as Record<string, unknown>)?.restaurantId || 0) || null;
  const accessToken = getAccessToken();
  const mountedRef = useRef(true);
  const latestOrdersRequestRef = useRef(0);
  const [workspaceState, setWorkspaceState] = useState<KitchenWorkspaceState>({
    loading: Boolean(restaurantId),
    refreshing: false,
    error: restaurantId
      ? null
      : 'Seu usuário não está vinculado a um restaurante. Entre novamente ou procure o administrador.',
    lastUpdatedAt: null,
    realtimeStatus: restaurantId && accessToken ? 'connecting' : 'disconnected',
  });

  const loadOrders = useCallback(async (refreshing = false) => {
    const requestId = ++latestOrdersRequestRef.current;
    if (mountedRef.current) {
      setWorkspaceState((current) => ({
        ...current,
        loading: current.lastUpdatedAt === null,
        refreshing,
        error: null,
      }));
    }

    try {
      const raw = await ordersService.listRestaurantOrders();
      if (!mountedRef.current || requestId !== latestOrdersRequestRef.current) return;
      setData((prev) => ({
        ...prev,
        orders: mapOperationalOrders(Array.isArray(raw) ? raw : []),
      }));
      setWorkspaceState((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        error: null,
        lastUpdatedAt: new Date().toISOString(),
      }));
    } catch {
      if (!mountedRef.current || requestId !== latestOrdersRequestRef.current) return;
      setWorkspaceState((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        error:
          'Não foi possível carregar os pedidos da cozinha. Verifique sua conexão e tente novamente.',
      }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      latestOrdersRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    restaurantSettingsService
      .getPublicSettings(restaurantId)
      .then((s: Record<string, unknown>) => {
        if (!mountedRef.current) return;
        setRestaurant(mapRestaurantBrand(s));
      })
      .catch((error: unknown) => {
        console.error('[KITCHEN_BRAND_LOAD_ERROR]', error);
      });
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    const initialLoadTimer = window.setTimeout(() => void loadOrders(), 0);
    intervalRef.current = setInterval(() => void loadOrders(true), POLL_MS);
    return () => {
      window.clearTimeout(initialLoadTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restaurantId, loadOrders]);

  useEffect(() => {
    if (!accessToken || !restaurantId) return;

    const socket = connectSocket(accessToken, 'kitchen-orders');
    const refreshOrders = () => {
      void loadOrders(true);
    };
    const markConnected = () =>
      setWorkspaceState((current) => ({ ...current, realtimeStatus: 'connected' }));
    const markDisconnected = () =>
      setWorkspaceState((current) => ({ ...current, realtimeStatus: 'disconnected' }));

    const initialSocketStatusTimer = window.setTimeout(
      () =>
        setWorkspaceState((current) => ({
          ...current,
          realtimeStatus: socket.connected ? 'connected' : 'connecting',
        })),
      0,
    );

    socket.on('new-order', refreshOrders);
    socket.on('order:payment-confirmed', refreshOrders);
    socket.on('order:status-changed', refreshOrders);
    socket.on('connect', markConnected);
    socket.on('disconnect', markDisconnected);
    socket.on('connect_error', markDisconnected);

    return () => {
      window.clearTimeout(initialSocketStatusTimer);
      socket.off('new-order', refreshOrders);
      socket.off('order:payment-confirmed', refreshOrders);
      socket.off('order:status-changed', refreshOrders);
      socket.off('connect', markConnected);
      socket.off('disconnect', markDisconnected);
      socket.off('connect_error', markDisconnected);
      disconnectSocket();
    };
  }, [accessToken, restaurantId, loadOrders]);

  const u = user as Record<string, unknown>;
  const employee = {
    id: String(u?.id || ''),
    name: String(u?.name || 'Cozinheiro'),
    email: String(u?.email || ''),
    role: 'KITCHEN' as const,
    shift: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  return (
    <KitchenModule
      employee={employee}
      restaurant={restaurant}
      data={data}
      workspaceState={workspaceState}
      onRefresh={restaurantId ? () => loadOrders(true) : undefined}
      onUpdateOrderStatus={
        restaurantId
          ? async (orderId, status) => {
              const numericId = orderId.replace(/^#/, '');
              await ordersService.updateStatus(numericId, status);
              const changedAt = new Date().toISOString();
              setData((current) => ({
                ...current,
                orders: current.orders.map((order) =>
                  order.id === orderId
                    ? {
                        ...order,
                        status,
                        ...(status === 'PREPARANDO'
                          ? { preparationStartedAt: changedAt }
                          : { readyAt: changedAt }),
                      }
                    : order,
                ),
              }));
              await loadOrders(true);
            }
          : undefined
      }
      onLogout={() => {
        logout();
        navigate('/login');
      }}
    />
  );
}
