import prisma from '../config/prisma.js';

export type ReadinessProbe = () => Promise<unknown>;

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
