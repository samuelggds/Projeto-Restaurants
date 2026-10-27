import type { Prisma } from '@prisma/client';

/**
 * A PREPARED dispatch is already an exclusive ADMIN choice of partner
 * delivery. Never expose the order to the restaurant's own couriers while
 * that choice is active, even before a provider booking is attempted.
 *
 * Only explicit, confirmed FAILED/CANCELED dispatches release this claim.
 * Unknown or future states must fail closed (including DONE).
 */
export const EXTERNAL_DISPATCH_RELEASED_OWN_COURIER = [
  'FAILED',
  'CANCELED',
] as const;

export const ownCourierAvailableDispatchScope = {
  OR: [
    { externalDeliveryDispatch: { is: null } },
    {
      externalDeliveryDispatch: {
        is: { status: { in: [...EXTERNAL_DISPATCH_RELEASED_OWN_COURIER] } },
      },
    },
  ],
} satisfies Prisma.OrderWhereInput;

export function assertNoActivePartnerDispatch(status: string | null | undefined) {
  if (
    status &&
    !EXTERNAL_DISPATCH_RELEASED_OWN_COURIER.some((released) => released === status)
  ) {
    throw new Error('Pedido reservado para entrega parceira. Não é possível retirar em paralelo.');
  }
}
