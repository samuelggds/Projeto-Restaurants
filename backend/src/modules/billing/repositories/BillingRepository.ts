import type { Prisma } from "@prisma/client";
import { UserRole } from "@prisma/client";
import prisma from "../../../config/prisma.js";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class BillingRepository {
  async findSubscriptionByRestaurantId(
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.subscription.findUnique({
      where: {
        restaurantId,
      },
      include: {
        restaurant: {
          select: {
            name: true,
            email: true,
            createdAt: true,
            users: {
              where: { role: UserRole.ADMIN },
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { id: true, name: true, email: true, createdAt: true },
            },
          },
        },
      },
    });
  }

  async updateSubscription(
    id: number | string,
    data: Prisma.SubscriptionUpdateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.subscription.update({
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
        status: {
          in: ["PENDENTE", "ATRASADO"],
        },
      },
      include: {
        restaurant: true,
      },
    });
  }

  async updateInvoice(
    id: number | string,
    data: Prisma.InvoiceUpdateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.invoice.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async deactivateRestaurant(
    id: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.restaurant.update({
      where: {
        id: Number(id),
      },
      data: {
        active: false,
      },
    });
  }

  async activateRestaurant(
    id: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.restaurant.update({
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

  async findInvoiceById(
    id: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.invoice.findUnique({
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
      include: {
        restaurant: { select: { name: true, email: true } },
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
