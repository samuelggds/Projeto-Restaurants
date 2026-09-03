import { Prisma, TableServiceCallStatus, TableServiceCallType } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { loadTablePaymentLedgerItems } from '../../tableAccount/services/tablePaymentLedger.js';

type Db = Prisma.TransactionClient | PrismaClient;

type ParticipantStateRow = {
  participantId: number;
  restaurantId: number;
  tableSessionId: number;
  phone: string | null;
  orderingBlockedAt: Date | null;
  orderingUnblockedAt: Date | null;
};

type ReleasedParticipant = {
  participantId: number;
  participantPublicId: string;
  tableId: number;
  callIds: number[];
};

function normalizePositiveInteger(value: unknown, field: string) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${field} inválido.`);
  }
  return normalized;
}

export function normalizeParticipantPhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Informe um telefone válido.');
  }
  return digits;
}

export class TableParticipantStateService {
  async getState(
    db: Db,
    input: { participantId: number; tableSessionId: number; restaurantId: number },
  ) {
    const participantId = normalizePositiveInteger(input.participantId, 'Participante');
    const tableSessionId = normalizePositiveInteger(input.tableSessionId, 'Sessão');
    const restaurantId = normalizePositiveInteger(input.restaurantId, 'Restaurante');

    const rows = await db.$queryRaw<ParticipantStateRow[]>(Prisma.sql`
      SELECT
        "participantId",
        "restaurantId",
        "tableSessionId",
        "phone",
        "orderingBlockedAt",
        "orderingUnblockedAt"
      FROM "TableParticipantState"
      WHERE "participantId" = ${participantId}
        AND "tableSessionId" = ${tableSessionId}
        AND "restaurantId" = ${restaurantId}
      LIMIT 1
    `);
    return rows[0] || null;
  }

  async upsertIdentity(
    db: Db,
    input: {
      participantId: number;
      tableSessionId: number;
      restaurantId: number;
      phone?: unknown;
    },
  ) {
    const participantId = normalizePositiveInteger(input.participantId, 'Participante');
    const tableSessionId = normalizePositiveInteger(input.tableSessionId, 'Sessão');
    const restaurantId = normalizePositiveInteger(input.restaurantId, 'Restaurante');
    const phone = input.phone === undefined ? null : normalizeParticipantPhone(input.phone);

    const rows = await db.$queryRaw<ParticipantStateRow[]>(Prisma.sql`
      INSERT INTO "TableParticipantState" (
        "participantId",
        "restaurantId",
        "tableSessionId",
        "phone",
        "updatedAt"
      ) VALUES (
        ${participantId},
        ${restaurantId},
        ${tableSessionId},
        ${phone},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("participantId") DO UPDATE SET
        "phone" = COALESCE(EXCLUDED."phone", "TableParticipantState"."phone"),
        "tableSessionId" = EXCLUDED."tableSessionId",
        "restaurantId" = EXCLUDED."restaurantId",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING
        "participantId",
        "restaurantId",
        "tableSessionId",
        "phone",
        "orderingBlockedAt",
        "orderingUnblockedAt"
    `);
    return rows[0];
  }

  async blockOrderingForBill(
    db: Db,
    input: { participantId: number; tableSessionId: number; restaurantId: number },
  ) {
    const participantId = normalizePositiveInteger(input.participantId, 'Participante');
    const tableSessionId = normalizePositiveInteger(input.tableSessionId, 'Sessão');
    const restaurantId = normalizePositiveInteger(input.restaurantId, 'Restaurante');

    await db.$executeRaw(Prisma.sql`
      INSERT INTO "TableParticipantState" (
        "participantId",
        "restaurantId",
        "tableSessionId",
        "orderingBlockedAt",
        "orderingUnblockedAt",
        "updatedAt"
      ) VALUES (
        ${participantId},
        ${restaurantId},
        ${tableSessionId},
        CURRENT_TIMESTAMP,
        NULL,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("participantId") DO UPDATE SET
        "orderingBlockedAt" = COALESCE(
          "TableParticipantState"."orderingBlockedAt",
          CURRENT_TIMESTAMP
        ),
        "orderingUnblockedAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
    `);
  }

  async assertCanCreateOrder(
    db: Db,
    input: { participantId: number; tableSessionId: number; restaurantId: number },
  ) {
    const state = await this.getState(db, input);
    if (state?.orderingBlockedAt) {
      throw new Error(
        'Você já pediu a conta. Novos pedidos ficam bloqueados até o pagamento ser confirmado.',
      );
    }
  }

  async releaseSettledParticipants(
    db: Prisma.TransactionClient,
    input: { tableSessionId: number; restaurantId: number; now?: Date },
  ): Promise<ReleasedParticipant[]> {
    const tableSessionId = normalizePositiveInteger(input.tableSessionId, 'Sessão');
    const restaurantId = normalizePositiveInteger(input.restaurantId, 'Restaurante');
    const now = input.now || new Date();
    const blockedRows = await db.$queryRaw<Array<{ participantId: number }>>(Prisma.sql`
      SELECT "participantId"
      FROM "TableParticipantState"
      WHERE "restaurantId" = ${restaurantId}
        AND "tableSessionId" = ${tableSessionId}
        AND "orderingBlockedAt" IS NOT NULL
      ORDER BY "participantId" ASC
      FOR UPDATE
    `);
    const blocked = blockedRows.filter(
      (row) => Number.isSafeInteger(Number(row.participantId)) && Number(row.participantId) > 0,
    );
    if (!blocked.length) return [];

    const ledgerItems = await loadTablePaymentLedgerItems(db, restaurantId, tableSessionId, now);
    const released: ReleasedParticipant[] = [];

    for (const blockedParticipant of blocked) {
      const participantItems = ledgerItems.filter(
        (item) =>
          item.participantId === blockedParticipant.participantId &&
          !item.canceled &&
          item.projectedStatus !== 'REFUNDED',
      );
      const settled = participantItems.every(
        (item) =>
          item.paidCents === item.unitPriceCents &&
          item.availableCents === 0 &&
          item.reservedCents === 0 &&
          item.processingCents === 0,
      );
      if (!settled) continue;

      await db.$executeRaw(Prisma.sql`
        UPDATE "TableParticipantState"
        SET
          "orderingBlockedAt" = NULL,
          "orderingUnblockedAt" = ${now},
          "updatedAt" = ${now}
        WHERE "participantId" = ${blockedParticipant.participantId}
          AND "restaurantId" = ${restaurantId}
          AND "tableSessionId" = ${tableSessionId}
          AND "orderingBlockedAt" IS NOT NULL
      `);

      const resolvedCalls = await db.$queryRaw<Array<{ id: number; tableId: number }>>(Prisma.sql`
        UPDATE "TableServiceCall"
        SET
          "status" = ${TableServiceCallStatus.RESOLVED}::"TableServiceCallStatus",
          "resolvedAt" = ${now},
          "updatedAt" = ${now}
        WHERE "restaurantId" = ${restaurantId}
          AND "tableSessionId" = ${tableSessionId}
          AND "participantId" = ${blockedParticipant.participantId}
          AND "type" = ${TableServiceCallType.BILL}::"TableServiceCallType"
          AND "status" IN (
            ${TableServiceCallStatus.WAITING}::"TableServiceCallStatus",
            ${TableServiceCallStatus.IN_PROGRESS}::"TableServiceCallStatus"
          )
        RETURNING "id", "tableId"
      `);

      const participantRows = await db.$queryRaw<
        Array<{ publicId: string; tableId: number }>
      >(Prisma.sql`
        SELECT participant."publicId", session."tableId"
        FROM "TableParticipant" AS participant
        JOIN "TableSession" AS session
          ON session."id" = participant."tableSessionId"
         AND session."restaurantId" = participant."restaurantId"
        WHERE participant."id" = ${blockedParticipant.participantId}
          AND participant."restaurantId" = ${restaurantId}
          AND participant."tableSessionId" = ${tableSessionId}
        LIMIT 1
      `);
      const participant = participantRows[0];
      if (participant) {
        released.push({
          participantId: blockedParticipant.participantId,
          participantPublicId: participant.publicId,
          tableId: participant.tableId,
          callIds: resolvedCalls.map((call) => call.id),
        });
      }
    }

    return released;
  }
}

export default new TableParticipantStateService();
