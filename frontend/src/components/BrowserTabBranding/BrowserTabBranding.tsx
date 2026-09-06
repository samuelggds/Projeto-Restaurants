import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { useAuth } from '../../contexts/authContext';
import {
  applyRestaurantBrowserBranding,
  DEFAULT_BROWSER_TITLE,
  RESTAURANT_BROWSER_BRANDING_UPDATED_EVENT,
} from '../../config/browserBranding';
import { normalizeRestaurantCategory } from '../../config/restaurantCategory';
import { mapLoginBranding } from '../../pages/Login/domain/loginBranding';

const RESERVED_ROUTE_SEGMENTS = new Set([
  'admin',
  'attendant',
  'billing',
  'change-password',
  'courier',
  'kitchen',
  'login',
  'mesa',
  'orders',
  'profile',
  'recover-password',
  'register',
  'super_admin',
  'system-blocked',
  'system-maintenance',
  'waiter',
]);

type RestaurantIdentitySource = {
  restaurantId?: unknown;
  restaurantName?: unknown;
  restaurantCategory?: unknown;
  restaurant?: {
    id?: unknown;
    name?: unknown;
    category?: unknown;
  } | null;
} | null;

type StoredRestaurantIdentity = {
  id: number;
  name: string;
  category: unknown;
};

function parsePositiveId(value: unknown) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
}

function readSessionUser(): RestaurantIdentitySource {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem('user') || 'null');
    return parsed && typeof parsed === 'object' ? (parsed as RestaurantIdentitySource) : null;
  } catch {
    return null;
  }
}

function readStoredRestaurantIdentity(authUser: RestaurantIdentitySource): StoredRestaurantIdentity {
  // A identidade autenticada é a fonte principal. O snapshot de sessionStorage
  // existe apenas durante a sessão atual e nunca é lido do localStorage.
  const user = authUser || readSessionUser() || {};
  const restaurant =
    user.restaurant && typeof user.restaurant === 'object' ? user.restaurant : {};

  return {
    id:
      parsePositiveId(user.restaurantId) ||
      parsePositiveId(restaurant.id) ||
      parsePositiveId(localStorage.getItem('menuRestaurantId')),
    name: String(user.restaurantName || restaurant.name || DEFAULT_BROWSER_TITLE).trim(),
    category: user.restaurantCategory || restaurant.category || 'RESTAURANTE',
  };
}

function normalizeSlug(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return /^[a-z0-9_-]+$/u.test(normalized) ? normalized : '';
}

function slugFromPath(pathname: string) {
  const firstSegment = normalizeSlug(pathname.split('/').filter(Boolean)[0]);
  return firstSegment && !RESERVED_ROUTE_SEGMENTS.has(firstSegment) ? firstSegment : '';
}

function restaurantReferenceFromLocation(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  const explicitSlug = normalizeSlug(params.get('restaurantSlug') || params.get('slug'));
  const explicitId = parsePositiveId(params.get('restaurantId') || params.get('rid'));
  const pathSlug = slugFromPath(pathname);

  if (pathSlug) return { slug: pathSlug, id: explicitId };
  if (explicitSlug) return { slug: explicitSlug, id: explicitId };

  const next = params.get('next');
  if (next) {
    try {
      const parsedNext = new URL(next, 'https://internal.invalid');
      const nextSlug = slugFromPath(parsedNext.pathname);
      const nextId = parsePositiveId(
        parsedNext.searchParams.get('restaurantId') || parsedNext.searchParams.get('rid'),
      );
      if (nextSlug || nextId) return { slug: nextSlug, id: nextId };
    } catch {
      // O fallback da sessão atual mantém a identidade caso o next seja inválido.
    }
  }

  return { slug: '', id: explicitId };
}

export default function BrowserTabBranding() {
  const location = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return undefined;

    let active = true;

    const refresh = async () => {
      if (location.pathname.startsWith('/super_admin')) {
        applyRestaurantBrowserBranding(document, 'Peça Já', 'RESTAURANTE');
        return;
      }

      const stored = readStoredRestaurantIdentity(user as RestaurantIdentitySource);
      applyRestaurantBrowserBranding(document, stored.name, stored.category);

      const routeReference = restaurantReferenceFromLocation(location.pathname, location.search);
      const restaurantId = routeReference.id || stored.id;

      // Rotas reservadas sem um tenant resolvido (ex.: rastreamento público antes
      // da resposta do pedido) não podem cair em um restaurante "default". Isso
      // evita consulta cross-tenant e mantém o branding neutro até o tenant existir.
      if (!routeReference.slug && !restaurantId) return;

      try {
        const settings = routeReference.slug
          ? await restaurantSettingsService.getPublicSettingsBySlug(routeReference.slug)
          : await restaurantSettingsService.getPublicSettings(restaurantId);

        if (!active) return;

        const branding = mapLoginBranding(settings);
        const resolvedRestaurantId = parsePositiveId(
          settings?.restaurantId ||
            (settings?.restaurant as Record<string, unknown> | undefined)?.id ||
            restaurantId,
        );
        if (resolvedRestaurantId) {
          localStorage.setItem('menuRestaurantId', String(resolvedRestaurantId));
        }

        applyRestaurantBrowserBranding(document, branding.name, branding.category);
      } catch {
        if (active) {
          applyRestaurantBrowserBranding(
            document,
            stored.name,
            normalizeRestaurantCategory(stored.category),
          );
        }
      }
    };

    void refresh();
    const handleBrandingUpdate = () => void refresh();
    window.addEventListener(RESTAURANT_BROWSER_BRANDING_UPDATED_EVENT, handleBrandingUpdate);

    return () => {
      active = false;
      window.removeEventListener(RESTAURANT_BROWSER_BRANDING_UPDATED_EVENT, handleBrandingUpdate);
    };
  }, [isAuthLoading, location.pathname, location.search, user]);

  return null;
}
