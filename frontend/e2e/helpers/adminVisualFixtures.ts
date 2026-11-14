import type { Page } from '@playwright/test';
import { adminMockSettings, defaultBusinessHours } from '../../src/pages/admin/data';
import { mockAuthRefresh } from './mockAuthRefresh';
import { orderFixtureResponse } from './orderFixtures';

export async function mockAdminVisuals(page: Page) {
  const writes: string[] = [];
  const orders = [
    {
      id: 1048,
      customerName: 'Marina Costa',
      status: 'PREPARANDO',
      total: 89.9,
      paid: true,
      type: 'DELIVERY',
      paymentMethod: 'PIX',
    },
    {
      id: 1047,
      customerName: 'Lucas Oliveira',
      status: 'CONFIRMADO',
      total: 64.9,
      paid: true,
      type: 'RETIRADA',
      paymentMethod: 'CREDIT_CARD',
    },
    {
      id: 1046,
      customerName: 'Ana Ribeiro',
      status: 'ENTREGUE',
      total: 119.8,
      paid: true,
      type: 'DELIVERY',
      paymentMethod: 'PIX',
    },
  ].map((order, index) => ({
    ...order,
    createdAt: new Date().toISOString(),
    userId: 101 + index,
    user: { id: 101 + index, name: order.customerName, email: `cliente${index + 1}@exemplo.test` },
    items: [
      {
        id: index + 1,
        quantity: 1,
        productName: 'Pizza Margherita',
        unitPrice: order.total,
        total: order.total,
      },
    ],
  }));
  const products = [
    {
      id: 1,
      name: 'Pizza Margherita',
      price: 49.9,
      category: { id: 1, name: 'Pizzas tradicionais' },
      image: '/demo/pizza.webp',
      active: true,
    },
    {
      id: 2,
      name: 'Pizza Calabresa',
      price: 54.9,
      category: { id: 1, name: 'Pizzas tradicionais' },
      image: '/demo/pizza.webp',
      active: true,
    },
    {
      id: 3,
      name: 'Refrigerante 350 ml',
      price: 7.9,
      category: { id: 2, name: 'Bebidas' },
      image: '/demo/soda.webp',
      active: true,
    },
    {
      id: 4,
      name: 'Pizza quatro queijos',
      price: 59.9,
      category: { id: 1, name: 'Pizzas tradicionais' },
      active: false,
    },
  ];
  await page.route(/:3000\/|\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname
      .replace(/^\/api/, '')
      .replace(/^\/products\/manage$/, '/products');
    if (!['GET', 'OPTIONS'].includes(request.method())) writes.push(`${request.method()} ${path}`);
    const data: Record<string, unknown> = {
      '/auth/me': { user: { id: 9, name: 'Administrador', role: 'ADMIN', restaurantId: 9 } },
      '/settings': {
        id: 1,
        primaryColor: '#f97316',
        isOpenForOrders: true,
        restaurant: {
          id: 9,
          name: 'Restaurante Exemplo',
          slug: 'restaurante-exemplo',
          address: 'Rua das Palmeiras',
          addressNumber: '123',
          city: 'Cidade Exemplo',
          state: 'SP',
        },
      },
      '/products': { products },
      '/categories': {
        categories: [
          { id: 1, name: 'Pizzas tradicionais' },
          { id: 2, name: 'Bebidas' },
        ],
      },
      '/ingredients': { ingredients: [] },
      '/coupons': { coupons: [] },
      '/banners': [],
      '/employees': [],
      '/billing/invoices': { invoices: [] },
      '/settings/payment-connections': { connections: [] },
      '/table-accounts/settings': adminMockSettings.tableAccount,
      '/table-accounts/admin/sessions': { sessions: [] },
      '/orders/reports/overview': {
        todayOrders: 24,
        sales: 1648.7,
        averageTicket: 68.7,
        preparingOrders: 3,
        customers: 186,
        timezone: 'America/Sao_Paulo',
        registeredSalesTotal: 1789.5,
        confirmedPaymentsToday: 22,
        cancelledOrdersCreatedToday: 1,
        refundedOrdersToday: 0,
      },
    };
    Object.assign(data, extraResponses);
    if (path === '/employees')
      data[path] = (extraResponses[path] as { employees: unknown[] }).employees;
    if (
      path.startsWith('/managed-service/setup-access/') ||
      path.startsWith('/managed-service/remote-support/')
    )
      data[path] = [];
    if (path.startsWith('/employee-compensation/admin/')) data[path] = [];
    const orderResponse = orderFixtureResponse(request.url().replace('/api/', '/'), orders);
    if (
      orderResponse &&
      'summary' in orderResponse &&
      orderResponse.summary &&
      'active' in orderResponse.summary
    ) {
      Object.assign(orderResponse.summary, {
        pending: 1,
        preparing: 1,
        ready: 0,
        onDelivery: 0,
        cancelled: 0,
      });
    }
    await route.fulfill({ json: data[path] ?? orderResponse ?? {} });
  });
  await mockAuthRefresh(page, 9, 'admin-overview-preview-token');
  return writes;
}

