import prisma from "../../../config/prisma.js";

class ProductRepository {
  async create(data, restaurantId, db = prisma) {
    return db.product.create({
      data: {
        ...data,
        restaurantId,
      },
    });
  }

  async findAll(restaurantId, db = prisma) {
    return db.product.findMany({
      where: {
        restaurantId,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async update(id, data, restaurantId, db = prisma) {
    return db.product.updateMany({
      where: {
        id: Number(id),
        restaurantId,
      },
      data,
    });
  }

  async findById(id, restaurantId, db = prisma) {
    return db.product.findFirst({
      where: {
        id: Number(id),
        restaurantId,
      },
      include: {
        category: true,
      },
    });
  }

  async delete(id, restaurantId, db = prisma) {
    const productId = Number(id);

    const hasOrders = await db.orderItem.findFirst({
      where: {
        productId,
        restaurantId,
      },
    });

    if (hasOrders) {
      throw new Error(
        "Não é possível excluir um produto que já possui pedidos.",
      );
    }

    return db.product.deleteMany({
      where: {
        id: productId,
        restaurantId,
      },
    });
  }
}

export default new ProductRepository();
