import prisma from '../../../config/prisma.js';
import {
  customDomainPlanEligible,
  customDomainPublicHosts,
  normalizeCustomHostname,
  type CustomDomainMode,
} from '../domain/customDomainPolicy.js';

type ActiveCustomDomainResolution = {
  hostname: string;
  restaurantId: number;
  restaurantName: string;
  restaurantSlug: string;
  mode: CustomDomainMode;
  surface: 'MENU' | 'LANDING';
  canonicalHost: string | null;
  menuHost: string | null;
};

const ACTIVE_HOST_CACHE_TTL_MS = 5_000;
const activeHostCache = new Map<
  string,
  { expiresAt: number; value: ActiveCustomDomainResolution | null }
>();

export async function resolveActiveCustomDomain(hostnameValue: unknown) {
  let hostname: string;
  try {
    hostname = normalizeCustomHostname(hostnameValue);
  } catch {
    return null;
  }

  const cached = activeHostCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) activeHostCache.delete(hostname);

  const row = await prisma.restaurantCustomDomain.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [
        { hostname },
        { menuHostname: hostname },
        ...(hostname.startsWith('www.') ? [{ hostname: hostname.slice(4), includeWww: true }] : []),
      ],
    },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          settings: { select: { landingPageEnabled: true } },
          subscription: { select: { plan: true, status: true } },
        },
      },
    },
  });

  if (
    !row ||
    !row.restaurant.active ||
    !customDomainPlanEligible(row.restaurant.subscription?.plan, row.restaurant.subscription?.status)
  ) {
    activeHostCache.set(hostname, {
      expiresAt: Date.now() + ACTIVE_HOST_CACHE_TTL_MS,
      value: null,
    });
    return null;
  }

  const mode = row.mode as CustomDomainMode;
  const landingPublished =
    row.landingPublished === true && row.restaurant.settings?.landingPageEnabled === true;
  const allowedHosts = customDomainPublicHosts({
    hostname: row.hostname,
    menuHostname: row.menuHostname,
    mode,
    includeWww: row.includeWww,
    landingPublished,
  });
  if (!allowedHosts.includes(hostname)) {
    activeHostCache.set(hostname, {
      expiresAt: Date.now() + ACTIVE_HOST_CACHE_TTL_MS,
      value: null,
    });
    return null;
  }

  const surface: ActiveCustomDomainResolution['surface'] =
    mode === 'SITE_WITH_MENU_SUBDOMAIN' && hostname !== row.menuHostname ? 'LANDING' : 'MENU';
  const resolution: ActiveCustomDomainResolution = {
    hostname,
    restaurantId: row.restaurant.id,
    restaurantName: row.restaurant.name,
    restaurantSlug: row.restaurant.slug,
    mode,
    surface,
    canonicalHost: surface === 'LANDING' ? row.hostname : row.menuHostname || row.hostname,
    menuHost: row.menuHostname || row.hostname,
  };
  activeHostCache.set(hostname, {
    expiresAt: Date.now() + ACTIVE_HOST_CACHE_TTL_MS,
    value: resolution,
  });
  return resolution;
}

export async function isActiveCustomDomainOrigin(originValue: unknown) {
  const raw = String(originValue || '').trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return false;
    return Boolean(await resolveActiveCustomDomain(url.hostname));
  } catch {
    return false;
  }
}

export async function resolveRestaurantMenuBaseUrl(restaurantIdValue: unknown) {
  const restaurantId = Number(restaurantIdValue);
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) return null;

  const row = await prisma.restaurantCustomDomain.findUnique({
    where: { restaurantId },
    include: {
      restaurant: {
        select: {
          active: true,
          subscription: { select: { plan: true, status: true } },
        },
      },
    },
  });
  if (
    !row ||
    row.status !== 'ACTIVE' ||
    !row.restaurant.active ||
    !customDomainPlanEligible(row.restaurant.subscription?.plan, row.restaurant.subscription?.status)
  ) {
    return null;
  }

  const host =
    row.mode === 'SITE_WITH_MENU_SUBDOMAIN' ? row.menuHostname : row.hostname;
  return host ? `https://${host}` : null;
}
