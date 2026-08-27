import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  assertHttpTarget,
  assertOperationalEnvironment,
  normalizeEnvironment,
} from './_shared/environmentGuard.mjs';
import {
  requireReason,
  requireWriteConfirmation,
  resolveExecutionMode,
} from './_shared/confirmation.mjs';
import {
  assertAllowedOptions,
  hasFlag,
  optionalString,
  parseCliArgs,
  rejectPositionals,
  requiredString,
} from './_shared/cli.mjs';
import { redactText, safeError } from './_shared/redaction.mjs';

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
  environment: string;
  mode: 'dry-run' | 'write';
  reason: string;
  expectedConfirmation: string;
};

function parseArgs(argv: string[]): CliOptions {
  const parsed = parseCliArgs(argv);
  rejectPositionals(parsed);
  assertAllowedOptions(parsed, [
    'environment',
    'base-url',
    'duration-sec',
    'target-rpm',
    'timeout-ms',
    'restaurant-ids',
    'execute',
    'dry-run',
    'allow-production',
    'confirm',
    'reason',
  ]);

  const environment = requiredString(parsed, 'Ambiente alvo', 'environment');
  const context = assertOperationalEnvironment({
    targetEnvironment: environment,
    allowProduction: hasFlag(parsed, 'allow-production'),
  });
  const apiEnvironment = normalizeEnvironment(process.env.OPS_API_ENV, 'OPS_API_ENV');
  if (apiEnvironment !== context.target) {
    throw new Error(
      `A API foi marcada como ${apiEnvironment}, mas --environment declarou ${context.target}.`,
    );
  }

  const baseUrl = assertHttpTarget(
    requiredString(parsed, 'URL base da API', 'base-url'),
    context.target,
  );
  const durationSec = Number(optionalString(parsed, 'duration-sec') || 300);
  const targetRpm = Number(optionalString(parsed, 'target-rpm') || 300);
  const timeoutMs = Number(optionalString(parsed, 'timeout-ms') || 10000);
  const rawRestaurantIds = requiredString(parsed, 'IDs dos restaurantes', 'restaurant-ids');
  const restaurantIdParts = rawRestaurantIds.split(',').map((value) => value.trim());
  const restaurantIds = restaurantIdParts.map((value) => Number(value));
  if (
    !restaurantIds.length ||
    restaurantIds.some((value) => !Number.isSafeInteger(value) || value <= 0) ||
    new Set(restaurantIds).size !== restaurantIds.length
  ) {
    throw new Error('--restaurant-ids deve conter inteiros positivos, únicos e separados por vírgula.');
  }

  const mode = resolveExecutionMode({
    execute: hasFlag(parsed, 'execute'),
    dryRun: hasFlag(parsed, 'dry-run'),
  });
  const reason = optionalString(parsed, 'reason');
  requireReason(mode, reason);
  const expectedConfirmation = [
    'LOAD_TEST',
    restaurantIds.join(','),
    `${durationSec}s`,
    `${targetRpm}rpm`,
    baseUrl,
    context.databaseLabel,
  ].join(':');
  requireWriteConfirmation({
    mode,
    provided: optionalString(parsed, 'confirm'),
    expected: expectedConfirmation,
    action: 'criar pedidos de teste de carga',
  });

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
    environment: context.target,
    mode,
    reason,
    expectedConfirmation,
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

  if (options.mode === 'dry-run') {
    console.log(
      JSON.stringify(
        {
          mode: options.mode,
          environment: options.environment,
          baseUrl: options.baseUrl,
          durationSec: options.durationSec,
          targetRpm: options.targetRpm,
          targetTotal,
          seeds,
        },
        null,
        2,
      ),
    );
    console.log(
      `DRY_RUN: use --execute --reason="..." --confirm="${options.expectedConfirmation}" para enviar pedidos.`,
    );
    return;
  }

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
            body: redactText(String(body || '').slice(0, 500)),
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
          body: redactText(error instanceof Error ? error.message : String(error)),
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
    console.error(safeError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    const { default: prismaClient } = await import('../src/config/prisma.js');
    await prismaClient.$disconnect();
  });
