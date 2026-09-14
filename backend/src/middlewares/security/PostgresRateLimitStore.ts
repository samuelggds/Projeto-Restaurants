import { createHash } from 'node:crypto';
import type { Options, Store } from 'express-rate-limit';
import prisma from '../../config/prisma.js';
import { distributedStateEnabled } from '../../runtime/distributedConfig.js';

type Database = Pick<typeof prisma, '$queryRaw' | '$executeRaw'>;

/** Atomic fixed windows shared by every replica. A database outage fails closed.
 * Only a digest is stored: IPs, email addresses and tokens never enter this table.
 */
export class PostgresRateLimitStore implements Store {
  readonly localKeys = false;
  private windowMs = 60_000;
  constructor(
    readonly prefix: string,
    private readonly db: Database = prisma,
  ) {
    if (!/^[a-z0-9:._-]{1,80}$/u.test(prefix)) throw new Error('Prefixo de rate limit inválido.');
  }
  init(options: Options) {
    this.windowMs = options.windowMs;
  }
  private key(value: string) {
    return `${this.prefix}:${createHash('sha256').update(value).digest('hex')}`;
  }
  async increment(key: string) {
    const rows = await this.db.$queryRaw<Array<{ totalHits: number; resetTime: Date }>>`
      INSERT INTO "RuntimeRateLimit" ("key", "totalHits", "resetTime")
      VALUES (${this.key(key)}, 1, clock_timestamp() + ${this.windowMs} * INTERVAL '1 millisecond')
      ON CONFLICT ("key") DO UPDATE SET
        "totalHits" = CASE WHEN "RuntimeRateLimit"."resetTime" <= clock_timestamp() THEN 1
          ELSE LEAST("RuntimeRateLimit"."totalHits", 2147483646) + 1 END,
        "resetTime" = CASE WHEN "RuntimeRateLimit"."resetTime" <= clock_timestamp()
          THEN clock_timestamp() + ${this.windowMs} * INTERVAL '1 millisecond'
          ELSE "RuntimeRateLimit"."resetTime" END
      RETURNING "totalHits", "resetTime"`;
    if (!rows[0]) throw new Error('Rate limit indisponível.');
    return rows[0];
  }
  async decrement(key: string) {
    await this.db.$executeRaw`UPDATE "RuntimeRateLimit"
      SET "totalHits" = GREATEST(0, "totalHits" - 1) WHERE "key" = ${this.key(key)}`;
  }
  async resetKey(key: string) {
    await this.db.$executeRaw`DELETE FROM "RuntimeRateLimit" WHERE "key" = ${this.key(key)}`;
  }
}

export function distributedRateLimitOptions(prefix: string) {
  return distributedStateEnabled()
    ? { store: new PostgresRateLimitStore(prefix), passOnStoreError: false as const }
    : {};
}
