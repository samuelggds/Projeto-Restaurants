import { useContext } from 'react';
import { CustomDomainContext } from './customDomainTenantContext';

export function useCustomDomainTenant() {
  return useContext(CustomDomainContext);
}

export function useResolvedTenantSlug(routeSlug?: unknown) {
  const custom = useCustomDomainTenant();
  const explicit = String(routeSlug || '').trim().toLowerCase();
  return explicit || custom.tenant?.restaurantSlug || '';
}
