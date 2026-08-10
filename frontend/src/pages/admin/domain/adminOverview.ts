import type { AdminOrder } from "../types";

export type CustomerSummary = {
  name: string;
  email: string;
  count: number;
  total: number;
};

export function getTodayOrders(orders: AdminOrder[], now = new Date()) {
  return orders.filter((order) =>
    Boolean(order.createdAt) &&
    new Date(String(order.createdAt)).toDateString() === now.toDateString() &&
    order.status !== "CANCELADO",
  );
}

export function summarizeCustomers(orders: AdminOrder[]): CustomerSummary[] {
  const summaries = orders.reduce((map, order) => {
    const key = String(order.userId || order.customerEmail || order.customerName);
    const current = map.get(key) || {
      name: order.customerName,
      email: order.customerEmail || "Sem e-mail",
      count: 0,
      total: 0,
    };
    current.count += 1;
    current.total += order.total;
    map.set(key, current);
    return map;
  }, new Map<string, CustomerSummary>());

  return Array.from(summaries.values());
}

export function filterCustomerSummaries(customers: CustomerSummary[], search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedSearch) return customers;
  return customers.filter((customer) =>
    `${customer.name} ${customer.email}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
  );
}

export function calculateOverviewMetrics(orders: AdminOrder[], now = new Date()) {
  const todayOrders = getTodayOrders(orders, now);
  const sales = todayOrders.reduce((sum, order) => sum + order.total, 0);
  return {
    todayOrders,
    sales,
    averageTicket: todayOrders.length ? sales / todayOrders.length : 0,
    preparingOrders: orders.filter((order) => order.status === "PREPARANDO").length,
    customers: summarizeCustomers(orders),
  };
}
