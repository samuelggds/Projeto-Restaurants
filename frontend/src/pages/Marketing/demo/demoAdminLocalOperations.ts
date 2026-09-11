import type {
  AdminProductConfigurationTemplate,
  TableAccountAdminSettings,
} from '../../admin/types';
import type { PaymentTerminal } from '../../../Services/paymentTerminalService';
import type { DemoState } from './demoDomain';
import { demoTableAccount, confirmDemoTablePayment } from './demoTableAccount';

export type DemoOperationContext = {
  path: string;
  method: string;
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  state: DemoState;
  update: (next: DemoState) => void;
  records: Map<string, unknown>;
  nextId: () => number;
  tableAccount?: TableAccountAdminSettings;
};

export function demoAdminLocalOperations({
  path,
  method,
  body,
  query,
  state,
  update,
  records,
  nextId,
  tableAccount,
}: DemoOperationContext): { data: unknown } | undefined {
  const result = (data: unknown) => ({ data });
  const list = <T>(key: string): T[] => (records.get(key) as T[] | undefined) ?? [];
  const templatesKey = 'configuration-templates';
  if (path === '/product-configuration-templates') {
    const templates = list<AdminProductConfigurationTemplate>(templatesKey);
    if (method === 'GET') return result({ templates });
    const template = { ...body, id: nextId() } as AdminProductConfigurationTemplate;
    records.set(templatesKey, [...templates, template]);
    return result({ template });
  }
  if (path.startsWith('/product-configuration-templates/') && method === 'DELETE') {
    records.set(
      templatesKey,
      list<AdminProductConfigurationTemplate>(templatesKey).filter(
        (item) => item.id !== Number(path.split('/').at(-1)),
      ),
    );
    return result({ success: true });
  }
  if (path.startsWith('/payment-terminals')) {
    let terminals = (records.get('terminals') as PaymentTerminal[] | undefined) ?? [
      {
        publicId: 'demo-terminal',
        provider: 'DEMO',
        providerTerminalId: 'demo',
        serial: 'DEMO',
        operatingMode: 'PDV',
        active: true,
      },
    ];
    const couriers = state.accounts
      .filter((item) => item.role === 'MOTOQUEIRO')
      .map((item, index) => ({ id: index + 6, name: item.name, email: item.email }));
    if (path.endsWith('/assignment') && method === 'PATCH') {
      const id = path.split('/')[2];
      const courier = couriers.find((item) => item.id === Number(body.courierId));
      terminals = terminals.map((item) =>
        item.publicId === id
          ? { ...item, assignedCourierId: courier?.id ?? null, courierName: courier?.name ?? null }
          : item,
      );
      records.set('terminals', terminals);
      return result(terminals.find((item) => item.publicId === id));
    }
    if (method === 'POST') {
      terminals = terminals.map((item) => ({ ...item, lastSyncedAt: new Date().toISOString() }));
      records.set('terminals', terminals);
    }
    return result({ terminals, couriers });
  }
  if (path === '/subscription' || path === '/subscription/change-plan') {
    if (method !== 'GET' && ['BASICO', 'PREMIUM'].includes(String(body.plan)))
      records.set('subscription-plan', body.plan);
    return result({
      id: 1,
      plan: records.get('subscription-plan') ?? 'PREMIUM',
      status: 'TESTE',
      trialEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      planChangeEligibility: { allowed: true, invoiceId: null, reason: '' },
      message: 'Plano alterado somente na demonstração.',
    });
  }
  if (path === '/billing/invoices')
    return result({
      invoices: [],
      billing: {
        plan: records.get('subscription-plan') ?? 'PREMIUM',
        subscriptionStatus: 'TESTE',
        isPlanActive: true,
        completedMonths: 0,
        currentCycle: 1,
        pixAvailable: false,
      },
    });
  if (path === '/ai-support/messages')
    return result({
      messages: (state.supportMessages ?? []).filter(
        (item) => item.channel === (query.channel ?? 'internal'),
      ),
      hasMore: false,
      nextCursor: null,
    });
  const issue = path.match(/^\/ai-support\/messages\/([^/]+)\/issue$/);
  if (issue) {
    const messages = state.supportMessages ?? [];
    if (method === 'DELETE')
      update({ ...state, supportMessages: messages.filter((item) => item.id !== issue[1]) });
    else {
      const status = String(body.status);
      if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status))
        throw new Error('Escolha uma situação válida.');
      update({
        ...state,
        supportMessages: messages.map((item) =>
          item.id === issue[1]
            ? {
                ...item,
                issueStatus: status as typeof item.issueStatus,
                issueResponse: String(body.response ?? ''),
              }
            : item,
        ),
      });
    }
    return result({ success: true });
  }
  if (path === '/table-accounts/admin/sessions') {
    return result({
      sessions: state.tables
        .filter((table) => table.occupied)
        .map((table) => {
          const snapshot = demoTableAccount(state, table.number, tableAccount);
          return {
            tableSessionId: table.number,
            sessionPublicId: snapshot.summary.sessionPublicId,
            tableNumber: table.number,
            openedAt:
              state.orders.find((order) => order.tableNumber === table.number)?.createdAt ??
              new Date().toISOString(),
            status: snapshot.summary.status,
            openedByName: 'Equipe Demo',
            itemsCount: snapshot.items.length,
            summary: snapshot.summary,
          };
        }),
    });
  }
  const account = path.match(/^\/table-accounts\/sessions\/(.+)\/admin$/);
  if (account && method === 'GET') {
    const table = state.tables.find(
      (item) => `demo-session:${item.id}` === decodeURIComponent(account[1]),
    );
    if (!table) throw new Error('Mesa fictícia não encontrada.');
    const snapshot = demoTableAccount(state, table.number, tableAccount);
    return result({ ...snapshot, paymentIntents: snapshot.payments });
  }
  const payment = path.match(/^\/table-accounts\/payments\/(.+)\/confirm-manual$/);
  if (payment && method === 'POST') {
    update(confirmDemoTablePayment(state, decodeURIComponent(payment[1])));
    return result({ success: true });
  }
  const close = path.match(/^\/table-sessions\/(\d+)\/force-close$/);
  if (close && method === 'PATCH') {
    if (String(body.reason ?? '').trim().length < 5)
      throw new Error('Informe o motivo do fechamento.');
    records.set(`table-close:${close[1]}`, {
      reason: body.reason,
      createdAt: new Date().toISOString(),
    });
    update({
      ...state,
      tables: state.tables.map((table) =>
        table.number === Number(close[1])
          ? { ...table, occupied: false, guests: 0, closingRequested: false }
          : table,
      ),
    });
    return result({ success: true });
  }
}