const extraResponses: Record<string, unknown> = {
  '/settings': {
    id: 1,
    primaryColor: '#b94a17',
    isOpenForOrders: true,
    businessHours: defaultBusinessHours,
    restaurant: {
      id: 9,
      name: 'Restaurante Exemplo',
      slug: 'restaurante-exemplo',
      logo: '/favicon.png',
      coverImage: '/demo/pizza-hero.webp',
      address: 'Rua das Palmeiras',
      addressNumber: '123',
      addressDistrict: 'Centro',
      city: 'Cidade Exemplo',
      state: 'SP',
      zipCode: '01001000',
    },
  },
  '/employees': {
    employees: [
      {
        id: 21,
        name: 'Ana Cozinha',
        email: 'ana@equipe.test',
        role: 'FUNCIONARIO',
        subRole: 'COZINHA',
        active: true,
        permissions: {},
      },
      {
        id: 22,
        name: 'Bruno Atendimento',
        email: 'bruno@equipe.test',
        role: 'FUNCIONARIO',
        subRole: 'ATENDENTE',
        active: true,
        permissions: {},
      },
      {
        id: 31,
        name: 'Caio Entregas',
        email: 'caio@equipe.test',
        role: 'MOTOQUEIRO',
        active: true,
        permissions: {},
      },
    ],
  },
  '/ingredients': {
    ingredients: [
      {
        id: 1,
        name: 'Muçarela',
        price: 5,
        category: 'Queijos',
        active: true,
        image: '/demo/ingredients/cheese.webp',
      },
    ],
  },
  '/subscription': {
    id: 3,
    plan: 'PREMIUM',
    status: 'ATIVA',
    planChangeEligibility: {
      allowed: true,
      invoiceId: null,
      reason: 'Você pode escolher o plano do próximo ciclo.',
    },
  },
  '/billing/plans': [
    {
      plan: 'BASICO',
      name: 'Entrada',
      monthlyFee: 79.9,
      trialDays: 7,
      features: ['Delivery e cardápio digital', 'Gestão de pedidos e mesas'],
    },
    {
      plan: 'PREMIUM',
      name: 'Avançado',
      monthlyFee: 149.9,
      trialDays: 15,
      features: ['Recursos do Entrada', 'Gestão assistida e suporte prioritário'],
    },
  ],
  '/billing/invoices': {
    invoices: [
      {
        id: 91,
        month: 11,
        year: 2026,
        monthlyFee: 149.9,
        systemFees: 0,
        total: 149.9,
        status: 'PENDENTE',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        paidAt: null,
      },
      {
        id: 90,
        month: 10,
        year: 2026,
        monthlyFee: 149.9,
        systemFees: 0,
        total: 149.9,
        status: 'PAGO',
        dueDate: '2026-10-20T12:00:00Z',
        paidAt: '2026-10-18T12:00:00Z',
      },
    ],
    billing: {
      currentCycle: 2,
      completedMonths: 1,
      currentInvoiceId: 91,
      restaurantCreatedAt: '2026-10-01T12:00:00Z',
      adminCreatedAt: '2026-10-01T12:00:00Z',
      adminName: 'Administrador',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      graceLimitDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      pixAvailableAt: new Date(Date.now() - 86400000).toISOString(),
      pixAvailable: true,
    },
  },
  '/billing/recurring': { billingMethod: 'PIX', autoRenew: false, status: 'INACTIVE' },
  '/billing/recurring/config': { publicKey: 'TEST-preview', provider: 'MERCADO_PAGO' },
  '/managed-service': {
    plan: 'PREMIUM',
    subscriptionStatus: 'ATIVA',
    implementationEligible: true,
    continuousManagementEnabled: false,
    implementation: {
      status: 'EM_IMPLANTACAO',
      productLimit: 30,
      notes: 'Organização inicial do cardápio de demonstração.',
    },
    requests: [],
  },
  '/tables': [
    { id: 1, number: 1, active: true, seatCapacity: 4, qrToken: 'table-preview', restaurantId: 9 },
  ],
  '/table-reservations/tables': [{ id: 1, number: 1, active: true }],
  '/table-reservations/settings': { enabled: true, toleranceMinutes: 15 },
  '/table-reservations': [],
  '/table-reservations/history': { rows: [], total: 0, skip: 0, take: 20 },
  '/table-accounts/settings': { ...adminMockSettings.tableAccount, enabled: true },
  '/kitchen-printing/settings': {
    settings: {
      enabled: true,
      autoPrintEnabled: false,
      autoPrintTrigger: 'NEW_ORDER',
      paperWidth: 'MM80',
      copies: 1,
    },
    agent: null,
    queue: {},
    onlineWindowSeconds: 90,
  },
  '/kitchen-printing/desktop-release': { release: null },
  '/kitchen-printing/jobs': [],
  '/courier-compensation/admin/configuration': {
    timezone: 'America/Sao_Paulo',
    defaultPolicy: {
      model: 'FIXED_PER_DELIVERY',
      fixedAmount: 8,
      baseAmount: 0,
      includedDistanceMeters: 0,
      extraPerKmAmount: 0,
      ranges: [{ maxDistanceMeters: 3000, amount: 0 }],
    },
    couriers: [
      { id: 31, name: 'Caio Entregas', email: 'caio@equipe.test', active: true, override: null },
    ],
  },
  '/courier-compensation/admin/pending-orders': [],
  '/courier-compensation/admin/settlements': [],
  '/nfc-registration/feature-access': { enabled: true },
  '/nfc-registration/customers': { customers: [], total: 0, page: 1, pageSize: 20 },
  '/nfc-registration/linked-customers': {
    customers: [],
    total: 0,
    totalLinked: 0,
    page: 1,
    pageSize: 20,
  },
  '/nfc-registration/cards/inventory': {
    cards: [],
    total: 0,
    page: 1,
    pageSize: 20,
    counts: { READY: 0, PENDING_WRITE: 0, ACTIVE: 0, REVOKED: 0 },
  },
  '/nfc-registration/payment-availability': {
    connected: false,
    pixConfigured: false,
    pointConfigured: false,
    pixEnabled: false,
    pointEnabled: false,
    reason: 'Configure o provedor para receber pagamentos.',
  },
  '/payment-terminals': { terminals: [] },
  '/auth/mfa/authenticator': { enabled: false },
  '/settings/delivery-partners/lalamove': { connected: false, enabled: false },
  '/ai-support/messages': { messages: [] },
  '/ai-support/credits': { remainingUsd: 2, exhausted: false },
  '/ai-support/restaurant/summary': {
    dataUpdatedAt: new Date().toISOString(),
    timeZone: 'America/Sao_Paulo',
    period: { start: new Date().toISOString(), end: new Date().toISOString() },
    sales: {
      registered: { count: 24, total: 1789.5 },
      confirmedPayments: { count: 22, total: 1648.7 },
      cancellations: { count: 1, total: 59.9 },
      refunds: { count: 0, total: 0 },
    },
    priorities: [
      {
        key: 'catalog',
        situation: 'Um produto está indisponível',
        evidence: 'Pizza quatro queijos não aparece para novos pedidos.',
        reason: 'Confira o estoque antes de ativar o produto.',
        target: 'catalog',
        label: 'Revisar cardápio',
      },
    ],
  },
};
