import { sanitizeDemoSupport, type DemoSupportMessage } from './demoSupport';
import { sanitizeDemoAttendant } from './demoAttendantPersistence';
import { demoConfiguredLine, isDemoConfiguration } from './demoProductConfiguration';
import type { ProductConfiguration } from '../../Home/domain/productCustomization';
import type { HomeProduct } from '../../Home/types';
import type { DemoTablePayment } from './demoTableAccount';
export type DemoRole = 'CLIENTE' | 'ADMIN' | 'MOTOQUEIRO' | 'ATENDENTE' | 'COZINHA' | 'GARCOM';

export type DemoOrderChannel = 'DELIVERY' | 'PICKUP' | 'TABLE';
export type DemoOrderStatus =
  'PENDENTE' | 'PREPARANDO' | 'PRONTO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADO';
export type DemoPaymentMethod = 'PIX' | 'CARD' | 'CASH';
export type DemoCallStatus = 'WAITING' | 'IN_PROGRESS' | 'RESOLVED';

export type DemoAccount = {
  active?: boolean;
  id: string;
  name: string;
  email: string;
  role: DemoRole;
  passwordFingerprint: string;
  createdAt: string;
};

export type DemoCartLine = {
  cartId?: string;
  configuration?: ProductConfiguration;
  customizations?: string[];
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type DemoOrder = {
  id: number;
  publicId: string;
  customerName: string;
  customerEmail: string;
  channel: DemoOrderChannel;
  tableNumber?: number;
  items: DemoCartLine[];
  total: number;
  paymentMethod: DemoPaymentMethod;
  paid: boolean;
  status: DemoOrderStatus;
  createdAt: string;
  preparationStartedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
};

export type DemoTable = {
  id: string;
  number: number;
  occupied: boolean;
  guests: number;
  total: number;
  closingRequested?: boolean;
};

export type DemoCall = {
  id: string;
  tableNumber: number;
  type: 'WAITER' | 'BILL';
  status: DemoCallStatus;
  createdAt: string;
};

export type DemoState = {
  supportMessages?: DemoSupportMessage[];
  attendant?: {
    details: Array<[number, import('../../attendant/operation-center/types').Raw]>;
    threads: Array<[number, import('../../attendant/operation-center/types').SupportThread]>;
  };
  courierProfile?: { name: string; email: string; phone: string; role: string };

  version: 2;
  accounts: DemoAccount[];
  sessionAccountId: string | null;
  cart: DemoCartLine[];
  orders: DemoOrder[];
  tables: DemoTable[];
  calls: DemoCall[];
  nextOrderNumber: number;
  tablePayments?: DemoTablePayment[];
};

export const DEMO_STORAGE_KEY = 'gastronexa:interactive-demo:v2';
export const DEMO_DEFAULT_PASSWORD = 'demo1234';

export const demoRoleLabels: Record<DemoRole, string> = {
  CLIENTE: 'Cliente',
  ADMIN: 'Administrador',
  MOTOQUEIRO: 'Motoqueiro',
  ATENDENTE: 'Atendente',
  COZINHA: 'Cozinha',
  GARCOM: 'Garçom',
};

export const demoRoleDescriptions: Record<DemoRole, string> = {
  CLIENTE: 'Navegue no cardápio, monte um pedido e acompanhe o fluxo.',
  ADMIN: 'Acompanhe indicadores, pedidos, equipe e a operação completa.',
  MOTOQUEIRO: 'Retire deliveries prontos, inicie a rota e conclua entregas.',
  ATENDENTE: 'Acompanhe a central, crie pedidos de balcão e veja pendências.',
  COZINHA: 'Receba pedidos, inicie o preparo e marque pedidos como prontos.',
  GARCOM: 'Acompanhe mesas, chamados e pedidos prontos para o salão.',
};

export const demoPortalAccounts = {
  customer: 'demo-cliente',
  admin: 'demo-admin',
  staff: ['demo-atendente', 'demo-garcom', 'demo-cozinha', 'demo-motoqueiro'],
} as const;

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

export function fingerprintDemoPassword(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function demoAccount(
  id: string,
  role: DemoRole,
  name: string,
  email: string,
  createdAt: string,
): DemoAccount {
  return {
    id,
    name,
    email,
    role,
    passwordFingerprint: fingerprintDemoPassword(DEMO_DEFAULT_PASSWORD),
    createdAt,
  };
}

function seedOrders(now: number): DemoOrder[] {
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  return [
    {
      id: 1058,
      publicId: '#1058',
      customerName: 'Marina Lima',
      customerEmail: 'marina@example.test',
      channel: 'DELIVERY',
      items: [
        { productId: 'burger-classic', name: 'Burger Clássico', unitPrice: 32.9, quantity: 2 },
        { productId: 'fries', name: 'Batata crocante', unitPrice: 16.9, quantity: 1 },
      ],
      total: 82.7,
      paymentMethod: 'PIX',
      paid: true,
      status: 'PRONTO',
      createdAt: iso(18),
    },
    {
      id: 1057,
      publicId: '#1057',
      customerName: 'Mesa 08',
      customerEmail: 'mesa08@example.test',
      channel: 'TABLE',
      tableNumber: 8,
      items: [{ productId: 'pizza-house', name: 'Pizza da Casa', unitPrice: 59.9, quantity: 1 }],
      total: 59.9,
      paymentMethod: 'CARD',
      paid: false,
      status: 'PREPARANDO',
      createdAt: iso(13),
    },
    {
      id: 1056,
      publicId: '#1056',
      customerName: 'Carlos Souza',
      customerEmail: 'carlos@example.test',
      channel: 'PICKUP',
      items: [
        { productId: 'combo-nexa', name: 'Combo Nexa', unitPrice: 44.9, quantity: 1 },
        { productId: 'soda', name: 'Refrigerante', unitPrice: 8.9, quantity: 1 },
      ],
      total: 53.8,
      paymentMethod: 'CASH',
      paid: false,
      status: 'PENDENTE',
      createdAt: iso(8),
    },
    {
      id: 1055,
      publicId: '#1055',
      customerName: 'Ana Martins',
      customerEmail: 'ana@example.test',
      channel: 'DELIVERY',
      items: [{ productId: 'pizza-house', name: 'Pizza da Casa', unitPrice: 59.9, quantity: 1 }],
      total: 59.9,
      paymentMethod: 'CARD',
      paid: true,
      status: 'SAIU_PARA_ENTREGA',
      createdAt: iso(31),
    },
    {
      id: 1054,
      publicId: '#1054',
      customerName: 'Mesa 03',
      customerEmail: 'mesa03@example.test',
      channel: 'TABLE',
      tableNumber: 3,
      items: [{ productId: 'combo-nexa', name: 'Combo Nexa', unitPrice: 44.9, quantity: 2 }],
      total: 89.8,
      paymentMethod: 'PIX',
      paid: true,
      status: 'ENTREGUE',
      createdAt: iso(52),
    },
  ];
}

export function createInitialDemoState(now = Date.now()): DemoState {
  const createdAt = new Date(now).toISOString();
  return {
    version: 2,
    accounts: [
      demoAccount(
        'demo-cliente',
        'CLIENTE',
        'Cliente Demo',
        'cliente@demo.gastronexa.com.br',
        createdAt,
      ),
      demoAccount(
        'demo-admin',
        'ADMIN',
        'Administrador Demo',
        'admin@demo.gastronexa.com.br',
        createdAt,
      ),
      demoAccount(
        'demo-atendente',
        'ATENDENTE',
        'Atendente Demo',
        'atendente@demo.gastronexa.com.br',
        createdAt,
      ),
      demoAccount(
        'demo-garcom',
        'GARCOM',
        'Garçom Demo',
        'garcom@demo.gastronexa.com.br',
        createdAt,
      ),
      demoAccount(
        'demo-cozinha',
        'COZINHA',
        'Cozinha Demo',
        'cozinha@demo.gastronexa.com.br',
        createdAt,
      ),
      demoAccount(
        'demo-motoqueiro',
        'MOTOQUEIRO',
        'Motoqueiro Demo',
        'motoqueiro@demo.gastronexa.com.br',
        createdAt,
      ),
    ],
    sessionAccountId: null,
    cart: [],
    orders: seedOrders(now),
    tables: [
      { id: 'table-3', number: 3, occupied: true, guests: 2, total: 89.8 },
      { id: 'table-8', number: 8, occupied: true, guests: 3, total: 59.9 },
      { id: 'table-12', number: 12, occupied: false, guests: 0, total: 0 },
      { id: 'table-15', number: 15, occupied: false, guests: 0, total: 0 },
    ],
    calls: [
      {
        id: 'call-1',
        tableNumber: 8,
        type: 'WAITER',
        status: 'WAITING',
        createdAt: new Date(now - 4 * 60_000).toISOString(),
      },
      {
        id: 'call-2',
        tableNumber: 3,
        type: 'BILL',
        status: 'IN_PROGRESS',
        createdAt: new Date(now - 7 * 60_000).toISOString(),
      },
    ],
    nextOrderNumber: 1059,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isCartLine(value: unknown): value is DemoCartLine {
  if (!isRecord(value)) return false;
  return (
    typeof value.productId === 'string' &&
    typeof value.name === 'string' &&
    isFiniteNumber(value.unitPrice) &&
    value.unitPrice >= 0 &&
    isPositiveInteger(value.quantity) &&
    (value.cartId === undefined || typeof value.cartId === 'string') &&
    (value.configuration === undefined || isDemoConfiguration(value.configuration)) &&
    (value.customizations === undefined ||
      (Array.isArray(value.customizations) &&
        value.customizations.every((item) => typeof item === 'string')))
  );
}

function isOrderChannel(value: unknown): value is DemoOrderChannel {
  return value === 'DELIVERY' || value === 'PICKUP' || value === 'TABLE';
}

function isOrderStatus(value: unknown): value is DemoOrderStatus {
  return (
    value === 'PENDENTE' ||
    value === 'PREPARANDO' ||
    value === 'PRONTO' ||
    value === 'SAIU_PARA_ENTREGA' ||
    value === 'ENTREGUE' ||
    value === 'CANCELADO'
  );
}

function isPaymentMethod(value: unknown): value is DemoPaymentMethod {
  return value === 'PIX' || value === 'CARD' || value === 'CASH';
}

function isDemoOrder(value: unknown): value is DemoOrder {
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isCartLine))
    return false;
  const tableNumberIsValid =
    value.tableNumber === undefined ||
    (isPositiveInteger(value.tableNumber) && value.tableNumber <= 9999);
  return (
    isPositiveInteger(value.id) &&
    typeof value.publicId === 'string' &&
    typeof value.customerName === 'string' &&
    typeof value.customerEmail === 'string' &&
    isOrderChannel(value.channel) &&
    tableNumberIsValid &&
    isFiniteNumber(value.total) &&
    value.total >= 0 &&
    isPaymentMethod(value.paymentMethod) &&
    typeof value.paid === 'boolean' &&
    isOrderStatus(value.status) &&
    typeof value.createdAt === 'string'
  );
}

function isDemoTable(value: unknown): value is DemoTable {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    isPositiveInteger(value.number) &&
    typeof value.occupied === 'boolean' &&
    isNonNegativeInteger(value.guests) &&
    isFiniteNumber(value.total) &&
    value.total >= 0
  );
}

function isCallStatus(value: unknown): value is DemoCallStatus {
  return value === 'WAITING' || value === 'IN_PROGRESS' || value === 'RESOLVED';
}

function isDemoCall(value: unknown): value is DemoCall {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    isPositiveInteger(value.tableNumber) &&
    (value.type === 'WAITER' || value.type === 'BILL') &&
    isCallStatus(value.status) &&
    typeof value.createdAt === 'string'
  );
}

