import type {
  Order,
  OrderChannel,
  OrderItemCustomization,
  OrderStatus,
  RestaurantBrand,
} from '../kitchen/types';
import { createRestaurantMonogram } from '../../utils/restaurantMonogram';

type GenericRecord = Record<string, unknown>;

function asRecord(value: unknown): GenericRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as GenericRecord)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function dateIso(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function timeLabel(value: string | undefined): string | undefined {
  return value
    ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : undefined;
}

const VALID_ORDER_STATUSES: OrderStatus[] = [
  'PENDENTE',
  'PREPARANDO',
  'PRONTO',
  'SAIU_PARA_ENTREGA',
  'ENTREGUE',
  'CANCELADO',
];

function orderStatus(value: unknown): OrderStatus {
  const normalized = String(value || '').toUpperCase() as OrderStatus;
  return VALID_ORDER_STATUSES.includes(normalized) ? normalized : 'PENDENTE';
}

function optionName(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  const option = asRecord(value);
  const ingredient = asRecord(option?.ingredient);
  const name = text(option?.name || option?.label || ingredient?.name);
  const quantity = Number(option?.quantity ?? 1);
  return name && Number.isInteger(quantity) && quantity > 1 ? `${quantity}x ${name}` : name;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function itemCustomizations(item: GenericRecord): OrderItemCustomization[] {
  const structured = asArray(item.customizations).flatMap((value, index) => {
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

  const legacyIngredients = unique(asArray(item.ingredients).map(optionName));
  return legacyIngredients.length
    ? [{ groupName: 'Itens escolhidos', options: legacyIngredients }]
    : [];
}

function configurationDetails(item: GenericRecord) {
  const snapshot = asRecord(item.configurationSnapshot);
  const removedComposition = unique(
    asArray(snapshot?.removedComposition ?? item.removedComposition).map((value) => {
      const entry = asRecord(value);
      return text(entry?.name || entry?.ingredientName || value);
    }),
  );
  const portions = asArray(snapshot?.portions ?? item.portions).flatMap((value, index) => {
    const portion = asRecord(value);
    if (!portion) return [];
    const name = text(portion.optionName || portion.name || portion.ingredientName);
    if (!name) return [];
    const fraction = text(portion.fraction) || `Porção ${index + 1}`;
    return [
      {
        label: `${fraction} ${name}`,
        observation: text(portion.observation) || undefined,
      },
    ];
  });
  return { removedComposition, portions };
}

export function formatElapsed(createdAt: string, now = Date.now()): string {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return '00:00';
  const diff = Math.max(0, Math.floor((now - timestamp) / 1000));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  const clock = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${clock}` : clock;
}

export function mapOperationalOrders(raw: unknown[], now = Date.now()): Order[] {
  return raw.flatMap((value) => {
    const record = asRecord(value);
    if (!record) return [];
    const rawId = String(record.id ?? '').trim();
    if (!rawId) return [];
    const type = String(record.type || record.orderType || '').toUpperCase();
    const channel: OrderChannel =
      type === 'MESA' || type === 'TABLE' || type === 'TABLE_SESSION'
        ? 'TABLE'
        : type === 'DELIVERY'
          ? 'DELIVERY'
          : 'PICKUP';
    const tableSession = asRecord(record.tableSession);
    const table = asRecord(record.table) ?? asRecord(tableSession?.table);
    const tableNumber = table?.number ?? record.tableNumber;
    const reference =
      channel === 'TABLE'
        ? `Mesa ${tableNumber ?? '?'}`
        : channel === 'DELIVERY'
          ? 'Delivery'
          : 'Retirada';
    const itemDetails = asArray(record.items).flatMap((value) => {
      const item = asRecord(value);
      if (!item) return [];
      const product = asRecord(item.product);
      const name = text(product?.name || item.productName || item.name || item.title);
      const parsedQuantity = Number(item.quantity);
      const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
      const configuration = configurationDetails(item);

      return [
        {
          name: name || 'Produto',
          quantity,
          customizations: itemCustomizations(item),
          removedComposition: configuration.removedComposition,
          portions: configuration.portions,
          observation: text(item.observation || item.notes) || undefined,
        },
      ];
    });
    const items = itemDetails.map((item) => `${item.quantity}× ${item.name}`);
    const createdAtIso = dateIso(record.createdAt);
    const status = orderStatus(record.status);
    const preparationStartedAt = dateIso(record.preparationStartedAt);
    const readyAt = dateIso(record.readyAt);
    const completedAtIso = dateIso(
      record.completedAt ??
        (status === 'ENTREGUE'
          ? (record.deliveredAt ?? record.updatedAt)
          : status === 'CANCELADO'
            ? record.updatedAt
            : undefined),
    );
    const parsedTotal = Number(record.total);
    const user = asRecord(record.user);
    const customer = asRecord(record.customer);

    return [
      {
        id: `#${rawId.replace(/^#/, '')}`,
        channel,
        reference,
        customer: text(user?.name || customer?.name || record.customerName) || undefined,
        items,
        itemDetails,
        createdAt: timeLabel(createdAtIso) ?? '--:--',
        createdAtIso,
        preparationStartedAt,
        readyAt,
        elapsed: createdAtIso ? formatElapsed(createdAtIso, now) : '00:00',
        status,
        total: Number.isFinite(parsedTotal) ? parsedTotal : 0,
        observation: text(record.observation || record.notes) || undefined,
        completedAt: timeLabel(completedAtIso),
        completedAtIso,
      },
    ];
  });
}

export function mapRestaurantBrand(settings: Record<string, unknown>): RestaurantBrand {
  const restaurant = (settings.restaurant as Record<string, unknown>) ?? settings;
  const name = String(restaurant.name || settings.restaurantName || '');
  return {
    restaurantName: name,
    monogram: createRestaurantMonogram(name),
    primaryColor: String(settings.primaryColor || '#d64d08'),
  };
}
