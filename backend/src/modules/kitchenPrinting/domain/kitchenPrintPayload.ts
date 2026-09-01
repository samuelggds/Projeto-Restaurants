import type { OrderType, PaymentMethod } from '@prisma/client';

type UnknownRecord = Record<string, unknown>;

export type KitchenPrintCustomizationV1 = {
  groupName: string;
  options: string[];
};

export type KitchenPrintPortionV1 = {
  fraction: string;
  optionName: string;
  observation?: string;
};

export type KitchenDeliveryAddressV1 = {
  address?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

export type KitchenPrintPayloadV1 = {
  version: 1;
  kind: 'ORDER';
  restaurantName: string;
  order: {
    publicId: string;
    displayNumber: string;
    createdAt: string;
    type: OrderType;
    tableNumber?: number;
    customerName?: string;
    deliveryAddress?: KitchenDeliveryAddressV1;
    paid: boolean;
    paymentMethod?: PaymentMethod;
    items: Array<{
      quantity: number;
      name: string;
      observation?: string;
      customizations: KitchenPrintCustomizationV1[];
      removedItems?: string[];
      portions?: KitchenPrintPortionV1[];
    }>;
    observation?: string;
    total: number;
  };
};

export type KitchenTestPrintPayloadV1 = {
  version: 1;
  kind: 'TEST';
  restaurantName: string;
  requestedAt: string;
  message: string;
};

export type KitchenPrintPayload = KitchenPrintPayloadV1 | KitchenTestPrintPayloadV1;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionName(value: unknown) {
  if (typeof value === 'string') return value.trim();
  const option = asRecord(value);
  const ingredient = asRecord(option?.ingredient);
  const name = text(option?.name || option?.label || ingredient?.name);
  const quantity = Number(option?.quantity || 1);
  return name && Number.isInteger(quantity) && quantity > 1 ? `${quantity}x ${name}` : name;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

/** Mantém a mesma semântica de customizações exibida pelo adapter da cozinha. */
export function normalizeKitchenItemCustomizations(input: {
  customizations: unknown;
  ingredients: unknown;
}): KitchenPrintCustomizationV1[] {
  const structured = asArray(input.customizations).flatMap((value, index) => {
    const group = asRecord(value);
    if (!group) return [];
    const options = unique(asArray(group.options).map(optionName));
    if (!options.length) return [];
    return [
      {
        groupName: text(group.groupName || group.name || group.label) || `Escolha ${index + 1}`,
        options,
      },
    ];
  });

  if (structured.length) return structured;
  const legacyIngredients = unique(asArray(input.ingredients).map(optionName));
  return legacyIngredients.length
    ? [{ groupName: 'Itens escolhidos', options: legacyIngredients }]
    : [];
}

export function normalizeKitchenConfigurationSnapshot(value: unknown) {
  const snapshot = asRecord(value);
  const removedItems = unique(
    asArray(snapshot?.removedComposition).map((item) => optionName(item)),
  );
  const portions = asArray(snapshot?.portions).flatMap((value) => {
    const portion = asRecord(value);
    if (!portion) return [];
    const fraction = text(portion.fraction);
    const name = text(portion.optionName || portion.name);
    if (!fraction || !name) return [];
    const observation = sanitizeKitchenObservation(portion.observation);
    return [
      {
        fraction,
        optionName: name,
        ...(observation ? { observation } : {}),
      },
    ];
  });
  return { removedItems, portions };
}

const CPF_WITH_LABEL = /(?:\s*\|\s*)?CPF\s*:\s*\d{3}\.?\d{3}\.?\d{3}-?\d{2}/giu;
const CPF_WITHOUT_LABEL = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/gu;
const INTERNAL_GUEST_PREFIX = /^Cliente\s*:\s*[^|]+(?:\s*\|\s*)?/iu;

/**
 * O pedido legado pode ter nome/CPF incorporado na observação. A comanda já
 * possui o nome em campo próprio e nunca deve carregar CPF para a cozinha.
 */
export function sanitizeKitchenObservation(value: unknown) {
  return text(value)
    .replace(CPF_WITH_LABEL, '')
    .replace(CPF_WITHOUT_LABEL, '')
    .replace(INTERNAL_GUEST_PREFIX, '')
    .replace(/^\s*\|\s*|\s*\|\s*$/gu, '')
    .trim();
}

type PrintableOrder = {
  id: number;
  publicId: string;
  createdAt: Date;
  type: OrderType;
  paid: boolean;
  paymentMethod: PaymentMethod | null;
  payOnDeliveryMethod: PaymentMethod | null;
  total: { toString(): string } | number | string;
  observation: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  restaurant: { name: string };
  table: { number: number } | null;
  user: { name: string } | null;
  participant: { displayName: string | null } | null;
  items: Array<{
    quantity: number;
    observation: string | null;
    ingredients: unknown;
    customizations: unknown;
    configurationSnapshot?: unknown;
    product: { name: string };
  }>;
};

function buildDeliveryAddress(order: PrintableOrder): KitchenDeliveryAddressV1 | undefined {
  if (order.type !== 'DELIVERY') return undefined;

  const fields: KitchenDeliveryAddressV1 = {
    ...(text(order.address) ? { address: text(order.address) } : {}),
    ...(text(order.number) ? { number: text(order.number) } : {}),
    ...(text(order.complement) ? { complement: text(order.complement) } : {}),
    ...(text(order.district) ? { district: text(order.district) } : {}),
    ...(text(order.city) ? { city: text(order.city) } : {}),
    ...(text(order.state) ? { state: text(order.state) } : {}),
    ...(text(order.zipCode) ? { zipCode: text(order.zipCode) } : {}),
  };

  return Object.keys(fields).length ? fields : undefined;
}

export function buildKitchenOrderPayload(order: PrintableOrder): KitchenPrintPayloadV1 {
  const observation = sanitizeKitchenObservation(order.observation);
  const customerName = text(order.user?.name || order.participant?.displayName);
  const paymentMethod = order.paymentMethod || order.payOnDeliveryMethod || undefined;
  const deliveryAddress = buildDeliveryAddress(order);

  return {
    version: 1,
    kind: 'ORDER',
    restaurantName: order.restaurant.name,
    order: {
      publicId: order.publicId,
      displayNumber: String(order.id),
      createdAt: order.createdAt.toISOString(),
      type: order.type,
      ...(order.table ? { tableNumber: order.table.number } : {}),
      ...(customerName ? { customerName } : {}),
      ...(deliveryAddress ? { deliveryAddress } : {}),
      paid: order.paid,
      ...(paymentMethod ? { paymentMethod } : {}),
      items: order.items.map((item) => {
        const itemObservation = sanitizeKitchenObservation(item.observation);
        const configuration = normalizeKitchenConfigurationSnapshot(item.configurationSnapshot);
        return {
          quantity: item.quantity,
          name: item.product.name,
          ...(itemObservation ? { observation: itemObservation } : {}),
          customizations: normalizeKitchenItemCustomizations(item),
          ...(configuration.removedItems.length
            ? { removedItems: configuration.removedItems }
            : {}),
          ...(configuration.portions.length ? { portions: configuration.portions } : {}),
        };
      }),
      ...(observation ? { observation } : {}),
      total: Number(order.total),
    },
  };
}

export function buildKitchenTestPayload(
  restaurantName: string,
  requestedAt = new Date(),
): KitchenTestPrintPayloadV1 {
  return {
    version: 1,
    kind: 'TEST',
    restaurantName: restaurantName.trim() || 'Restaurante',
    requestedAt: requestedAt.toISOString(),
    message: 'Conexão com a impressora OK.',
  };
}
