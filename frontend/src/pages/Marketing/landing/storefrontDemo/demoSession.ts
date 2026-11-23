import { demoStores, type DemoSlug } from './catalog';
import type { DemoAddress, DemoBagLine, DemoPayment } from './DemoCheckout';
import type { DemoDeliveryClock, DemoOrder } from './DemoOrders';

export const couponCode = 'VITRINE10';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatPrice = (cents: number) => currency.format(cents / 100);
export type Fulfillment = 'delivery' | 'pickup';
export type DemoSession = {
  lines: DemoBagLine[];
  address: DemoAddress | null;
  coupon: boolean;
  loggedIn: boolean;
  darkMode: boolean;
  fulfillment: Fulfillment;
  orders: DemoOrder[];
};

function createDemoSession(slug: DemoSlug, now: number): DemoSession {
  const product = demoStores[slug].products[0];
  return {
    lines: [],
    address: null,
    coupon: false,
    loggedIn: false,
    fulfillment: 'delivery',
    darkMode: slug === 'forno-alto' || slug === 'braseiro-burger',
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

export function getTotals(
  lines: DemoBagLine[],
  coupon: boolean,
  fulfillment: Fulfillment = 'delivery',
) {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const discount = coupon ? Math.round(subtotal * 0.1) : 0;
  const delivery = lines.length && fulfillment === 'delivery' ? 500 : 0;
  return { subtotal, discount, delivery, total: subtotal - discount + delivery };
}

type Action =
  | { type: 'add'; id: string; quantity: number; observation?: string }
  | { type: 'quantity'; id: string; quantity: number }
  | { type: 'fulfillment'; method: Fulfillment }
  | { type: 'address'; address: DemoAddress }
  | { type: 'coupon' | 'login' | 'theme'; enabled: boolean }
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
    case 'add': {
      const product = demoStores[slug].products.find((item) => item.id === action.id);
      if (!product || !Number.isSafeInteger(action.quantity) || action.quantity < 1) return current;
      const observation = action.observation?.trim() || undefined;
      const id = observation ? JSON.stringify([product.id, observation]) : product.id;
      const existing = session.lines.find((line) => line.id === id);
      const quantity = Math.min(99, (existing?.quantity ?? 0) + action.quantity);
      const lines = existing
        ? session.lines.map((line) => (line.id === id ? { ...line, quantity } : line))
        : [
            ...session.lines,
            {
              id,
              quantity,
              observation,
              name: product.name,
              image: product.image,
              price: product.price,
            },
          ];
      next = { ...session, lines };
      break;
    }
    case 'quantity': {
      if (!Number.isSafeInteger(action.quantity)) return current;
      const lines =
        action.quantity <= 0
          ? session.lines.filter((line) => line.id !== action.id)
          : session.lines.map((line) =>
              line.id === action.id ? { ...line, quantity: Math.min(99, action.quantity) } : line,
            );
      next = { ...session, lines };
      break;
    }
    case 'address':
      next = { ...session, address: action.address };
      break;
    case 'fulfillment':
      next = { ...session, fulfillment: action.method };
      break;
    case 'coupon':
      next = { ...session, coupon: action.enabled };
      break;
    case 'login':
      next = { ...session, loggedIn: action.enabled };
      break;
    case 'theme':
      next = { ...session, darkMode: action.enabled };
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
      const { lines, address, fulfillment } = session;
      if (!lines.length || (fulfillment === 'delivery' && !address)) return current;
      const order: DemoOrder = {
        id: String(601 + session.orders.length),
        placedAt: action.time,
        items: lines.map(({ name, quantity, observation }) => ({
          name,
          quantity,
          ...(observation ? { observation } : {}),
        })),
        total: getTotals(lines, session.coupon, fulfillment).total,
        method: action.method,
        fulfillmentMethod: fulfillment,
        destination:
          fulfillment === 'pickup'
            ? demoStores[slug].name
            : [address!.street, address!.number, address!.district, address!.city].join(', '),
      };
      next = { ...session, lines: [], coupon: false, orders: [order, ...session.orders] };
      break;
    }
  }
  return { ...current, [slug]: next };
}
