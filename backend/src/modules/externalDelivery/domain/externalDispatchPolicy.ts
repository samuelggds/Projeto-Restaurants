export type DeliveryMode = 'OWN_ONLY' | 'PARTNER_ONLY' | 'BOTH';

type EligibleOrder = {
  restaurantId: number;
  type: string;
  status: string;
  paid: boolean;
  assignedCourierId: number | null;
  refundStatus: string;
};

export type ExternalDispatchContext = {
  restaurantId: number;
  deliveryMode: DeliveryMode;
  providerConnected: boolean;
  providerAccountBelongsToRestaurant: boolean;
  activeOrUncertainBooking: boolean;
};

export function assertExternalDispatchAllowed(
  order: EligibleOrder,
  context: ExternalDispatchContext,
): void {
  if (
    !Number.isSafeInteger(context.restaurantId) ||
    context.restaurantId <= 0 ||
    order.restaurantId !== context.restaurantId
  ) {
    throw new Error('Pedido não pertence ao restaurante autenticado.');
  }
  if (
    context.deliveryMode === 'OWN_ONLY' ||
    !context.providerConnected ||
    !context.providerAccountBelongsToRestaurant
  ) {
    throw new Error('Parceiro externo não habilitado para este restaurante.');
  }
  if (order.type !== 'DELIVERY' || order.status !== 'PRONTO') {
    throw new Error('Somente pedidos de delivery prontos podem ser despachados.');
  }
  if (order.assignedCourierId !== null || context.activeOrUncertainBooking) {
    throw new Error('Pedido já atribuído ou com despacho externo pendente.');
  }
  if (order.refundStatus !== 'NOT_REQUESTED') {
    throw new Error('Pedidos com estorno não podem ser despachados.');
  }
  // External courier cash/card collection requires separate commercial approval.
  if (!order.paid) {
    throw new Error('É necessário confirmar o pagamento antes do despacho externo.');
  }
}

export function assertExternalQuoteApproved(input: {
  restaurantId: number;
  orderId: number;
  quotationRestaurantId: number;
  quotationOrderId: number;
  quotedCents: number;
  approvedCents: number;
  currency: string;
  expiresAt: Date;
  approvedByAdmin: boolean;
  now?: Date;
}): void {
  if (
    !Number.isSafeInteger(input.restaurantId) ||
    input.restaurantId <= 0 ||
    !Number.isSafeInteger(input.orderId) ||
    input.orderId <= 0 ||
    input.quotationRestaurantId !== input.restaurantId ||
    input.quotationOrderId !== input.orderId
  ) {
    throw new Error('Cotação não pertence ao pedido deste restaurante.');
  }
  if (
    !Number.isSafeInteger(input.quotedCents) ||
    input.quotedCents < 0 ||
    input.quotedCents !== input.approvedCents ||
    input.currency !== 'BRL' ||
    !Number.isFinite(input.expiresAt.getTime()) ||
    input.expiresAt.getTime() <= (input.now ?? new Date()).getTime()
  ) {
    throw new Error('Cotação inválida, alterada ou expirada.');
  }
  if (!input.approvedByAdmin) {
    throw new Error('O administrador precisa aprovar o preço da entrega.');
  }
}

export function requiresExternalReconciliation(
  state: 'QUOTED' | 'DISPATCHING' | 'UNKNOWN' | 'ACTIVE' | 'CANCELED' | 'DONE',
): boolean {
  return state === 'DISPATCHING' || state === 'UNKNOWN';
}
