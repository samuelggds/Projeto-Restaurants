import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
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

type StoredRestaurantIdentity = {
  id: number;
  name: string;
  category: unknown;
};

function parsePositiveId(value: unknown) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
}

function readJsonRecord(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readStoredRestaurantIdentity(): StoredRestaurantIdentity {
  const user = readJsonRecord('user');
  const restaurant =
    user.restaurant && typeof user.restaurant === 'object'
      ? (user.restaurant as Record<string, unknown>)
      : {};

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
      // O fallback armazenado abaixo mantém a identidade segura caso o next seja inválido.
    }
  }

  return { slug: '', id: explicitId };
}

export default function BrowserTabBranding() {
  const location = useLocation();

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (location.pathname.startsWith('/super_admin')) {
        applyRestaurantBrowserBranding(document, 'Peça Já', 'RESTAURANTE');
        return;
      }

      const stored = readStoredRestaurantIdentity();
      applyRestaurantBrowserBranding(document, stored.name, stored.category);

      const routeReference = restaurantReferenceFromLocation(location.pathname, location.search);
      const restaurantId = routeReference.id || stored.id;

      try {
        const settings = routeReference.slug
          ? await restaurantSettingsService.getPublicSettingsBySlug(routeReference.slug)
          : restaurantId
            ? await restaurantSettingsService.getPublicSettings(restaurantId)
            : await restaurantSettingsService.getDefaultPublicSettings();

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
  }, [location.pathname, location.search]);

  return null;
}
