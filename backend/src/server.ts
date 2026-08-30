import 'dotenv/config';
import './config/validateEnvOnStartup.js';

import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { Sentry } from './config/sentry.js';
import { socketAuth } from './socket/socketAuth.js';
import { socketHandler } from './socket/socketHandler.js';
import { notifyCriticalError } from './services/alertNotifier.js';
import prisma from './config/prisma.js';
import { registerRealtimeTransport } from './realtime/realtimePublisher.js';
import { createSocketIoRealtimeTransport } from './realtime/socketIoRealtimeTransport.js';
import { createJobScheduler } from './jobs/runtime.js';
import { safeErrorName, safeErrorSummary } from './services/telemetrySanitizer.js';

const server = http.createServer(app);
const apiJobScheduler = createJobScheduler('api');
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

const unregisterRealtimeTransport = registerRealtimeTransport(createSocketIoRealtimeTransport(io));

io.use(socketAuth);
io.on('connection', socketHandler);

server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${port}`);
  apiJobScheduler.start();
});

let shuttingDown = false;

async function shutdown(signal: 'SIGINT' | 'SIGTERM', exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info('[SHUTDOWN_STARTED]', { signal });

  const configuredTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10_000);
  const shutdownTimeoutMs =
    Number.isInteger(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 10_000;
  const forceExitTimer = setTimeout(() => {
    console.error('[SHUTDOWN_TIMEOUT]', { signal });
    process.exit(1);
  }, shutdownTimeoutMs);
  forceExitTimer.unref();

  try {
    await apiJobScheduler.stop();
    unregisterRealtimeTransport();
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
    console.error('[SHUTDOWN_FAILED]', { errorType: safeErrorName(error) });
    Sentry.captureException(error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const errorType = safeErrorName(error);
  console.error('[UNHANDLED_REJECTION]', { errorType });
  Sentry.captureException(error);
  void notifyCriticalError('[UNHANDLED_REJECTION]', { errorType });
});

process.on('uncaughtException', (error) => {
  const errorType = safeErrorName(error);
  const errorSummary = safeErrorSummary(error);
  console.error('[UNCAUGHT_EXCEPTION]', { errorType, errorSummary });
  Sentry.captureException(error);
  void notifyCriticalError('[UNCAUGHT_EXCEPTION]', { errorType, errorSummary });
  void shutdown('SIGTERM', 1);
});
