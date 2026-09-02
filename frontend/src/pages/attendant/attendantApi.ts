import api from '../../Services/api';
import type {
  AttendantCall,
  AttendantCallStatus,
  AttendantCallType,
  AttendantOrder,
  AttendantOrderStatus,
  AttendantOrderType,
  AttendantTable,
  AttendantTableStatus,
  AttendantWorkspaceSnapshot,
} from './types';

type UnknownRecord = Record<string, unknown>;

const orderTypes = new Set<AttendantOrderType>(['MESA', 'RETIRADA', 'DELIVERY']);
const orderStatuses = new Set<AttendantOrderStatus>(['PENDENTE', 'PREPARANDO', 'PRONTO']);
const callTypes = new Set<AttendantCallType>(['WAITER', 'BILL']);
const callStatuses = new Set<AttendantCallStatus>(['WAITING', 'IN_PROGRESS', 'RESOLVED']);
const tableStatuses = new Set<AttendantTableStatus>(['OPEN', 'CLOSING_REQUESTED']);

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown) {
  return text(value) || null;
}

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function isoDate(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  const normalized = text(value).toUpperCase() as T;
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeOrder(value: unknown): AttendantOrder | null {
  const input = record(value);
  const id = text(input?.id);
  const createdAt = isoDate(input?.createdAt);
  if (!input || !id || !createdAt) return null;

  const items = (Array.isArray(input.items) ? input.items : []).flatMap((item) => {
    const itemRecord = record(item);
    const productName = text(itemRecord?.productName);
    const quantity = positiveInteger(itemRecord?.quantity);
    return productName && quantity ? [{ productName, quantity }] : [];
  });

  return {
    id,
    code: text(input.code) || id.slice(0, 8).toUpperCase(),
    type: enumValue(input.type, orderTypes, 'RETIRADA'),
    status: enumValue(input.status, orderStatuses, 'PENDENTE'),
    tableNumber: positiveInteger(input.tableNumber),
    customerName: nullableText(input.customerName),
    createdAt,
    readyAt: isoDate(input.readyAt),
    items,
  };
}

function normalizeCall(value: unknown): AttendantCall | null {
  const input = record(value);
  const id = text(input?.id);
  const tableNumber = positiveInteger(input?.tableNumber);
  const requestedAt = isoDate(input?.requestedAt);
  if (!input || !id || !tableNumber || !requestedAt) return null;

  return {
    id,
    tableNumber,
    type: enumValue(input.type, callTypes, 'WAITER'),
    status: enumValue(input.status, callStatuses, 'WAITING'),
    assignedToName: nullableText(input.assignedToName),
    requestedAt,
    assignedAt: isoDate(input.assignedAt),
    resolvedAt: isoDate(input.resolvedAt),
  };
}

function normalizeTable(value: unknown): AttendantTable | null {
  const input = record(value);
  const tableNumber = positiveInteger(input?.tableNumber);
  const openedAt = isoDate(input?.openedAt);
  if (!input || !tableNumber || !openedAt) return null;

  return {
    id: text(input.id) || String(tableNumber),
    tableNumber,
    status: enumValue(input.status, tableStatuses, 'OPEN'),
    openedAt,
    participantCount: count(input.participantCount),
    activeOrderCount: count(input.activeOrderCount),
    activeCallCount: count(input.activeCallCount),
  };
}

export function normalizeAttendantWorkspace(value: unknown): AttendantWorkspaceSnapshot {
  const input = record(value);
  return {
    generatedAt: isoDate(input?.generatedAt) || '',
    orders: (Array.isArray(input?.orders) ? input.orders : []).flatMap((order) => {
      const normalized = normalizeOrder(order);
      return normalized ? [normalized] : [];
    }),
    calls: (Array.isArray(input?.calls) ? input.calls : []).flatMap((call) => {
      const normalized = normalizeCall(call);
      return normalized ? [normalized] : [];
    }),
    tables: (Array.isArray(input?.tables) ? input.tables : []).flatMap((table) => {
      const normalized = normalizeTable(table);
      return normalized ? [normalized] : [];
    }),
  };
}

const attendantApi = {
  async getWorkspace() {
    const response = await api.get('/attendant/workspace');
    return normalizeAttendantWorkspace(response.data);
  },
};

export default attendantApi;
