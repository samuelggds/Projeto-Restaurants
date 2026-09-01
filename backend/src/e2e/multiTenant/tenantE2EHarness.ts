import assert from 'node:assert/strict';
import http from 'node:http';

import bcrypt from 'bcrypt';
import {
  FuncionarioSubRole,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PlanType,
  PrismaClient,
  ProductSaleMode,
  SubscriptionStatus,
  TableOrderFinancialStatus,
  TableOrderSettlementMode,
  UserRole,
} from '@prisma/client';
import { Server as SocketIoServer } from 'socket.io';
import { io as createSocketClient, type Socket as SocketClient } from 'socket.io-client';

import app from '../../app.js';
import runtimePrisma from '../../config/prisma.js';
import authTokenService from '../../modules/auth/services/AuthTokenService.js';
import { registerRealtimeTransport } from '../../realtime/realtimePublisher.js';
import { createSocketIoRealtimeTransport } from '../../realtime/socketIoRealtimeTransport.js';
import { socketAuth } from '../../socket/socketAuth.js';
import { socketHandler } from '../../socket/socketHandler.js';

const SAFE_DATABASE_NAME = /(?:^|[_-])(ci|e2e|test)(?:[_-]|$)/iu;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const ownerDatabaseUrl = String(process.env.TENANT_E2E_OWNER_DATABASE_URL || '').trim();
const prisma = new PrismaClient({ datasources: { db: { url: ownerDatabaseUrl } } });

function assertSafeLoopbackPostgresUrl(value: string, label: string) {
  assert.ok(value, `${label} é obrigatória para a suíte E2E.`);
  const url = new URL(value);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'Somente PostgreSQL é permitido.');
  assert.ok(LOOPBACK_HOSTS.has(url.hostname.toLowerCase()), 'O banco E2E deve ser loopback.');
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  assert.match(databaseName, SAFE_DATABASE_NAME, 'O banco não possui marcador ci/e2e/test.');
}

export function assertDisposableTenantDatabase() {
  const configured = String(process.env.TENANT_E2E_RUNTIME_DATABASE_URL || '').trim();
  const active = String(process.env.DATABASE_URL || '').trim();
  assertSafeLoopbackPostgresUrl(configured, 'TENANT_E2E_RUNTIME_DATABASE_URL');
  assertSafeLoopbackPostgresUrl(ownerDatabaseUrl, 'TENANT_E2E_OWNER_DATABASE_URL');
  assert.equal(
    active,
    configured,
    'DATABASE_URL deve apontar exatamente para a role runtime E2E aprovada.',
  );
  assert.notEqual(
    active,
    ownerDatabaseUrl,
    'As conexões owner e runtime devem usar roles distintas.',
  );
}

