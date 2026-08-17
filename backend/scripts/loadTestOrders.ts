import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config();
dotenv.config({ path: path.resolve('backend/.env') });

type RestaurantSeed = {
  restaurantId: number;
  productId: number;
};

type SampleError = {
  status: number;
  body: string;
};

type CliOptions = {
  baseUrl: string;
  durationSec: number;
  targetRpm: number;
  timeoutMs: number;
  restaurantIds: number[];
};

function parseArgs(argv: string[]): CliOptions {
  const map = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const item = String(argv[i] || '').trim();
    if (!item.startsWith('--')) {
      continue;
    }

    const key = item.slice(2);
    const next = String(argv[i + 1] || '').trim();
    if (!next || next.startsWith('--')) {
      map.set(key, 'true');
      continue;
    }

    map.set(key, next);
    i += 1;
  }

  const baseUrl = String(map.get('baseUrl') || 'http://127.0.0.1:3000')
    .trim()
    .replace(/\/+$/, '');
  const durationSec = Number(map.get('durationSec') || 300);
  const targetRpm = Number(map.get('targetRpm') || 300);
  const timeoutMs = Number(map.get('timeoutMs') || 10000);
  const restaurantIds = String(map.get('restaurantIds') || '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('durationSec invalido. Use valor inteiro > 0.');
  }

  if (!Number.isFinite(targetRpm) || targetRpm <= 0) {
    throw new Error('targetRpm invalido. Use valor inteiro > 0.');
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    throw new Error('timeoutMs invalido. Use valor >= 1000.');
  }

  return {
    baseUrl,
    durationSec,
    targetRpm,
    timeoutMs,
    restaurantIds,
  };
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) {
    return 0;
  }

  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));

  return sorted[index] || 0;
}

async function resolveSeeds(prismaClient: any, restaurantIds: number[]) {
  const restaurants = await prismaClient.restaurant.findMany({
    where: {
      active: true,
      ...(restaurantIds.length
        ? {
            id: {
              in: restaurantIds,
            },
          }
        : {}),
    },
    select: {
      id: true,
      products: {
        where: {
          active: true,
        },
        select: {
          id: true,
        },
        take: 1,
        orderBy: {
          id: 'asc',
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  const seeds: RestaurantSeed[] = restaurants
    .map((restaurant) => {
      const productId = Number(restaurant.products?.[0]?.id || 0);
      if (!productId) {
        return null;
      }

      return {
        restaurantId: Number(restaurant.id),
        productId,
      };
    })
    .filter((item): item is RestaurantSeed => Boolean(item));

  if (!seeds.length) {
    throw new Error('Nenhum restaurante ativo com produto ativo encontrado para teste de carga.');
  }

  return seeds;
}

async function run() {
  const { default: prismaClient } = await import('../src/config/prisma.js');
  const options = parseArgs(process.argv.slice(2));
  const seeds = await resolveSeeds(prismaClient, options.restaurantIds);
  const runId = `LOAD_${Date.now()}`;
  const targetTotal = Math.max(1, Math.round((options.targetRpm / 60) * options.durationSec));

  let sent = 0;
  let ok = 0;
  let failed = 0;
  let seedIndex = 0;
  const latencies: number[] = [];
  const byStatus: Record<string, number> = {};
  const sampleErrors: SampleError[] = [];

  const startedAt = Date.now();

  for (let i = 0; i < targetTotal; i += 1) {
    const elapsed = Date.now() - startedAt;
    const expectedElapsed = Math.floor(((i + 1) / targetTotal) * options.durationSec * 1000);
    if (expectedElapsed > elapsed) {
      await new Promise((resolve) => setTimeout(resolve, expectedElapsed - elapsed));
    }

    const seed = seeds[seedIndex % seeds.length];
    seedIndex += 1;
    sent += 1;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    const t0 = Date.now();

    try {
      const response = await fetch(`${options.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          restaurantId: seed.restaurantId,
          type: 'RETIRADA',
          paymentMethod: 'DINHEIRO',
          paid: false,
          customerName: 'Load Test Runner',
          customerCpf: '12345678909',
          customerPhone: '85999999999',
          observation: runId,
          items: [
            {
              productId: seed.productId,
              quantity: 1,
            },
          ],
        }),
      });

      clearTimeout(timeout);
      const latency = Date.now() - t0;
      latencies.push(latency);
      const statusKey = String(response.status);
      byStatus[statusKey] = Number(byStatus[statusKey] || 0) + 1;

      if (response.ok) {
        ok += 1;
      } else {
        failed += 1;
        if (sampleErrors.length < 10) {
          const body = await response.text();
          sampleErrors.push({
            status: response.status,
            body: String(body || '').slice(0, 500),
          });
        }
      }
    } catch (error: unknown) {
      clearTimeout(timeout);
      failed += 1;
      byStatus.NETWORK_ERROR = Number(byStatus.NETWORK_ERROR || 0) + 1;

      if (sampleErrors.length < 10) {
        sampleErrors.push({
          status: 0,
          body: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const finishedAt = Date.now();
  const durationMs = Math.max(1, finishedAt - startedAt);
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const avg = sorted.length ? sum / sorted.length : 0;
  const throughput = (sent / durationMs) * 1000;
  const errorRate = sent ? (failed / sent) * 100 : 0;

  const report = {
    runId,
    baseUrl: options.baseUrl,
    durationSec: options.durationSec,
    targetRpm: options.targetRpm,
    seeds,
    sent,
    ok,
    failed,
    errorRatePercent: Number(errorRate.toFixed(3)),
    throughputRps: Number(throughput.toFixed(3)),
    latencyMs: {
      avg: Number(avg.toFixed(2)),
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted.length ? sorted[sorted.length - 1] : 0,
    },
    byStatus,
    sampleErrors,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
  };

  const reportDir = path.resolve('load-test-reports');
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${runId}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(JSON.stringify(report, null, 2));
  console.log(`REPORT_SAVED=${reportPath}`);

  if (failed > 0) {
    process.exitCode = 2;
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { default: prismaClient } = await import('../src/config/prisma.js');
    await prismaClient.$disconnect();
  });
