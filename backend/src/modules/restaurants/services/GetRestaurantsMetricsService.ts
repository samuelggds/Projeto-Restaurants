import prisma from "../../../config/prisma.js";

function last6Months() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const label = d.toLocaleString("pt-BR", { month: "short" });
    return { start, end, label };
  });
}

class GetRestaurantsMetricsService {
  async execute() {
    const months = last6Months();

    const [restaurants, paidOrders, invoices] = await Promise.all([
      prisma.restaurant.findMany({
        select: { id: true, active: true },
      }),
      prisma.order.findMany({
        where: { paid: true, status: { not: "CANCELADO" } },
        select: { total: true, systemFee: true },
      }),
      prisma.invoice.findMany({
        where: { status: { in: ["PENDENTE", "ATRASADO"] } },
        select: { id: true, total: true },
      }),
    ]);

    const [monthlyGrowth, monthlyRevenue] = await Promise.all([
      Promise.all(
        months.map(async ({ end, label }) => {
          const count = await prisma.restaurant.count({
            where: { active: true, createdAt: { lte: end } },
          });
          return { label, count };
        }),
      ),
      Promise.all(
        months.map(async ({ start, end, label }) => {
          const result = await prisma.order.aggregate({
            where: {
              paid: true,
              status: { not: "CANCELADO" },
              createdAt: { gte: start, lte: end },
            },
            _sum: { systemFee: true },
          });
          return { label, value: Number(result._sum.systemFee || 0) };
        }),
      ),
    ]);

    const totalGenerated = paidOrders.reduce(
      (acc, o) => acc + Number(o.total || 0),
      0,
    );
    const totalReceivable = paidOrders.reduce(
      (acc, o) => acc + Number(o.systemFee || 0),
      0,
    );
    const pendingInvoiceTotal = invoices.reduce(
      (acc, i) => acc + Number(i.total || 0),
      0,
    );
    const activeRestaurants = restaurants.filter((r) => r.active).length;

    return {
      restaurantsTotal: restaurants.length,
      restaurantsActive: activeRestaurants,
      restaurantsInactive: restaurants.length - activeRestaurants,
      totalGenerated,
      totalReceivable,
      pendingInvoicesCount: invoices.length,
      pendingInvoicesTotal: pendingInvoiceTotal,
      monthlyGrowth,
      monthlyRevenue,
    };
  }
}

export default new GetRestaurantsMetricsService();