export async function resetTenantE2EDatabase() {
  assertDisposableTenantDatabase();
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;
  if (!tables.length) return;
  const identifiers = tables
    .map(({ tablename }) => `"${tablename.replace(/"/gu, '""')}"`)
    .join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`);
}

function accessToken(user: {
  id: number;
  role: string;
  subRole: string | null;
  restaurantId: number | null;
  authVersion: number;
}) {
  return authTokenService.createAccessToken({
    id: user.id,
    role: user.role,
    subRole: user.subRole,
    restaurantId: user.restaurantId,
    authVersion: user.authVersion,
  });
}

export async function seedTenantE2EFixture() {
  const password = await bcrypt.hash('TenantE2E!123456', 4);
  const restaurantA = await prisma.restaurant.create({
    data: {
      name: 'Restaurante A E2E',
      slug: 'restaurante-a-e2e',
      email: 'restaurant-a@tenant-e2e.test',
      active: true,
    },
  });
  const restaurantB = await prisma.restaurant.create({
    data: {
      name: 'Restaurante B E2E',
      slug: 'restaurante-b-e2e',
      email: 'restaurant-b@tenant-e2e.test',
      active: true,
    },
  });

  await prisma.subscription.createMany({
    data: [restaurantA.id, restaurantB.id].map((restaurantId) => ({
      restaurantId,
      plan: PlanType.PREMIUM,
      status: SubscriptionStatus.ATIVA,
      currentPeriodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })),
  });

  const stripeSecretA = 'whsec_tenant_e2e_a';
  const stripeSecretB = 'whsec_tenant_e2e_b';
  const settingsA = await prisma.restaurantSettings.create({
    data: {
      restaurantId: restaurantA.id,
      primaryColor: '#aa1100',
      stripeWebhookSecret: stripeSecretA,
      mercadoPagoAccessToken: 'TEST-tenant-e2e-mercado-pago-a',
      soundNotifications: false,
    },
  });
  const settingsB = await prisma.restaurantSettings.create({
    data: {
      restaurantId: restaurantB.id,
      primaryColor: '#bb2200',
      stripeWebhookSecret: stripeSecretB,
      soundNotifications: false,
    },
  });
  await prisma.tableAccountSettings.createMany({
    data: [restaurantA.id, restaurantB.id].map((restaurantId) => ({
      restaurantId,
      enabled: true,
      allowCash: true,
      allowCardMachine: true,
    })),
  });

  const createUser = (data: {
    name: string;
    email: string;
    role: UserRole;
    restaurantId: number;
    subRole?: FuncionarioSubRole;
  }) =>
    prisma.user.create({
      data: {
        ...data,
        password,
        active: true,
        phone: '11999990000',
        subRole: data.subRole || null,
      },
    });

  const adminA = await createUser({
    name: 'Admin A',
    email: 'admin-a@tenant-e2e.test',
    role: UserRole.ADMIN,
    restaurantId: restaurantA.id,
  });
  const adminB = await createUser({
    name: 'Admin B',
    email: 'admin-b@tenant-e2e.test',
    role: UserRole.ADMIN,
    restaurantId: restaurantB.id,
  });
  const customerA = await createUser({
    name: 'Cliente A',
    email: 'customer-a@tenant-e2e.test',
    role: UserRole.CLIENTE,
    restaurantId: restaurantA.id,
  });
  const customerB = await createUser({
    name: 'Cliente B',
    email: 'customer-b@tenant-e2e.test',
    role: UserRole.CLIENTE,
    restaurantId: restaurantB.id,
  });
  const employeeB = await createUser({
    name: 'Funcionário B',
    email: 'employee-b@tenant-e2e.test',
    role: UserRole.FUNCIONARIO,
    subRole: FuncionarioSubRole.GARCOM,
    restaurantId: restaurantB.id,
  });
  const courierA = await createUser({
    name: 'Motoqueiro A',
    email: 'courier-a@tenant-e2e.test',
    role: UserRole.MOTOQUEIRO,
    restaurantId: restaurantA.id,
  });
  const courierB = await createUser({
    name: 'Motoqueiro B',
    email: 'courier-b@tenant-e2e.test',
    role: UserRole.MOTOQUEIRO,
    restaurantId: restaurantB.id,
  });

  const categoryA = await prisma.category.create({
    data: { name: 'Categoria A', restaurantId: restaurantA.id },
  });
  const categoryB = await prisma.category.create({
    data: { name: 'Categoria B', restaurantId: restaurantB.id },
  });
  const productA = await prisma.product.create({
    data: {
      name: 'Produto A',
      price: 25,
      categoryId: categoryA.id,
      restaurantId: restaurantA.id,
      saleMode: ProductSaleMode.COMPLETE,
    },
  });
  const productB = await prisma.product.create({
    data: {
      name: 'Produto B protegido',
      price: 35,
      image: 'https://tenant-e2e.test/produto-b-original.webp',
      categoryId: categoryB.id,
      restaurantId: restaurantB.id,
      saleMode: ProductSaleMode.COMPLETE,
    },
  });
  const ingredientB = await prisma.ingredient.create({
    data: {
      name: 'Ingrediente B protegido',
      price: 3,
      restaurantId: restaurantB.id,
    },
  });

  const orderA = await prisma.order.create({
    data: {
      total: 25,
      itemsSubtotal: 25,
      type: OrderType.DELIVERY,
      status: OrderStatus.PENDENTE,
      paymentMethod: PaymentMethod.DINHEIRO,
      restaurantId: restaurantA.id,
      userId: customerA.id,
    },
  });
  const orderB = await prisma.order.create({
    data: {
      total: 35,
      itemsSubtotal: 35,
      type: OrderType.DELIVERY,
      status: OrderStatus.PENDENTE,
      paymentMethod: PaymentMethod.DINHEIRO,
      restaurantId: restaurantB.id,
      userId: customerB.id,
    },
  });
  const realtimeOrderB = await prisma.order.create({
    data: {
      total: 35,
      itemsSubtotal: 35,
      type: OrderType.DELIVERY,
      status: OrderStatus.PENDENTE,
      paymentMethod: PaymentMethod.DINHEIRO,
      restaurantId: restaurantB.id,
      userId: customerB.id,
    },
  });
  const deliveryOrderB = await prisma.order.create({
    data: {
      total: 35,
      itemsSubtotal: 35,
      type: OrderType.DELIVERY,
      status: OrderStatus.SAIU_PARA_ENTREGA,
      paymentMethod: PaymentMethod.DINHEIRO,
      restaurantId: restaurantB.id,
      userId: customerB.id,
      assignedCourierId: courierB.id,
      deliveryStartedAt: new Date(),
    },
  });
  const webhookOrderB = await prisma.order.create({
    data: {
      total: 35,
      itemsSubtotal: 35,
      type: OrderType.DELIVERY,
      status: OrderStatus.PENDENTE,
      paymentMethod: PaymentMethod.CARTAO,
      restaurantId: restaurantB.id,
      userId: customerB.id,
      cardCheckoutSessionId: 'checkout-original-b',
    },
  });

  const issueThreadB = await prisma.orderIssueThread.create({
    data: {
      orderId: orderB.id,
      userId: customerB.id,
      restaurantId: restaurantB.id,
      customerName: customerB.name,
      customerPhone: customerB.phone,
      orderStatus: orderB.status,
      orderType: orderB.type,
      paymentMethod: orderB.paymentMethod,
      total: orderB.total,
      orderCreatedAt: orderB.createdAt,
      itemsSummary: ['Produto B protegido'],
      messages: {
        create: { senderType: 'CLIENT', senderName: customerB.name, message: 'Mensagem privada B' },
      },
    },
  });

  const tableA = await prisma.table.create({
    data: { number: 1, token: 'table-a-e2e-token', restaurantId: restaurantA.id },
  });
  const tableB = await prisma.table.create({
    data: { number: 1, token: 'table-b-e2e-token', restaurantId: restaurantB.id },
  });
  const tableSessionB = await prisma.tableSession.create({
    data: {
      restaurantId: restaurantB.id,
      tableId: tableB.id,
      pinHash: await bcrypt.hash('4827', 4),
      sessionToken: 'table-session-b-e2e-token',
      openedById: adminB.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const participantB = await prisma.tableParticipant.create({
    data: {
      restaurantId: restaurantB.id,
      tableSessionId: tableSessionB.id,
      userId: customerB.id,
      displayName: customerB.name,
    },
  });
  const tableOrderB = await prisma.order.create({
    data: {
      total: 35,
      itemsSubtotal: 35,
      type: OrderType.MESA,
      status: OrderStatus.PENDENTE,
      paymentMethod: null,
      settlementMode: TableOrderSettlementMode.TABLE_ACCOUNT,
      tableFinancialStatus: TableOrderFinancialStatus.UNPAID,
      restaurantId: restaurantB.id,
      userId: customerB.id,
      tableId: tableB.id,
      tableSessionId: tableSessionB.id,
      participantId: participantB.id,
      items: {
        create: {
          quantity: 1,
          price: 35,
          productId: productB.id,
          restaurantId: restaurantB.id,
          tableSessionId: tableSessionB.id,
          participantId: participantB.id,
        },
      },
    },
    include: { items: true },
  });
  const tableBillItemB = await prisma.tableBillItem.create({
    data: {
      restaurantId: restaurantB.id,
      tableSessionId: tableSessionB.id,
      participantId: participantB.id,
      orderId: tableOrderB.id,
      orderItemId: tableOrderB.items[0].id,
      unitIndex: 1,
      productName: productB.name,
      unitPriceCents: 3500n,
    },
  });
  const paymentIntentB = await prisma.tablePaymentIntent.create({
    data: {
      restaurantId: restaurantB.id,
      tableSessionId: tableSessionB.id,
      payerParticipantId: participantB.id,
      selectionMode: 'FULL_ACCOUNT',
      method: 'CASH',
      idempotencyKeyHash: 'tenant-e2e-payment-b',
      requestFingerprint: 'tenant-e2e-payment-b-fingerprint',
      subtotalCents: 3500n,
      totalCents: 3500n,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  const couponA = await prisma.coupon.create({
    data: { code: 'COUPON_A', discount: 5, restaurantId: restaurantA.id },
  });
  const couponB = await prisma.coupon.create({
    data: { code: 'COUPON_B', discount: 7, restaurantId: restaurantB.id },
  });
  const supportMessageA = await prisma.supportChatMessage.create({
    data: {
      restaurantId: restaurantA.id,
      senderUserId: courierA.id,
      senderRole: 'MOTOQUEIRO',
      senderLabel: 'Motoqueiro A',
      message: 'Relato interno A',
      issueStatus: 'OPEN',
    },
  });
  const supportMessageB = await prisma.supportChatMessage.create({
    data: {
      restaurantId: restaurantB.id,
      senderUserId: employeeB.id,
      senderRole: 'FUNCIONARIO',
      senderLabel: 'Funcionário B',
      message: 'Relato interno B',
      issueStatus: 'OPEN',
    },
  });
  const closedSupportMessageB = await prisma.supportChatMessage.create({
    data: {
      restaurantId: restaurantB.id,
      senderUserId: employeeB.id,
      senderRole: 'FUNCIONARIO',
      senderLabel: 'Funcionário B',
      message: 'Relato encerrado B',
      issueStatus: 'CLOSED',
      issueClosedAt: new Date(),
    },
  });

  const dueDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
  const invoiceA = await prisma.invoice.create({
    data: {
      restaurantId: restaurantA.id,
      month: 11,
      year: 2098,
      monthlyFee: 100,
      systemFees: 5,
      total: 105,
      dueDate,
    },
  });
  const invoiceB = await prisma.invoice.create({
    data: {
      restaurantId: restaurantB.id,
      month: 12,
      year: 2098,
      monthlyFee: 200,
      systemFees: 10,
      total: 210,
      dueDate,
    },
  });

  const tokens = {
    adminA: accessToken(adminA),
    adminB: accessToken(adminB),
    customerA: accessToken(customerA),
    customerB: accessToken(customerB),
    employeeB: accessToken(employeeB),
    courierA: accessToken(courierA),
    courierB: accessToken(courierB),
  };

  return {
    restaurants: { a: restaurantA, b: restaurantB },
    settings: { a: settingsA, b: settingsB, stripeSecretA, stripeSecretB },
    users: { adminA, adminB, customerA, customerB, employeeB, courierA, courierB },
    categories: { a: categoryA, b: categoryB },
    products: { a: productA, b: productB },
    ingredients: { b: ingredientB },
    orders: {
      a: orderA,
      b: orderB,
      realtimeB: realtimeOrderB,
      deliveryB: deliveryOrderB,
      webhookB: webhookOrderB,
    },
    issueThreadB,
    tables: { a: tableA, b: tableB },
    tableSessionB,
    participantB,
    tableOrderB,
    tableBillItemB,
    paymentIntentB,
    coupons: { a: couponA, b: couponB },
    support: { a: supportMessageA, b: supportMessageB, closedB: closedSupportMessageB },
    invoices: { a: invoiceA, b: invoiceB },
    tokens,
  };
}

export async function startTenantTestApplication() {
  const httpServer = http.createServer(app);
  const ioServer = new SocketIoServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket'],
  });
  ioServer.use(socketAuth);
  ioServer.on('connection', socketHandler);
  const unregisterRealtime = registerRealtimeTransport(createSocketIoRealtimeTransport(ioServer));

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });
  const address = httpServer.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    ioServer,
    async close() {
      unregisterRealtime();
      ioServer.disconnectSockets(true);
      await new Promise<void>((resolve) => ioServer.close(() => resolve()));
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) =>
          httpServer.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  };
}

export async function apiRequest(
  baseUrl: string,
  path: string,
  token?: string,
  options: RequestInit & { json?: unknown } = {},
) {
  const headers = new Headers(options.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  let body = options.body;
  if (options.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(options.json);
  }
  const response = await fetch(`${baseUrl}${path}`, { ...options, body, headers });
  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { response, data };
}

export async function connectTenantSocket(
  baseUrl: string,
  token: string,
  extraAuth: Record<string, unknown> = {},
) {
  const socket = createSocketClient(baseUrl, {
    auth: { ...extraAuth, token },
    transports: ['websocket'],
    reconnection: false,
    timeout: 5_000,
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout ao conectar Socket.IO.')), 6_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return socket;
}

export function waitForSocketEvent<T>(socket: SocketClient, event: string, timeoutMs = 2_000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Evento ${event} não foi recebido em ${timeoutMs}ms.`));
    }, timeoutMs);
    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });
}

export function expectNoSocketEvent(socket: SocketClient, event: string, timeoutMs = 600) {
  return new Promise<void>((resolve, reject) => {
    const handler = (payload: unknown) => {
      clearTimeout(timer);
      reject(new Error(`Evento ${event} vazou para outro tenant: ${JSON.stringify(payload)}`));
    };
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, timeoutMs);
    socket.once(event, handler);
  });
}

export async function emitWithAck<T>(
  socket: SocketClient,
  event: string,
  payload: unknown,
  timeoutMs = 4_000,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Ack de ${event} expirou.`)), timeoutMs);
    socket.emit(event, payload, (result: T) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}

export { prisma, runtimePrisma };
