import type { Prisma } from "@prisma/client";
import { OrderStatus } from "@prisma/client";
import prisma from "../../../config/prisma.js";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class OrderRepository {
  async create(
    data: Prisma.OrderCreateInput | Prisma.OrderUncheckedCreateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
          },
        },
        table: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll(
    restaurantId: number,
    status?: OrderStatus,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findMany({
      where: {
        restaurantId,
        ...(status && { status }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
          },
        },
        table: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async updateStatus(
    id: number | string,
    status: OrderStatus,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
      },
      data: {
        status,
      },
    });

    return this.findById(id, restaurantId, db);
  }

  async confirmPayment(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
      },
      data: {
        paid: true,
        paymentConfirmationPin: null,
        paymentConfirmationPinExpiresAt: null,
      },
    });

    return this.findById(id, restaurantId, db);
  }

  async setPaymentConfirmationPin(
    id: number | string,
    restaurantId: number,
    paymentConfirmationPin: string,
    paymentConfirmationPinExpiresAt: Date,
    db: PrismaClientLike = prisma,
  ) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
      },
      data: {
        paymentConfirmationPin,
        paymentConfirmationPinExpiresAt,
      },
    });

    return this.findById(id, restaurantId, db);
  }

  async findById(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        id: Number(id),
        restaurantId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
          },
        },
        table: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findByUserId(
    userId: number | string,
    restaurantId: number | string,
    db: PrismaClientLike = prisma,
  ) {
    const normalizedRestaurantId = Number(restaurantId);

    const where: Prisma.OrderWhereInput = {
      userId: Number(userId),
    };

    if (Number.isFinite(normalizedRestaurantId) && normalizedRestaurantId > 0) {
      where.restaurantId = normalizedRestaurantId;
    }

    return db.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        table: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export default new OrderRepository();
