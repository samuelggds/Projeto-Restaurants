import { AxiosError, type AxiosAdapter } from 'axios';
import type { OrderCustomersPage } from '../../../Services/ordersService';
import type { DemoState, DemoOrderStatus } from './demoDomain';
import { toggleDemoOrderPaid, updateDemoOrderStatus } from './demoDomain';

export function demoApiOrders(state: DemoState) {
  return state.orders.map((order) => ({
    ...order,
    orderNumber: order.publicId,
    type: order.channel === 'TABLE' ? 'MESA' : order.channel === 'PICKUP' ? 'RETIRADA' : 'DELIVERY',
    user: { name: order.customerName, email: order.customerEmail },
    paymentMethod:
      order.paymentMethod === 'CASH'
        ? 'DINHEIRO'
        : order.paymentMethod === 'CARD'
          ? 'CARTAO'
          : 'PIX',
    payOnDelivery: order.channel === 'DELIVERY' && order.paymentMethod === 'CASH',
    payOnDeliveryMethod: 'DINHEIRO',
    items: order.items.map((item) => ({
      quantity: item.quantity,
      price: item.unitPrice,
      product: { name: item.name },
    })),
  }));
}

export type DemoAdminRuntime = {
  records: [string, unknown][];
  sequence: number;
  printer: {
    enabled: boolean;
    autoPrintEnabled: boolean;
    autoPrintTrigger: string;
    paperWidth: string;
    copies: number;
  };
  jobs: Record<string, unknown>[];
  compensation: {
    timezone: string;
    defaultPolicy: {
      model: string;
      fixedAmount: number;
      baseAmount: number;
      includedDistanceMeters: number;
      extraPerKmAmount: number;
      ranges: unknown[];
    };
    couriers: { id: number; name: string; email: string; active: boolean; override: unknown }[];
  };
};

