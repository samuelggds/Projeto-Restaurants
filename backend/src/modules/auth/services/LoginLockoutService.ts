import prisma from '../../../config/prisma.js';

type FailureResult = {
  locked: boolean;
  waitSeconds: number;
  failedAttempts: number;
};

const BASE_LOCK_SECONDS = Number(process.env.LOGIN_LOCKOUT_BASE_SECONDS || 60);
const MAX_LOCK_SECONDS = Number(process.env.LOGIN_LOCKOUT_MAX_SECONDS || 3600);
const LOCKOUT_AFTER_FAILURES = Number(process.env.LOGIN_LOCKOUT_AFTER_FAILURES || 5);
const STATE_TTL_MS = Number(process.env.LOGIN_LOCKOUT_STATE_TTL_MS || 86400000);

function normalizeKey(email: string) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .slice(0, 255);
}

async function clearExpiredStates() {
  const cutoff = new Date(Date.now() - STATE_TTL_MS);

  await prisma.loginLockout.deleteMany({
    where: {
      updatedAt: {
        lt: cutoff,
      },
    },
  });
}

class LoginLockoutService {
  async check(email: string) {
    await clearExpiredStates();

    const key = normalizeKey(email);
    if (!key) {
      return { locked: false, waitSeconds: 0 };
    }

    const state = await prisma.loginLockout.findUnique({
      where: {
        emailNormalized: key,
      },
      select: {
        lockUntil: true,
      },
    });
    if (!state) {
      return { locked: false, waitSeconds: 0 };
    }

    const now = Date.now();
    const lockUntilMs = state.lockUntil ? new Date(state.lockUntil).getTime() : 0;
    if (lockUntilMs <= now) {
      return { locked: false, waitSeconds: 0 };
    }

    return {
      locked: true,
      waitSeconds: Math.max(1, Math.ceil((lockUntilMs - now) / 1000)),
    };
  }

  async registerFailure(email: string): Promise<FailureResult> {
    await clearExpiredStates();

    const key = normalizeKey(email);
    if (!key) {
      return {
        locked: false,
        waitSeconds: 0,
        failedAttempts: 0,
      };
    }

    const now = Date.now();
    const current = await prisma.loginLockout.findUnique({
      where: {
        emailNormalized: key,
      },
    });

    const nextFailedAttempts = Number(current?.failedAttempts || 0) + 1;

    if (nextFailedAttempts < LOCKOUT_AFTER_FAILURES) {
      await prisma.loginLockout.upsert({
        where: {
          emailNormalized: key,
        },
        update: {
          failedAttempts: nextFailedAttempts,
          lockUntil: null,
        },
        create: {
          emailNormalized: key,
          failedAttempts: nextFailedAttempts,
          lockUntil: null,
        },
      });

      return {
        locked: false,
        waitSeconds: 0,
        failedAttempts: nextFailedAttempts,
      };
    }

    const exponent = Math.max(0, nextFailedAttempts - LOCKOUT_AFTER_FAILURES);
    const lockSeconds = Math.min(MAX_LOCK_SECONDS, BASE_LOCK_SECONDS * 2 ** exponent);

    await prisma.loginLockout.upsert({
      where: {
        emailNormalized: key,
      },
      update: {
        failedAttempts: nextFailedAttempts,
        lockUntil: new Date(now + lockSeconds * 1000),
      },
      create: {
        emailNormalized: key,
        failedAttempts: nextFailedAttempts,
        lockUntil: new Date(now + lockSeconds * 1000),
      },
    });

    return {
      locked: true,
      waitSeconds: lockSeconds,
      failedAttempts: nextFailedAttempts,
    };
  }

  async registerSuccess(email: string) {
    const key = normalizeKey(email);
    if (!key) {
      return;
    }

    await prisma.loginLockout.deleteMany({
      where: {
        emailNormalized: key,
      },
    });
  }
}

export default new LoginLockoutService();
