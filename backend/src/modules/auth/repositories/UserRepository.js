import prisma from "../../../config/prisma.js";

class UserRepository {
  async findByEmail(email, db = prisma) {
    return db.user.findUnique({
      where: {
        email,
      },
    });
  }

  async create(data, db = prisma) {
    return db.user.create({
      data,
    });
  }

  async findById(id, db = prisma) {
    return db.user.findUnique({
      where: {
        id: Number(id),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        phone: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
        zipCode: true,
        complement: true,
        restaurantId: true,
      },
    });
  }

  async updateProfile(id, data, db = prisma) {
    return db.user.update({
      where: {
        id: Number(id),
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        phone: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
        zipCode: true,
        complement: true,
        restaurantId: true,
      },
    });
  }

  async updatePassword(id, password, db = prisma) {
    return db.user.update({
      where: {
        id: Number(id),
      },
      data: {
        password,
      },
    });
  }
  async findByIdWithPassword(id, db = prisma) {
    return db.user.findUnique({
      where: {
        id: Number(id),
      },
    });
  }

  async deactivate(id, db = prisma) {
    return db.user.update({
      where: {
        id: Number(id),
      },
      data: {
        active: false,
      },
    });
  }
  async reactivate(id, db = prisma) {
    return db.user.update({
      where: {
        id: Number(id),
      },
      data: {
        active: true,
      },
    });
  }
}

export default new UserRepository();
