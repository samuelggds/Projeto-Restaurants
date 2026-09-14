import { randomUUID } from 'node:crypto';
import type { TenantDbClient } from '../../../database/tenantDbContext.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import orderRepository from '../../orders/repositories/OrderRepository.js';
import paymentTerminalRepository from '../../paymentTerminals/repositories/PaymentTerminalRepository.js';

export type PickupPayment = NonNullable<
  Awaited<ReturnType<typeof paymentTerminalRepository.findDeliveryPayment>>
>;

export async function withLockedPickup<T>(
  orderId: number,
  restaurantId: number,
  callback: (
    tx: TenantDbClient,
    order: NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>,
  ) => Promise<T>,
) {
  return withTenantDbContext(restaurantId, async (tx) => {
    await tx.$queryRaw`
      SELECT "id" FROM "Order"
      WHERE "id" = ${orderId} AND "restaurantId" = ${restaurantId} FOR UPDATE
    `;
    const order = await orderRepository.findById(orderId, restaurantId, tx);
    if (!order || order.type !== 'RETIRADA') throw new Error('Pedido de retirada não encontrado.');
    if (order.status === 'CANCELADO')
      throw new Error('Pedido cancelado não pode receber pagamento.');
    return callback(tx, order);
  });
}

export async function findPickupPayment(tx: TenantDbClient, orderId: number, restaurantId: number) {
  const rows = await tx.$queryRaw<PickupPayment[]>`
    SELECT * FROM "DeliveryPayment" WHERE "orderId" = ${orderId} AND "restaurantId" = ${restaurantId}
  `;
  return rows[0] || null;
}

export async function reservePickupPayment(
  tx: TenantDbClient,
  input: {
    orderId: number;
    restaurantId: number;
    method: 'PIX' | 'CARTAO';
    provider: string;
    amount: number;
    terminalId?: number | null;
  },
) {
  const rows = await tx.$queryRaw<PickupPayment[]>`
    INSERT INTO "DeliveryPayment" (
      "publicId", "restaurantId", "orderId", "method", "provider", "status", "terminalId", "amount", "currency", "lastProviderStatus", "createdAt", "updatedAt"
    ) VALUES (
      ${randomUUID()}, ${input.restaurantId}, ${input.orderId}, ${input.method}, ${input.provider},
      'PENDING', ${input.terminalId ?? null}, ${input.amount}, 'BRL', 'creation_reserved:v1', NOW(), NOW()
    ) RETURNING *
  `;
  if (!rows[0]) throw new Error('Não foi possível reservar a tentativa de pagamento.');
  return rows[0];
}

/** Persist the external reference even when the order was canceled concurrently. */
export async function savePickupProvider(input: {
  payment: PickupPayment;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  pixCopyPaste?: string | null;
  pixQrCodeBase64?: string | null;
  lastProviderStatus: string;
}) {
  return withTenantDbContext(input.payment.restaurantId, async (tx) => {
    const rows = await tx.$queryRaw<PickupPayment[]>`
      UPDATE "DeliveryPayment" SET
        "providerPaymentId" = COALESCE(${input.providerPaymentId ?? null}, "providerPaymentId"),
        "providerOrderId" = COALESCE(${input.providerOrderId ?? null}, "providerOrderId"),
        "pixCopyPaste" = COALESCE(${input.pixCopyPaste ?? null}, "pixCopyPaste"),
        "pixQrCodeBase64" = COALESCE(${input.pixQrCodeBase64 ?? null}, "pixQrCodeBase64"),
        "lastProviderStatus" = CASE WHEN "status" = 'PAID' THEN "lastProviderStatus" ELSE ${input.lastProviderStatus} END,
        "updatedAt" = NOW()
      WHERE "id" = ${input.payment.id} AND "restaurantId" = ${input.payment.restaurantId}
      RETURNING *
    `;
    if (!rows[0]) throw new Error('A tentativa de pagamento não foi encontrada para conciliação.');
    return rows[0];
  });
}

export async function markPickupPaid(
  tx: TenantDbClient,
  payment: PickupPayment,
  providerPaymentId?: string | null,
) {
  await tx.$executeRaw`
    UPDATE "DeliveryPayment" SET "status" = 'PAID', "paidAt" = COALESCE("paidAt", NOW()),
      "providerPaymentId" = COALESCE(${providerPaymentId ?? null}, "providerPaymentId"),
      "lastProviderStatus" = 'paid', "updatedAt" = NOW()
    WHERE "id" = ${payment.id} AND "restaurantId" = ${payment.restaurantId}
  `;
}
