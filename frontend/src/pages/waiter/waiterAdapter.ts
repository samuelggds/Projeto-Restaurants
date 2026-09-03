import { formatElapsed } from '../operations/orderAdapter';
import type {
  CallStatus,
  RestaurantTable,
  ServiceCall,
  TableSessionStatus,
  TableStatus,
  WaiterAccountSession,
  WaiterManualPayment,
} from './types';

type GenericRecord = Record<string, unknown>;

const ACTIVE_TABLE_SESSION_STATUSES = new Set(['OPEN', 'CLOSING_REQUESTED']);

function asActiveTableSessionStatus(value: unknown): TableSessionStatus | undefined {
  const status = String(value || '');
  return ACTIVE_TABLE_SESSION_STATUSES.has(status) ? (status as TableSessionStatus) : undefined;
}

export function asRecord(value: unknown): GenericRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as GenericRecord)
    : {};
}

function formatTime(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return undefined;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function mapWaiterTables(raw: unknown[]): RestaurantTable[] {
  return raw.flatMap((value) => {
    const table = asRecord(value);
    if (table.active === false) return [];
    const operational = asRecord(table.operational);
    const sessions = Array.isArray(table.tableSessions) ? table.tableSessions.map(asRecord) : [];
    const openSession = Object.keys(asRecord(operational.openSession)).length
      ? asRecord(operational.openSession)
      : sessions.find((session) => asActiveTableSessionStatus(session.status)) || {};
    const sessionStatus = asActiveTableSessionStatus(
      openSession.status || operational.sessionStatus || table.sessionStatus,
    );
    const status: TableStatus =
      operational.status === 'OCCUPIED' || table.status === 'OCCUPIED' || Boolean(sessionStatus)
        ? 'OCCUPIED'
        : 'FREE';
    const id = String(table.id || '').trim();
    const number = Number(table.number);
    if (!id || !Number.isInteger(number) || number <= 0) return [];

    return [
      {
        id,
        number,
        status,
        sessionStatus: status === 'OCCUPIED' ? sessionStatus || 'OPEN' : undefined,
        sessionId:
          status === 'OCCUPIED'
            ? String(table.sessionId || openSession.id || '').trim() || undefined
            : undefined,
        sessionPublicId:
          status === 'OCCUPIED'
            ? String(table.sessionPublicId || openSession.publicId || '').trim() || undefined
            : undefined,
        guests: Math.max(0, Number(operational.guests ?? table.guests ?? 0) || 0),
        total: Math.max(0, Number(operational.total ?? table.total ?? 0) || 0),
        openedAt: formatTime(table.openedAt || openSession.openedAt),
      },
    ];
  });
}

export function mapWaiterCalls(raw: unknown[], now = Date.now()): ServiceCall[] {
  return raw.flatMap((value) => {
    const call = asRecord(value);
    const table = asRecord(call.table);
    const assignedTo = asRecord(call.assignedTo);
    const type = call.type === 'BILL' ? 'BILL' : call.type === 'WAITER' ? 'WAITER' : null;
    const status = ['WAITING', 'IN_PROGRESS', 'RESOLVED'].includes(String(call.status))
      ? (String(call.status) as CallStatus)
      : null;
    const requestedAt = String(call.requestedAt || call.createdAt || '').trim();
    const tableNumber = Number(table.number || call.tableNumber);
    if (!call.id || !type || !status || !Number.isInteger(tableNumber) || tableNumber <= 0) {
      return [];
    }
    return [
      {
        id: String(call.id),
        tableNumber,
        type,
        status,
        elapsed: requestedAt ? formatElapsed(requestedAt, now) : '00:00',
        employeeName: String(assignedTo.name || call.employeeName || '').trim() || undefined,
        createdAt: requestedAt || undefined,
        resolvedAt: String(call.resolvedAt || '').trim() || undefined,
      },
    ];
  });
}

export function mapWaiterAccountSessions(raw: unknown[]): WaiterAccountSession[] {
  return raw.flatMap((value) => {
    const session = asRecord(value);
    const summary = asRecord(session.summary);
    const paymentCounts = asRecord(session.paymentCounts);
    const tableNumber = Number(session.tableNumber);
    const status = asActiveTableSessionStatus(session.status);
    const sessionPublicId = String(session.sessionPublicId || '').trim();
    if (!sessionPublicId || !status || !Number.isInteger(tableNumber) || tableNumber <= 0)
      return [];

    const pendingManualPayments = (
      Array.isArray(session.pendingManualPayments) ? session.pendingManualPayments : []
    ).flatMap((value): WaiterManualPayment[] => {
      const payment = asRecord(value);
      const method = payment.method;
      const paymentStatus = payment.status;
      const publicId = String(payment.publicId || '').trim();
      if (
        !publicId ||
        (method !== 'CASH' && method !== 'CARD_MACHINE') ||
        (paymentStatus !== 'RESERVED' && paymentStatus !== 'PROCESSING')
      ) {
        return [];
      }
      return [
        {
          publicId,
          method,
          status: paymentStatus,
          totalCents: Math.max(0, Number(payment.totalCents) || 0),
          createdAt: String(payment.createdAt || ''),
        },
      ];
    });

    return [
      {
        tableSessionId: String(session.tableSessionId || ''),
        sessionPublicId,
        tableId: String(session.tableId || ''),
        tableNumber,
        openedAt: String(session.openedAt || ''),
        status,
        openedByName: String(session.openedByName || '').trim() || 'Equipe do salão',
        summary: {
          consumedCents: Math.max(0, Number(summary.consumedCents) || 0),
          netPaidCents: Math.max(0, Number(summary.netPaidCents) || 0),
          reservedCents: Math.max(0, Number(summary.reservedCents) || 0),
          processingCents: Math.max(0, Number(summary.processingCents) || 0),
          remainingCents: Math.max(0, Number(summary.remainingCents) || 0),
          participantsCount: Math.max(0, Number(summary.participantsCount) || 0),
        },
        itemsCount: Math.max(0, Number(session.itemsCount) || 0),
        paymentCounts: {
          reserved: Math.max(0, Number(paymentCounts.reserved) || 0),
          processing: Math.max(0, Number(paymentCounts.processing) || 0),
          online: Math.max(0, Number(paymentCounts.online) || 0),
          inPerson: Math.max(0, Number(paymentCounts.inPerson) || 0),
        },
        pendingManualPayments,
      },
    ];
  });
}
