import prisma from '../../../config/prisma.js';

type TerminalRow = {
  id: number;
  publicId: string;
  restaurantId: number;
  provider: string;
  providerTerminalId: string;
  posId: string | null;
  storeId: string | null;
  externalPosId: string | null;
  operatingMode: string | null;
  active: boolean;
  assignedCourierId: number | null;
  courierName: string | null;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type DeliveryPaymentRow = {
  id: number;
  publicId: string;
  restaurantId: number;
  orderId: number;
  method: string;
  provider: string;
  status: string;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  terminalId: number | null;
  amount: unknown;
  currency: string;
  pixCopyPaste: string | null;
  pixQrCodeBase64: string | null;
  expiresAt: Date | null;
  lastProviderStatus: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

class PaymentTerminalRepository {
  async listTerminals(restaurantId: number): Promise<TerminalRow[]> {
    return prisma.$queryRaw<TerminalRow[]>`
      SELECT
        t."id",
        t."publicId",
        t."restaurantId",
        t."provider",
        t."providerTerminalId",
        t."posId",
        t."storeId",
        t."externalPosId",
        t."operatingMode",
        t."active",
        t."assignedCourierId",
        u."name" AS "courierName",
        t."lastSyncedAt",
        t."createdAt",
        t."updatedAt"
      FROM "PaymentTerminal" t
      LEFT JOIN "User" u ON u."id" = t."assignedCourierId"
      WHERE t."restaurantId" = ${restaurantId}
      ORDER BY t."active" DESC, t."providerTerminalId" ASC
    `;
  }

  async upsertMercadoPagoTerminal(input: {
    restaurantId: number;
    providerTerminalId: string;
    posId?: string | null;
    storeId?: string | null;
    externalPosId?: string | null;
    operatingMode?: string | null;
  }) {
    const rows = await prisma.$queryRaw<TerminalRow[]>`
      INSERT INTO "PaymentTerminal" (
        "publicId",
        "restaurantId",
        "provider",
        "providerTerminalId",
        "posId",
        "storeId",
        "externalPosId",
        "operatingMode",
        "active",
        "lastSyncedAt",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${crypto.randomUUID()},
        ${input.restaurantId},
        'MERCADO_PAGO',
        ${input.providerTerminalId},
        ${input.posId ?? null},
        ${input.storeId ?? null},
        ${input.externalPosId ?? null},
        ${input.operatingMode ?? null},
        true,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT ("restaurantId", "provider", "providerTerminalId")
      DO UPDATE SET
        "posId" = EXCLUDED."posId",
        "storeId" = EXCLUDED."storeId",
        "externalPosId" = EXCLUDED."externalPosId",
        "operatingMode" = EXCLUDED."operatingMode",
        "active" = true,
        "lastSyncedAt" = NOW(),
        "updatedAt" = NOW()
      RETURNING *
    `;
    return rows[0] || null;
  }

  async deactivateMissingMercadoPagoTerminals(restaurantId: number, providerIds: string[]) {
    if (providerIds.length === 0) {
      await prisma.$executeRaw`
        UPDATE "PaymentTerminal"
        SET "active" = false, "updatedAt" = NOW()
        WHERE "restaurantId" = ${restaurantId}
          AND "provider" = 'MERCADO_PAGO'
      `;
      return;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "PaymentTerminal"
       SET "active" = false, "updatedAt" = NOW()
       WHERE "restaurantId" = $1
         AND "provider" = 'MERCADO_PAGO'
         AND NOT ("providerTerminalId" = ANY($2::text[]))`,
      restaurantId,
      providerIds,
    );
  }

  async findTerminalByPublicId(publicId: string, restaurantId: number) {
    const rows = await prisma.$queryRaw<TerminalRow[]>`
      SELECT
        t.*,
        u."name" AS "courierName"
      FROM "PaymentTerminal" t
      LEFT JOIN "User" u ON u."id" = t."assignedCourierId"
      WHERE t."publicId" = ${publicId}
        AND t."restaurantId" = ${restaurantId}
      LIMIT 1
    `;
    return rows[0] || null;
  }

  async findAssignedTerminal(restaurantId: number, courierId: number) {
    const rows = await prisma.$queryRaw<TerminalRow[]>`
      SELECT
        t.*,
        u."name" AS "courierName"
      FROM "PaymentTerminal" t
      LEFT JOIN "User" u ON u."id" = t."assignedCourierId"
      WHERE t."restaurantId" = ${restaurantId}
        AND t."assignedCourierId" = ${courierId}
        AND t."active" = true
      LIMIT 1
    `;
    return rows[0] || null;
  }

  async assignTerminal(input: {
    publicId: string;
    restaurantId: number;
    courierId: number | null;
    assignedByUserId: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const currentRows = await tx.$queryRaw<TerminalRow[]>`
        SELECT t.*, u."name" AS "courierName"
        FROM "PaymentTerminal" t
        LEFT JOIN "User" u ON u."id" = t."assignedCourierId"
        WHERE t."publicId" = ${input.publicId}
          AND t."restaurantId" = ${input.restaurantId}
        LIMIT 1
      `;
      const current = currentRows[0];
      if (!current) throw new Error('Maquininha não encontrada.');

      if (current.assignedCourierId) {
        await tx.$executeRaw`
          UPDATE "PaymentTerminalAssignment"
          SET "unassignedAt" = NOW()
          WHERE "restaurantId" = ${input.restaurantId}
            AND "terminalId" = ${current.id}
            AND "unassignedAt" IS NULL
        `;
      }

      if (input.courierId) {
        const courierRows = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT "id"
          FROM "User"
          WHERE "id" = ${input.courierId}
            AND "restaurantId" = ${input.restaurantId}
            AND "role" = 'MOTOQUEIRO'
            AND "active" = true
          LIMIT 1
        `;
        if (!courierRows[0]) throw new Error('Motoqueiro ativo não encontrado neste restaurante.');

        await tx.$executeRaw`
          UPDATE "PaymentTerminal"
          SET "assignedCourierId" = NULL, "updatedAt" = NOW()
          WHERE "restaurantId" = ${input.restaurantId}
            AND "assignedCourierId" = ${input.courierId}
            AND "id" <> ${current.id}
        `;
      }

      await tx.$executeRaw`
        UPDATE "PaymentTerminal"
        SET "assignedCourierId" = ${input.courierId}, "updatedAt" = NOW()
        WHERE "id" = ${current.id}
          AND "restaurantId" = ${input.restaurantId}
      `;

      if (input.courierId) {
        await tx.$executeRaw`
          INSERT INTO "PaymentTerminalAssignment" (
            "restaurantId", "terminalId", "courierId", "assignedByUserId", "assignedAt"
          ) VALUES (
            ${input.restaurantId}, ${current.id}, ${input.courierId}, ${input.assignedByUserId}, NOW()
          )
        `;
      }

      const updatedRows = await tx.$queryRaw<TerminalRow[]>`
        SELECT t.*, u."name" AS "courierName"
        FROM "PaymentTerminal" t
        LEFT JOIN "User" u ON u."id" = t."assignedCourierId"
        WHERE t."id" = ${current.id}
        LIMIT 1
      `;
      return updatedRows[0] || null;
    });
  }

  async listActiveCouriers(restaurantId: number) {
    return prisma.$queryRaw<Array<{ id: number; name: string; email: string }>>`
      SELECT "id", "name", "email"
      FROM "User"
      WHERE "restaurantId" = ${restaurantId}
        AND "role" = 'MOTOQUEIRO'
        AND "active" = true
      ORDER BY "name" ASC
    `;
  }

  async findDeliveryPayment(orderId: number, restaurantId: number) {
    const rows = await prisma.$queryRaw<DeliveryPaymentRow[]>`
      SELECT *
      FROM "DeliveryPayment"
      WHERE "orderId" = ${orderId}
        AND "restaurantId" = ${restaurantId}
      LIMIT 1
    `;
    return rows[0] || null;
  }

  async createDeliveryPayment(input: {
    orderId: number;
    restaurantId: number;
    method: 'PIX' | 'CARTAO';
    provider: string;
    amount: number;
    terminalId?: number | null;
  }) {
    const rows = await prisma.$queryRaw<DeliveryPaymentRow[]>`
      INSERT INTO "DeliveryPayment" (
        "publicId", "restaurantId", "orderId", "method", "provider", "status",
        "terminalId", "amount", "currency", "createdAt", "updatedAt"
      ) VALUES (
        ${crypto.randomUUID()}, ${input.restaurantId}, ${input.orderId}, ${input.method},
        ${input.provider}, 'PENDING', ${input.terminalId ?? null}, ${input.amount}, 'BRL', NOW(), NOW()
      )
      ON CONFLICT ("orderId") DO UPDATE SET "updatedAt" = NOW()
      RETURNING *
    `;
    return rows[0] || null;
  }

  async updateDeliveryPaymentProvider(input: {
    orderId: number;
    restaurantId: number;
    providerPaymentId?: string | null;
    providerOrderId?: string | null;
    status?: string;
    lastProviderStatus?: string | null;
    pixCopyPaste?: string | null;
    pixQrCodeBase64?: string | null;
    expiresAt?: Date | null;
  }) {
    const rows = await prisma.$queryRaw<DeliveryPaymentRow[]>`
      UPDATE "DeliveryPayment"
      SET
        "providerPaymentId" = COALESCE(${input.providerPaymentId ?? null}, "providerPaymentId"),
        "providerOrderId" = COALESCE(${input.providerOrderId ?? null}, "providerOrderId"),
        "status" = COALESCE(${input.status ?? null}, "status"),
        "lastProviderStatus" = COALESCE(${input.lastProviderStatus ?? null}, "lastProviderStatus"),
        "pixCopyPaste" = COALESCE(${input.pixCopyPaste ?? null}, "pixCopyPaste"),
        "pixQrCodeBase64" = COALESCE(${input.pixQrCodeBase64 ?? null}, "pixQrCodeBase64"),
        "expiresAt" = COALESCE(${input.expiresAt ?? null}, "expiresAt"),
        "updatedAt" = NOW()
      WHERE "orderId" = ${input.orderId}
        AND "restaurantId" = ${input.restaurantId}
      RETURNING *
    `;
    return rows[0] || null;
  }

  async markDeliveryPaymentPaid(input: {
    orderId: number;
    restaurantId: number;
    providerPaymentId?: string | null;
    providerOrderId?: string | null;
    lastProviderStatus?: string | null;
  }) {
    const rows = await prisma.$queryRaw<DeliveryPaymentRow[]>`
      UPDATE "DeliveryPayment"
      SET
        "status" = 'PAID',
        "providerPaymentId" = COALESCE(${input.providerPaymentId ?? null}, "providerPaymentId"),
        "providerOrderId" = COALESCE(${input.providerOrderId ?? null}, "providerOrderId"),
        "lastProviderStatus" = COALESCE(${input.lastProviderStatus ?? 'paid'}, "lastProviderStatus"),
        "paidAt" = COALESCE("paidAt", NOW()),
        "updatedAt" = NOW()
      WHERE "orderId" = ${input.orderId}
        AND "restaurantId" = ${input.restaurantId}
      RETURNING *
    `;
    return rows[0] || null;
  }

  async findByProviderOrderId(provider: string, providerOrderId: string) {
    const rows = await prisma.$queryRaw<DeliveryPaymentRow[]>`
      SELECT *
      FROM "DeliveryPayment"
      WHERE "provider" = ${provider}
        AND "providerOrderId" = ${providerOrderId}
      LIMIT 1
    `;
    return rows[0] || null;
  }
}

export default new PaymentTerminalRepository();
