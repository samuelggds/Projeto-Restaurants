import type { Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.js";

class BillingRepository {
  async findSubscriptionByRestaurantId(restaurantId: number) {
    return prisma.subscription.findUnique({
      where: {
        restaurantId,
      },
    });
  }

  async updateSubscription(
    id: number | string,
    data: Prisma.SubscriptionUpdateInput,
  ) {
    return prisma.subscription.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async createInvoice(data: Prisma.InvoiceUncheckedCreateInput) {
    return prisma.invoice.create({
      data,
    });
  }

  async findInvoiceByMonth(restaurantId: number, month: number, year: number) {
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

  async updateInvoice(id: number | string, data: Prisma.InvoiceUpdateInput) {
    return prisma.invoice.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async deactivateRestaurant(id: number | string) {
    return prisma.restaurant.update({
      where: {
        id: Number(id),
      },
      data: {
        active: false,
      },
    });
  }

  async activateRestaurant(id: number | string) {
    return prisma.restaurant.update({
      where: {
        id: Number(id),
      },
      data: {
        active: true,
      },
    });
  }

  async findPaidOrdersByPeriod(
    restaurantId: number,
    startDate: Date,
    endDate: Date,
  ) {
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

  async findInvoiceById(id: number | string) {
    return prisma.invoice.findUnique({
      where: { id: Number(id) },
    });
  }

  async findInvoiceByIdAndRestaurantId(
    id: number | string,
    restaurantId: number,
  ) {
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

  async findInvoicesByRestaurantId(restaurantId: number) {
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
