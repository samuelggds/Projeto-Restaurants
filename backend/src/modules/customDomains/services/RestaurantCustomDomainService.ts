import { randomBytes } from 'node:crypto';
import { resolve4, resolveCname, resolveTxt } from 'node:dns/promises';
import prisma from '../../../config/prisma.js';
import { buildAuditMetadata } from '../../superAdmin/domain/auditMetadata.js';
import { notFound, SuperAdminError } from '../../superAdmin/domain/superAdminErrors.js';
import type { AuditContext } from '../../superAdmin/repositories/SuperAdminRepository.js';
import superAdminRepository from '../../superAdmin/repositories/SuperAdminRepository.js';
import { requireSuperAdminActor } from '../../superAdmin/services/superAdminServiceSupport.js';
import {
  buildMenuHostname,
  customDomainPlanEligible,
  customDomainPublicHosts,
  normalizeCustomHostname,
  verificationRecordName,
  verificationRecordValue,
  type CustomDomainMode,
} from '../domain/customDomainPolicy.js';

type CustomDomainPayload = {
  hostname?: unknown;
  mode?: unknown;
  menuSubdomain?: unknown;
  includeWww?: unknown;
  landingPublished?: unknown;
};

function parseRestaurantId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SuperAdminError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
  }
  return id;
}

function parseMode(value: unknown): CustomDomainMode {
  const mode = String(value || 'MENU_ONLY').trim().toUpperCase();
  if (mode !== 'MENU_ONLY' && mode !== 'SITE_WITH_MENU_SUBDOMAIN') {
    throw new SuperAdminError('Modo de domínio inválido.', 400, 'INVALID_CUSTOM_DOMAIN_MODE');
  }
  return mode;
}

function present(record: {
  id: string;
  restaurantId: number;
  hostname: string;
  mode: string;
  menuHostname: string | null;
  includeWww: boolean;
  landingPublished: boolean;
  status: string;
  verificationToken: string;
  dnsVerifiedAt: Date | null;
  activatedAt: Date | null;
  disabledAt: Date | null;
  lastCheckedAt: Date | null;
  lastCheckError: string | null;
  createdAt: Date;
  updatedAt: Date;
}, subscription?: { plan: string; status: string } | null, landingRequested = false) {
  const target = String(process.env.CUSTOM_DOMAIN_CNAME_TARGET ||
    process.env.APP_DOMAIN ||
    process.env.FRONTEND_URL ||
    '')
    .trim()
    .replace(/^https?:\/\//u, '')
    .replace(/\/+$/u, '');
  const edgeIpv4 = String(process.env.CUSTOM_DOMAIN_EDGE_IPV4 || '').trim();
  const mode = record.mode as CustomDomainMode;
  return {
    id: record.id,
    restaurantId: record.restaurantId,
    hostname: record.hostname,
    mode,
    menuHostname: record.menuHostname,
    includeWww: record.includeWww,
    landingPublished: record.landingPublished,
    landingRequested,
    status: record.status,
    planEligible: customDomainPlanEligible(
      subscription?.plan as never,
      subscription?.status as never,
    ),
    publicHosts: customDomainPublicHosts({
      hostname: record.hostname,
      menuHostname: record.menuHostname,
      mode,
      includeWww: record.includeWww,
      landingPublished: record.landingPublished && landingRequested,
    }),
    verification: {
      type: 'TXT',
      name: verificationRecordName(record.hostname),
      value: verificationRecordValue(record.verificationToken),
    },
    routing:
      mode === 'SITE_WITH_MENU_SUBDOMAIN'
        ? {
            type: 'CNAME',
            name: record.menuHostname,
            value: target || null,
            note: record.landingPublished && landingRequested
              ? 'O cardápio usa CNAME e a landing usa o domínio principal no gateway GastroNexa.'
              : 'O domínio principal permanece livre. Apenas o subdomínio do cardápio aponta para a GastroNexa.',
          }
        : {
            type: 'A',
            name: record.hostname,
            value: edgeIpv4 || null,
            wwwCname: record.includeWww ? record.hostname : null,
            note: edgeIpv4
              ? 'Aponte o domínio principal para o IP do gateway GastroNexa.'
              : 'Configure CUSTOM_DOMAIN_EDGE_IPV4 no ambiente de produção antes de publicar domínios no apex.',
          },
    landingRouting:
      mode === 'SITE_WITH_MENU_SUBDOMAIN' && record.landingPublished && landingRequested
        ? {
            type: 'A',
            name: record.hostname,
            value: edgeIpv4 || null,
            wwwCname: record.includeWww ? record.hostname : null,
            note: edgeIpv4
              ? 'Landing autorizada: aponte o domínio principal para o IP do gateway GastroNexa.'
              : 'Configure CUSTOM_DOMAIN_EDGE_IPV4 antes de publicar a landing.',
          }
        : null,
    dnsVerifiedAt: record.dnsVerifiedAt?.toISOString() || null,
    activatedAt: record.activatedAt?.toISOString() || null,
    disabledAt: record.disabledAt?.toISOString() || null,
    lastCheckedAt: record.lastCheckedAt?.toISOString() || null,
    lastCheckError: record.lastCheckError,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function restaurantWithSubscription(restaurantId: number) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      active: true,
      settings: { select: { landingPageEnabled: true } },
      subscription: { select: { plan: true, status: true } },
    },
  });
  if (!restaurant) throw notFound('Restaurante não encontrado.');
  return restaurant;
}

