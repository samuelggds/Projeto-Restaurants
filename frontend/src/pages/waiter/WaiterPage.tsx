import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import ordersService from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { connectSocket, disconnectSocket } from '../../Services/socketService';
import tablesService from '../../Services/tablesService';
import waiterCallsService from '../../Services/waiterCallsService';
import { getStoredAccessToken } from '../../modules/auth/session/authSession';
import { WaiterModule } from './WaiterModule';
import type { EmployeeWorkspaceData, RestaurantBrand, WaiterWorkspaceState } from './types';
import { mapOperationalOrders, mapRestaurantBrand } from '../operations/orderAdapter';
import { asRecord, mapWaiterCalls, mapWaiterTables } from './waiterAdapter';
import {
  playOrderNotificationSound,
  prepareOrderNotificationSound,
} from '../admin/domain/orderNotificationSound';

const POLL_MS = 30_000;

type GenericRecord = Record<string, unknown>;

function formatTimeForWorkspace(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function WaiterPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const restaurantId = Number((user as GenericRecord)?.restaurantId || 0) || null;
  const [data, setData] = useState<EmployeeWorkspaceData>({ orders: [], tables: [], calls: [] });
  const [restaurant, setRestaurant] = useState<RestaurantBrand>({
    restaurantName: 'Restaurante',
    monogram: 'R',
    primaryColor: '#d64d08',
  });
  const [workspaceState, setWorkspaceState] = useState<WaiterWorkspaceState>({
    loading: Boolean(restaurantId),
    refreshing: false,
    error: restaurantId
      ? null
      : 'Seu usuário não está vinculado a um restaurante. Entre novamente ou procure o administrador.',
    lastUpdatedAt: null,
  });
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const callAlarmIntervalRef = useRef<number | null>(null);

  const stopCallAlarm = useCallback(() => {
    if (callAlarmIntervalRef.current !== null) {
      window.clearInterval(callAlarmIntervalRef.current);
      callAlarmIntervalRef.current = null;
    }
  }, []);

  const startCallAlarm = useCallback(() => {
    if (callAlarmIntervalRef.current !== null) return;
    playOrderNotificationSound();
    callAlarmIntervalRef.current = window.setInterval(playOrderNotificationSound, 1500);
  }, []);

  const loadWorkspace = useCallback(async (refreshing = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (mountedRef.current) {
      setWorkspaceState((current) => ({
        ...current,
        loading: current.lastUpdatedAt === null,
        refreshing,
        error: null,
      }));
    }

    const results = await Promise.allSettled([
      ordersService.listRestaurantOrders(),
      tablesService.listTables(),
      waiterCallsService.listCalls(),
    ]);
    inFlightRef.current = false;
    if (!mountedRef.current) return;

    const failures: string[] = [];
    if (results[0].status === 'rejected') failures.push('pedidos');
    if (results[1].status === 'rejected') failures.push('mesas');
    if (results[2].status === 'rejected') failures.push('chamados');

    setData((current) => ({
      orders:
        results[0].status === 'fulfilled'
          ? mapOperationalOrders(Array.isArray(results[0].value) ? results[0].value : [])
          : current.orders,
      tables:
        results[1].status === 'fulfilled'
          ? mapWaiterTables(Array.isArray(results[1].value) ? results[1].value : [])
          : current.tables,
      calls:
        results[2].status === 'fulfilled'
          ? mapWaiterCalls(Array.isArray(results[2].value) ? results[2].value : [])
          : current.calls,
    }));
    setWorkspaceState({
      loading: false,
      refreshing: false,
      error: failures.length
        ? `Não foi possível carregar ${failures.join(', ')}. Os demais dados continuam disponíveis.`
        : null,
      lastUpdatedAt: failures.length === 3 ? null : new Date().toISOString(),
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCallAlarm();
    };
  }, [stopCallAlarm]);

  useEffect(() => {
    const unlockSound = () => prepareOrderNotificationSound();
    window.addEventListener('pointerdown', unlockSound, { once: true });
    return () => window.removeEventListener('pointerdown', unlockSound);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    restaurantSettingsService
      .getPublicSettings(restaurantId)
      .then((settings: GenericRecord) => {
        if (!mountedRef.current) return;
        const restaurantRecord = asRecord(settings.restaurant);
        setRestaurant({
          ...mapRestaurantBrand(settings),
          restaurantId,
          slug: String(restaurantRecord.slug || settings.restaurantSlug || '').trim() || undefined,
        });
      })
      .catch((error: unknown) => {
        console.error('[WAITER_BRAND_LOAD_ERROR]', error);
      });
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    void loadWorkspace();
    const interval = window.setInterval(() => void loadWorkspace(true), POLL_MS);
    return () => window.clearInterval(interval);
  }, [loadWorkspace, restaurantId]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token || !restaurantId) return;
    const socket = connectSocket(token, 'waiter-workspace');
    const refresh = () => void loadWorkspace(true);
    const handleNewCall = () => {
      startCallAlarm();
      refresh();
    };
    socket.on('new-order', refresh);
    socket.on('order:status-changed', refresh);
    socket.on('waiter:order-updated', refresh);
    socket.on('waiter-call:created', handleNewCall);
    socket.on('waiter-call:updated', refresh);
    return () => {
      socket.off('new-order', refresh);
      socket.off('order:status-changed', refresh);
      socket.off('waiter:order-updated', refresh);
      socket.off('waiter-call:created', handleNewCall);
      socket.off('waiter-call:updated', refresh);
      disconnectSocket();
    };
  }, [loadWorkspace, restaurantId, startCallAlarm]);

  const account = user as GenericRecord;
  const employee = {
    id: String(account?.id || ''),
    name: String(account?.name || 'Garçom'),
    email: String(account?.email || ''),
    role: 'WAITER' as const,
    shift: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };

  return (
    <WaiterModule
      employee={employee}
      restaurant={restaurant}
      data={data}
      workspaceState={workspaceState}
      onRefresh={() => loadWorkspace(true)}
      onOpenTable={async (tableId) => {
        const result = asRecord(await tablesService.openTableSession(tableId));
        const session = asRecord(result.session);
        const sessionId = String(result.sessionId || session.id || '').trim();
        if (!sessionId) throw new Error('O servidor não confirmou a abertura da mesa.');
        setData((current) => ({
          ...current,
          tables: current.tables.map((table) =>
            table.id === tableId
              ? {
                  ...table,
                  status: 'OCCUPIED',
                  sessionId,
                  openedAt: formatTimeForWorkspace(session.openedAt),
                }
              : table,
          ),
        }));
        void loadWorkspace(true);
        return { sessionId };
      }}
      onCloseTable={async (sessionId) => {
        await tablesService.closeTableSession(sessionId);
        setData((current) => ({
          ...current,
          tables: current.tables.map((table) =>
            table.sessionId === sessionId
              ? {
                  ...table,
                  status: 'FREE',
                  sessionId: undefined,
                  openedAt: undefined,
                  guests: 0,
                  total: 0,
                }
              : table,
          ),
        }));
        void loadWorkspace(true);
      }}
      onUpdateCall={async (callId, status) => {
        if (status === 'WAITING')
          throw new Error('Não é possível reabrir um chamado por esta tela.');
        stopCallAlarm();
        await waiterCallsService.updateStatus(callId, status);
        setData((current) => ({
          ...current,
          calls: current.calls.map((call) =>
            call.id === callId
              ? {
                  ...call,
                  status,
                  employeeName: status === 'IN_PROGRESS' ? employee.name : call.employeeName,
                  resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : call.resolvedAt,
                }
              : call,
          ),
        }));
        void loadWorkspace(true);
      }}
      onDeleteCall={async (callId) => {
        await waiterCallsService.deleteCall(callId);
        setData((current) => ({
          ...current,
          calls: current.calls.filter((call) => call.id !== callId),
        }));
      }}
      onLogout={() => {
        logout();
        navigate('/login');
      }}
    />
  );
}
