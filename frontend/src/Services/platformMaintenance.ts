const PLATFORM_MAINTENANCE_KEY = 'platform_maintenance_state';
const PLATFORM_MAINTENANCE_EVENT = 'platform-maintenance-state-changed';

export const PLATFORM_STATUS_PATH = '/platform/status';

export const DEFAULT_PLATFORM_MAINTENANCE_MESSAGE = 'Plataforma temporariamente em manutenção.';

export type PlatformStatus = {
  available: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

export type PlatformMaintenanceState = {
  active: true;
  message: string;
  returnTo: string | null;
  updatedAt: string;
};

function normalizeAvailabilityPath(pathname: string) {
  return String(pathname || '')
    .split(/[?#]/u, 1)[0]
    .replace(/\/+$/u, '')
    .toLowerCase();
}

function notifyPlatformMaintenanceChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PLATFORM_MAINTENANCE_EVENT));
  }
}

export function getPlatformMaintenanceState(): PlatformMaintenanceState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(PLATFORM_MAINTENANCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlatformMaintenanceState>;
    if (parsed?.active !== true) return null;

    return {
      active: true,
      message: String(parsed.message || DEFAULT_PLATFORM_MAINTENANCE_MESSAGE),
      returnTo: typeof parsed.returnTo === 'string' ? parsed.returnTo : null,
      updatedAt: String(parsed.updatedAt || new Date(0).toISOString()),
    };
  } catch {
    window.localStorage.removeItem(PLATFORM_MAINTENANCE_KEY);
    return null;
  }
}

export function setPlatformMaintenanceState(
  payload: { message?: unknown; returnTo?: string | null } = {},
) {
  if (typeof window === 'undefined') return;

  const current = getPlatformMaintenanceState();
  const state: PlatformMaintenanceState = {
    active: true,
    message: String(payload.message || DEFAULT_PLATFORM_MAINTENANCE_MESSAGE),
    returnTo: payload.returnTo ?? current?.returnTo ?? null,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PLATFORM_MAINTENANCE_KEY, JSON.stringify(state));
  notifyPlatformMaintenanceChange();
}

export function isTechnicalMaintenancePath(pathname: string) {
  return normalizeAvailabilityPath(pathname) === '/super_admin/login';
}

export function isAlwaysAvailableLoginPath(pathname: string) {
  const path = normalizeAvailabilityPath(pathname);
  return path === '/super_admin/login' || /^\/[^/]+\/(?:login|team|admin)$/u.test(path);
}

export function isSuperAdminAccessPath(pathname: string) {
  const path = normalizeAvailabilityPath(pathname);
  return path === '/super_admin' || path.startsWith('/super_admin/');
}

export function isMaintenanceBypassPath(pathname: string) {
  return isAlwaysAvailableLoginPath(pathname) || isSuperAdminAccessPath(pathname);
}

export function clearPlatformMaintenanceState() {
  if (typeof window === 'undefined') return;
  const hadState = Boolean(window.localStorage.getItem(PLATFORM_MAINTENANCE_KEY));
  window.localStorage.removeItem(PLATFORM_MAINTENANCE_KEY);
  if (hadState) notifyPlatformMaintenanceChange();
}

export function subscribePlatformMaintenanceState(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === PLATFORM_MAINTENANCE_KEY) listener();
  };
  window.addEventListener(PLATFORM_MAINTENANCE_EVENT, listener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(PLATFORM_MAINTENANCE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
