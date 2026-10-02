import { publicOrderPayload } from '../modules/orders/domain/publicOrderPayload.js';

export type RealtimeEmitter = {
  emit(event: string, ...args: unknown[]): unknown;
};

export type RealtimeTransport = RealtimeEmitter & {
  to(room: string): RealtimeEmitter;
};

let activeTransport: RealtimeTransport | null = null;
let warnedAboutMissingTransport = false;

const MINIMAL_ORDER_EVENTS = new Set([
  'new-order',
  'order:status-changed',
  'order:capacity-queued',
]);

function warnAboutMissingTransport() {
  if (warnedAboutMissingTransport || process.env.NODE_ENV === 'test') return;
  warnedAboutMissingTransport = true;
  console.warn('[REALTIME_TRANSPORT_NOT_CONFIGURED]');
}

function orderRealtimeSignal(payload: unknown) {
  const safe = publicOrderPayload(payload);
  if (!safe || typeof safe !== 'object' || Array.isArray(safe)) return safe;

  const record = safe as Record<string, unknown>;
  const candidate =
    record.order && typeof record.order === 'object' && !Array.isArray(record.order)
      ? (record.order as Record<string, unknown>)
      : record;
  const id = Number(candidate.id || candidate.orderId || 0);
  if (!Number.isInteger(id) || id <= 0) return safe;

  const restaurantId = Number(candidate.restaurantId || 0);
  return {
    id,
    ...(candidate.orderId !== undefined ? { orderId: id } : {}),
    ...(Number.isInteger(restaurantId) && restaurantId > 0 ? { restaurantId } : {}),
    ...(candidate.type ? { type: String(candidate.type) } : {}),
    ...(candidate.status ? { status: String(candidate.status) } : {}),
    ...(candidate.paid !== undefined ? { paid: candidate.paid === true } : {}),
    ...(candidate.paymentMethod ? { paymentMethod: String(candidate.paymentMethod) } : {}),
    updatedAt:
      candidate.updatedAt instanceof Date
        ? candidate.updatedAt.toISOString()
        : String(candidate.updatedAt || new Date().toISOString()),
  };
}

function safeRealtimeArgument(event: string, argument: unknown) {
  if (MINIMAL_ORDER_EVENTS.has(event)) return orderRealtimeSignal(argument);
  return publicOrderPayload(argument);
}

/**
 * Porta de saída usada pelos módulos de negócio. Ela evita que um service
 * importe o bootstrap HTTP e, por consequência, abra servidor e jobs em testes.
 *
 * Eventos operacionais de pedido são invalidações, não snapshots completos.
 * O consumidor deve recarregar pela API autorizada. Isso evita distribuir PII,
 * endereços e metadados financeiros a todas as funções conectadas ao realtime.
 */
export const realtimePublisher: RealtimeTransport = {
  emit(event, ...args) {
    if (!activeTransport) {
      warnAboutMissingTransport();
      return false;
    }
    return activeTransport.emit(event, ...args.map((arg) => safeRealtimeArgument(event, arg)));
  },

  to(room) {
    return {
      emit(event, ...args) {
        if (!activeTransport) {
          warnAboutMissingTransport();
          return false;
        }
        return activeTransport
          .to(room)
          .emit(event, ...args.map((arg) => safeRealtimeArgument(event, arg)));
      },
    };
  },
};

/**
 * Registra o adaptador da infraestrutura. O disposer só remove o transporte
 * que esta chamada instalou, impedindo que um bootstrap antigo desligue outro.
 */
export function registerRealtimeTransport(transport: RealtimeTransport) {
  activeTransport = transport;
  warnedAboutMissingTransport = false;

  return () => {
    if (activeTransport === transport) activeTransport = null;
  };
}
