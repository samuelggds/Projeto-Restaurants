import type { Prisma } from '@prisma/client';

/**
 * PREPARED is a local quotation reservation, not an external booking.
 * Only a booking already sent to Lalamove, uncertain, or active excludes
 * the restaurant's own couriers. Failed/cancelled preparations cannot
 * block the restaurant's existing delivery workflow.
 */
export const EXTERNAL_DISPATCH_BLOCKING_OWN_COURIER = [
  'DISPATCHING',
  'UNKNOWN',
  'ACTIVE',
] as const;

export const ownCourierAvailableDispatchScope = {
  OR: [
    { externalDeliveryDispatch: { is: null } },
    {
      externalDeliveryDispatch: {
        is: { status: { notIn: [...EXTERNAL_DISPATCH_BLOCKING_OWN_COURIER] } },
      },
    },
  ],
} satisfies Prisma.OrderWhereInput;

export function assertNoActivePartnerDispatch(status: string | null | undefined) {
  if (EXTERNAL_DISPATCH_BLOCKING_OWN_COURIER.some((value) => value === status)) {
    throw new Error('Pedido em despacho com motoboy parceiro. Não é possível retirar em paralelo.');
  }
}
