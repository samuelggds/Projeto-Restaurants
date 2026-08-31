import 'dotenv/config';
import './config/validateEnvOnStartup.js';

import prisma from './config/prisma.js';
import { Sentry } from './config/sentry.js';
import { createJobScheduler } from './jobs/runtime.js';
import { notifyCriticalError } from './services/alertNotifier.js';
import { assertSecureRuntimeDatabaseRole } from './database/tenantDbContext.js';

const scheduler = createJobScheduler('worker');
let shuttingDown = false;

async function shutdown(signal: 'SIGINT' | 'SIGTERM', exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info('[WORKER_SHUTDOWN_STARTED]', { signal });

  const configuredTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10_000);
  const shutdownTimeoutMs =
    Number.isInteger(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 10_000;
  const forceExitTimer = setTimeout(() => {
    console.error('[WORKER_SHUTDOWN_TIMEOUT]', { signal });
    process.exit(1);
  }, shutdownTimeoutMs);
  forceExitTimer.unref();

  try {
    await scheduler.stop();
    await prisma.$disconnect();
    await Sentry.flush(2_000);
    clearTimeout(forceExitTimer);
    console.info('[WORKER_SHUTDOWN_COMPLETED]', { signal });
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceExitTimer);
    console.error(
      '[WORKER_SHUTDOWN_FAILED]',
      error instanceof Error ? error.name : 'UNKNOWN_ERROR',
    );
    Sentry.captureException(error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error('[WORKER_UNHANDLED_REJECTION]', error.name);
  Sentry.captureException(error);
  notifyCriticalError('[WORKER_UNHANDLED_REJECTION]', error.name);
  void shutdown('SIGTERM', 1);
});

process.on('uncaughtException', (error) => {
  console.error('[WORKER_UNCAUGHT_EXCEPTION]', error.name);
  Sentry.captureException(error);
  notifyCriticalError('[WORKER_UNCAUGHT_EXCEPTION]', error.name);
  void shutdown('SIGTERM', 1);
});

async function startWorker() {
  if (process.env.NODE_ENV === 'production' || process.env.RLS_VERIFY_RUNTIME_ROLE === 'true') {
    await assertSecureRuntimeDatabaseRole();
    console.info('[RLS_RUNTIME_ROLE_VERIFIED]');
  }
  scheduler.start();
  console.info('[WORKER_STARTED]');
}

void startWorker().catch((error) => {
  console.error('[WORKER_START_FAILED]', error instanceof Error ? error.name : 'UNKNOWN_ERROR');
  Sentry.captureException(error);
  void shutdown('SIGTERM', 1);
});