// This adapter exists only in demo-admin.html. No request can fall through to HTTP.
export function createDemoAdminApi(
  getState: () => DemoState,
  update: (state: DemoState) => void,
  runtime?: DemoAdminRuntime,
  onRuntimeChange?: (runtime: DemoAdminRuntime) => void,
): AxiosAdapter {
  const records = new Map<string, unknown>(runtime?.records ?? []);
  let sequence = runtime?.sequence ?? 1;
  let printer = runtime?.printer ?? {
    enabled: true,
    autoPrintEnabled: false,
    autoPrintTrigger: 'NEW_ORDER',
    paperWidth: 'MM80',
    copies: 1,
  };
  const jobs: Record<string, unknown>[] = runtime?.jobs ?? [];
  const defaultPolicy = {
    model: 'FIXED_PER_DELIVERY',
    fixedAmount: 5,
    baseAmount: 0,
    includedDistanceMeters: 0,
    extraPerKmAmount: 0,
    ranges: [],
  };
  let compensation = runtime?.compensation ?? {
    timezone: 'America/Sao_Paulo',
    defaultPolicy,
    couriers: [
      {
        id: 6,
        name: 'Motoqueiro Demo',
        email: 'motoqueiro@demo.gastronexa.com.br',
        active: true,
        override: null,
      },
    ],
  };
  return async (config) => {
    const state = getState();
    const path = new URL(config.url ?? '/', 'https://demo.invalid').pathname;
    const method = (config.method ?? 'get').toUpperCase();
    const body: Record<string, unknown> =
      typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data ?? {});
    const query = config.params ?? {};
    const response = (data: unknown) => {
      if (method !== 'GET')
        onRuntimeChange?.({ records: [...records], sequence, printer, jobs, compensation });
      return {
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    const orders = demoApiOrders(state);
    if (path === '/orders' && method === 'GET') {
      let filtered = orders.filter(
        (order) =>
          (!query.status || order.status === query.status) &&
          (!query.search ||
            `${order.id} ${order.customerName}`
              .toLowerCase()
              .includes(String(query.search).toLowerCase().replace('#', ''))),
      );
      if (query.issuesOnly) filtered = [];
      if (query.queue === 'ACTIVE')
        filtered = filtered.filter((order) => !['ENTREGUE', 'CANCELADO'].includes(order.status));
      if (query.queue === 'PAYMENT')
        filtered = filtered.filter((order) => !order.paid && order.status !== 'CANCELADO');
      if (query.queue === 'IN_PROGRESS')
        filtered = filtered.filter((order) =>
          ['PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA'].includes(order.status),
        );
      if (query.queue === 'DELIVERED')
        filtered = filtered.filter((order) => order.status === 'ENTREGUE');
      if (query.queue === 'HISTORY')
        filtered = filtered.filter((order) => ['ENTREGUE', 'CANCELADO'].includes(order.status));
      const total = filtered.length;
      if (query.cursor) filtered = filtered.filter((order) => order.id < Number(query.cursor));
      const page = filtered.slice(0, Number(query.limit) || 10);
      const hasMore = filtered.length > page.length;
      return response({
        orders: page,
        total,
        hasMore,
        nextCursor: hasMore ? page.at(-1)?.id : null,
        summary: {
          total: orders.length,
          active: orders.filter((order) => !['ENTREGUE', 'CANCELADO'].includes(order.status))
            .length,
          awaitingPayment: orders.filter((order) => !order.paid && order.status !== 'CANCELADO')
            .length,
          inProgress: orders.filter((order) =>
            ['PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA'].includes(order.status),
          ).length,
          delivered: orders.filter((order) => order.status === 'ENTREGUE').length,
        },
      });
    }
    if (path === '/orders/reports/overview' && method === 'GET') {
      const active = orders.filter((order) => order.status !== 'CANCELADO');
      const sales = active.reduce((total, order) => total + order.total, 0);
      return response({
        todayOrders: orders.length,
        sales,
        averageTicket: active.length ? sales / active.length : 0,
        preparingOrders: orders.filter((order) => order.status === 'PREPARANDO').length,
        customers: new Set(orders.map((order) => order.customerEmail)).size,
        timezone: 'America/Sao_Paulo',
      });
    }
    if (path === '/orders/reports/customers' && method === 'GET') {
      const visibleOrders = state.orders.filter(
        (order) => order.channel === 'TABLE' || order.paid || order.paymentMethod === 'CASH',
      );
      const customers = [...new Set(visibleOrders.map((order) => order.customerEmail))].map(
        (email) => {
          const own = visibleOrders.filter((order) => order.customerEmail === email);
          return {
            key: email,
            name: own[0].customerName,
            email,
            count: own.length,
            total: own.reduce((total, order) => total + order.total, 0),
          };
        },
      );
      const search = String(query.search ?? '')
        .trim()
        .toLocaleLowerCase('pt-BR');
      const filtered = customers.filter((customer) =>
        `${customer.name} ${customer.email}`.toLocaleLowerCase('pt-BR').includes(search),
      );
      filtered.sort((a, b) => {
        const keyOrder = a.key.localeCompare(b.key, 'pt-BR');
        if (query.sort === 'NAME') return a.name.localeCompare(b.name, 'pt-BR') || keyOrder;
        if (query.sort === 'ORDERS') return b.count - a.count || b.total - a.total || keyOrder;
        return b.total - a.total || b.count - a.count || keyOrder;
      });
      const offset =
        Number.isSafeInteger(Number(query.offset)) && Number(query.offset) >= 0
          ? Number(query.offset)
          : 0;
      const limit =
        Number.isSafeInteger(Number(query.limit)) && Number(query.limit) > 0
          ? Math.min(Number(query.limit), 100)
          : 12;
      const page = filtered.slice(offset, offset + limit);
      const hasMore = offset + page.length < filtered.length;
      const result: OrderCustomersPage = {
        customers: page,
        total: filtered.length,
        hasMore,
        nextOffset: hasMore ? offset + page.length : null,
        summary: {
          customers: customers.length,
          returningCustomers: customers.filter((customer) => customer.count > 1).length,
          totalOrders: visibleOrders.length,
          totalMoved: visibleOrders.reduce((total, order) => total + order.total, 0),
        },
      };
      return response(result);
    }
    const pickup = path.match(/^\/pickup-payments\/(\d+)\/(start|reconcile|cash)$/);
    if (pickup && method === 'POST') {
      const order = state.orders.find(
        (order) => order.id === Number(pickup[1]) && order.channel === 'PICKUP',
      );
      if (order) {
        const paid = order.paid || pickup[2] !== 'start';
        if (paid) update(toggleDemoOrderPaid(state, order.id));
        return response({
          paid,
          order,
          payment: {
            orderId: order.id,
            method: body.method ?? order.paymentMethod,
            provider: 'DEMO',
            status: paid ? 'PAID' : 'PENDING',
            amount: order.total,
            pixCopyPaste: 'DEMONSTRACAO-SEM-VALOR-DE-PAGAMENTO',
          },
        });
      }
    }
    if (path.startsWith('/payment-terminals') && method === 'GET')
      return response({
        terminals: [
          {
            publicId: 'demo-terminal',
            provider: 'DEMO',
            providerTerminalId: 'demo',
            serial: 'DEMO',
            operatingMode: 'PDV',
            active: true,
          },
        ],
        couriers: compensation.couriers,
      });
    const orderAction = path.match(
      /^\/orders\/(\d+)(?:\/(cancel|confirm-payment|status|refund|issue-thread))?$/,
    );
    if (orderAction) {
      const order = orders.find((item) => item.id === Number(orderAction[1]));
      const action = orderAction[2];
      if (order && method === 'GET' && !action) return response(order);
      if (order && method === 'GET' && action === 'issue-thread')
        return response({ messages: [], hasMore: false });
      if (
        order &&
        ['PATCH', 'PUT', 'POST'].includes(method) &&
        ['cancel', 'confirm-payment', 'status'].includes(action)
      ) {
        const next =
          action === 'confirm-payment'
            ? toggleDemoOrderPaid(state, order.id)
            : updateDemoOrderStatus(
                state,
                order.id,
                action === 'cancel' ? 'CANCELADO' : (body.status as DemoOrderStatus),
              );
        update(next);
        return response(demoApiOrders(next).find((item) => item.id === order.id));
      }
      // Refunds need a payment provider. Never report success for a skipped operation.
    }
    if (path === '/tables') {
      if (method === 'POST') {
        const table = {
          id: `demo-table-${sequence++}`,
          number: Number(body.number),
          occupied: false,
          guests: 0,
          total: 0,
        };
        update({ ...state, tables: [...state.tables, table] });
        return response({ ...table, restaurantId: 999999, token: `demo-${table.id}` });
      }
      return response(
        state.tables.map((table) => ({
          ...table,
          restaurantId: 999999,
          token: `demo-${table.id}`,
          active: true,
          status: table.occupied ? 'OCCUPIED' : 'FREE',
        })),
      );
    }
    if (path.startsWith('/tables/')) {
      const id = path.split('/').at(-1);
      if (method === 'DELETE')
        update({ ...state, tables: state.tables.filter((table) => table.id !== id) });
      return response({ success: true });
    }
    if (path === '/kitchen-printing/settings') {
      if (method !== 'GET') {
        printer = { ...printer, ...body };
        return response(printer);
      }
      return response({
        settings: printer,
        agent: {
          publicId: 'demo-printer',
          name: 'Impressora fictícia',
          printerName: 'Demo 80 mm',
          lastSeenAt: new Date().toISOString(),
          appVersion: 'Demo',
          online: true,
        },
        queue: { PRINTED: jobs.length },
        onlineWindowSeconds: 90,
      });
    }
    if (path === '/kitchen-printing/jobs') return response(jobs);
    if (path === '/kitchen-printing/test') {
      const publicId = `demo-print-${sequence++}`;
      jobs.unshift({
        publicId,
        orderId: null,
        type: 'TEST',
        source: 'TEST',
        trigger: null,
        status: 'PRINTED',
        attempts: 1,
        availableAt: new Date().toISOString(),
        printedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastError: null,
      });
      return response({ jobPublicId: publicId, status: 'PRINTED' });
    }
    if (path === '/kitchen-printing/devices/credential')
      return response({
        device: { publicId: 'demo-printer', name: 'Impressora fictícia' },
        credential: 'DEMO-SEM-ACESSO-A-IMPRESSORAS-REAIS',
        shownOnce: true,
      });
    if (path.startsWith('/kitchen-printing/devices/')) return response({ success: true });
    if (path === '/courier-compensation/admin/configuration') {
      if (method !== 'GET')
        compensation = {
          ...compensation,
          timezone: String(body.timezone ?? compensation.timezone),
          defaultPolicy: {
            ...compensation.defaultPolicy,
            ...((body.defaultPolicy as Partial<typeof defaultPolicy>) ?? {}),
          },
        };
      return response(compensation);
    }
    if (path.startsWith('/courier-compensation/') || path.startsWith('/employee-compensation/')) {
      const key = path.replace(/\/\d+\/(approve|reject|pay)$/, '');
      if (method === 'GET') return response(records.get(key) ?? []);
      const entry = {
        ...body,
        id: sequence++,
        publicId: `demo-entry-${sequence}`,
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        items: [],
        payments: [],
      };
      const current = records.get(key);
      records.set(key, [...(Array.isArray(current) ? current : []), entry]);
      return response(entry);
    }
    if (path === '/billing/plans')
      return response([
        {
          plan: 'BASICO',
          name: 'Básico',
          monthlyFee: 149.9,
          trialDays: 30,
          features: ['Delivery', 'Cardápio digital'],
        },
        {
          plan: 'PREMIUM',
          name: 'Premium',
          monthlyFee: 249.9,
          trialDays: 30,
          features: ['Delivery', 'Salão', 'Gestão completa'],
        },
      ]);
    if (path === '/subscription' || path === '/subscription/change-plan')
      return response({
        id: 1,
        plan: body.plan ?? 'PREMIUM',
        status: 'TESTE',
        trialEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        planChangeEligibility: { allowed: true, invoiceId: null, reason: '' },
        message: 'Plano alterado somente na demonstração.',
      });
    if (path === '/billing/invoices')
      return response({
        invoices: [],
        billing: {
          plan: 'PREMIUM',
          subscriptionStatus: 'TESTE',
          isPlanActive: true,
          completedMonths: 0,
          currentCycle: 1,
          pixAvailable: false,
        },
      });
    if (path === '/ai-support/messages')
      return response({ messages: [], hasMore: false, nextCursor: null });
    if (path === '/ai-support/my-issue-updates') return response({ messages: [] });
    const message =
      'Esta integração é demonstrativa: nenhuma conexão ou operação real foi realizada.';
    throw new AxiosError(message, 'DEMO_ONLY', config, undefined, {
      data: { error: message, message },
      status: 422,
      statusText: 'Demo only',
      headers: {},
      config,
    });
  };
}
