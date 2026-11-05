import type { Prisma } from '@prisma/client';

/** Image is resolved using the persisted source order item, never a product name. */
export async function nfcComandaItemImageMap(
  tx: Prisma.TransactionClient,
  restaurantId: number,
  rows: ReadonlyArray<{ sourceOrderItemId?: number | null }>,
): Promise<Map<number, string | null>> {
  const ids = [...new Set(rows.map(row => row.sourceOrderItemId).filter(
    (id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0,
  ))];
  if (!ids.length) return new Map();
  const matches = await tx.orderItem.findMany({
    where: { id: { in: ids }, order: { restaurantId } },
    select: { id: true, product: { select: { image: true, restaurantId: true } } },
  });
  return new Map(matches.map(row => [
    row.id,
    row.product.restaurantId === restaurantId ? row.product.image || null : null,
  ]));
}
