import { Prisma, TablePaymentIntentStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import {
  expireTablePaymentReservations,
  lockTablePaymentSession,
} from '../services/tablePaymentLedger.js';
import { tableAccountEvents } from '../realtime/tableAccountEvents.js';

class TablePaymentReservationExpirationJob {
  async execute(now = new Date()) {
    const candidates = await prisma.tablePaymentIntent.findMany({
      where: {
        status: {
          in: [TablePaymentIntentStatus.RESERVED, TablePaymentIntentStatus.PROCESSING],
        },
        expiresAt: { lte: now },
      },
      select: {
        restaurantId: true,
        tableSessionId: true,
      },
      distinct: ['restaurantId', 'tableSessionId'],
      take: 200,
    });

    let expiredCount = 0;
    for (const candidate of candidates) {
      try {
        const expiredForSession = await prisma.$transaction(
          async (tx) => {
            await lockTablePaymentSession(tx, candidate.restaurantId, candidate.tableSessionId);
            return expireTablePaymentReservations(
              tx,
              candidate.restaurantId,
              candidate.tableSessionId,
              now,
            );
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        expiredCount += expiredForSession;
        if (expiredForSession > 0) {
          await tableAccountEvents.updated({
            sessionId: candidate.tableSessionId,
            restaurantId: candidate.restaurantId,
            reason: 'PAYMENT_EXPIRED',
            occurredAt: now,
          });
        }
      } catch (error) {
        console.error('[TABLE_PAYMENT_EXPIRATION_ERROR]', {
          restaurantId: candidate.restaurantId,
          tableSessionId: candidate.tableSessionId,
          error: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        });
      }
    }

    return { sessionsChecked: candidates.length, expiredCount };
  }
}

export default new TablePaymentReservationExpirationJob();
