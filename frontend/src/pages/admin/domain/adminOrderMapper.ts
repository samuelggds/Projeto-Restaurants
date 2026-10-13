import type { AdminOrder, AdminOrderItem } from '../types';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalAmount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

function optionName(value: unknown): string | undefined {
  const entry = asRecord(value);
  const ingredient = asRecord(entry.ingredient);
  const name =
    optionalText(value) ??
    optionalText(entry.name) ??
    optionalText(entry.label) ??
    optionalText(ingredient.name);
  if (!name) return undefined;
  const quantity = Number(entry.quantity ?? 1);
  return Number.isInteger(quantity) && quantity > 1 ? `${quantity}x ${name}` : name;
}

function mapAdminOrderItem(value: unknown): AdminOrderItem | null {
  const item = asRecord(value);
  const product = asRecord(item.product);
  const quantity = Number(item.quantity);
  const name =
    optionalText(product.name) ??
    optionalText(item.productName) ??
    optionalText(item.name);
  if (!name || !Number.isSafeInteger(quantity) || quantity <= 0) return null;
  const customizations = Array.isArray(item.customizations) ? item.customizations : [];
  const options = customizations.flatMap((value) => {
    const group = asRecord(value);
    const selected = (Array.isArray(group.options) ? group.options : [])
      .map(optionName)
      .filter((name): name is string => Boolean(name));
    if (!selected.length) return [];
    const groupName =
      optionalText(group.groupName) ?? optionalText(group.name) ?? 'Personalização';
    return [`${groupName}: ${selected.join(', ')}`];
  });
  // Preserve normalized line-item options while supporting raw legacy item snapshots.
  if (!options.length && Array.isArray(item.options)) {
    options.push(
      ...item.options
        .map(optionName)
        .filter((name): name is string => Boolean(name)),
    );
  }
  if (!options.length && Array.isArray(item.ingredients)) {
    options.push(
      ...item.ingredients
        .map(optionName)
        .filter((name): name is string => Boolean(name)),
    );
  }
  const configuration = asRecord(item.configurationSnapshot);
  if (Array.isArray(configuration.removedComposition)) {
    for (const removed of configuration.removedComposition) {
      const entry = asRecord(removed);
      const name = optionalText(entry.name) ?? optionalText(entry.ingredientName);
      if (name) options.push(`Sem ${name}`);
    }
  }
  return {
    id: Number(item.id) || 0,
    name,
    quantity,
    unitPrice: optionalAmount(item.unitPrice ?? item.price),
    observation: optionalText(item.observation),
    options,
  };
}

export function mapAdminOrder(value: unknown): AdminOrder {
  const raw = asRecord(value);
  const user = asRecord(raw.user ?? raw.customer);
  const participant = asRecord(raw.participant);
  const table = asRecord(raw.table);
  const numericId = Number(raw.id ?? 0);
  const refundStatus = String(raw.refundStatus ?? '').toUpperCase();
  const items = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.orderItems) ? raw.orderItems : [];
  const assignedCourierId = Number(raw.assignedCourierId);
  return {
    id: String(raw.orderNumber ?? `#${numericId}`),
    numericId,
    publicId: optionalText(raw.publicId),
    userId: String(raw.userId ?? user.id ?? '') || undefined,
    customerName: String(user.name ?? participant.displayName ?? raw.customerName ?? 'Cliente'),
    customerEmail: optionalText(user.email ?? raw.customerEmail),
    customerPhone: optionalText(user.phone ?? raw.customerPhone),
    tableNumber: Number.isSafeInteger(Number(table.number)) && Number(table.number) > 0
      ? Number(table.number)
      : undefined,
    status: String(raw.status ?? 'PENDENTE'),
    total: Number(raw.total ?? raw.totalAmount ?? 0),
    paid: Boolean(raw.paid ?? raw.paymentConfirmed),
    type: String(raw.type ?? raw.orderType ?? ''),
    paymentMethod: optionalText(raw.paymentMethod),
    payOnDelivery: Boolean(raw.payOnDelivery),
    payOnDeliveryMethod: optionalText(raw.payOnDeliveryMethod),
    createdAt: optionalText(raw.createdAt),
    updatedAt: optionalText(raw.updatedAt),
    paidAt: optionalText(raw.paidAt),
    preparationStartedAt: optionalText(raw.preparationStartedAt),
    readyAt: optionalText(raw.readyAt),
    deliveryStartedAt: optionalText(raw.deliveryStartedAt),
    deliveredAt: optionalText(raw.deliveredAt),
    observation: optionalText(raw.observation),
    items: items.map(mapAdminOrderItem).filter((item): item is AdminOrderItem => item !== null),
    itemsSubtotal: optionalAmount(raw.itemsSubtotal),
    productDiscountTotal: optionalAmount(raw.productDiscountTotal),
    couponDiscount: optionalAmount(raw.couponDiscount),
    deliveryFeeAmount: optionalAmount(raw.deliveryFeeAmount),
    couponCode: optionalText(raw.couponCode),
    assignedCourierId: Number.isSafeInteger(assignedCourierId) && assignedCourierId > 0
      ? assignedCourierId
      : undefined,
    capacityQueuedAt: optionalText(raw.capacityQueuedAt),
    capacityAdmittedAt: optionalText(raw.capacityAdmittedAt),
    refundStatus: ['NOT_REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED'].includes(refundStatus)
      ? (refundStatus as AdminOrder['refundStatus'])
      : undefined,
    refundRequestedAt: optionalText(raw.refundRequestedAt),
    refundedAt: optionalText(raw.refundedAt),
    refundFailureReason: optionalText(raw.refundFailureReason),
    refundProvider: optionalText(raw.refundProvider),
    refundExternalId: optionalText(raw.refundExternalId),
  };
}
