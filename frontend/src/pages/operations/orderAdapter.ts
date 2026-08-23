import type {
  Order,
  OrderChannel,
  OrderItemCustomization,
  OrderStatus,
  RestaurantBrand,
} from '../kitchen/types';

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

function optionName(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  const option = asRecord(value);
  const ingredient = asRecord(option?.ingredient);
  return text(option?.name || option?.label || ingredient?.name);
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

export function formatElapsed(createdAt: string, now = Date.now()): string {
  const diff = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  const clock = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${clock}` : clock;
}

export function mapOperationalOrders(raw: unknown[], now = Date.now()): Order[] {
  return (raw as Record<string, unknown>[]).map((record) => {
    const type = String(record.type || record.orderType || '').toUpperCase();
    const channel: OrderChannel =
      type === 'MESA' || type === 'TABLE_SESSION'
        ? 'TABLE'
        : type === 'DELIVERY'
          ? 'DELIVERY'
          : 'PICKUP';
    const tableSession = record.tableSession as Record<string, unknown> | null;
    const table = tableSession?.table as Record<string, unknown> | undefined;
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

      return [
        {
          name: name || 'Produto',
          quantity,
          customizations: itemCustomizations(item),
          observation: text(item.observation || item.notes) || undefined,
        },
      ];
    });
    const items = itemDetails.map((item) => `${item.quantity}× ${item.name}`);
    const createdAt = String(record.createdAt || '');
    return {
      id: `#${record.id}`,
      channel,
      reference,
      customer:
        String((record.user as Record<string, unknown>)?.name || record.customerName || '') ||
        undefined,
      items,
      itemDetails,
      createdAt: createdAt
        ? new Date(createdAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '--:--',
      createdAtIso: createdAt || undefined,
      preparationStartedAt: record.preparationStartedAt
        ? String(record.preparationStartedAt)
        : undefined,
      readyAt: record.readyAt ? String(record.readyAt) : undefined,
      elapsed: createdAt ? formatElapsed(createdAt, now) : '00:00',
      status: String(record.status || 'PENDENTE') as OrderStatus,
      total: Number(record.total || 0),
      observation: String(record.observation || record.notes || '') || undefined,
      completedAt: record.completedAt
        ? new Date(String(record.completedAt)).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined,
    };
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
import { createRestaurantMonogram } from '../../utils/restaurantMonogram';
