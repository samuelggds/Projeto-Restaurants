import 'dotenv/config';
import './config/validateEnvOnStartup.js';

import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { Sentry } from './config/sentry.js';
import { socketAuth } from './socket/socketAuth.js';
import { socketHandler } from './socket/socketHandler.js';
import { startJobs, stopJobs } from './modules/billing/jobs/scheduler.js';
import billingJob from './modules/billing/jobs/BillingJob.js';
import reconcileMercadoPagoInvoicesService from './modules/billing/services/ReconcileMercadoPagoInvoicesService.js';
import { notifyCriticalError } from './services/alertNotifier.js';
import prisma from './config/prisma.js';
import {
  startTablePaymentJobs,
  stopTablePaymentJobs,
} from './modules/tableAccount/jobs/tablePaymentScheduler.js';

const server = http.createServer(app);
const port = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');
const socketAllowedOrigins = [
  process.env.SOCKET_CORS_ORIGINS || '',
  process.env.CORS_ORIGINS || '',
  process.env.FRONTEND_URL || '',
]
  .flatMap((value) => value.split(','))
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

export const io = new Server(server, {
  cors: {
    origin: isProduction ? socketAllowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
});

io.use(socketAuth);
io.on('connection', socketHandler);

server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${port}`);
  startJobs();
  startTablePaymentJobs();

  billingJob.execute().catch((error) => {
    console.error(error);
    Sentry.captureException(error);
  });

  reconcileMercadoPagoInvoicesService.execute().catch((error) => {
    console.error(error);
    Sentry.captureException(error);
  });
});

let shuttingDown = false;

async function shutdown(signal: 'SIGINT' | 'SIGTERM', exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info('[SHUTDOWN_STARTED]', { signal });
  stopJobs();
  stopTablePaymentJobs();

  const configuredTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10_000);
  const shutdownTimeoutMs =
    Number.isInteger(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 10_000;
  const forceExitTimer = setTimeout(() => {
    console.error('[SHUTDOWN_TIMEOUT]', { signal });
    process.exit(1);
  }, shutdownTimeoutMs);
  forceExitTimer.unref();

  try {
    io.disconnectSockets(true);
    await new Promise<void>((resolve) => io.close(() => resolve()));
    server.closeIdleConnections?.();
    await prisma.$disconnect();
    await Sentry.flush(2_000);
    clearTimeout(forceExitTimer);
    console.info('[SHUTDOWN_COMPLETED]', { signal });
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceExitTimer);
    console.error('[SHUTDOWN_FAILED]', error);
    Sentry.captureException(error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason);
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
  notifyCriticalError('[UNHANDLED_REJECTION]', String(reason));
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT_EXCEPTION]', error);
  Sentry.captureException(error);
  notifyCriticalError('[UNCAUGHT_EXCEPTION]', error?.message || 'unknown');
  void shutdown('SIGTERM', 1);
});
