type Order = Record<string, unknown> & { id: number };

/** Mimics the bounded API contract; fixtures must not hide missing client pagination. */
export function orderFixtureResponse(requestUrl: string, payload: unknown, ascending = false) {
  const url = new URL(requestUrl);
  if (!['/orders', '/orders/my-orders', '/orders/reports/overview', '/orders/reports/customers'].includes(url.pathname)) return undefined;
  const source = Array.isArray(payload) ? payload : (payload as { orders?: unknown[] } | null)?.orders || [];
  const all = source as Order[];
  const queue = url.searchParams.get('queue') || 'ALL';
  const status = url.searchParams.get('status');
  const search = (url.searchParams.get('search') || '').replace(/^#/, '').toLocaleLowerCase();
  const limit = Number(url.searchParams.get('limit') || 50);
  const issueState = url.searchParams.get('issueState');
  const summary = { total: all.length, active: 0, awaitingPayment: 0, inProgress: 0, delivered: 0 };
  all.forEach((order) => {
    if (!['ENTREGUE', 'CANCELADO'].includes(String(order.status))) summary.active += 1;
    if (!order.paid && order.status !== 'CANCELADO') summary.awaitingPayment += 1;
    if (['PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA'].includes(String(order.status))) summary.inProgress += 1;
    if (order.status === 'ENTREGUE') summary.delivered += 1;
  });
  const customers = new Map<string, { key: string; name: string; email: string; count: number; total: number }>();
  all.forEach((order) => {
    const user = (order.user || {}) as Record<string, unknown>;
    const key = String(order.userId || user.id || user.email || user.name || 'Cliente');
    const current = customers.get(key) || { key, name: String(user.name || 'Cliente'), email: String(user.email || 'Sem e-mail'), count: 0, total: 0 };
    current.count += 1;
    current.total += Number(order.total || 0);
    customers.set(key, current);
  });
  if (url.pathname === '/orders/reports/overview') {
    const day = (value: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(value);
    const today = all.filter((order) => order.status !== 'CANCELADO' && order.createdAt && day(new Date(String(order.createdAt))) === day(new Date()));
    const sales = today.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return { todayOrders: today.length, sales, averageTicket: today.length ? sales / today.length : 0,
      preparingOrders: all.filter((order) => order.status === 'PREPARANDO').length, customers: customers.size, timezone: 'America/Sao_Paulo' };
  }
  if (url.pathname === '/orders/reports/customers') {
    const sort = url.searchParams.get('sort') || 'VALUE';
    const filtered = [...customers.values()].filter((customer) => `${customer.name} ${customer.email}`.toLocaleLowerCase().includes(search))
      .sort((a, b) => sort === 'NAME' ? a.name.localeCompare(b.name) : sort === 'ORDERS' ? b.count - a.count || b.total - a.total : b.total - a.total || b.count - a.count);
    const offset = Number(url.searchParams.get('offset') || 0);
    const result = filtered.slice(offset, offset + limit);
    const hasMore = offset + result.length < filtered.length;
    return { customers: result, total: filtered.length, hasMore, nextOffset: hasMore ? offset + result.length : null,
      summary: { customers: customers.size, returningCustomers: [...customers.values()].filter((customer) => customer.count > 1).length,
        totalOrders: all.length, totalMoved: all.reduce((sum, order) => sum + Number(order.total || 0), 0) } };
  }
  const filtered = all.filter((order) => {
    if (status && order.status !== status) return false;
    if (queue === 'ACTIVE' && ['ENTREGUE', 'CANCELADO'].includes(String(order.status))) return false;
    if (queue === 'HISTORY' && !['ENTREGUE', 'CANCELADO'].includes(String(order.status))) return false;
    if (queue === 'DELIVERED' && order.status !== 'ENTREGUE') return false;
    if (queue === 'PAYMENT' && (order.paid || order.status === 'CANCELADO')) return false;
    if (queue === 'IN_PROGRESS' && !['PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA'].includes(String(order.status))) return false;
    const issue = order.issueThread as { isResolved: boolean } | null;
    if (issueState && (!issue || issue.isResolved !== (issueState === 'RESOLVED'))) return false;
    const user = (order.user || {}) as Record<string, unknown>;
    return !search || String(order.id) === search || String(user.name || order.customerName || '').toLocaleLowerCase().includes(search);
  });
  const forward = ascending && !['HISTORY', 'DELIVERED'].includes(queue);
  const cursor = Number(url.searchParams.get('cursor') || 0);
  const rows = filtered.filter((order) => !cursor || (forward ? order.id > cursor : order.id < cursor))
    .sort((a, b) => forward ? a.id - b.id : b.id - a.id);
  const orders = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  return { orders, total: filtered.length, hasMore, nextCursor: hasMore ? orders.at(-1)!.id : null, summary };
}
