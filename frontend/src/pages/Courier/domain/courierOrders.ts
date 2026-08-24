export type CourierOrder = {
  id?: number;
  type?: string;
  status?: string;
  createdAt?: string;
  deliveredAt?: string;
  items?: unknown[];
  [key: string]: unknown;
};

type GenericRecord = Record<string, unknown>;

const COURIER_STATUSES = new Set(['PRONTO', 'SAIU_PARA_ENTREGA', 'ENTREGUE']);

function asRecord(value: unknown): GenericRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as GenericRecord)
    : null;
}

function normalizedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionName(value: unknown) {
  if (typeof value === 'string') return value.trim();
  const option = asRecord(value);
  const ingredient = asRecord(option?.ingredient);
  return normalizedText(option?.name || option?.label || ingredient?.name);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function getNormalizedOrderStatus(order: CourierOrder): string {
  return String(order.status || '').toUpperCase();
}

export function isCourierDeliveryOrder(order: CourierOrder): boolean {
  return String(order.type || '').toUpperCase() === 'DELIVERY';
}

export function isReadyForCourierPickup(order: CourierOrder): boolean {
  return isCourierDeliveryOrder(order) && getNormalizedOrderStatus(order) === 'PRONTO';
}

export function isCourierVisibleOrder(order: CourierOrder): boolean {
  return isCourierDeliveryOrder(order) && COURIER_STATUSES.has(getNormalizedOrderStatus(order));
}

export function isCourierOrderVisibleToAccount(order: CourierOrder, accountId: number): boolean {
  if (!isCourierVisibleOrder(order) || !Number.isInteger(accountId) || accountId <= 0) return false;
  const assignedCourier = asRecord(order.assignedCourier);
  const assignedCourierId = Number(order.assignedCourierId || assignedCourier?.id || 0);
  return getNormalizedOrderStatus(order) === 'PRONTO'
    ? !assignedCourierId
    : assignedCourierId === accountId;
}

export function normalizeCourierOrders(value: unknown): CourierOrder[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    const order = asRecord(candidate);
    const id = Number(order?.id);
    if (!order || !Number.isInteger(id) || id <= 0) return [];

    const normalized: CourierOrder = {
      ...order,
      id,
      type: String(order.type || '').toUpperCase(),
      status: String(order.status || '').toUpperCase(),
      items: Array.isArray(order.items) ? order.items : [],
    };

    return isCourierVisibleOrder(normalized) ? [normalized] : [];
  });
}

export type CourierItemChoiceGroup = {
  groupName: string;
  options: string[];
};

export function getCourierItemChoices(value: unknown): CourierItemChoiceGroup[] {
  const item = asRecord(value);
  if (!item) return [];

  const structured = (Array.isArray(item.customizations) ? item.customizations : []).flatMap(
    (candidate, index) => {
      const group = asRecord(candidate);
      if (!group) return [];
      const options = unique((Array.isArray(group.options) ? group.options : []).map(optionName));
      if (!options.length) return [];

      return [
        {
          groupName:
            normalizedText(group.groupName || group.name || group.label) || `Escolha ${index + 1}`,
          options,
        },
      ];
    },
  );

  const legacy = unique((Array.isArray(item.ingredients) ? item.ingredients : []).map(optionName));
  const structuredOptions = new Set(structured.flatMap((group) => group.options));
  const legacyOnly = legacy.filter((option) => !structuredOptions.has(option));
  return legacyOnly.length
    ? [...structured, { groupName: 'Itens escolhidos', options: legacyOnly }]
    : structured;
}

export function getCourierItemObservation(value: unknown): string {
  const item = asRecord(value);
  return normalizedText(item?.observation || item?.notes);
}

function createdAtMs(order: CourierOrder): number {
  const parsed = Date.parse(String(order.createdAt || ''));
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function compareReadyForPickupOrders(a: CourierOrder, b: CourierOrder): number {
  const byDate = createdAtMs(a) - createdAtMs(b);
  return byDate !== 0 ? byDate : Number(a.id || 0) - Number(b.id || 0);
}

export function filterCourierOrders(
  orders: CourierOrder[],
  status: string,
  search: string,
): CourierOrder[] {
  const idSearch = search.replace(/\D/g, '');
  return orders.filter(
    (order) =>
      isCourierDeliveryOrder(order) &&
      getNormalizedOrderStatus(order) === status.toUpperCase() &&
      (!idSearch || String(order.id || '').includes(idSearch)),
  );
}
