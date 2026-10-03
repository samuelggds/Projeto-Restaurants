import prisma from '../../../config/prisma.js';
import {
  customDomainPlanEligible,
  customDomainPublicHosts,
  normalizeCustomHostname,
  type CustomDomainMode,
} from '../domain/customDomainPolicy.js';

export async function resolveActiveCustomDomain(hostnameValue: unknown) {
  let hostname: string;
  try {
    hostname = normalizeCustomHostname(hostnameValue);
  } catch {
    return null;
  }

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
    return null;
  }

  const mode = row.mode as CustomDomainMode;
  const allowedHosts = customDomainPublicHosts({
    hostname: row.hostname,
    menuHostname: row.menuHostname,
    mode,
    includeWww: row.includeWww,
  });
  if (!allowedHosts.includes(hostname)) return null;

  return {
    hostname,
    restaurantId: row.restaurant.id,
    restaurantName: row.restaurant.name,
    restaurantSlug: row.restaurant.slug,
    mode,
    canonicalHost: mode === 'SITE_WITH_MENU_SUBDOMAIN' ? row.menuHostname : row.hostname,
  };
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
