import { domainToASCII } from 'node:url';
import type { PlanType, SubscriptionStatus } from '@prisma/client';
import { hasCustomDomainAccess } from '../../billing/domain/planFeaturePolicy.js';
import { SuperAdminError } from '../../superAdmin/domain/superAdminErrors.js';

export const CUSTOM_DOMAIN_MODES = ['MENU_ONLY', 'SITE_WITH_MENU_SUBDOMAIN'] as const;
export type CustomDomainMode = (typeof CUSTOM_DOMAIN_MODES)[number];

export function customDomainPlanEligible(
  plan: PlanType | null | undefined,
  status: SubscriptionStatus | null | undefined,
) {
  return hasCustomDomainAccess(plan, status);
}

function platformHostnames() {
  const values = [
    process.env.APP_DOMAIN,
    process.env.API_DOMAIN,
    process.env.FRONTEND_URL,
    process.env.BACKEND_URL,
    process.env.PUBLIC_APP_URL,
  ];
  const hosts = new Set<string>();
  for (const value of values) {
    const raw = String(value || '').trim();
    if (!raw) continue;
    try {
      const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
      const ascii = domainToASCII(url.hostname).toLowerCase();
      if (ascii) hosts.add(ascii);
    } catch {
      // Invalid deployment values are handled by startup validation.
    }
  }
  return hosts;
}

export function normalizeCustomHostname(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) throw new SuperAdminError('Informe o domínio.', 400, 'INVALID_CUSTOM_DOMAIN');

  let url: URL;
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    throw new SuperAdminError('Domínio inválido.', 400, 'INVALID_CUSTOM_DOMAIN');
  }

  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    url.port ||
    (url.pathname && url.pathname !== '/') ||
    url.search ||
    url.hash
  ) {
    throw new SuperAdminError(
      'Informe somente o domínio, sem caminho, porta, usuário ou parâmetros.',
      400,
      'INVALID_CUSTOM_DOMAIN',
    );
  }

  const hostname = domainToASCII(url.hostname.replace(/\.$/u, '')).toLowerCase();
  if (
    !hostname ||
    hostname.length > 253 ||
    hostname === 'localhost' ||
    /^[0-9.]+$/u.test(hostname) ||
    hostname.includes(':') ||
    hostname.startsWith('*.') ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(
      hostname,
    )
  ) {
    throw new SuperAdminError('Domínio público inválido.', 400, 'INVALID_CUSTOM_DOMAIN');
  }

  const reserved = platformHostnames();
  if (
    [...reserved].some(
      (platformHost) =>
        hostname === platformHost ||
        hostname.endsWith(`.${platformHost}`) ||
        platformHost.endsWith(`.${hostname}`),
    )
  ) {
    throw new SuperAdminError(
      'O domínio da própria plataforma não pode ser cadastrado como domínio de restaurante.',
      409,
      'PLATFORM_DOMAIN_RESERVED',
    );
  }

  return hostname;
}

export function buildMenuHostname(rootHostname: string, mode: CustomDomainMode, subdomain?: unknown) {
  if (mode === 'MENU_ONLY') return null;
  const label = String(subdomain || 'cardapio')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label)) {
    throw new SuperAdminError(
      'Subdomínio do cardápio inválido. Use letras, números e hífen.',
      400,
      'INVALID_MENU_SUBDOMAIN',
    );
  }
  return `${label}.${rootHostname}`;
}

export function verificationRecordName(hostname: string) {
  return `_gastronexa.${hostname}`;
}

export function verificationRecordValue(token: string) {
  return `gastronexa-domain-verification=${token}`;
}

export function customDomainPublicHosts(input: {
  hostname: string;
  menuHostname: string | null;
  mode: CustomDomainMode;
  includeWww: boolean;
  landingPublished?: boolean;
}) {
  if (input.mode === 'SITE_WITH_MENU_SUBDOMAIN') {
    return [
      ...(input.menuHostname ? [input.menuHostname] : []),
      ...(input.landingPublished
        ? [
            input.hostname,
            ...(input.includeWww && !input.hostname.startsWith('www.')
              ? [`www.${input.hostname}`]
              : []),
          ]
        : []),
    ];
  }
  return [
    input.hostname,
    ...(input.includeWww && !input.hostname.startsWith('www.')
      ? [`www.${input.hostname}`]
      : []),
  ];
}
