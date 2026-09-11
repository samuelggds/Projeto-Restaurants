import { demoProducts } from './demoCatalog';
import type { AttendantWorkspaceSnapshot } from '../../attendant/types';
import type { OperationServices } from '../../attendant/operation-center/services';
import type { Raw, SupportThread } from '../../attendant/operation-center/types';
import {
  createDemoOrder,
  updateDemoCallStatus,
  updateDemoOrderStatus,
  type DemoState,
} from './demoDomain';

export const DEMO_ATTENDANT_ID = 9003;
export type DemoAttendantProduct = {
  id: string;
  name: string;
  price: number;
  image?: string;
  categoryId?: string;
  stock?: number | null;
  available?: boolean;
};

export const defaultAttendantProducts: DemoAttendantProduct[] = demoProducts;

export function mapDemoAttendantSnapshot(
  state: DemoState,
  now: number,
): AttendantWorkspaceSnapshot {
  const activeOrders = state.orders.filter((order) =>
    ['PENDENTE', 'PREPARANDO', 'PRONTO'].includes(order.status),
  );
  return {
    generatedAt: new Date(now).toISOString(),
    orders: activeOrders.map((order) => ({
      id: String(order.id),
      orderId: order.id,
      code: order.publicId,
      type:
        order.channel === 'TABLE' ? 'MESA' : order.channel === 'PICKUP' ? 'RETIRADA' : 'DELIVERY',
      status: order.status as 'PENDENTE' | 'PREPARANDO' | 'PRONTO',
      tableNumber: order.tableNumber ?? null,
      customerName: order.customerName,
      createdAt: order.createdAt,
      readyAt: order.readyAt ?? (order.status === 'PRONTO' ? order.createdAt : null),
      items: order.items.map((item) => ({ quantity: item.quantity, productName: item.name })),
    })),
    calls: state.calls.map((call) => ({
      id: call.id,
      tableNumber: call.tableNumber,
      type: call.type,
      status: call.status,
      assignedToId: call.status === 'WAITING' ? null : DEMO_ATTENDANT_ID,
      assignedToName: call.status === 'WAITING' ? null : 'Equipe Demo',
      requestedAt: call.createdAt,
      assignedAt: null,
      resolvedAt: call.status === 'RESOLVED' ? call.createdAt : null,
    })),
    tables: state.tables
      .filter((table) => table.occupied)
      .map((table) => ({
        id: table.id,
        tableNumber: table.number,
        status: state.calls.some(
          (call) =>
            call.tableNumber === table.number && call.type === 'BILL' && call.status !== 'RESOLVED',
        )
          ? 'CLOSING_REQUESTED'
          : 'OPEN',
        openedAt:
          state.orders
            .filter((order) => order.channel === 'TABLE' && order.tableNumber === table.number)
            .map((order) => order.createdAt)
            .sort()[0] || new Date(now).toISOString(),
        participantCount: table.guests,
        activeOrderCount: activeOrders.filter(
          (order) => order.channel === 'TABLE' && order.tableNumber === table.number,
        ).length,
        activeCallCount: state.calls.filter(
          (call) => call.tableNumber === table.number && call.status !== 'RESOLVED',
        ).length,
      })),
  };
}

function fail(message: string): never {
  throw { response: { data: { error: message } } };
}

