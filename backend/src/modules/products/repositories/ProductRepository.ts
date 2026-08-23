import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

type ProductRatingUpsertData = {
  restaurantId: number;
  productId: number;
  clientKey: string;
  rating: number;
};

const productConfigurationInclude = {
  category: true,
  discount: true,
  ingredients: { orderBy: { id: 'asc' as const } },
  optionGroups: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    include: {
      options: {
        orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
        include: {
          ingredient: true,
        },
      },
    },
  },
};

class ProductRepository {
  async create(
    data: Omit<Prisma.ProductUncheckedCreateInput, 'restaurantId'>,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.product.create({
      data: {
        ...data,
        restaurantId,
      },
    });
  }

  async findByName(
    name: string | null | undefined,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.product.findFirst({
      where: {
        restaurantId,
        name: {
          equals: String(name || '').trim(),
          mode: 'insensitive',
        },
      },
    });
  }

  async findAll(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.product.findMany({
      where: {
        restaurantId,
      },
      include: {
        ...productConfigurationInclude,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(
    id: number | string,
    data: Prisma.ProductUpdateManyMutationInput,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.product.updateMany({
      where: {
        id: Number(id),
        restaurantId,
      },
      data,
    });
  }

  async findById(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    return db.product.findFirst({
      where: {
        id: Number(id),
        restaurantId,
      },
      include: {
        ...productConfigurationInclude,
      },
    });
  }

  async delete(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    const productId = Number(id);

    const hasOrders = await db.orderItem.findFirst({
      where: {
        productId,
        order: {
          restaurantId,
        },
      },
    });

    if (hasOrders) {
      throw new Error('Não é possível excluir um produto que já possui pedidos.');
    }

    return db.product.deleteMany({
      where: {
        id: productId,
        restaurantId,
      },
    });
  }

  async listRatingsByRestaurant(
    restaurantId: number,
    clientKey?: string,
    db: PrismaClientLike = prisma,
  ) {
    const summaries = await db.productRating.groupBy({
      by: ['productId'],
      where: {
        restaurantId,
      },
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    });

    let userRatingsMap = new Map<number, number>();

    if (clientKey) {
      const userRatings = await db.productRating.findMany({
        where: {
          restaurantId,
          clientKey,
        },
        select: {
          productId: true,
          rating: true,
        },
      });

      userRatingsMap = new Map(
        userRatings.map((item) => [Number(item.productId), Number(item.rating)]),
      );
    }

    return summaries.map((item) => ({
      productId: Number(item.productId),
      average: Number(item._avg.rating || 0),
      count: Number(item._count._all || 0),
      userRating: Number(userRatingsMap.get(Number(item.productId)) || 0),
    }));
  }

  async upsertRating(data: ProductRatingUpsertData, db: PrismaClientLike = prisma) {
    const { restaurantId, productId, clientKey, rating } = data;

    return db.productRating.upsert({
      where: {
        restaurantId_productId_clientKey: {
          restaurantId,
          productId,
          clientKey,
        },
      },
      update: {
        rating,
      },
      create: {
        restaurantId,
        productId,
        clientKey,
        rating,
      },
    });
  }

  async getRatingSummary(
    productId: number,
    restaurantId: number,
    clientKey?: string,
    db: PrismaClientLike = prisma,
  ) {
    const grouped = await db.productRating.groupBy({
      by: ['productId'],
      where: {
        restaurantId,
        productId,
      },
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    });

    const summary = grouped[0];

    let userRating = 0;

    if (clientKey) {
      const mine = await db.productRating.findUnique({
        where: {
          restaurantId_productId_clientKey: {
            restaurantId,
            productId,
            clientKey,
          },
        },
        select: {
          rating: true,
        },
      });

      userRating = Number(mine?.rating || 0);
    }

    return {
      productId: Number(productId),
      average: Number(summary?._avg?.rating || 0),
      count: Number(summary?._count?._all || 0),
      userRating,
    };
  }
}

export default new ProductRepository();
