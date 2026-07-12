import prisma from "../../../config/prisma.js";
class GetRestaurantsMetricsService {
    async execute() {
        const [restaurants, paidOrders, invoices] = await Promise.all([
            prisma.restaurant.findMany({
                select: { id: true, active: true },
            }),
            prisma.order.findMany({
                where: {
                    paid: true,
                    status: { not: "CANCELADO" },
                },
                select: {
                    total: true,
                    systemFee: true,
                },
            }),
            prisma.invoice.findMany({
                where: {
                    status: { in: ["PENDENTE", "ATRASADO"] },
                },
                select: {
                    id: true,
                    total: true,
                },
            }),
        ]);
        const totalGenerated = paidOrders.reduce((acc, order) => acc + Number(order.total || 0), 0);
        const totalReceivable = paidOrders.reduce((acc, order) => acc + Number(order.systemFee || 0), 0);
        const pendingInvoiceTotal = invoices.reduce((acc, invoice) => acc + Number(invoice.total || 0), 0);
        const activeRestaurants = restaurants.filter((r) => r.active).length;
        return {
            restaurantsTotal: restaurants.length,
            restaurantsActive: activeRestaurants,
            restaurantsInactive: restaurants.length - activeRestaurants,
            totalGenerated,
            totalReceivable,
            pendingInvoicesCount: invoices.length,
            pendingInvoicesTotal: pendingInvoiceTotal,
        };
    }
}
export default new GetRestaurantsMetricsService();