export function createDemoAttendantServices({
  getState,
  onState,
  products = defaultAttendantProducts,
  now = Date.now,
}: {
  getState: () => DemoState;
  onState: (state: DemoState) => void;
  products?: DemoAttendantProduct[];
  now?: () => number;
}): OperationServices {
  const details = new Map<number, Raw>(getState().attendant?.details ?? []);
  const threads = new Map<number, SupportThread>(getState().attendant?.threads ?? []);
  const persist = () =>
    onState({ ...getState(), attendant: { details: [...details], threads: [...threads] } });
  const findOrder = (id: number) =>
    getState().orders.find((order) => order.id === id) ||
    fail('Pedido não encontrado na demonstração.');
  const ensureThread = () => {
    if (threads.size) return;
    const order = getState().orders.find((item) => item.channel !== 'TABLE');
    if (order)
      threads.set(order.id, {
        orderId: order.id,
        customerName: order.customerName,
        orderStatus: order.status,
        isResolved: false,
        messages: [
          {
            id: 'demo-question',
            senderType: 'CUSTOMER',
            senderName: order.customerName,
            message: 'Pode confirmar o andamento do meu pedido?',
            sentAt: new Date(now()).toISOString(),
          },
        ],
      });
  };
  const thread = (id: number) => {
    ensureThread();
    const value = threads.get(id) || fail('Atendimento não encontrado na demonstração.');
    value.orderStatus = findOrder(id).status;
    return value;
  };
  const issueOrders = (resolved: boolean) => {
    ensureThread();
    return [...threads.values()]
      .filter((item) => item.isResolved === resolved)
      .map((item) => ({
        id: item.orderId,
        user: { name: item.customerName },
        issueThread: { ...item, messages: [...item.messages] },
      }));
  };
  return {
    async getOrder(id) {
      const order = findOrder(id);
      return {
        ...details.get(id),
        id,
        type:
          order.channel === 'PICKUP' ? 'RETIRADA' : order.channel === 'TABLE' ? 'MESA' : 'DELIVERY',
        status: order.status,
        paid: order.paid,
        total: order.total,
        user: { name: order.customerName, phone: '(11) 99999-0000' },
        items: order.items.map((item) => ({
          quantity: item.quantity,
          product: { name: item.name },
        })),
      };
    },
    async completePickup(id) {
      const order = findOrder(id);
      if (order.channel !== 'PICKUP') fail('Somente retiradas são entregues pelo atendente.');
      if (order.status !== 'PRONTO' || !order.paid)
        fail('Confirme o pagamento e aguarde o preparo antes de entregar.');
      onState(updateDemoOrderStatus(getState(), id, 'ENTREGUE'));
      return { id, status: 'ENTREGUE' };
    },
    async listProducts() {
      return products.map((product, index) => ({
        ...product,
        id: index + 1,
        category: { name: product.categoryId || 'Cardápio' },
        stock: product.available === false ? 0 : (product.stock ?? null),
      }));
    },
    async createOrder(payload) {
      if (payload.type !== 'RETIRADA' && payload.type !== 'DELIVERY')
        fail('Pedidos de mesa são feitos pela sessão da mesa.');
      const items = Array.isArray(payload.items) ? payload.items : [];
      const cart = items.map((item: Raw) => {
        const product = products[Number(item.productId) - 1];
        const quantity = Number(item.quantity);
        if (
          !product ||
          !Number.isSafeInteger(quantity) ||
          quantity < 1 ||
          product.available === false ||
          product.stock === 0 ||
          (product.stock != null && quantity > product.stock)
        )
          fail('Confira os itens do pedido.');
        return { productId: product.id, name: product.name, unitPrice: product.price, quantity };
      });
      const current = getState();
      const created = createDemoOrder(
        { ...current, cart },
        {
          channel: payload.type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
          paymentMethod:
            payload.paymentMethod === 'PIX'
              ? 'PIX'
              : payload.paymentMethod === 'CARTAO'
                ? 'CARD'
                : 'CASH',
          customerName: String(payload.customerName || 'Cliente Demo'),
          customerEmail: 'cliente.demo@example.test',
        },
        now(),
      );
      const order = { ...created.order, paid: false };
      onState({
        ...created.state,
        cart: current.cart,
        orders: created.state.orders.map((item) => (item.id === order.id ? order : item)),
      });
      details.set(order.id, payload);
      persist();
      return { orderId: order.id };
    },
    async updateCallStatus(id, status) {
      const call =
        getState().calls.find((item) => item.id === id) || fail('Chamado não encontrado.');
      if (call.status === 'RESOLVED' || (status === 'RESOLVED' && call.status !== 'IN_PROGRESS'))
        fail('Assuma o chamado antes de concluí-lo.');
      onState(updateDemoCallStatus(getState(), id, status));
      return { id, status };
    },
    async listOpenOrderIssues() {
      return issueOrders(false);
    },
    async getIssueThread(id) {
      return { ...thread(id) };
    },
    async replyIssue(id, message) {
      const value = thread(id);
      if (value.isResolved || !message.trim())
        fail('Selecione um atendimento aberto e escreva uma resposta.');
      value.messages = [
        ...value.messages,
        {
          id: `demo-reply-${value.messages.length}`,
          senderType: 'ADMIN',
          senderName: 'Restaurante',
          message: message.trim().slice(0, 600),
          sentAt: new Date(now()).toISOString(),
        },
      ];
      persist();
      return { messages: value.messages };
    },
    async resolveIssue(id) {
      thread(id).isResolved = true;
      persist();
      return {};
    },
    supportHistory: {
      get orders() {
        return issueOrders(true);
      },
      get total() {
        return issueOrders(true).length;
      },
      hasMore: false,
      nextCursor: null,
      loading: false,
      error: '',
      loadMore: async () => {},
      refresh: async () => {},
    },
  };
}
