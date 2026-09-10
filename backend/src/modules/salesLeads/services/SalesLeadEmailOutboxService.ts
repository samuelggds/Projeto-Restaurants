import { randomUUID } from 'node:crypto';
import prisma from '../../../config/prisma.js';
import { createSalesLeadEmailSender, type SalesLeadEmail } from './salesLeadEmailTransport.js';

type Database = Pick<typeof prisma, '$queryRaw' | '$executeRaw' | 'salesLead'>;
type ClaimedEmail = { id: string; leadId: string; attempts: number };
type Sender = (lead: SalesLeadEmail) => Promise<void>;
type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

function smtpFailureCode(error: unknown) {
  if (!error || typeof error !== 'object') return 'UNKNOWN_ERROR';
  const code = 'code' in error ? String(error.code || '').trim() : '';
  if (code) return code.toUpperCase().slice(0, 40);
  const name = error instanceof Error ? error.name.trim() : '';
  return name ? name.toUpperCase().slice(0, 40) : 'UNKNOWN_ERROR';
}

/** Global durable queue follows the existing notification outbox lease/retry pattern.
 * SMTP is at-least-once: a crash after acceptance can replay the stable Message-ID.
 * The lead remains in the inbox on missing configuration or exhausted retries.
 */
export async function deliverSalesLeadEmails(
  db: Database = prisma,
  send: Sender | null = createSalesLeadEmailSender(),
  logger: Logger = console,
) {
  if (!send) {
    logger.warn('[SALES_LEADS_EMAIL_NOT_CONFIGURED]');
    return { processed: 0, sent: 0, configured: false };
  }
  const lockToken = randomUUID();
  const rows = await db.$queryRaw<ClaimedEmail[]>`
    WITH picked AS (
      SELECT "id" FROM "SalesLeadEmailOutbox"
      WHERE "status" = 'PENDING' AND "availableAt" <= clock_timestamp()
        AND ("lockedUntil" IS NULL OR "lockedUntil" < clock_timestamp())
      ORDER BY "availableAt", "id" LIMIT 10 FOR UPDATE SKIP LOCKED
    )
    UPDATE "SalesLeadEmailOutbox" o
    SET "lockedUntil" = clock_timestamp() + INTERVAL '5 minutes',
      "lockToken" = ${lockToken}::uuid, "attempts" = o."attempts" + 1
    FROM picked WHERE o."id" = picked."id"
    RETURNING o."id", o."leadId", o."attempts"`;
  let sent = 0;
  for (let offset = 0; offset < rows.length; offset += 3) {
    await Promise.all(
      rows.slice(offset, offset + 3).map(async (row) => {
        try {
          const lead = await db.salesLead.findUnique({
            where: { id: row.leadId },
            select: {
              id: true,
              name: true,
              restaurantName: true,
              email: true,
              phone: true,
              city: true,
              state: true,
              businessType: true,
              channels: true,
              planInterest: true,
              message: true,
            },
          });
          if (!lead) throw new Error('Contato não encontrado.');
          await send(lead);
          const updated = await db.$executeRaw`UPDATE "SalesLeadEmailOutbox"
          SET "status" = 'SENT', "sentAt" = clock_timestamp(), "lockedUntil" = NULL, "lockToken" = NULL
          WHERE "id" = ${row.id}::uuid AND "lockToken" = ${lockToken}::uuid`;
          if (updated === 1) {
            sent++;
            logger.info('[SALES_LEADS_EMAIL_SENT]', { attempt: row.attempts });
          }
        } catch (error) {
          // Never log owner data, message text, recipient, credentials or SMTP response.
          const exhausted = row.attempts >= 8;
          const delayMs = Math.min(60 * 60_000, 60_000 * 2 ** Math.min(row.attempts - 1, 6));
          await db.$executeRaw`UPDATE "SalesLeadEmailOutbox"
          SET "status" = ${exhausted ? 'FAILED' : 'PENDING'},
            "availableAt" = clock_timestamp() + ${delayMs} * INTERVAL '1 millisecond',
            "lockedUntil" = NULL, "lockToken" = NULL
          WHERE "id" = ${row.id}::uuid AND "lockToken" = ${lockToken}::uuid`;
          logger.error('[SALES_LEADS_EMAIL_FAILED]', {
            code: smtpFailureCode(error),
            attempt: row.attempts,
            exhausted,
            retryInMs: exhausted ? null : delayMs,
          });
        }
      }),
    );
  }
  return { processed: rows.length, sent, configured: true };
}
