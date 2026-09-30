// @ts-nocheck
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test, { afterEach, beforeEach } from 'node:test';
import jwt from 'jsonwebtoken';
import prisma from '../../../config/prisma.js';
import service, { ADMIN_PORTAL_GRANT_TTL_SECONDS } from './AdminPortalAccessService.js';

const originalRestaurantFindUnique = prisma.restaurant.findUnique;
const originalAuditFindFirst = prisma.auditLog.findFirst;
const originalJwtSecret = process.env.JWT_SECRET;

beforeEach(() => {
  process.env.JWT_SECRET = 'admin-portal-unit-test-secret-only';
});

afterEach(() => {
  prisma.restaurant.findUnique = originalRestaurantFindUnique;
  prisma.auditLog.findFirst = originalAuditFindFirst;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

test('emite grant administrativo do tenant por exatamente uma semana', async () => {
  const key = 'a'.repeat(43);
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  prisma.restaurant.findUnique = async ({ where }) => {
    assert.equal(where.slug, 'north-pizza');
    return {
      id: 7,
      slug: 'north-pizza',
      active: true,
    };
  };

  prisma.auditLog.findFirst = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    return {
      id: 91,
      action: 'ADMIN_PORTAL_KEY_ROTATED',
      metadata: { keyHash },
      createdAt: new Date(),
    };
  };

  const result = await service.exchange('north-pizza', key);
  const decoded = jwt.decode(result.grant);

  assert.equal(result.restaurantId, 7);
  assert.equal(result.slug, 'north-pizza');
  assert.equal(result.expiresInSeconds, 7 * 24 * 60 * 60);
  assert.equal(result.expiresInSeconds, ADMIN_PORTAL_GRANT_TTL_SECONDS);
  assert.equal(decoded?.type, 'admin_portal_grant');
  assert.equal(decoded?.restaurantId, 7);
  assert.equal(decoded?.slug, 'north-pizza');
  assert.equal(Number(decoded?.exp) - Number(decoded?.iat), ADMIN_PORTAL_GRANT_TTL_SECONDS);
});


test('verify devolve a expiração validada do grant do mesmo tenant', async () => {
  const key = 'b'.repeat(43);
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  prisma.restaurant.findUnique = async ({ where }) => ({
    id: where.slug ? 8 : where.id,
    slug: 'sushi-house',
    active: true,
  });
  prisma.auditLog.findFirst = async () => ({
    id: 101,
    action: 'ADMIN_PORTAL_KEY_ROTATED',
    metadata: { keyHash },
    createdAt: new Date(),
  });

  const exchanged = await service.exchange('sushi-house', key);
  const decoded = jwt.decode(exchanged.grant);
  const verified = await service.verifyGrant('sushi-house', exchanged.grant);

  assert.equal(verified.restaurantId, 8);
  assert.equal(verified.slug, 'sushi-house');
  assert.equal(verified.expiresAt, new Date(Number(decoded?.exp) * 1000).toISOString());
});
