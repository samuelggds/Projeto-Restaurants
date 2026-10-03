import { createContext } from 'react';

export type CustomDomainTenant = {
  hostname: string;
  restaurantId: number;
  restaurantName: string;
  restaurantSlug: string;
  mode: 'MENU_ONLY' | 'SITE_WITH_MENU_SUBDOMAIN';
  surface: 'MENU' | 'LANDING';
  canonicalHost: string | null;
  menuHost: string | null;
};

export type CustomDomainContextValue = {
  loading: boolean;
  isCustomDomain: boolean;
  tenant: CustomDomainTenant | null;
  error: boolean;
};

export const CustomDomainContext = createContext<CustomDomainContextValue>({
  loading: false,
  isCustomDomain: false,
  tenant: null,
  error: false,
});
