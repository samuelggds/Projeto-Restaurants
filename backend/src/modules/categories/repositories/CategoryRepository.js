import prisma from "../../../config/prisma.js";

class CategoryRepository {
  async create(data, restaurantId, db = prisma) {
    return db.category.create({
      data: {
        ...data,
        restaurantId,
      },
    });
  }

  async findAll(restaurantId, db = prisma) {
    return db.category.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async findById(id, restaurantId, db = prisma) {
    return db.category.findFirst({
      where: {
        id: Number(id),
        restaurantId,
      },
    });
  }

  async findByName(name, restaurantId, db = prisma) {
    return db.category.findFirst({
      where: {
        restaurantId,
        name: {
          equals: String(name || "").trim(),
          mode: "insensitive",
        },
      },
    });
  }

  async update(id, data, restaurantId, db = prisma) {
    return db.category.updateMany({
      where: {
        id: Number(id),
        restaurantId,
      },
      data,
    });
  }
  async delete(id, restaurantId, db = prisma) {
    const categoryId = Number(id);

    const hasProducts = await db.product.findFirst({
      where: {
        categoryId,
        restaurantId,
      },
    });
    if (hasProducts) {
      throw new Error(
        "Não é possivel excluir uma categoria que possui produtos!",
      );
    }
    return db.category.deleteMany({
      where: {
        id: categoryId,
        restaurantId,
      },
    });
  }
}

export default new CategoryRepository();
