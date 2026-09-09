import assert from 'node:assert/strict';
import http from 'node:http';
import { createInterface } from 'node:readline';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';

// This executable is a loopback-only fixture, never a production entry point.
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.DISTRIBUTED_STATE, 'postgres');
const url = new URL(process.env.DATABASE_URL!);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /(?:^|[_/-])(ci|e2e|test)(?:[_/-]|$)/i);
assert.equal(url.username, 'tenant_e2e_runtime');
assert.equal(process.env.DIRECT_URL, undefined);
assert.equal(process.env.TENANT_E2E_OWNER_DATABASE_URL, undefined);

const { default: app } = await import('../../app.js');
const { default: prisma } = await import('../../config/prisma.js');
const { assertSecureRuntimeDatabaseRole } = await import('../../database/tenantDbContext.js');
const { PostgresRateLimitStore } =
  await import('../../middlewares/security/PostgresRateLimitStore.js');
const { PostgresRealtimeTransport } = await import('../../realtime/postgresRealtimeTransport.js');
const { createSocketIoRealtimeTransport } =
  await import('../../realtime/socketIoRealtimeTransport.js');
const { registerRealtimeTransport } = await import('../../realtime/realtimePublisher.js');
const { registerRuntimeRealtimeProbe } = await import('../../runtime/runtimeReadiness.js');
const { socketAuth } = await import('../../socket/socketAuth.js');
const { socketHandler } = await import('../../socket/socketHandler.js');
await assertSecureRuntimeDatabaseRole();
const fixture = express();
fixture.get(
  '/__runtime/rate',
  rateLimit({
    store: new PostgresRateLimitStore('runtime-e2e-probe'),
    windowMs: 60_000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  (_req, res) => res.json({ ok: true }),
);
fixture.use(app);
const server = http.createServer(fixture);
const io = new Server(server, { transports: ['websocket'], maxHttpBufferSize: 64 * 1024 });
io.use(socketAuth);
io.on('connection', socketHandler);
const relay = new PostgresRealtimeTransport(createSocketIoRealtimeTransport(io));
registerRealtimeTransport(relay);
registerRuntimeRealtimeProbe(() => relay.healthy());
await relay.start();
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address === 'object');
console.log(`RUNTIME_TEST_READY:http://127.0.0.1:${address.port}`);

let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await relay.stop();
  io.disconnectSockets(true);
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await prisma.$disconnect();
  process.exit(0);
}
const input = createInterface({ input: process.stdin });
input.on('line', (line) => {
  const command = JSON.parse(line);
  if (command.action === 'close') void close();
  if (command.action === 'publish')
    void relay.to(command.room).emit(command.event, command.payload);
});
input.on('close', () => void close());
process.on('SIGTERM', () => void close());
