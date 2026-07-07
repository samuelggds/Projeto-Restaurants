import prisma from "../../../config/prisma.js";

class OrderRepository {
  async create(data, db = prisma) {
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

  async findAll(restaurantId, status, db = prisma) {
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

  async updateStatus(id, status, restaurantId, db = prisma) {
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

  async confirmPayment(id, restaurantId, db = prisma) {
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
    id,
    restaurantId,
    paymentConfirmationPin,
    paymentConfirmationPinExpiresAt,
    db = prisma,
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

  async findById(id, restaurantId, db = prisma) {
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

  async findByUserId(userId, restaurantId, db = prisma) {
    const normalizedRestaurantId = Number(restaurantId);

    const where = {
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
