import prisma from "../../../config/prisma.js";

class RestaurantRepository {
  async findByEmail(email, db: any = prisma) {
    return db.restaurant.findUnique({
      where: { email },
    });
  }

  async findBySlug(slug, db: any = prisma) {
    return db.restaurant.findUnique({
      where: { slug },
    });
  }

  async create(data, db: any = prisma) {
    return db.restaurant.create({
      data,
    });
  }

  async listAll(db: any = prisma) {
    return db.restaurant.findMany({
      include: {
        users: {
          where: { role: "ADMIN" },
          select: {
            id: true,
            name: true,
            email: true,
          },
          take: 1,
        },
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export default new RestaurantRepository();
