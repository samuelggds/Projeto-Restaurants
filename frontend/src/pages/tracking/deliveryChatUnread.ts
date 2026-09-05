export type DeliveryChatActorScope = 'customer' | 'courier';

const UNREAD_EVENT = 'delivery-chat-unread-changed';

function storageKey(scope: DeliveryChatActorScope, actorId: number, orderId: number) {
  return `delivery-chat-unread:${scope}:${actorId}:${orderId}`;
}

function safeRead(key: string) {
  if (typeof window === 'undefined') return 0;
  const value = Number(window.localStorage.getItem(key) || 0);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function emit(scope: DeliveryChatActorScope, actorId: number, orderId: number, count: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(UNREAD_EVENT, {
      detail: { scope, actorId, orderId, count },
    }),
  );
}

export function readDeliveryChatUnread(
  scope: DeliveryChatActorScope,
  actorId: number,
  orderId: number,
) {
  if (!actorId || !orderId) return 0;
  return safeRead(storageKey(scope, actorId, orderId));
}

export function incrementDeliveryChatUnread(
  scope: DeliveryChatActorScope,
  actorId: number,
  orderId: number,
) {
  if (typeof window === 'undefined' || !actorId || !orderId) return 0;
  const key = storageKey(scope, actorId, orderId);
  const next = Math.min(99, safeRead(key) + 1);
  window.localStorage.setItem(key, String(next));
  emit(scope, actorId, orderId, next);
  return next;
}

export function clearDeliveryChatUnread(
  scope: DeliveryChatActorScope,
  actorId: number,
  orderId: number,
) {
  if (typeof window === 'undefined' || !actorId || !orderId) return;
  window.localStorage.removeItem(storageKey(scope, actorId, orderId));
  emit(scope, actorId, orderId, 0);
}

export function subscribeDeliveryChatUnread(
  listener: (event: {
    scope: DeliveryChatActorScope;
    actorId: number;
    orderId: number;
    count: number;
  }) => void,
) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as {
      scope?: DeliveryChatActorScope;
      actorId?: number;
      orderId?: number;
      count?: number;
    };
    if (!detail?.scope) return;
    listener({
      scope: detail.scope,
      actorId: Number(detail.actorId || 0),
      orderId: Number(detail.orderId || 0),
      count: Number(detail.count || 0),
    });
  };
  window.addEventListener(UNREAD_EVENT, handler);
  return () => window.removeEventListener(UNREAD_EVENT, handler);
}
