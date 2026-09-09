export type DemoRole =
  | 'CLIENTE'
  | 'ADMIN'
  | 'MOTOQUEIRO'
  | 'ATENDENTE'
  | 'COZINHA'
  | 'GARCOM';

export type DemoOrderChannel = 'DELIVERY' | 'PICKUP' | 'TABLE';
export type DemoOrderStatus =
  | 'PENDENTE'
  | 'PREPARANDO'
  | 'PRONTO'
  | 'SAIU_PARA_ENTREGA'
  | 'ENTREGUE'
  | 'CANCELADO';
export type DemoPaymentMethod = 'PIX' | 'CARD' | 'CASH';
export type DemoCallStatus = 'WAITING' | 'IN_PROGRESS' | 'RESOLVED';

export type DemoAccount = {
  id: string;
  name: string;
  email: string;
  role: DemoRole;
  passwordFingerprint: string;
  createdAt: string;
};

export type DemoCartLine = {
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
};

export type DemoTable = {
  id: string;
  number: number;
  occupied: boolean;
  guests: number;
  total: number;
};

export type DemoCall = {
  id: string;
  tableNumber: number;
  type: 'WAITER' | 'BILL';
  status: DemoCallStatus;
  createdAt: string;
};

export type DemoState = {
  version: 1;
  accounts: DemoAccount[];
  sessionAccountId: string | null;
  cart: DemoCartLine[];
  orders: DemoOrder[];
  tables: DemoTable[];
  calls: DemoCall[];
  nextOrderNumber: number;
};

export const DEMO_STORAGE_KEY = 'gastronexa:interactive-demo:v1';
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
  CLIENTE: 'Monta o carrinho, envia pedidos e acompanha o andamento.',
  ADMIN: 'Visualiza a operação, pedidos, equipe e indicadores do restaurante.',
  MOTOQUEIRO: 'Retira deliveries prontos, inicia a rota e conclui entregas.',
  ATENDENTE: 'Acompanha a fila, cria pedidos de balcão e resolve pendências.',
  COZINHA: 'Recebe a fila, inicia o preparo e marca pedidos como prontos.',
  GARCOM: 'Acompanha mesas, chamados e entrega pedidos prontos no salão.',
};

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

function demoAccount(role: DemoRole, name: string, email: string, createdAt: string): DemoAccount {
  return {
    id: `demo-${role.toLowerCase()}`,
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
    version: 1,
    accounts: [
      demoAccount('CLIENTE', 'Cliente Demo', 'cliente.demo@gastronexa.local', createdAt),
      demoAccount('ADMIN', 'Admin Demo', 'admin.demo@gastronexa.local', createdAt),
      demoAccount('MOTOQUEIRO', 'Motoqueiro Demo', 'moto.demo@gastronexa.local', createdAt),
      demoAccount('ATENDENTE', 'Atendente Demo', 'atendente.demo@gastronexa.local', createdAt),
      demoAccount('COZINHA', 'Cozinha Demo', 'cozinha.demo@gastronexa.local', createdAt),
      demoAccount('GARCOM', 'Garçom Demo', 'garcom.demo@gastronexa.local', createdAt),
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

export function sanitizeDemoState(value: unknown): DemoState {
  if (!value || typeof value !== 'object') return createInitialDemoState();
  const state = value as Partial<DemoState>;
  if (state.version !== 1) return createInitialDemoState();
  return {
    ...createInitialDemoState(),
    ...state,
    version: 1,
    accounts: Array.isArray(state.accounts) ? state.accounts : [],
    orders: Array.isArray(state.orders) ? state.orders : [],
    cart: Array.isArray(state.cart) ? state.cart : [],
    tables: Array.isArray(state.tables) ? state.tables : [],
    calls: Array.isArray(state.calls) ? state.calls : [],
  };
}

export function getDemoSessionAccount(state: DemoState) {
  return state.accounts.find((account) => account.id === state.sessionAccountId) || null;
}

export function registerDemoAccount(
  state: DemoState,
  input: { name: string; email: string; password: string; role: DemoRole },
  now = Date.now(),
) {
  const name = input.name.trim();
  const email = normalizedEmail(input.email);
  const password = input.password;
  if (name.length < 2) throw new Error('Informe um nome para a conta de demonstração.');
  if (!email.includes('@')) throw new Error('Informe um e-mail válido para a demonstração.');
  if (password.length < 6) throw new Error('A senha de demonstração precisa ter pelo menos 6 caracteres.');
  if (state.accounts.some((account) => normalizedEmail(account.email) === email)) {
    throw new Error('Já existe uma conta de demonstração com este e-mail.');
  }
  const account: DemoAccount = {
    id: `custom-${now}-${state.accounts.length + 1}`,
    name,
    email,
    role: input.role,
    passwordFingerprint: fingerprintDemoPassword(password),
    createdAt: new Date(now).toISOString(),
  };
  return {
    state: { ...state, accounts: [...state.accounts, account], sessionAccountId: account.id },
    account,
  };
}

export function authenticateDemoAccount(state: DemoState, emailInput: string, password: string) {
  const email = normalizedEmail(emailInput);
  const passwordFingerprint = fingerprintDemoPassword(password);
  const account = state.accounts.find(
    (candidate) =>
      normalizedEmail(candidate.email) === email &&
      candidate.passwordFingerprint === passwordFingerprint,
  );
  if (!account) throw new Error('E-mail ou senha de demonstração inválidos.');
  return { state: { ...state, sessionAccountId: account.id }, account };
}

export function selectDemoAccount(state: DemoState, accountId: string | null) {
  if (accountId && !state.accounts.some((account) => account.id === accountId)) return state;
  return { ...state, sessionAccountId: accountId };
}

export function addDemoCartItem(
  state: DemoState,
  product: { id: string; name: string; price: number },
) {
  const existing = state.cart.find((line) => line.productId === product.id);
  const cart = existing
    ? state.cart.map((line) =>
        line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
      )
    : [
        ...state.cart,
        { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1 },
      ];
  return { ...state, cart };
}

export function changeDemoCartQuantity(state: DemoState, productId: string, quantity: number) {
  const safeQuantity = Math.max(0, Math.floor(quantity));
  const cart = safeQuantity === 0
    ? state.cart.filter((line) => line.productId !== productId)
    : state.cart.map((line) =>
        line.productId === productId ? { ...line, quantity: safeQuantity } : line,
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
    customerEmail: normalizedEmail(input.customerEmail || account?.email || 'cliente@gastronexa.local'),
    channel: input.channel,
    tableNumber: input.channel === 'TABLE' ? Number(input.tableNumber || 1) : undefined,
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
    customerEmail: 'balcao@gastronexa.local',
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

export function updateDemoOrderStatus(state: DemoState, orderId: number, status: DemoOrderStatus) {
  return {
    ...state,
    orders: state.orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
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

export function toggleDemoTable(state: DemoState, tableId: string) {
  return {
    ...state,
    tables: state.tables.map((table) =>
      table.id === tableId
        ? {
            ...table,
            occupied: !table.occupied,
            guests: table.occupied ? 0 : 2,
            total: table.occupied ? 0 : table.total,
          }
        : table,
    ),
  };
}
