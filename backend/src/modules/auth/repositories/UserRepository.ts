import type { Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.js";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class UserRepository {
  async findByEmail(email: string, db: PrismaClientLike = prisma) {
    return db.user.findUnique({
      where: {
        email,
      },
    });
  }

  async create(
    data: Prisma.UserUncheckedCreateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.user.create({
      data,
    });
  }

  async findById(id: number | string, db: PrismaClientLike = prisma) {
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
        cpf: true,
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

  async updateProfile(
    id: number | string,
    data: Prisma.UserUpdateInput,
    db: PrismaClientLike = prisma,
  ) {
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
        cpf: true,
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

  async updatePassword(
    id: number | string,
    password: string,
    db: PrismaClientLike = prisma,
  ) {
    return db.user.update({
      where: {
        id: Number(id),
      },
      data: {
        password,
      },
    });
  }
  async findByIdWithPassword(
    id: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.user.findUnique({
      where: {
        id: Number(id),
      },
    });
  }

  async deactivate(id: number | string, db: PrismaClientLike = prisma) {
    return db.user.update({
      where: {
        id: Number(id),
      },
      data: {
        active: false,
      },
    });
  }
  async reactivate(id: number | string, db: PrismaClientLike = prisma) {
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
