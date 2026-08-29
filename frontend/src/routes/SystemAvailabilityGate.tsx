import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../Services/api';
import {
  clearPlatformMaintenanceState,
  getPlatformMaintenanceState,
  isMaintenanceBypassPath,
  PLATFORM_STATUS_PATH,
  setPlatformMaintenanceState,
  subscribePlatformMaintenanceState,
  type PlatformStatus,
} from '../Services/platformMaintenance';
import {
  clearSystemBlockState,
  getSystemBlockState,
  subscribeSystemBlockState,
} from '../Services/systemBlock';
import { useAuth } from '../contexts/authContext';
import SystemMaintenancePage from '../pages/SystemMaintenance/SystemMaintenance';
import BillingRestrictedAdmin from '../pages/admin/restricted/BillingRestrictedAdmin';
import { resolveAvailabilityView } from './availabilityPolicy';

const STATUS_POLL_INTERVAL_MS = 15_000;

export default function SystemAvailabilityGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [maintenanceState, setMaintenanceState] = useState(() => getPlatformMaintenanceState());
  const [blockState, setBlockState] = useState(() => getSystemBlockState());
  const [initialStatusPending, setInitialStatusPending] = useState(
    () => !getPlatformMaintenanceState(),
  );

  const syncStoredStates = useCallback(() => {
    setMaintenanceState(getPlatformMaintenanceState());
    setBlockState(getSystemBlockState());
  }, []);

  const checkPlatformStatus = useCallback(async () => {
    try {
      const response = await api.get<PlatformStatus>(PLATFORM_STATUS_PATH, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const status = response.data;
      const active = status?.maintenanceMode === true || status?.available === false;

      if (active) {
        const returnTo = isMaintenanceBypassPath(location.pathname)
          ? null
          : `${location.pathname}${location.search}${location.hash}`;
        setPlatformMaintenanceState({
          message: status?.maintenanceMessage,
          returnTo,
        });
      } else {
        clearPlatformMaintenanceState();
      }
    } catch {
      // Falha aberta: uma indisponibilidade do endpoint de status não deve
      // inventar uma manutenção. Respostas 503 das APIs ainda acionam o
      // interceptor global e bloqueiam a interface imediatamente.
    } finally {
      setInitialStatusPending(false);
      syncStoredStates();
    }
  }, [location.hash, location.pathname, location.search, syncStoredStates]);

  useEffect(() => {
    const unsubscribeMaintenance = subscribePlatformMaintenanceState(syncStoredStates);
    const unsubscribeBlock = subscribeSystemBlockState(syncStoredStates);
    return () => {
      unsubscribeMaintenance();
      unsubscribeBlock();
    };
  }, [syncStoredStates]);

  useEffect(() => {
    void checkPlatformStatus();
    const timer = window.setInterval(() => void checkPlatformStatus(), STATUS_POLL_INTERVAL_MS);
    const onFocus = () => void checkPlatformStatus();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkPlatformStatus();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkPlatformStatus]);

  useEffect(() => {
    const restaurantId = Number(
      blockState?.restaurantId || user?.restaurantId || user?.restaurant?.id || 0,
    );
    if (!blockState || !Number.isInteger(restaurantId) || restaurantId <= 0) return;

    const checkRestaurantAvailability = async () => {
      try {
        const response = await api.get<{ available?: boolean }>(
          `/restaurants/${restaurantId}/availability`,
          { headers: { 'Cache-Control': 'no-cache' } },
        );
        if (response.data?.available === true) clearSystemBlockState();
      } catch {
        // Manter a tela protegida é o comportamento seguro durante falhas.
      }
    };

    void checkRestaurantAvailability();
    const timer = window.setInterval(() => void checkRestaurantAvailability(), 12_000);
    return () => window.clearInterval(timer);
  }, [blockState, user?.restaurant?.id, user?.restaurantId]);

  const role = String(user?.role || '').toUpperCase();
  const view = resolveAvailabilityView({
    pathname: location.pathname,
    role,
    userPresent: Boolean(user),
    platformMaintenance: Boolean(maintenanceState),
    initialStatusPending,
    systemBlock: blockState,
  });

  if (view === 'PLATFORM_MAINTENANCE') {
    return <SystemMaintenancePage mode="platform" message={maintenanceState.message} />;
  }

  if (view === 'LOADING') {
    return (
      <main className="app-route-loading" aria-busy="true" aria-live="polite">
        <span role="status">Verificando disponibilidade…</span>
      </main>
    );
  }

  if (view === 'BILLING_ADMIN') return <BillingRestrictedAdmin />;
  if (view === 'TENANT_MAINTENANCE') {
    return <SystemMaintenancePage mode="tenant" message={blockState.message} />;
  }

  return children;
}
