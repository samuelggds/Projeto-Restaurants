import prisma from "../../../config/prisma.js";
class BillingRepository {
    async findSubscriptionByRestaurantId(restaurantId) {
        return prisma.subscription.findUnique({
            where: {
                restaurantId,
            },
        });
    }
    async updateSubscription(id, data) {
        return prisma.subscription.update({
            where: {
                id: Number(id),
            },
            data,
        });
    }
    async createInvoice(data) {
        return prisma.invoice.create({
            data,
        });
    }
    async findInvoiceByMonth(restaurantId, month, year) {
        return prisma.invoice.findFirst({
            where: {
                restaurantId,
                month,
                year,
            },
        });
    }
    async findPendingInvoices() {
        return prisma.invoice.findMany({
            where: {
                status: "PENDENTE",
            },
            include: {
                restaurant: true,
            },
        });
    }
    async updateInvoice(id, data) {
        return prisma.invoice.update({
            where: {
                id: Number(id),
            },
            data,
        });
    }
    async deactivateRestaurant(id) {
        return prisma.restaurant.update({
            where: {
                id: Number(id),
            },
            data: {
                active: false,
            },
        });
    }
    async activateRestaurant(id) {
        return prisma.restaurant.update({
            where: {
                id: Number(id),
            },
            data: {
                active: true,
            },
        });
    }
    async findPaidOrdersByPeriod(restaurantId, startDate, endDate) {
        return prisma.order.findMany({
            where: {
                restaurantId,
                paid: true,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
    }
    async findExpiredTrials() {
        return prisma.subscription.findMany({
            where: {
                status: "TESTE",
                trialEndsAt: {
                    lte: new Date(),
                },
            },
            include: {
                restaurant: true,
            },
        });
    }
    async findExpiredInvoices() {
        return prisma.invoice.findMany({
            where: {
                status: "PENDENTE",
                dueDate: {
                    lt: new Date(),
                },
            },
            include: {
                restaurant: true,
            },
        });
    }
    async findInvoiceById(id) {
        return prisma.invoice.findUnique({
            where: { id: Number(id) },
        });
    }
    async findInvoiceByIdAndRestaurantId(id, restaurantId) {
        return prisma.invoice.findFirst({
            where: {
                id: Number(id),
                restaurantId,
            },
        });
    }
    async findAllSubscriptions() {
        return prisma.subscription.findMany();
    }
    async findInvoicesByRestaurantId(restaurantId) {
        return prisma.invoice.findMany({
            where: {
                restaurantId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
}
export default new BillingRepository();
