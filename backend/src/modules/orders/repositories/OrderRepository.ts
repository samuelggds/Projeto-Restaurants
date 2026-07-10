import type { Prisma } from "@prisma/client";
import { OrderStatus, PaymentMethod, OrderType } from "@prisma/client";
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
        NOT: [
          {
            type: OrderType.DELIVERY,
            paid: false,
            paymentMethod: {
              in: [PaymentMethod.PIX, PaymentMethod.CARTAO],
            },
            payOnDelivery: false,
            OR: [
              {
                observation: null,
              },
              {
                observation: {
                  not: {
                    contains: "PAY_ON_DELIVERY:",
                  },
                },
              },
            ],
          },
        ],
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
        issueThread: {
          select: {
            orderId: true,
            isResolved: true,
            messages: {
              orderBy: {
                sentAt: "desc",
              },
              take: 40,
              select: {
                senderType: true,
                message: true,
              },
            },
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
        paidAt: new Date(),
        paymentConfirmationPin: null,
        paymentConfirmationPinExpiresAt: null,
      },
    });

    return this.findById(id, restaurantId, db);
  }

  async confirmPixPayment(
    id: number | string,
    restaurantId: number,
    {
      paymentProof,
      paymentProofImage,
    }: {
      paymentProof?: string | null;
      paymentProofImage?: string | null;
    } = {},
    db: PrismaClientLike = prisma,
  ) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
      },
      data: {
        paid: true,
        paidAt: new Date(),
        paymentProof: String(paymentProof || "").trim() || null,
        paymentProofImage: String(paymentProofImage || "").trim() || null,
        paymentConfirmationPin: null,
        paymentConfirmationPinExpiresAt: null,
      },
    });

    return this.findById(id, restaurantId, db);
  }

  async setCardCheckoutSessionId(
    id: number | string,
    restaurantId: number,
    cardCheckoutSessionId: string,
    db: PrismaClientLike = prisma,
  ) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
      },
      data: {
        cardCheckoutSessionId,
      },
    });

    return this.findById(id, restaurantId, db);
  }

  async deleteById(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    await db.order.deleteMany({
      where: {
        id: Number(id),
        restaurantId,
      },
    });
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

  async findByPixPaymentId(
    pixPaymentId: string,
    restaurantId?: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        pixPaymentId,
        ...(restaurantId
          ? {
              restaurantId,
            }
          : {}),
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

  async findByCardCheckoutSessionId(
    cardCheckoutSessionId: string,
    restaurantId?: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        cardCheckoutSessionId,
        ...(restaurantId
          ? {
              restaurantId,
            }
          : {}),
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

  async findLatestByTable(
    tableId: number | string,
    restaurantId: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        tableId: Number(tableId),
        restaurantId: Number(restaurantId),
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
      where: {
        ...where,
        NOT: [
          {
            paymentMethod: PaymentMethod.PIX,
            paid: false,
            pixPaymentId: {
              not: null,
            },
          },
          {
            paymentMethod: PaymentMethod.CARTAO,
            paid: false,
            cardCheckoutSessionId: {
              not: null,
            },
          },
        ],
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        table: true,
        issueThread: {
          select: {
            orderId: true,
            isResolved: true,
            resolvedAt: true,
            resolvedByName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export default new OrderRepository();
