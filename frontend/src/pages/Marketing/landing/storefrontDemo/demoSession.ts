import { demoStores, type DemoSlug } from './catalog';
import type { DemoAddress, DemoBagLine, DemoPayment } from './DemoCheckout';
import type { DemoDeliveryClock, DemoOrder } from './DemoOrders';

export const couponCode = 'VITRINE10';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatPrice = (cents: number) => currency.format(cents / 100);
export const itemCountLabel = (count: number) => `${count} ${count === 1 ? 'item' : 'itens'}`;

export type DemoSession = {
  quantities: Record<string, number>;
  address: DemoAddress | null;
  coupon: boolean;
  loggedIn: boolean;
  orders: DemoOrder[];
};

function createDemoSession(slug: DemoSlug, now: number): DemoSession {
  const product = demoStores[slug].products[0];
  return {
    quantities: {},
    address: null,
    coupon: false,
    loggedIn: false,
    orders: [
      {
        id: '601',
        example: true,
        placedAt: now - 90_000,
        items: [{ name: product.name, quantity: 1 }],
        total: product.price + 500,
        method: 'Pix',
        destination: 'Rua das Flores, 120 · Centro',
      },
    ],
  };
}

export function getBagLines(slug: DemoSlug, session: DemoSession): DemoBagLine[] {
  return demoStores[slug].products
    .filter((item) => session.quantities[item.id] > 0)
    .map(({ id, name, image, price }) => ({
      id,
      name,
      image,
      price,
      quantity: session.quantities[id],
    }));
}

export function getTotals(lines: DemoBagLine[], coupon: boolean) {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const discount = coupon ? Math.round(subtotal * 0.1) : 0;
  const delivery = lines.length ? 500 : 0;
  return { subtotal, discount, delivery, total: subtotal - discount + delivery };
}

type Action =
  | { type: 'add' | 'quantity'; id: string; quantity: number }
  | { type: 'address'; address: DemoAddress }
  | { type: 'coupon' | 'login'; enabled: boolean }
  | { type: 'clock'; id: string; clock: DemoDeliveryClock }
  | { type: 'pay'; method: DemoPayment; time: number };

export type StoreAction = Action & { slug: DemoSlug };
export type DemoSessions = Record<DemoSlug, DemoSession>;

export function initialDemoSessions(now = Date.now()): DemoSessions {
  return {
    'forno-alto': createDemoSession('forno-alto', now),
    'braseiro-burger': createDemoSession('braseiro-burger', now),
    'acai-da-mata': createDemoSession('acai-da-mata', now),
    'salvia-trattoria': createDemoSession('salvia-trattoria', now),
  };
}

export function updateDemoSession(current: DemoSessions, action: StoreAction): DemoSessions {
  const { slug } = action;
  const session = current[slug];
  let next: DemoSession;
  switch (action.type) {
    case 'add':
    case 'quantity': {
      if (
        !Number.isFinite(action.quantity) ||
        !demoStores[slug].products.some((p) => p.id === action.id)
      )
        return current;
      const quantity =
        Math.trunc(action.quantity) +
        (action.type === 'add' ? (session.quantities[action.id] ?? 0) : 0);
      const quantities = { ...session.quantities };
      if (quantity <= 0) delete quantities[action.id];
      else quantities[action.id] = Math.min(quantity, 99);
      next = { ...session, quantities };
      break;
    }
    case 'address':
      next = { ...session, address: action.address };
      break;
    case 'coupon':
      next = { ...session, coupon: action.enabled };
      break;
    case 'login':
      next = { ...session, loggedIn: action.enabled };
      break;
    case 'clock':
      next = {
        ...session,
        orders: session.orders.map((order) =>
          order.id === action.id ? { ...order, deliveryClock: action.clock } : order,
        ),
      };
      break;
    case 'pay': {
      const lines = getBagLines(slug, session);
      if (!lines.length || !session.address) return current;
      const { street, number, district, city } = session.address;
      const order: DemoOrder = {
        id: String(601 + session.orders.length),
        placedAt: action.time,
        items: lines.map(({ name, quantity }) => ({ name, quantity })),
        total: getTotals(lines, session.coupon).total,
        method: action.method,
        destination: [street, number, district, city].filter(Boolean).join(', '),
      };
      next = { ...session, quantities: {}, coupon: false, orders: [order, ...session.orders] };
      break;
    }
  }
  return { ...current, [slug]: next };
}
