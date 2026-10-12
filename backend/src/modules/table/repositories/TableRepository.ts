import type { Prisma } from '@prisma/client';
import {
  OrderStatus,
  PaymentMethod,
  TableOrderSettlementMode,
  TableParticipantStatus,
  TableSessionStatus,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class TableRepository {
  async create(data: Prisma.TableUncheckedCreateInput, db: PrismaClientLike = prisma) {
    return db.table.create({
      data,
      include: {
        restaurant: {
          select: {
            slug: true,
          },
        },
      },
    });
  }

  async findByIdForRestaurant(
    id: number | string,
    restaurantId: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.table.findFirst({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
      },
    });
  }

  async findByNumber(number: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    return db.table.findFirst({
      where: {
        number: Number(number),
        restaurantId,
      },
    });
  }

  async findPublicByReference(
    {
      number,
      tableToken,
      restaurantId,
      restaurantSlug,
    }: {
      number: number;
      tableToken: string;
      restaurantId?: number;
      restaurantSlug?: string;
    },
    db: PrismaClientLike = prisma,
  ) {
    return db.table.findFirst({
      where: {
        number,
        token: tableToken,
        active: true,
        restaurant: {
          active: true,
          ...(restaurantId ? { id: restaurantId } : {}),
          ...(restaurantSlug ? { slug: restaurantSlug } : {}),
        },
      },
      select: {
        id: true,
        number: true,
        restaurantId: true,
        restaurant: {
          select: {
            slug: true,
            settings: {
              select: {
                tableOrderingEnabled: true,
                waiterCallEnabled: true,
                billRequestEnabled: true,
              },
            },
            subscription: {
              select: {
                plan: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllByRestaurant(restaurantId: number, db: PrismaClientLike = prisma) {
    // A lista do salão deve considerar somente atendimentos abertos e não expirados.
    // Pedidos de sessões encerradas continuam no banco, mas não entram nos indicadores.
    const activeSessionWhere = {
      restaurantId,
      status: { in: [TableSessionStatus.OPEN, TableSessionStatus.CLOSING_REQUESTED] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    } satisfies Prisma.TableSessionWhereInput;

    return db.table.findMany({
      where: {
        restaurantId,
      },
      include: {
        restaurant: {
          select: {
            slug: true,
          },
        },
        tableSessions: {
          where: activeSessionWhere,
          orderBy: { openedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            publicId: true,
            status: true,
            openedAt: true,
            expiresAt: true,
            openedBy: { select: { id: true, name: true } },
            _count: {
              select: {
                participants: {
                  where: {
                    restaurantId,
                    status: TableParticipantStatus.ACTIVE,
                    revokedAt: null,
                  },
                },
              },
            },
          },
        },
        orders: {
          where: {
            // Evita buscar pedidos históricos ou sem sessão vinculada à mesa.
            tableSession: { is: activeSessionWhere },
            status: { in: [OrderStatus.PENDENTE, OrderStatus.PREPARANDO, OrderStatus.PRONTO] },
            // Pedidos lançados na conta não possuem paymentMethod. O filtro anterior
            // os eliminava por causa da semântica de NULL do banco e fazia o garçom
            // enxergar R$ 0,00 mesmo com saldo pendente na mesa.
            OR: [
              { settlementMode: TableOrderSettlementMode.TABLE_ACCOUNT },
              { paymentMethod: null },
              { paid: true },
              { payOnDelivery: true },
              { paymentMethod: { notIn: [PaymentMethod.PIX, PaymentMethod.CARTAO] } },
            ],
          },
          select: {
            id: true,
            tableSessionId: true,
            total: true,
          },
        },
        _count: {
          select: {
            orders: true,
            tableSessions: true,
          },
        },
      },
      orderBy: {
        number: 'asc',
      },
    });
  }

  async update(
    id: number | string,
    restaurantId: number | string,
    data: Prisma.TableUpdateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.table.update({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
      },
      data,
    });
  }

  async deactivate(
    id: number | string,
    restaurantId: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.table.update({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
      },
      data: {
        active: false,
      },
    });
  }

  async deleteIfUnused(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    const result = await db.table.deleteMany({
      where: {
        id: Number(id),
        restaurantId,
        orders: { none: {} },
        tableSessions: {
          none: {
            status: {
              in: [TableSessionStatus.OPEN, TableSessionStatus.CLOSING_REQUESTED],
            },
          },
        },
      },
    });
    return result.count;
  }
}

export default new TableRepository();
