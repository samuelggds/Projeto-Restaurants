import { useEffect, useMemo, useState, type ReactNode } from 'react';
import api from '../../Services/api';
import {
  clearCustomDomainTenant,
  rememberCustomDomainTenant,
} from '../navigation/authNavigation';
import {
  CustomDomainContext,
  type CustomDomainTenant,
} from './customDomainTenantContext';

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
      return;
    }

    let active = true;
    const hostname = window.location.hostname.toLowerCase();

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

  return <CustomDomainContext.Provider value={value}>{children}</CustomDomainContext.Provider>;
}
