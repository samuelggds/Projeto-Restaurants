import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import { getAccessToken } from '../../modules/auth/session/authSession';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { acquireSocket } from '../../Services/socketService';
import {
  getRememberedTenantSlug,
  rememberTenantSlug,
  TENANT_REQUIRED_PATH,
} from '../../shared/navigation/authNavigation';
import { mapRestaurantBrand } from '../operations/orderAdapter';
import attendantApi from './attendantApi';
import { AttendantWorkspace } from './AttendantWorkspace';
import type {
  AttendantRestaurantBrand,
  AttendantWorkspaceSnapshot,
  AttendantWorkspaceState,
} from './types';

type UnknownRecord = Record<string, unknown>;

const POLL_MS = 20_000;
const emptySnapshot: AttendantWorkspaceSnapshot = {
  generatedAt: '',
  orders: [],
  calls: [],
  tables: [],
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

export default function AttendantPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const account = asRecord(user);
  const accountRestaurant = asRecord(account.restaurant);
  const restaurantId = Number(account.restaurantId || accountRestaurant.id || 0) || null;
  const attendantName = String(account.name || 'Atendente').trim() || 'Atendente';
  const restaurantSlugRef = useRef(
    String(account.restaurantSlug || accountRestaurant.slug || '').trim().toLowerCase(),
  );
  const [snapshot, setSnapshot] = useState<AttendantWorkspaceSnapshot>(emptySnapshot);
  const [restaurant, setRestaurant] = useState<AttendantRestaurantBrand>({
    name: String(accountRestaurant.name || 'Restaurante'),
    monogram: 'R',
    primaryColor: '#e16a3d',
  });
  const [workspaceState, setWorkspaceState] = useState<AttendantWorkspaceState>({
    loading: Boolean(restaurantId),
    refreshing: false,
    error: restaurantId
      ? null
      : 'Seu usuário não está vinculado a um restaurante. Entre novamente ou procure o administrador.',
    lastUpdatedAt: null,
  });
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const loadWorkspace = useCallback(
    async (refreshing = false) => {
      if (!restaurantId) return;
      const requestId = ++requestIdRef.current;
      if (mountedRef.current) {
        setWorkspaceState((current) => ({
          ...current,
          loading: current.lastUpdatedAt === null,
          refreshing,
          error: null,
        }));
      }

      try {
        const nextSnapshot = await attendantApi.getWorkspace();
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setSnapshot(nextSnapshot);
        setWorkspaceState({
          loading: false,
          refreshing: false,
          error: null,
          lastUpdatedAt: nextSnapshot.generatedAt || new Date().toISOString(),
        });
      } catch {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setWorkspaceState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: 'A conexão com a operação falhou. Os últimos dados disponíveis foram preservados.',
        }));
      }
    },
    [restaurantId],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    restaurantSettingsService
      .getPublicSettings(restaurantId)
      .then((settings: UnknownRecord) => {
        if (!mountedRef.current) return;
        const settingsRestaurant = asRecord(settings.restaurant);
        const settingsSlug = String(settingsRestaurant.slug || settings.restaurantSlug || '')
          .trim()
          .toLowerCase();
        if (settingsSlug) {
          restaurantSlugRef.current = settingsSlug;
          rememberTenantSlug(settingsSlug);
        }
        const brand = mapRestaurantBrand(settings);
        setRestaurant((current) => ({
          name: brand.restaurantName || current.name,
          monogram: brand.monogram || current.monogram,
          primaryColor: brand.primaryColor || current.primaryColor,
        }));
      })
      .catch(() => undefined);
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadWorkspace();
    });
    const interval = window.setInterval(() => void loadWorkspace(true), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadWorkspace, restaurantId]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !restaurantId) return;
    const { socket, release } = acquireSocket(token, 'attendant-workspace');
    let debounceTimer: number | null = null;
    const invalidate = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => void loadWorkspace(true), 180);
    };

    socket.on('attendant:workspace-invalidated', invalidate);
    return () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      socket.off('attendant:workspace-invalidated', invalidate);
      release();
    };
  }, [loadWorkspace, restaurantId]);

  return (
    <AttendantWorkspace
      attendantName={attendantName}
      restaurant={restaurant}
      snapshot={snapshot}
      workspaceState={workspaceState}
      onRefresh={() => loadWorkspace(true)}
      onLogout={() => {
        const tenantSlug = restaurantSlugRef.current || getRememberedTenantSlug();
        const destination = tenantSlug ? `/${tenantSlug}/team` : TENANT_REQUIRED_PATH;
        flushSync(() => {
          logout();
          navigate(destination, { replace: true });
        });
      }}
    />
  );
}
