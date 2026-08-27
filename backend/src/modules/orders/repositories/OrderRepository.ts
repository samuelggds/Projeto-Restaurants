import type { Prisma } from '@prisma/client';
import {
  OrderRefundStatus,
  OrderStatus,
  PaymentMethod,
  OrderType,
  TableBillItemFinancialStatus,
  TableOrderFinancialStatus,
  TableSessionStatus,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

const operationalTableSelect = {
  id: true,
  number: true,
  active: true,
  restaurantId: true,
} satisfies Prisma.TableSelect;

const tableParticipantSelect = {
  id: true,
  publicId: true,
  displayName: true,
} satisfies Prisma.TableParticipantSelect;

const waiterReadyOrderInclude = {
  user: { select: { id: true, name: true } },
  table: { select: { id: true, number: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      price: true,
      observation: true,
      ingredients: true,
      customizations: true,
      product: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.OrderInclude;

const statusUpdateOrderInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  restaurant: { select: { id: true, name: true, whatsapp: true } },
  table: { select: operationalTableSelect },
  participant: { select: tableParticipantSelect },
  items: { include: { product: true } },
} satisfies Prisma.OrderInclude;

function activeTableSessionWhere(restaurantId: number): Prisma.TableSessionWhereInput {
  return {
    restaurantId,
    status: { in: [TableSessionStatus.OPEN, TableSessionStatus.CLOSING_REQUESTED] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}

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
        table: { select: operationalTableSelect },
        participant: { select: tableParticipantSelect },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll(restaurantId: number, status?: OrderStatus, db: PrismaClientLike = prisma) {
    return db.order.findMany({
      where: {
        restaurantId,
        NOT: {
          paid: false,
          paymentMethod: {
            in: [PaymentMethod.PIX, PaymentMethod.CARTAO],
          },
          payOnDelivery: false,
        },
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
        table: { select: operationalTableSelect },
        participant: { select: tableParticipantSelect },
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
                sentAt: 'desc',
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
        createdAt: 'desc',
      },
    });
  }

  async countActiveOperationalOrders(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.order.count({
      where: {
        restaurantId,
        status: { in: [OrderStatus.PENDENTE, OrderStatus.PREPARANDO, OrderStatus.PRONTO] },
        NOT: {
          paid: false,
          paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
          payOnDelivery: false,
        },
      },
    });
  }

  async findCourierOrders(
    restaurantId: number,
    courierId: number,
    status?: OrderStatus,
    db: PrismaClientLike = prisma,
  ) {
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.PRONTO,
      OrderStatus.SAIU_PARA_ENTREGA,
      OrderStatus.ENTREGUE,
    ];

    if (status && !allowedStatuses.includes(status)) {
      return [];
    }

    return db.order.findMany({
      where: {
        restaurantId,
        type: OrderType.DELIVERY,
        status: status || { in: allowedStatuses },
        OR: [
          { status: OrderStatus.PRONTO, assignedCourierId: null },
          { assignedCourierId: courierId },
        ],
        NOT: {
          paid: false,
          paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
          payOnDelivery: false,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        restaurant: {
          select: { id: true, name: true, whatsapp: true },
        },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findCourierOrderById(
    id: number | string,
    restaurantId: number,
    courierId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        id: Number(id),
        restaurantId,
        type: OrderType.DELIVERY,
        OR: [
          { status: OrderStatus.PRONTO, assignedCourierId: null },
          {
            status: { in: [OrderStatus.SAIU_PARA_ENTREGA, OrderStatus.ENTREGUE] },
            assignedCourierId: courierId,
          },
        ],
        NOT: {
          paid: false,
          paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
          payOnDelivery: false,
        },
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        restaurant: { select: { id: true, name: true, whatsapp: true } },
        items: { include: { product: true } },
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
        ...(status === OrderStatus.PREPARANDO
          ? { preparationStartedAt: new Date(), readyAt: null }
          : {}),
        ...(status === OrderStatus.PRONTO ? { readyAt: new Date() } : {}),
      },
    });

    return this.findById(id, restaurantId, db);
  }

  async findReadyTableOrders(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.order.findMany({
      where: {
        restaurantId,
        type: OrderType.MESA,
        status: OrderStatus.PRONTO,
        tableSession: { is: activeTableSessionWhere(restaurantId) },
        NOT: {
          paid: false,
          paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
          payOnDelivery: false,
        },
      },
      include: waiterReadyOrderInclude,
      orderBy: [{ readyAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findReadyTableOrderById(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        id: Number(id),
        restaurantId,
        type: OrderType.MESA,
        status: OrderStatus.PRONTO,
        tableSession: { is: activeTableSessionWhere(restaurantId) },
        NOT: {
          paid: false,
          paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
          payOnDelivery: false,
        },
      },
      include: waiterReadyOrderInclude,
    });
  }

  async findDeliverableTableOrderById(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        id: Number(id),
        restaurantId,
        type: OrderType.MESA,
        status: OrderStatus.PRONTO,
        tableSession: { is: activeTableSessionWhere(restaurantId) },
        NOT: {
          paid: false,
          paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
          payOnDelivery: false,
        },
      },
      include: statusUpdateOrderInclude,
    });
  }

  async updateStatusIfCurrent(
    id: number | string,
    status: OrderStatus,
    restaurantId: number,
    expected: {
      status: OrderStatus;
      paid?: boolean;
    },
    db: PrismaClientLike = prisma,
  ) {
    const result = await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
        status: expected.status,
        refundStatus: {
          notIn: [OrderRefundStatus.PROCESSING, OrderRefundStatus.SUCCEEDED],
        },
        ...(typeof expected.paid === 'boolean' ? { paid: expected.paid } : {}),
      },
      data: {
        status,
        ...(status === OrderStatus.PREPARANDO
          ? { preparationStartedAt: new Date(), readyAt: null }
          : {}),
        ...(status === OrderStatus.PRONTO ? { readyAt: new Date() } : {}),
      },
    });

    if (result.count !== 1) {
      const current = await this.findById(id, restaurantId, db);
      if (!current) {
        throw new Error('Pedido não encontrado!');
      }

      throw new Error(
        'O pedido foi atualizado por outro processo. Atualize a tela e tente novamente.',
      );
    }

    const updated = await this.findById(id, restaurantId, db);
    if (!updated) {
      throw new Error('Pedido não encontrado após a atualização.');
    }

    return updated;
  }

  async confirmDeliveryReceived(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
        status: OrderStatus.ENTREGUE,
      },
      data: {
        deliveryConfirmedAt: new Date(),
      },
    });

    return this.findById(id, restaurantId, db);
  }

  async confirmPayment(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    const paidAt = new Date();
    const result = await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
        paid: false,
        status: { not: OrderStatus.CANCELADO },
      },
      data: {
        paid: true,
        paidAt,
        paymentConfirmationPin: null,
        paymentConfirmationPinExpiresAt: null,
      },
    });

    if (result.count === 1) {
      await db.order.updateMany({
        where: { id: Number(id), restaurantId, tableSessionId: { not: null } },
        data: { tableFinancialStatus: TableOrderFinancialStatus.PAID },
      });
      await db.tableBillItem.updateMany({
        where: { orderId: Number(id), restaurantId, canceledAt: null },
        data: { financialStatus: TableBillItemFinancialStatus.PAID, paidAt },
      });
    }

    const current = await this.findById(id, restaurantId, db);
    if (!current) {
      throw new Error('Pedido não encontrado para confirmar o pagamento.');
    }

    if (result.count === 1 || current.paid === true) {
      return current;
    }

    if (current.status === OrderStatus.CANCELADO) {
      throw new Error('Pagamento recebido para um pedido cancelado; confirmação bloqueada.');
    }

    throw new Error('O pagamento não pôde ser confirmado no estado atual do pedido.');
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
    const paidAt = new Date();
    const result = await db.order.updateMany({
      where: {
        id: Number(id),
        restaurantId,
        paid: false,
        status: { not: OrderStatus.CANCELADO },
      },
      data: {
        paid: true,
        paidAt,
        paymentProof: String(paymentProof || '').trim() || null,
        paymentProofImage: String(paymentProofImage || '').trim() || null,
        paymentConfirmationPin: null,
        paymentConfirmationPinExpiresAt: null,
      },
    });

    if (result.count === 1) {
      await db.order.updateMany({
        where: { id: Number(id), restaurantId, tableSessionId: { not: null } },
        data: { tableFinancialStatus: TableOrderFinancialStatus.PAID },
      });
      await db.tableBillItem.updateMany({
        where: { orderId: Number(id), restaurantId, canceledAt: null },
        data: { financialStatus: TableBillItemFinancialStatus.PAID, paidAt },
      });
    }

    const current = await this.findById(id, restaurantId, db);
    if (!current) {
      throw new Error('Pedido não encontrado para confirmar o pagamento PIX.');
    }

    if (result.count === 1 || current.paid === true) {
      return current;
    }

    if (current.status === OrderStatus.CANCELADO) {
      throw new Error('Pagamento PIX recebido para um pedido cancelado; confirmação bloqueada.');
    }

    throw new Error('O pagamento PIX não pôde ser confirmado no estado atual do pedido.');
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

  async deleteById(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    await db.order.deleteMany({
      where: {
        id: Number(id),
        restaurantId,
      },
    });
  }

  async deleteAllByRestaurant(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.order.deleteMany({
      where: {
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

  async findById(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    return db.order.findFirst({
      where: {
        id: Number(id),
        restaurantId,
      },
      include: statusUpdateOrderInclude,
    });
  }

  async findByPublicIdForTableParticipant(
    publicId: string,
    tableSessionId: number,
    restaurantId: number,
    participantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        publicId,
        tableSessionId,
        restaurantId,
        participantId,
        type: OrderType.MESA,
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
        table: { select: operationalTableSelect },
        participant: { select: tableParticipantSelect },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOperationalById(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        id: Number(id),
        restaurantId,
        NOT: {
          paid: false,
          paymentMethod: {
            in: [PaymentMethod.PIX, PaymentMethod.CARTAO],
          },
          payOnDelivery: false,
        },
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
        table: { select: operationalTableSelect },
        participant: { select: tableParticipantSelect },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findByIdForCustomer(
    id: number | string,
    customerId: number,
    restaurantId?: number | null,
    db: PrismaClientLike = prisma,
  ) {
    const normalizedRestaurantId = Number(restaurantId || 0);

    return db.order.findFirst({
      where: {
        id: Number(id),
        userId: customerId,
        ...(Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
          ? { restaurantId: normalizedRestaurantId }
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
        table: { select: operationalTableSelect },
        participant: { select: tableParticipantSelect },
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
        table: { select: operationalTableSelect },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async claimPixPaymentId(
    id: number | string,
    restaurantId: number,
    pixPaymentId: string,
    db: PrismaClientLike = prisma,
  ) {
    const normalizedPaymentId = String(pixPaymentId || '').trim();
    if (!normalizedPaymentId) {
      throw new Error('Pagamento PIX inválido para vincular ao pedido.');
    }

    const existingOwner = await db.order.findFirst({
      where: { pixPaymentId: normalizedPaymentId },
      select: { id: true },
    });
    if (existingOwner && existingOwner.id !== Number(id)) {
      throw new Error('Este pagamento PIX já foi utilizado em outro pedido.');
    }

    let result;
    try {
      result = await db.order.updateMany({
        where: {
          id: Number(id),
          restaurantId,
          paid: false,
          status: { not: OrderStatus.CANCELADO },
          OR: [{ pixPaymentId: null }, { pixPaymentId: normalizedPaymentId }],
        },
        data: { pixPaymentId: normalizedPaymentId },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('Este pagamento PIX já foi utilizado em outro pedido.');
      }
      throw error;
    }

    const current = await this.findById(id, restaurantId, db);
    if (!current) {
      throw new Error('Pedido não encontrado para vincular o pagamento PIX.');
    }

    if (result.count === 1 || current.pixPaymentId === normalizedPaymentId) {
      return current;
    }

    if (current.status === OrderStatus.CANCELADO) {
      throw new Error('Pagamento PIX não pode ser vinculado a um pedido cancelado.');
    }

    if (String(current.pixPaymentId || '').trim()) {
      throw new Error('O pedido já está vinculado a outro pagamento PIX.');
    }

    throw new Error('Não foi possível vincular o pagamento PIX ao pedido.');
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
        table: { select: operationalTableSelect },
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
        table: { select: operationalTableSelect },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findLatestByTableParticipant(
    tableSessionId: number | string,
    restaurantId: number | string,
    participantId: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findFirst({
      where: {
        tableSessionId: Number(tableSessionId),
        restaurantId: Number(restaurantId),
        participantId: Number(participantId),
        type: OrderType.MESA,
      },
      select: {
        publicId: true,
        total: true,
        status: true,
        type: true,
        paid: true,
        observation: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            observation: true,
            ingredients: true,
            customizations: true,
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
        table: { select: operationalTableSelect },
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
        createdAt: 'desc',
      },
    });
  }
}

export default new OrderRepository();
