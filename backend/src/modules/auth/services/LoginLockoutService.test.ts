// @ts-nocheck
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import prisma from "../../../config/prisma.js";
import loginLockoutService from "./LoginLockoutService.js";

const originalFindUnique = prisma.loginLockout.findUnique;
const originalUpsert = prisma.loginLockout.upsert;
const originalDeleteMany = prisma.loginLockout.deleteMany;

const lockouts = new Map();

afterEach(() => {
  prisma.loginLockout.findUnique = originalFindUnique;
  prisma.loginLockout.upsert = originalUpsert;
  prisma.loginLockout.deleteMany = originalDeleteMany;
  lockouts.clear();
});

function installLockoutPrismaMocks() {
  prisma.loginLockout.findUnique = async ({ where }) => {
    return lockouts.get(String(where.emailNormalized)) || null;
  };

  prisma.loginLockout.upsert = async ({ where, create, update }) => {
    const key = String(where.emailNormalized);
    const next = {
      emailNormalized: key,
      ...(lockouts.get(key) || {}),
      ...(lockouts.has(key) ? update : create),
      updatedAt: new Date(),
    };
    lockouts.set(key, next);
    return next;
  };

  prisma.loginLockout.deleteMany = async ({ where }) => {
    if (where?.updatedAt?.lt) {
      let count = 0;
      for (const [key, value] of lockouts.entries()) {
        const updatedAt = new Date(value.updatedAt || new Date());
        if (updatedAt.getTime() < new Date(where.updatedAt.lt).getTime()) {
          lockouts.delete(key);
          count += 1;
        }
      }
      return { count };
    }

    if (where?.emailNormalized) {
      const exists = lockouts.has(String(where.emailNormalized));
      lockouts.delete(String(where.emailNormalized));
      return { count: exists ? 1 : 0 };
    }

    const total = lockouts.size;
    lockouts.clear();
    return { count: total };
  };
}

test("deve ativar lockout apos falhas sucessivas", async () => {
  installLockoutPrismaMocks();

  const email = "admin@pizza.com";

  for (let i = 0; i < 4; i += 1) {
    const result = await loginLockoutService.registerFailure(email);
    assert.equal(result.locked, false);
  }

  const fifth = await loginLockoutService.registerFailure(email);
  assert.equal(fifth.locked, true);
  assert.ok(fifth.waitSeconds >= 60);

  const check = await loginLockoutService.check(email);
  assert.equal(check.locked, true);
});

test("deve resetar lockout apos sucesso", async () => {
  installLockoutPrismaMocks();

  const email = "owner@pizza.com";
  for (let i = 0; i < 5; i += 1) {
    await loginLockoutService.registerFailure(email);
  }

  const before = await loginLockoutService.check(email);
  assert.equal(before.locked, true);

  await loginLockoutService.registerSuccess(email);

  const after = await loginLockoutService.check(email);
  assert.equal(after.locked, false);
});
