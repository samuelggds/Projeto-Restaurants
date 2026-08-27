export type TableOrderNoticeCustomization = {
  groupName: string;
  options: string[];
};

export type TableOrderNoticeItem = {
  name: string;
  quantity: number;
  observation?: string;
  customizations: TableOrderNoticeCustomization[];
};

export type TableOrderNotice = {
  publicId: string;
  status: string;
  summary: string;
  items: TableOrderNoticeItem[];
  statusLabel: string;
  progress: number;
  cancelled: boolean;
};

const TABLE_STATUS: Record<string, { label: string; progress: number }> = {
  PENDENTE: { label: 'Pedido recebido', progress: 1 },
  PREPARANDO: { label: 'Em preparo', progress: 2 },
  PRONTO: { label: 'Pronto para servir', progress: 3 },
  // Este status pertence ao delivery, mas um dado legado de mesa não deve
  // expor GPS ou linguagem de motoqueiro no cardápio digital.
  SAIU_PARA_ENTREGA: { label: 'Pronto para servir', progress: 3 },
  ENTREGUE: { label: 'Servido na mesa', progress: 4 },
  CANCELADO: { label: 'Pedido cancelado', progress: 0 },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function customizationOptionName(value: unknown) {
  if (typeof value === 'string') return value.trim();
  const record = asRecord(value);
  return String(record?.name || '').trim();
}

function parseCustomizations(item: Record<string, unknown>) {
  const groups = Array.isArray(item.customizations) ? item.customizations : [];
  const customizations = groups.flatMap((value) => {
    const group = asRecord(value);
    if (!group) return [];

    const groupName = String(group.groupName || group.name || '').trim() || 'Escolhas';
    const options = (Array.isArray(group.options) ? group.options : [])
      .map(customizationOptionName)
      .filter(Boolean);
    return options.length ? [{ groupName, options }] : [];
  });

  if (customizations.length) return customizations;

  const ingredients = (Array.isArray(item.ingredients) ? item.ingredients : [])
    .map(customizationOptionName)
    .filter(Boolean);
  return ingredients.length ? [{ groupName: 'Ingredientes', options: ingredients }] : [];
}

function parseItems(order: Record<string, unknown>): TableOrderNoticeItem[] {
  const rawItems = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.orderItems)
      ? order.orderItems
      : [];

  return rawItems.flatMap((value) => {
    const item = asRecord(value);
    if (!item) return [];

    const product = asRecord(item.product);
    const name =
      String(product?.name || item.productName || item.name || '').trim() || 'Item do pedido';
    const quantity = Number(item.quantity);
    const observation = String(item.observation || '').trim();

    return [
      {
        name,
        quantity: Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1,
        ...(observation ? { observation } : {}),
        customizations: parseCustomizations(item),
      },
    ];
  });
}

function summarizeItems(items: TableOrderNoticeItem[]) {
  if (!items.length) return 'Pedido feito pelo cardápio da mesa';

  const firstName = items[0].name;
  return items.length > 1
    ? `${firstName} + ${items.length - 1} ${items.length === 2 ? 'item' : 'itens'}`
    : firstName;
}

export function getTableOrderNotice(order: unknown): TableOrderNotice | null {
  if (!order || typeof order !== 'object' || Array.isArray(order)) return null;

  const record = order as Record<string, unknown>;
  if (String(record.type || '').toUpperCase() !== 'MESA') return null;

  const publicId = record.publicId ?? record.id;
  const status = String(record.status || '').toUpperCase();
  const statusInfo = TABLE_STATUS[status];
  if (publicId == null || !statusInfo) return null;
  const items = parseItems(record);

  return {
    publicId: String(publicId),
    status,
    summary: summarizeItems(items),
    items,
    statusLabel: statusInfo.label,
    progress: statusInfo.progress,
    cancelled: status === 'CANCELADO',
  };
}