async function assertEligible(restaurantId: number) {
  const restaurant = await restaurantWithSubscription(restaurantId);
  if (
    !restaurant.active ||
    !customDomainPlanEligible(restaurant.subscription?.plan, restaurant.subscription?.status)
  ) {
    throw new SuperAdminError(
      'Domínio personalizado está disponível somente para restaurantes ativos nos planos Premium ou Gestão Total.',
      403,
      'CUSTOM_DOMAIN_PLAN_REQUIRED',
    );
  }
  return restaurant;
}

async function checkTxt(hostname: string, token: string) {
  const expected = verificationRecordValue(token);
  try {
    const records = await resolveTxt(verificationRecordName(hostname));
    return records.some((parts) => parts.join('') === expected);
  } catch {
    return false;
  }
}

async function checkRouting(record: {
  hostname: string;
  mode: string;
  menuHostname: string | null;
  landingPublished: boolean;
}) {
  const expectedIpv4 = String(process.env.CUSTOM_DOMAIN_EDGE_IPV4 || '').trim();

  const checkApex = async () => {
    if (!expectedIpv4) {
      return { ok: false, reason: 'IP público do gateway não está configurado no ambiente.' };
    }
    try {
      const values = await resolve4(record.hostname);
      return values.includes(expectedIpv4)
        ? { ok: true, reason: null }
        : {
            ok: false,
            reason: `O registro A de ${record.hostname} ainda não aponta para o gateway GastroNexa.`,
          };
    } catch {
      return {
        ok: false,
        reason: `O registro A de ${record.hostname} ainda não foi encontrado.`,
      };
    }
  };

  if (record.mode === 'SITE_WITH_MENU_SUBDOMAIN') {
    const target = String(
      process.env.CUSTOM_DOMAIN_CNAME_TARGET ||
        process.env.APP_DOMAIN ||
        process.env.FRONTEND_URL ||
        '',
    )
      .trim()
      .replace(/^https?:\/\//u, '')
      .replace(/\/+$/u, '')
      .toLowerCase();
    if (!target || !record.menuHostname) {
      return { ok: false, reason: 'Destino CNAME da GastroNexa não está configurado no ambiente.' };
    }
    try {
      const values = (await resolveCname(record.menuHostname)).map((value) =>
        value.replace(/\.$/u, '').toLowerCase(),
      );
      if (!values.includes(target)) {
        return {
          ok: false,
          reason: `O CNAME de ${record.menuHostname} ainda não aponta para ${target}.`,
        };
      }
    } catch {
      return {
        ok: false,
        reason: `O CNAME de ${record.menuHostname} ainda não foi encontrado.`,
      };
    }
    return record.landingPublished ? checkApex() : { ok: true, reason: null };
  }

  return checkApex();
}

export class RestaurantCustomDomainService {
  async list() {
    const rows = await prisma.restaurantCustomDomain.findMany({
      orderBy: [{ status: 'asc' }, { hostname: 'asc' }],
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
    return rows.map((row) => ({
      ...present(
        row,
        row.restaurant.subscription,
        row.restaurant.settings?.landingPageEnabled === true,
      ),
      restaurant: {
        id: row.restaurant.id,
        name: row.restaurant.name,
        slug: row.restaurant.slug,
        active: row.restaurant.active,
        planCode: row.restaurant.subscription?.plan || null,
        subscriptionStatus: row.restaurant.subscription?.status || null,
      },
    }));
  }

  async get(restaurantIdValue: unknown) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const [row, restaurant] = await Promise.all([
      prisma.restaurantCustomDomain.findUnique({ where: { restaurantId } }),
      restaurantWithSubscription(restaurantId),
    ]);
    return row
      ? present(row, restaurant.subscription, restaurant.settings?.landingPageEnabled === true)
      : null;
  }

  async save(restaurantIdValue: unknown, payload: CustomDomainPayload, context: AuditContext) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const restaurant = await assertEligible(restaurantId);
    const hostname = normalizeCustomHostname(payload.hostname);
    const mode = parseMode(payload.mode);
    const menuHostname = buildMenuHostname(hostname, mode, payload.menuSubdomain);
    const includeWww = payload.includeWww !== false;
    const landingPublished = mode === 'SITE_WITH_MENU_SUBDOMAIN' && payload.landingPublished === true;
    if (landingPublished && restaurant.settings?.landingPageEnabled !== true) {
      throw new SuperAdminError(
        'O ADMIN ainda não solicitou uma landing page para este restaurante.',
        409,
        'LANDING_PAGE_NOT_REQUESTED',
      );
    }
    const current = await prisma.restaurantCustomDomain.findUnique({ where: { restaurantId } });
    const identityChanged =
      !current ||
      current.hostname !== hostname ||
      current.mode !== mode ||
      current.menuHostname !== menuHostname ||
      current.landingPublished !== landingPublished;

    try {
      return await prisma.$transaction(async (tx) => {
        const actor = await requireSuperAdminActor(superAdminRepository, context, tx);

        // One registry-wide transaction lock prevents concurrent SUPER_ADMIN writes
        // from reserving the same host through different columns (hostname/menuHostname).
        await tx.$queryRaw<Array<{ locked: number }>>`
          SELECT 1::int AS "locked"
          FROM pg_advisory_xact_lock(7243)
        `;

        const reservedHosts = new Set([
          hostname,
          ...(menuHostname ? [menuHostname] : []),
          ...(mode === 'MENU_ONLY' && includeWww && !hostname.startsWith('www.')
            ? [`www.${hostname}`]
            : []),
        ]);
        const otherDomains = await tx.restaurantCustomDomain.findMany({
          where: { restaurantId: { not: restaurantId } },
          select: {
            hostname: true,
            menuHostname: true,
            includeWww: true,
            mode: true,
          },
        });
        const collision = otherDomains.some((domain) => {
          const occupied = new Set([
            domain.hostname,
            ...(domain.menuHostname ? [domain.menuHostname] : []),
            ...(domain.mode === 'MENU_ONLY' &&
            domain.includeWww &&
            !domain.hostname.startsWith('www.')
              ? [`www.${domain.hostname}`]
              : []),
          ]);
          return [...reservedHosts].some((host) => occupied.has(host));
        });
        if (collision) {
          throw new SuperAdminError(
            'Este domínio, subdomínio ou alias www já está vinculado a outro restaurante.',
            409,
            'CUSTOM_DOMAIN_CONFLICT',
          );
        }

        const verificationToken =
          !current || identityChanged
            ? randomBytes(24).toString('base64url')
            : current.verificationToken;
        const after = await tx.restaurantCustomDomain.upsert({
          where: { restaurantId },
          create: {
            restaurantId,
            hostname,
            mode,
            menuHostname,
            includeWww,
            landingPublished,
            verificationToken,
            status: 'PENDING_DNS',
            createdByUserId: actor.id,
            updatedByUserId: actor.id,
          },
          update: {
            hostname,
            mode,
            menuHostname,
            includeWww,
            landingPublished,
            verificationToken,
            updatedByUserId: actor.id,
            ...(identityChanged
              ? {
                  status: 'PENDING_DNS',
                  dnsVerifiedAt: null,
                  activatedAt: null,
                  disabledAt: null,
                  lastCheckedAt: null,
                  lastCheckError: null,
                }
              : {}),
          },
        });

        await superAdminRepository.createAuditLog(
          {
            ...context,
            actorName: actor.name,
            actorRole: actor.role,
            restaurantId,
            restaurantName: restaurant.name,
            action: current ? 'CUSTOM_DOMAIN_UPDATED' : 'CUSTOM_DOMAIN_CREATED',
            resource: `RestaurantCustomDomain:${after.id}`,
            metadata: buildAuditMetadata({
              before: current
                ? {
                    hostname: current.hostname,
                    mode: current.mode,
                    menuHostname: current.menuHostname,
                    includeWww: current.includeWww,
                    landingPublished: current.landingPublished,
                    status: current.status,
                  }
                : null,
              after: {
                hostname: after.hostname,
                mode: after.mode,
                menuHostname: after.menuHostname,
                includeWww: after.includeWww,
                landingPublished: after.landingPublished,
                status: after.status,
              },
            }),
          },
          tx,
        );
        return present(
          after,
          restaurant.subscription,
          restaurant.settings?.landingPageEnabled === true,
        );
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        String((error as { code?: unknown }).code) === 'P2002'
      ) {
        throw new SuperAdminError(
          'Este domínio ou subdomínio já está vinculado a outro restaurante.',
          409,
          'CUSTOM_DOMAIN_CONFLICT',
        );
      }
      throw error;
    }
  }

  async verify(restaurantIdValue: unknown, context: AuditContext) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const restaurant = await assertEligible(restaurantId);
    const current = await prisma.restaurantCustomDomain.findUnique({ where: { restaurantId } });
    if (!current) throw notFound('Domínio personalizado não configurado.');

    const ownershipVerified = await checkTxt(current.hostname, current.verificationToken);
    const routing = await checkRouting(current);
    const verified = ownershipVerified && routing.ok;
    const failureReason = !ownershipVerified
      ? 'Registro TXT de verificação ainda não encontrado.'
      : routing.reason;
    const now = new Date();
    const after = await prisma.$transaction(async (tx) => {
      const actor = await requireSuperAdminActor(superAdminRepository, context, tx);
      const updated = await tx.restaurantCustomDomain.update({
        where: { restaurantId },
        data: verified
          ? {
              status: current.status === 'ACTIVE' ? 'ACTIVE' : 'DNS_VERIFIED',
              dnsVerifiedAt: now,
              lastCheckedAt: now,
              lastCheckError: null,
              updatedByUserId: actor.id,
            }
          : {
              status: 'PENDING_DNS',
              dnsVerifiedAt: null,
              activatedAt: null,
              lastCheckedAt: now,
              lastCheckError: failureReason || 'DNS ainda não está pronto.',
              updatedByUserId: actor.id,
            },
      });
      await superAdminRepository.createAuditLog(
        {
          ...context,
          actorName: actor.name,
          actorRole: actor.role,
          restaurantId,
          restaurantName: restaurant.name,
          action: verified ? 'CUSTOM_DOMAIN_DNS_VERIFIED' : 'CUSTOM_DOMAIN_DNS_CHECK_FAILED',
          resource: `RestaurantCustomDomain:${updated.id}`,
          metadata: buildAuditMetadata({
            after: {
              hostname: updated.hostname,
              mode: updated.mode,
              menuHostname: updated.menuHostname,
              status: updated.status,
              verified,
            },
          }),
        },
        tx,
      );
      return updated;
    });

    if (!verified) {
      throw new SuperAdminError(
        failureReason || 'Os registros DNS ainda não estão prontos.',
        409,
        'CUSTOM_DOMAIN_DNS_NOT_VERIFIED',
      );
    }
    return present(
          after,
          restaurant.subscription,
          restaurant.settings?.landingPageEnabled === true,
        );
  }

  async activate(restaurantIdValue: unknown, context: AuditContext) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const restaurant = await assertEligible(restaurantId);
    const actor = await superAdminRepository.findActor(context.actorUserId);
    if (!actor) {
      throw new SuperAdminError(
        'SUPER_ADMIN não encontrado ou inativo.',
        403,
        'ACTOR_FORBIDDEN',
      );
    }
    const current = await prisma.restaurantCustomDomain.findUnique({ where: { restaurantId } });
    if (!current) throw notFound('Domínio personalizado não configurado.');
    if (!current.dnsVerifiedAt) {
      throw new SuperAdminError(
        'Verifique o registro TXT antes de ativar o domínio.',
        409,
        'CUSTOM_DOMAIN_DNS_NOT_VERIFIED',
      );
    }

    const [ownershipVerified, routing] = await Promise.all([
      checkTxt(current.hostname, current.verificationToken),
      checkRouting(current),
    ]);
    if (!ownershipVerified || !routing.ok) {
      const failureReason = !ownershipVerified
        ? 'O TXT de verificação não está mais publicado.'
        : routing.reason || 'O roteamento DNS não está mais apontando para a GastroNexa.';
      await prisma.$transaction(async (tx) => {
        const verifiedActor = await requireSuperAdminActor(superAdminRepository, context, tx);
        const updated = await tx.restaurantCustomDomain.update({
          where: { restaurantId },
          data: {
            status: 'PENDING_DNS',
            dnsVerifiedAt: null,
            activatedAt: null,
            lastCheckedAt: new Date(),
            lastCheckError: failureReason,
            updatedByUserId: verifiedActor.id,
          },
        });
        await superAdminRepository.createAuditLog(
          {
            ...context,
            actorName: verifiedActor.name,
            actorRole: verifiedActor.role,
            restaurantId,
            restaurantName: restaurant.name,
            action: 'CUSTOM_DOMAIN_ACTIVATION_BLOCKED',
            resource: `RestaurantCustomDomain:${updated.id}`,
            metadata: buildAuditMetadata({
              before: { status: current.status },
              after: { status: updated.status, reason: failureReason },
            }),
          },
          tx,
        );
      });
      throw new SuperAdminError(
        failureReason,
        409,
        'CUSTOM_DOMAIN_DNS_NOT_VERIFIED',
      );
    }

    if (current.mode === 'SITE_WITH_MENU_SUBDOMAIN' && !current.menuHostname) {
      throw new SuperAdminError('Subdomínio do cardápio não configurado.', 409, 'MENU_HOST_MISSING');
    }
    if (current.mode === 'MENU_ONLY' && !String(process.env.CUSTOM_DOMAIN_EDGE_IPV4 || '').trim()) {
      throw new SuperAdminError(
        'CUSTOM_DOMAIN_EDGE_IPV4 precisa estar configurado no ambiente antes de publicar um domínio principal.',
        503,
        'CUSTOM_DOMAIN_EDGE_NOT_CONFIGURED',
      );
    }

    const now = new Date();
    const after = await prisma.$transaction(async (tx) => {
      const actor = await requireSuperAdminActor(superAdminRepository, context, tx);
      const updated = await tx.restaurantCustomDomain.update({
        where: { restaurantId },
        data: {
          status: 'ACTIVE',
          activatedAt: now,
          disabledAt: null,
          lastCheckError: null,
          updatedByUserId: actor.id,
        },
      });
      await superAdminRepository.createAuditLog(
        {
          ...context,
          actorName: actor.name,
          actorRole: actor.role,
          restaurantId,
          restaurantName: restaurant.name,
          action: 'CUSTOM_DOMAIN_ACTIVATED',
          resource: `RestaurantCustomDomain:${updated.id}`,
          metadata: buildAuditMetadata({
            after: {
              hostname: updated.hostname,
              mode: updated.mode,
              menuHostname: updated.menuHostname,
              status: updated.status,
            },
          }),
        },
        tx,
      );
      return updated;
    });
    return present(
          after,
          restaurant.subscription,
          restaurant.settings?.landingPageEnabled === true,
        );
  }

  async disable(restaurantIdValue: unknown, context: AuditContext) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const restaurant = await restaurantWithSubscription(restaurantId);
    const current = await prisma.restaurantCustomDomain.findUnique({ where: { restaurantId } });
    if (!current) throw notFound('Domínio personalizado não configurado.');
    const now = new Date();
    const after = await prisma.$transaction(async (tx) => {
      const actor = await requireSuperAdminActor(superAdminRepository, context, tx);
      const updated = await tx.restaurantCustomDomain.update({
        where: { restaurantId },
        data: {
          status: 'DISABLED',
          disabledAt: now,
          updatedByUserId: actor.id,
        },
      });
      await superAdminRepository.createAuditLog(
        {
          ...context,
          actorName: actor.name,
          actorRole: actor.role,
          restaurantId,
          restaurantName: restaurant.name,
          action: 'CUSTOM_DOMAIN_DISABLED',
          resource: `RestaurantCustomDomain:${updated.id}`,
          metadata: buildAuditMetadata({
            before: { status: current.status },
            after: { status: updated.status },
          }),
        },
        tx,
      );
      return updated;
    });
    return present(
          after,
          restaurant.subscription,
          restaurant.settings?.landingPageEnabled === true,
        );
  }
}

export default new RestaurantCustomDomainService();