export function sanitizeDemoState(value: unknown): DemoState {
  const fallback = createInitialDemoState();
  if (!isRecord(value) || value.version !== 2) return fallback;

  const orders =
    Array.isArray(value.orders) && value.orders.every(isDemoOrder) ? value.orders : fallback.orders;
  const cart =
    Array.isArray(value.cart) && value.cart.every(isCartLine) ? value.cart : fallback.cart;
  const tables =
    Array.isArray(value.tables) && value.tables.every(isDemoTable) ? value.tables : fallback.tables;
  const calls =
    Array.isArray(value.calls) && value.calls.every(isDemoCall) ? value.calls : fallback.calls;
  const accounts =
    Array.isArray(value.accounts) &&
    value.accounts.length &&
    value.accounts.every(
      (item) =>
        isRecord(item) &&
        ['id', 'name', 'email', 'passwordFingerprint', 'createdAt'].every(
          (key) => typeof item[key] === 'string',
        ) &&
        ['CLIENTE', 'ADMIN', 'MOTOQUEIRO', 'ATENDENTE', 'COZINHA', 'GARCOM'].includes(
          String(item.role),
        ) &&
        (item.active === undefined || typeof item.active === 'boolean'),
    )
      ? (value.accounts as DemoAccount[])
      : fallback.accounts;
  const knownAccountIds = new Set(
    accounts.filter((account) => account.active !== false).map((account) => account.id),
  );
  const sessionAccountId: string | null =
    typeof value.sessionAccountId === 'string' && knownAccountIds.has(value.sessionAccountId)
      ? value.sessionAccountId
      : null;
  const maxOrderId = orders.reduce((max, order) => Math.max(max, order.id), 0);
  const persistedNextOrderNumber = isPositiveInteger(value.nextOrderNumber)
    ? value.nextOrderNumber
    : fallback.nextOrderNumber;
  const nextOrderNumber = Math.max(
    fallback.nextOrderNumber,
    persistedNextOrderNumber,
    maxOrderId + 1,
  );

  return {
    version: 2,
    accounts,
    supportMessages: sanitizeDemoSupport(value.supportMessages),
    attendant: sanitizeDemoAttendant(value.attendant),
    courierProfile:
      isRecord(value.courierProfile) &&
      ['name', 'email', 'phone', 'role'].every(
        (key) => typeof (value.courierProfile as Record<string, unknown>)[key] === 'string',
      )
        ? (value.courierProfile as DemoState['courierProfile'])
        : undefined,
    sessionAccountId,
    cart,
    orders,
    tables,
    calls,
    nextOrderNumber,
    tablePayments: Array.isArray(value.tablePayments)
      ? value.tablePayments.filter(
          (entry): entry is DemoTablePayment =>
            isRecord(entry) &&
            isRecord(entry.payment) &&
            typeof entry.payment.publicId === 'string' &&
            typeof entry.payment.sessionPublicId === 'string' &&
            ['RESERVED', 'PAID', 'CANCELED'].includes(String(entry.payment.status)) &&
            isFiniteNumber(entry.payment.totalCents) &&
            isRecord(entry.allocations) &&
            Object.values(entry.allocations).every(
              (amount) => isFiniteNumber(amount) && amount >= 0,
            ),
        )
      : [],
  };
}

