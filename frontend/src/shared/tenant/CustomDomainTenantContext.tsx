import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api from '../../Services/api';
import {
  clearCustomDomainTenant,
  rememberCustomDomainTenant,
} from '../navigation/authNavigation';

type CustomDomainTenant = {
  hostname: string;
  restaurantId: number;
  restaurantName: string;
  restaurantSlug: string;
  mode: 'MENU_ONLY' | 'SITE_WITH_MENU_SUBDOMAIN';
  surface: 'MENU' | 'LANDING';
  canonicalHost: string | null;
  menuHost: string | null;
};

type CustomDomainContextValue = {
  loading: boolean;
  isCustomDomain: boolean;
  tenant: CustomDomainTenant | null;
  error: boolean;
};

const Context = createContext<CustomDomainContextValue>({
  loading: false,
  isCustomDomain: false,
  tenant: null,
  error: false,
});

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function hostnameFrom(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function shouldResolveCustomDomain() {
  if (typeof window === 'undefined') return false;
  const runtime = window.location.hostname.toLowerCase();
  if (!runtime || LOCAL_HOSTS.has(runtime)) return false;
  const appHost = hostnameFrom(import.meta.env.VITE_APP_URL);
  const apiHost = hostnameFrom(import.meta.env.VITE_API_URL);
  return Boolean(appHost && runtime !== appHost && runtime !== apiHost);
}

export function CustomDomainTenantProvider({ children }: { children: ReactNode }) {
  const shouldResolve = shouldResolveCustomDomain();
  const [tenant, setTenant] = useState<CustomDomainTenant | null>(null);
  const [loading, setLoading] = useState(shouldResolve);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shouldResolve) {
      clearCustomDomainTenant();
      setTenant(null);
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    const hostname = window.location.hostname.toLowerCase();
    setLoading(true);
    setError(false);

    void api
      .get('/public/custom-domain/resolve', {
        params: { hostname },
        skipBaseUrlFallback: true,
      })
      .then((response) => {
        if (!active) return;
        const value = response.data as CustomDomainTenant;
        const slug = String(value?.restaurantSlug || '').trim().toLowerCase();
        const restaurantId = Number(value?.restaurantId || 0);
        if (!slug || !Number.isInteger(restaurantId) || restaurantId <= 0) {
          throw new Error('Domínio sem tenant válido.');
        }
        const next = { ...value, hostname, restaurantId, restaurantSlug: slug };
        rememberCustomDomainTenant(hostname, slug);
        setTenant(next);
      })
      .catch(() => {
        if (!active) return;
        clearCustomDomainTenant();
        setTenant(null);
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shouldResolve]);

  const value = useMemo(
    () => ({
      loading,
      isCustomDomain: shouldResolve && Boolean(tenant),
      tenant,
      error,
    }),
    [error, loading, shouldResolve, tenant],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCustomDomainTenant() {
  return useContext(Context);
}

export function useResolvedTenantSlug(routeSlug?: unknown) {
  const custom = useCustomDomainTenant();
  const explicit = String(routeSlug || '').trim().toLowerCase();
  return explicit || custom.tenant?.restaurantSlug || '';
}
