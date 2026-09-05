import {
  OrderStatus,
  PaymentMethod,
  Prisma,
  TableOrderSettlementMode,
} from '@prisma/client';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';

const operationalPaymentWhere = {
  OR: [
    { settlementMode: TableOrderSettlementMode.TABLE_ACCOUNT },
    { paymentMethod: null },
    { paid: true },
    { payOnDelivery: true },
    { paymentMethod: { notIn: [PaymentMethod.PIX, PaymentMethod.CARTAO] } },
  ],
} satisfies Prisma.OrderWhereInput;

class KitchenOrderRepository {
  async findAll(restaurantId: number, status?: OrderStatus) {
    return withTenantDbContext(restaurantId, (db) =>
      db.order.findMany({
        where: {
          restaurantId,
          ...(status ? { status } : {}),
          AND: [operationalPaymentWhere],
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
          table: {
            select: {
              id: true,
              number: true,
              active: true,
              restaurantId: true,
            },
          },
          participant: {
            select: {
              id: true,
              publicId: true,
              displayName: true,
            },
          },
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
      }),
    );
  }
}

export default new KitchenOrderRepository();