export function getDemoSessionAccount(state: DemoState) {
  return (
    state.accounts.find(
      (account) => account.id === state.sessionAccountId && account.active !== false,
    ) || null
  );
}

export function getDemoAccountByRole(state: DemoState, role: DemoRole) {
  const current = getDemoSessionAccount(state);
  return current?.role === role
    ? current
    : state.accounts.find((account) => account.role === role && account.active !== false) || null;
}

export function authenticateDemoAccount(state: DemoState, emailInput: string, password: string) {
  const email = normalizedEmail(emailInput);
  const passwordFingerprint = fingerprintDemoPassword(password);
  const account = state.accounts.find(
    (candidate) =>
      candidate.active !== false &&
      normalizedEmail(candidate.email) === email &&
      candidate.passwordFingerprint === passwordFingerprint,
  );
  if (!account) throw new Error('E-mail ou senha de demonstração inválidos.');
  return { state: { ...state, sessionAccountId: account.id }, account };
}

export function selectDemoAccount(state: DemoState, accountId: string | null) {
  if (
    accountId &&
    !state.accounts.some((account) => account.id === accountId && account.active !== false)
  )
    return state;
  return { ...state, sessionAccountId: accountId };
}

export function addDemoCartItem(
  state: DemoState,
  product: Pick<HomeProduct, 'id' | 'name' | 'price'> & Partial<HomeProduct>,
  configuration?: ProductConfiguration,
) {
  const line = demoConfiguredLine(product, configuration);
  const key = line.cartId ?? line.productId;
  const existing = state.cart.some((item) => (item.cartId ?? item.productId) === key);
  const cart = existing
    ? state.cart.map((item) =>
        (item.cartId ?? item.productId) === key ? { ...item, quantity: item.quantity + 1 } : item,
      )
    : [...state.cart, line];
  return { ...state, cart };
}

