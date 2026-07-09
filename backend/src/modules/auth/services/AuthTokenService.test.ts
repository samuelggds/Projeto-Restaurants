// @ts-nocheck
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import prisma from "../../../config/prisma.js";
import authTokenService from "./AuthTokenService.js";
import { getJwtRefreshSecret, getJwtSecret } from "../../../config/auth.js";

const originalFindUnique = prisma.authRefreshSession.findUnique;
const originalUpsert = prisma.authRefreshSession.upsert;
const originalDeleteMany = prisma.authRefreshSession.deleteMany;
const originalJwtSecret = process.env.JWT_SECRET;
const originalJwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

const refreshSessions = new Map();

function getSafeRefreshSecret() {
  return getJwtRefreshSecret() || getJwtSecret();
}

afterEach(() => {
  prisma.authRefreshSession.findUnique = originalFindUnique;
  prisma.authRefreshSession.upsert = originalUpsert;
  prisma.authRefreshSession.deleteMany = originalDeleteMany;
  refreshSessions.clear();
  process.env.JWT_SECRET = originalJwtSecret;
  process.env.JWT_REFRESH_SECRET = originalJwtRefreshSecret;
});

function installSessionPrismaMocks() {
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "test_jwt_secret_with_minimum_32_chars_123456";
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ||
    "test_refresh_secret_with_minimum_32_chars_654321";

  prisma.authRefreshSession.findUnique = async ({ where }) => {
    return refreshSessions.get(Number(where.userId)) || null;
  };

  prisma.authRefreshSession.upsert = async ({ where, create, update }) => {
    const userId = Number(where.userId);
    const next = {
      userId,
      ...(refreshSessions.get(userId) || {}),
      ...(refreshSessions.has(userId) ? update : create),
    };
    refreshSessions.set(userId, next);
    return next;
  };

  prisma.authRefreshSession.deleteMany = async ({ where }) => {
    const userId = Number(where.userId);
    const existing = refreshSessions.get(userId);
    if (existing && String(existing.jti) === String(where.jti)) {
      refreshSessions.delete(userId);
      return { count: 1 };
    }

    return { count: 0 };
  };
}

test("deve rotacionar refresh token e invalidar o token anterior", async () => {
  installSessionPrismaMocks();

  const payload = { id: 77, role: "ADMIN", restaurantId: 1 };
  const refreshToken = await authTokenService.createRefreshToken(payload);
  const firstRotation = await authTokenService.rotateRefreshToken(refreshToken);

  assert.ok(firstRotation.accessToken);
  assert.ok(firstRotation.refreshToken);
  assert.notEqual(firstRotation.refreshToken, refreshToken);

  await assert.rejects(
    () => authTokenService.rotateRefreshToken(refreshToken),
    /Refresh token expirado|Refresh token invalido/,
  );
});

test("logout deve revogar refresh token atual", async () => {
  installSessionPrismaMocks();

  const payload = { id: 88, role: "CLIENTE", restaurantId: null };
  const refreshToken = await authTokenService.createRefreshToken(payload);

  await authTokenService.revokeRefreshToken(refreshToken);

  await assert.rejects(
    () => authTokenService.rotateRefreshToken(refreshToken),
    /Refresh token expirado|Refresh token invalido/,
  );
});

test("deve rejeitar token que nao seja refresh", async () => {
  installSessionPrismaMocks();

  const accessToken = jwt.sign(
    { id: 99, role: "ADMIN", restaurantId: 1 },
    getSafeRefreshSecret(),
    { expiresIn: "10m" },
  );

  await assert.rejects(
    () => authTokenService.rotateRefreshToken(accessToken),
    /Refresh token invalido/,
  );
});
