import axios from 'axios';
import {
  applyRefreshedAccessToken,
  clearAuthSession,
  getAccessToken,
  getAuthSessionRevision,
  getAuthSessionUserId,
  invalidateAuthSessionMemory,
} from '../modules/auth/session/authSession';
import { setSystemBlockState } from './systemBlock';
import { setPlatformMaintenanceState } from './platformMaintenance';
import { buildLoginUrl } from '../shared/navigation/authNavigation';
import { sanitizeApiErrorData } from '../shared/errors/userFacingError';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

function normalizeBaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}

function getRuntimeBaseUrl() {
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const host = window.location.hostname;
  return host ? `${protocol}//${host}:3000` : '';
}

function getRuntimeHost() {
  return typeof window === 'undefined' ? '' : window.location.hostname || '';
}

function getHostCandidates(host) {
  if (!host) return [];
  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
  const candidates = [`${protocol}//${host}:3000`];
  if (protocol !== 'https:') candidates.push(`https://${host}:3000`);
  return candidates;
}

function getApiBaseUrls() {
  const configuredUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
  const runtimeHost = getRuntimeHost();
  const runtimeCandidates = getHostCandidates(runtimeHost).map(normalizeBaseUrl);
  const runtimeUrl = normalizeBaseUrl(getRuntimeBaseUrl());
  const sameOriginUrl =
    typeof window !== 'undefined' ? normalizeBaseUrl(window.location.origin) : '';
  const e2eDirectApi =
    String(import.meta.env.VITE_E2E_DIRECT_API || '')
      .trim()
      .toLowerCase() === 'true';
  const developmentProxyUrl =
    import.meta.env.DEV && sameOriginUrl && !e2eDirectApi ? `${sameOriginUrl}/api` : '';
  const defaultLoopbackUrl = 'http://127.0.0.1:3000';
  const defaultLocalUrl = 'http://localhost:3000';
  const urls = new Set<string>();
  const isLocalRuntimeHost = LOCAL_HOSTS.includes(runtimeHost);

  if (developmentProxyUrl) urls.add(developmentProxyUrl);

  if (isLocalRuntimeHost) {
    if (runtimeHost === 'localhost') {
      urls.add(defaultLocalUrl);
      urls.add(defaultLoopbackUrl);
    } else {
      urls.add(defaultLoopbackUrl);
      urls.add(defaultLocalUrl);
    }
  }

  if (!isLocalRuntimeHost) {
    // Production uses a dedicated API origin. Falling back to the frontend origin is unsafe:
    // nginx serves the SPA there and rejects API POSTs with 405, while GETs may return index.html.
    // Keep production requests pinned to VITE_API_URL instead of mutating the client to APP_DOMAIN
    // after a transient network failure.
    if (configuredUrl && configuredUrl !== sameOriginUrl) urls.add(configuredUrl);
    return Array.from(urls);
  }

  if (runtimeUrl) urls.add(runtimeUrl);
  for (const candidate of runtimeCandidates) if (candidate) urls.add(candidate);
  if (configuredUrl) urls.add(configuredUrl);
  return urls.size ? Array.from(urls) : [defaultLoopbackUrl, defaultLocalUrl];
}

const API_BASE_URLS: string[] = getApiBaseUrls();
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15_000);
const API_TIMEOUT_MS =
  Number.isInteger(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15_000;

const api = axios.create({
  baseURL: API_BASE_URLS[0] || '',
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
});

let refreshRequest: Promise<string> | null = null;
const AUTH_REFRESH_LOCK_NAME = 'pizza-ia-auth-refresh';

export class AuthSessionChangedError extends Error {
  constructor() {
    super('Sua sessão foi atualizada em outra aba. Entre novamente para continuar.');
    this.name = 'AuthSessionChangedError';
  }
}

export class AuthSessionIdentityChangedError extends Error {
  constructor() {
    super('A conta conectada mudou em outra aba. Entre novamente para continuar.');
    this.name = 'AuthSessionIdentityChangedError';
  }
}

function normalizeUserId(value: unknown) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function withCrossTabRefreshLock<T>(callback: () => Promise<T>) {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) return callback();
  const lockedRefresh = navigator.locks.request(
    AUTH_REFRESH_LOCK_NAME,
    { mode: 'exclusive' },
    callback,
  );
  return lockedRefresh.then((result) => result);
}

export function refreshAccessToken(expectedUserId: unknown = getAuthSessionUserId()) {
  if (!refreshRequest) {
    const expectedSessionUserId = normalizeUserId(expectedUserId);
    refreshRequest = withCrossTabRefreshLock(async () => {
      const baseURL = normalizeBaseUrl(api.defaults.baseURL || API_BASE_URLS[0] || '');
      const expectedRevision = getAuthSessionRevision();
      const response = await axios.post(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true, timeout: API_TIMEOUT_MS },
      );
      const accessToken = String(response?.data?.accessToken || '').trim();
      if (!accessToken) throw new Error('Não foi possível renovar seu acesso. Entre novamente.');
      const refreshedUserId = normalizeUserId(response?.data?.userId);
      if (!refreshedUserId) throw new Error('Não foi possível confirmar sua sessão. Entre novamente.');
      if (expectedSessionUserId && refreshedUserId !== expectedSessionUserId) {
        throw new AuthSessionIdentityChangedError();
      }
      if (!applyRefreshedAccessToken(accessToken, expectedRevision, refreshedUserId)) {
        throw new AuthSessionChangedError();
      }
      return accessToken;
    }).finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
}

