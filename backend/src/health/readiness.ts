import prisma from '../config/prisma.js';

export type ReadinessProbe = () => Promise<unknown>;

// Public probes share a short snapshot instead of opening one database query
// per caller. Realtime readiness is still checked on each HTTP request.
export function createCachedDatabaseReadiness(
  probe: () => Promise<{ ready: boolean }> = probeDatabaseReadiness,
  cacheMs = 1000,
  now: () => number = Date.now,
) {
  let cached: { ready: boolean } | undefined;
  let validUntil = 0;
  let pending: Promise<{ ready: boolean }> | undefined;
  return () => {
    if (cached && now() < validUntil) return Promise.resolve(cached);
    if (pending) return pending;
    pending = Promise.resolve()
      .then(probe)
      .catch(() => ({ ready: false }))
      .then((result) => {
        cached = result;
        validUntil = now() + cacheMs;
        return result;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}

function readinessTimeoutMs() {
  const parsed = Number(process.env.READINESS_TIMEOUT_MS || 3000);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3000;
}

export async function probeDatabaseReadiness(
  probe: ReadinessProbe = () => prisma.$queryRaw`SELECT 1`,
  timeoutMs = readinessTimeoutMs(),
) {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      probe(),
      new Promise<never>((_resolve, reject) => {
        // Keep the timeout referenced until the readiness race settles.
        // If this timer is unref'ed and the probe never resolves, Node may
        // finish the event loop before the timeout rejects, cancelling the
        // readiness check instead of returning { ready: false }.
        timer = setTimeout(() => reject(new Error('database readiness timeout')), timeoutMs);
      }),
    ]);
    return { ready: true as const };
  } catch {
    return { ready: false as const };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
