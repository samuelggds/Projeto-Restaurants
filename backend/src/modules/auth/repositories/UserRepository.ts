import type { Prisma, User } from "@prisma/client";
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

  async findByPhone(phone: string, db: PrismaClientLike = prisma) {
    const normalizedPhone = String(phone || "").replace(/\D/g, "");

    if (!normalizedPhone) {
      return null;
    }

    const users = await db.$queryRaw<User[]>`
      SELECT *
      FROM "User"
      WHERE regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g') = ${normalizedPhone}
      LIMIT 1
    `;

    return users[0] || null;
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
        mustChangePassword: true,
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
        mustChangePassword: true,
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
        mustChangePassword: false,
      },
    });
  }

  async savePasswordResetCode(
    id: number | string,
    codeHash: string,
    expiresAt: Date,
    db: PrismaClientLike = prisma,
  ) {
    return db.user.update({
      where: {
        id: Number(id),
      },
      data: {
        resetPasswordCodeHash: codeHash,
        resetPasswordCodeExpiresAt: expiresAt,
      },
    });
  }

  async clearPasswordResetCode(
    id: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.user.update({
      where: {
        id: Number(id),
      },
      data: {
        resetPasswordCodeHash: null,
        resetPasswordCodeExpiresAt: null,
      },
    });
  }

  async updatePasswordAndClearResetCode(
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
        resetPasswordCodeHash: null,
        resetPasswordCodeExpiresAt: null,
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
