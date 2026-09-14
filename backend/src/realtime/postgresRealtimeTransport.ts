import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import type { RealtimeTransport } from './realtimePublisher.js';
import { publicOrderPayload } from '../modules/orders/domain/publicOrderPayload.js';

type EventRow = { id: bigint; room: string | null; event: string; payload: unknown[] };
type Database = {
  $queryRaw<T = unknown>(...args: Parameters<typeof prisma.$queryRaw>): Promise<T>;
  $executeRaw(...args: Parameters<typeof prisma.$executeRaw>): Promise<number>;
};
const WRITE_PROBE_EVENT = '__runtime_write_probe__';

/** PostgreSQL relay for deployments that already operate one shared database.
 * It forwards only to the local Socket.IO transport; it never bypasses room authorization.
 * A restarted API starts at the current high-water mark: clients refetch canonical state.
 */
export class PostgresRealtimeTransport implements RealtimeTransport {
  readonly sourceId = randomUUID();
  private cursor = 0n;
  private stopped = true;
  private timer: NodeJS.Timeout | undefined;
  private pollInFlight: Promise<void> | undefined;
  private pending = new Set<Promise<unknown>>();
  private lastSuccessfulPoll = 0;
  private lastCleanup = 0;
  private writeFailed = false;
  private lastWriteProbe = 0;

  constructor(
    private readonly local?: RealtimeTransport,
    private readonly db: Database = prisma,
  ) {}

  async start() {
    const rows = await this.db.$queryRaw<Array<{ id: bigint }>>`
      SELECT COALESCE(MAX("id"), 0)::bigint AS "id" FROM "RuntimeRealtimeEvent"`;
    this.cursor = rows[0].id;
    this.stopped = false;
    this.lastSuccessfulPoll = Date.now();
    this.schedule();
  }

  healthy() {
    return (
      !this.stopped &&
      !this.writeFailed &&
      (!this.local || Date.now() - this.lastSuccessfulPoll < 10_000)
    );
  }

  emit(event: string, ...args: unknown[]) {
    return this.publish(null, event, args);
  }
  to(room: string) {
    return { emit: (event: string, ...args: unknown[]) => this.publish(room, event, args) };
  }

  private publish(room: string | null, event: string, args: unknown[]) {
    if (this.stopped) return false;
    const payload = JSON.stringify(publicOrderPayload(args));
    if (event.length > 120 || (room?.length || 0) > 200 || Buffer.byteLength(payload) > 512_000) {
      console.error('[REALTIME_EVENT_REJECTED]', { event });
      return false;
    }
    if (this.pending.size >= 1000) {
      console.error('[REALTIME_RELAY_BACKPRESSURE]');
      return false;
    }
    // Serialize only the small INSERT, not any domain transaction or network call.
    // This ensures IDs cannot commit out of order and be skipped by subscribers.
    const write = this.db.$executeRaw`
      WITH lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(78124, 1))
      INSERT INTO "RuntimeRealtimeEvent" ("sourceId", "room", "event", "payload")
      SELECT ${this.sourceId}::uuid, ${room}, ${event}, ${payload}::jsonb FROM lock`
      .then(() => {
        this.writeFailed = false;
      })
      .catch(() => {
        this.writeFailed = true;
        console.error('[REALTIME_RELAY_WRITE_FAILED]');
      });
    this.pending.add(write);
    void write.finally(() => this.pending.delete(write));
    return write;
  }

  private schedule() {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      void this.poll().finally(() => this.schedule());
    }, 250);
    this.timer.unref();
  }

  poll() {
    if (this.pollInFlight) return this.pollInFlight;
    if (this.stopped) return Promise.resolve();
    this.pollInFlight = this.readEvents().finally(() => {
      this.pollInFlight = undefined;
    });
    return this.pollInFlight;
  }

  private async readEvents() {
    try {
      // A read alone does not prove INSERT permission or restore write availability.
      // Probe independently of HTTP traffic, which readiness rejects during an outage.
      if (this.writeFailed && Date.now() - this.lastWriteProbe >= 5_000) {
        this.lastWriteProbe = Date.now();
        await this.db.$executeRaw`
          WITH lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(78124, 1))
          INSERT INTO "RuntimeRealtimeEvent" ("sourceId", "room", "event", "payload")
          SELECT ${this.sourceId}::uuid, NULL, ${WRITE_PROBE_EVENT}, '[]'::jsonb FROM lock`;
        this.writeFailed = false;
      }
      const rows = this.local
        ? await this.db.$queryRaw<EventRow[]>`
        SELECT "id", "room", "event", "payload" FROM "RuntimeRealtimeEvent"
        WHERE "id" > ${this.cursor} ORDER BY "id" ASC LIMIT 250`
        : [];
      for (const row of rows) {
        if (row.event !== WRITE_PROBE_EVENT && Array.isArray(row.payload)) {
          const target = row.room ? this.local?.to(row.room) : this.local;
          target?.emit(row.event, ...publicOrderPayload(row.payload));
        }
        this.cursor = row.id;
      }
      this.lastSuccessfulPoll = Date.now();
      if (Date.now() - this.lastCleanup > 60_000) {
        this.lastCleanup = Date.now();
        await this.db.$executeRaw`DELETE FROM "RuntimeRealtimeEvent" WHERE "id" IN
          (SELECT "id" FROM "RuntimeRealtimeEvent" WHERE "createdAt" < clock_timestamp() - INTERVAL '5 minutes' LIMIT 5000)`;
        await this.db.$executeRaw`DELETE FROM "RuntimeRateLimit" WHERE "key" IN
          (SELECT "key" FROM "RuntimeRateLimit" WHERE "resetTime" < clock_timestamp() - INTERVAL '1 hour' LIMIT 5000)`;
      }
    } catch {
      console.error('[REALTIME_RELAY_POLL_FAILED]');
    }
  }

  async stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await Promise.allSettled([...this.pending]);
    await this.pollInFlight;
  }
}
