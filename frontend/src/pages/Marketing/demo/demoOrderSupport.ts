import type { DemoOperationContext } from './demoAdminLocalOperations';
import type { SupportThread } from '../../attendant/operation-center/types';

export function demoOrderSupport({
  path,
  method,
  body,
  state,
  update,
}: DemoOperationContext): { data: unknown } | undefined {
  const route = path.match(
    /^\/orders\/(\d+)\/(issue-thread|reply-issue|resolve-issue|report-issue)$/,
  );
  if (!route) return;
  const orderId = Number(route[1]);
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) throw new Error('Pedido fictício não encontrado.');
  const threads = new Map(state.attendant?.threads ?? []);
  const current = threads.get(orderId);
  const thread: SupportThread = current
    ? structuredClone(current)
    : {
        orderId,
        customerName: order.customerName,
        orderStatus: order.status,
        isResolved: false,
        messages: [],
      };
  thread.orderStatus = order.status;
  if (route[2] === 'issue-thread' && method === 'GET')
    return { data: { ...thread, hasMore: false } };
  if (route[2] === 'resolve-issue' && method === 'PATCH') thread.isResolved = true;
  else if (['reply-issue', 'report-issue'].includes(route[2]) && method === 'POST') {
    const message = String(body.message ?? '').trim();
    if (!message || (thread.isResolved && route[2] === 'reply-issue'))
      throw new Error('Escreva uma mensagem em um atendimento aberto.');
    thread.isResolved = false;
    thread.messages.push({
      id: `demo-message-${Date.now()}-${thread.messages.length}`,
      senderType: route[2] === 'reply-issue' ? 'ADMIN' : 'CUSTOMER',
      senderName: route[2] === 'reply-issue' ? 'Restaurante Demo' : order.customerName,
      message: message.slice(0, 600),
      sentAt: new Date().toISOString(),
    });
  } else return;
  threads.set(orderId, thread);
  update({
    ...state,
    attendant: { details: state.attendant?.details ?? [], threads: [...threads] },
  });
  return { data: thread };
}