api.interceptors.request.use(
  (config) => {
    const runtimeHost = getRuntimeHost();
    const isProductionBrowser =
      typeof window !== 'undefined' && !import.meta.env.DEV && !LOCAL_HOSTS.includes(runtimeHost);
    if (isProductionBrowser && !normalizeBaseUrl(config.baseURL || api.defaults.baseURL)) {
      return Promise.reject(
        new Error('A API do sistema não está configurada corretamente. Atualize a página e tente novamente.'),
      );
    }

    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const tableSessionRaw = localStorage.getItem('tableSession');
    if (tableSessionRaw) {
      try {
        const tableSession = JSON.parse(tableSessionRaw);
        const sessionToken =
          localStorage.getItem('tableSessionToken') || tableSession?.sessionToken || null;
        if (sessionToken) config.headers['x-session-token'] = sessionToken;
      } catch {
        // Sessão inválida é ignorada e a requisição segue normalmente.
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalConfig = error?.config;
    const hasHttpResponse = Boolean(error?.response);

    if (!hasHttpResponse && originalConfig && !originalConfig.skipBaseUrlFallback) {
      const currentBase = normalizeBaseUrl(originalConfig.baseURL || api.defaults.baseURL);
      const tried = new Set((originalConfig.__triedBaseUrls || []).map(normalizeBaseUrl));
      if (currentBase) tried.add(currentBase);
      const fallbackBase = API_BASE_URLS.find((url) => !tried.has(normalizeBaseUrl(url)));
      if (fallbackBase) {
        api.defaults.baseURL = fallbackBase;
        originalConfig.baseURL = fallbackBase;
        originalConfig.__triedBaseUrls = [...tried, normalizeBaseUrl(fallbackBase)];
        return api(originalConfig);
      }
    }

    const status = error?.response?.status;
    const rawData = error?.response?.data;
    const requestPath = String(originalConfig?.url || '');
    const canRefresh =
      status === 401 &&
      originalConfig &&
      !originalConfig.__authRetry &&
      Boolean(getAccessToken()) &&
      !requestPath.includes('/auth/login') &&
      !requestPath.includes('/auth/refresh') &&
      !requestPath.includes('/auth/logout');

    if (canRefresh) {
      originalConfig.__authRetry = true;
      return refreshAccessToken()
        .then((accessToken) => {
          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalConfig);
        })
        .catch((refreshError) => {
          if (refreshError instanceof AuthSessionIdentityChangedError) {
            invalidateAuthSessionMemory();
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.assign(buildLoginUrl(window.location));
            }
          } else if (!(refreshError instanceof AuthSessionChangedError)) {
            clearAuthSession();
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.assign(buildLoginUrl(window.location));
            }
          }
          return Promise.reject(refreshError);
        });
    }

    const currentUser = (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        return null;
      }
    })();
    const role = currentUser?.role || null;
    const platformMaintenance =
      status === 503 &&
      (rawData?.code === 'PLATFORM_MAINTENANCE' || rawData?.maintenanceMode === true);

    if (platformMaintenance) {
      const currentLocation =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : null;
      setPlatformMaintenanceState({
        message: rawData?.error || rawData?.maintenanceMessage || rawData?.message,
        returnTo: currentLocation,
      });
    }

    const blockedByBilling =
      (status === 403 || status === 423) &&
      (rawData?.code === 'BILLING_BLOCKED' ||
        String(rawData?.error || '')
          .toLowerCase()
          .includes('bloqueado por inadimpl'));
    const blockedByManualRestriction =
      (status === 403 || status === 423) && rawData?.code === 'RESTAURANT_ACCESS_BLOCKED';

    if (blockedByBilling || blockedByManualRestriction) {
      if (role !== 'SUPER_ADMIN') {
        setSystemBlockState({
          reason: blockedByManualRestriction ? 'MANUAL' : 'BILLING',
          message:
            rawData?.error ||
            (blockedByManualRestriction
              ? 'Restaurante temporariamente indisponível'
              : 'Sistema bloqueado por inadimplência'),
          paymentLink: rawData?.paymentLink || null,
          invoiceId: rawData?.invoiceId || null,
          dueDate: rawData?.dueDate || null,
          restaurantId:
            rawData?.restaurantId || currentUser?.restaurantId || currentUser?.restaurant?.id || null,
        });

        const currentPath = window.location.pathname;
        const adminCanUseBillingOnly = role === 'ADMIN' && !blockedByManualRestriction;
        if (!adminCanUseBillingOnly && currentPath !== '/system-maintenance') {
          window.location.assign('/system-maintenance');
        }
      }
    }

    if (error?.response) {
      error.response.data = sanitizeApiErrorData(rawData);
    } else if (error instanceof Error) {
      error.message = 'Não foi possível se comunicar com o sistema. Verifique sua conexão e tente novamente.';
    }

    return Promise.reject(error);
  },
);

export default api;