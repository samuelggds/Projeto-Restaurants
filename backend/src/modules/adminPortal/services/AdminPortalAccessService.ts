import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import prisma from '../../../config/prisma.js';
import { getJwtSecret } from '../../../config/auth.js';

const ROTATED_ACTION = 'ADMIN_PORTAL_KEY_ROTATED';
const REVOKED_ACTION = 'ADMIN_PORTAL_KEY_REVOKED';
const GRANT_TTL: SignOptions['expiresIn'] = '10m';

export class AdminPortalAccessError extends Error {
  constructor(
    message: string,
    readonly statusCode = 404,
    readonly code = 'ADMIN_PORTAL_NOT_FOUND',
  ) {
    super(message);
    this.name = 'AdminPortalAccessError';
  }
}

type AuditContext = {
  actorUserId: number;
  ipAddress?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
};

type AdminPortalMetadata = {
  keyHash?: string;
};

type AdminPortalGrantPayload = jwt.JwtPayload & {
  type?: string;
  restaurantId?: number;
  slug?: string;
  rotationAuditLogId?: number;
};

function normalizeSlug(value: unknown) {
  const slug = String(value || '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,100}$/u.test(slug) ? slug : '';
}

function normalizeKey(value: unknown) {
  const key = String(value || '').trim();
  return /^[A-Za-z0-9_-]{32,128}$/u.test(key) ? key : '';
}

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function safeEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/u.test(left) || !/^[a-f0-9]{64}$/u.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

async function latestPortalEvent(restaurantId: number) {
  return prisma.auditLog.findFirst({
    where: {
      restaurantId,
      action: { in: [ROTATED_ACTION, REVOKED_ACTION] },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

async function assertCurrentRotation(restaurantId: number, rotationAuditLogId: number) {
  const latest = await latestPortalEvent(restaurantId);
  if (!latest || latest.action !== ROTATED_ACTION || latest.id !== rotationAuditLogId) {
    throw new AdminPortalAccessError('Acesso administrativo indisponível.');
  }
  return latest;
}

export class AdminPortalAccessService {
  async rotate(restaurantId: number, context: AuditContext) {
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new AdminPortalAccessError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, slug: true },
    });
    if (!restaurant) {
      throw new AdminPortalAccessError('Restaurante não encontrado.');
    }

    const key = crypto.randomBytes(32).toString('base64url');
    const keyHash = hashKey(key);

    const audit = await prisma.auditLog.create({
      data: {
        userId: context.actorUserId,
        userRole: 'SUPER_ADMIN',
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        action: ROTATED_ACTION,
        resource: `Restaurant:${restaurant.id}:admin-portal`,
        ipAddress: context.ipAddress || null,
        requestId: context.requestId || null,
        userAgent: context.userAgent || null,
        metadata: { keyHash },
      },
      select: { id: true },
    });

    return {
      restaurantId: restaurant.id,
      slug: restaurant.slug,
      key,
      rotationId: audit.id,
    };
  }

  async revoke(restaurantId: number, context: AuditContext) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true },
    });
    if (!restaurant) throw new AdminPortalAccessError('Restaurante não encontrado.');

    await prisma.auditLog.create({
      data: {
        userId: context.actorUserId,
        userRole: 'SUPER_ADMIN',
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        action: REVOKED_ACTION,
        resource: `Restaurant:${restaurant.id}:admin-portal`,
        ipAddress: context.ipAddress || null,
        requestId: context.requestId || null,
        userAgent: context.userAgent || null,
        metadata: { revokedAt: new Date().toISOString() },
      },
    });

    return { revoked: true };
  }

  async exchange(slugInput: unknown, keyInput: unknown) {
    const slug = normalizeSlug(slugInput);
    const key = normalizeKey(keyInput);
    if (!slug || !key) throw new AdminPortalAccessError('Página não encontrada.');

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, slug: true, active: true },
    });
    if (!restaurant?.active) throw new AdminPortalAccessError('Página não encontrada.');

    const latest = await latestPortalEvent(restaurant.id);
    if (!latest || latest.action !== ROTATED_ACTION) {
      throw new AdminPortalAccessError('Página não encontrada.');
    }

    const metadata = (latest.metadata || {}) as AdminPortalMetadata;
    const expectedHash = String(metadata.keyHash || '');
    if (!expectedHash || !safeEqual(expectedHash, hashKey(key))) {
      throw new AdminPortalAccessError('Página não encontrada.');
    }

    const grant = jwt.sign(
      {
        type: 'admin_portal_grant',
        restaurantId: restaurant.id,
        slug: restaurant.slug,
        rotationAuditLogId: latest.id,
      },
      getJwtSecret(),
      { expiresIn: GRANT_TTL },
    );

    return { grant, restaurantId: restaurant.id, slug: restaurant.slug, expiresInSeconds: 600 };
  }

  async verifyGrant(slugInput: unknown, grantInput: unknown) {
    const slug = normalizeSlug(slugInput);
    const grant = String(grantInput || '').trim();
    if (!slug || !grant) throw new AdminPortalAccessError('Página não encontrada.');

    let decoded: AdminPortalGrantPayload;
    try {
      const verified = jwt.verify(grant, getJwtSecret());
      if (!verified || typeof verified === 'string') throw new Error('invalid');
      decoded = verified as AdminPortalGrantPayload;
    } catch {
      throw new AdminPortalAccessError('Página não encontrada.');
    }

    const restaurantId = Number(decoded.restaurantId || 0);
    const rotationAuditLogId = Number(decoded.rotationAuditLogId || 0);
    if (
      decoded.type !== 'admin_portal_grant' ||
      decoded.slug !== slug ||
      !Number.isInteger(restaurantId) ||
      restaurantId <= 0 ||
      !Number.isInteger(rotationAuditLogId) ||
      rotationAuditLogId <= 0
    ) {
      throw new AdminPortalAccessError('Página não encontrada.');
    }

    await assertCurrentRotation(restaurantId, rotationAuditLogId);
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, slug: true, active: true },
    });
    if (!restaurant?.active || restaurant.slug !== slug) {
      throw new AdminPortalAccessError('Página não encontrada.');
    }

    return { valid: true, restaurantId: restaurant.id, slug: restaurant.slug };
  }
}

export default new AdminPortalAccessService();