export function changeDemoCartQuantity(state: DemoState, cartId: string, quantity: number) {
  const safeQuantity = Math.max(0, Math.floor(quantity));
  const cart =
    safeQuantity === 0
      ? state.cart.filter((line) => (line.cartId ?? line.productId) !== cartId)
      : state.cart.map((line) =>
          (line.cartId ?? line.productId) === cartId ? { ...line, quantity: safeQuantity } : line,
        );
  return { ...state, cart };
}

export function getDemoCartTotal(state: DemoState) {
  return state.cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

export function createDemoOrder(
  state: DemoState,
  input: {
    channel: DemoOrderChannel;
    paymentMethod: DemoPaymentMethod;
    tableNumber?: number;
    customerName?: string;
    customerEmail?: string;
  },
  now = Date.now(),
) {
  if (state.cart.length === 0) throw new Error('Adicione pelo menos um item ao carrinho.');
  const account = getDemoSessionAccount(state);
  const id = state.nextOrderNumber;
  const order: DemoOrder = {
    id,
    publicId: `#${id}`,
    customerName: input.customerName?.trim() || account?.name || 'Cliente Demo',
    customerEmail: normalizedEmail(
      input.customerEmail || account?.email || 'cliente@demo.gastronexa.com.br',
    ),
    channel: input.channel,
    tableNumber: input.channel === 'TABLE' ? Number(input.tableNumber || 8) : undefined,
    items: state.cart.map((line) => ({ ...line })),
    total: getDemoCartTotal(state),
    paymentMethod: input.paymentMethod,
    paid: input.paymentMethod === 'PIX' || input.paymentMethod === 'CARD',
    status: 'PENDENTE',
    createdAt: new Date(now).toISOString(),
  };
  return {
    state: {
      ...state,
      cart: [],
      orders: [order, ...state.orders],
      nextOrderNumber: id + 1,
    },
    order,
  };
}

export function createManualDemoOrder(state: DemoState, now = Date.now()) {
  const id = state.nextOrderNumber;
  const order: DemoOrder = {
    id,
    publicId: `#${id}`,
    customerName: 'Pedido de balcão',
    customerEmail: 'balcao@demo.gastronexa.com.br',
    channel: 'PICKUP',
    items: [{ productId: 'combo-nexa', name: 'Combo Nexa', unitPrice: 44.9, quantity: 1 }],
    total: 44.9,
    paymentMethod: 'CASH',
    paid: false,
    status: 'PENDENTE',
    createdAt: new Date(now).toISOString(),
  };
  return {
    ...state,
    orders: [order, ...state.orders],
    nextOrderNumber: id + 1,
  };
}

export function updateDemoOrderStatus(
  state: DemoState,
  orderId: number,
  status: DemoOrderStatus,
  now = Date.now(),
) {
  const current = state.orders.find((order) => order.id === orderId);
  if (!current || current.status === status) return state;
  const allowed =
    (status === 'CANCELADO' && !['ENTREGUE', 'CANCELADO'].includes(current.status)) ||
    (current.status === 'PENDENTE' && status === 'PREPARANDO') ||
    (current.status === 'PREPARANDO' && status === 'PRONTO') ||
    (current.status === 'PRONTO' &&
      status === 'SAIU_PARA_ENTREGA' &&
      current.channel === 'DELIVERY') ||
    (current.status === 'PRONTO' &&
      status === 'ENTREGUE' &&
      (current.channel === 'TABLE' || (current.channel === 'PICKUP' && current.paid))) ||
    (current.status === 'SAIU_PARA_ENTREGA' &&
      status === 'ENTREGUE' &&
      current.channel === 'DELIVERY' &&
      current.paid);
  if (!allowed) throw new Error('Esta mudança não é permitida para o canal ou a etapa do pedido.');
  const timestamp = new Date(now).toISOString();
  const stage =
    status === 'PREPARANDO'
      ? { preparationStartedAt: timestamp }
      : status === 'PRONTO'
        ? { readyAt: timestamp }
        : status === 'ENTREGUE'
          ? { deliveredAt: timestamp }
          : {};
  return {
    ...state,
    orders: state.orders.map((order) =>
      order.id === orderId ? { ...order, ...stage, status } : order,
    ),
  };
}

export function toggleDemoOrderPaid(state: DemoState, orderId: number, paid = true) {
  return {
    ...state,
    orders: state.orders.map((order) => (order.id === orderId ? { ...order, paid } : order)),
  };
}

export function updateDemoCallStatus(state: DemoState, callId: string, status: DemoCallStatus) {
  return {
    ...state,
    calls: state.calls.map((call) => (call.id === callId ? { ...call, status } : call)),
  };
}

export function deleteDemoCall(state: DemoState, callId: string) {
  return { ...state, calls: state.calls.filter((call) => call.id !== callId) };
}

export function toggleDemoTable(state: DemoState, tableId: string) {
  return {
    ...state,
    tables: state.tables.map((table) =>
      table.id === tableId
        ? {
            ...table,
            occupied: !table.occupied,
            closingRequested: false,
            guests: table.occupied ? 0 : 2,
            total: table.occupied ? 0 : table.total,
          }
        : table,
    ),
  };
}
