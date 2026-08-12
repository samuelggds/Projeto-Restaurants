import type { Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.js";
import { UserRole } from "@prisma/client";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class EmployeeRepository {
  async findByEmail(email: string, db: PrismaClientLike = prisma) {
    return db.user.findFirst({
      where: { email },
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

  async findAllByRestaurant(
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.user.findMany({
      where: {
        restaurantId,
        role: {
          in: [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO],
        },
      },
    });
  }

  async findById(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.user.findFirst({
      where: {
        id: Number(id),
        restaurantId,
        role: {
          in: [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO],
        },
      },
    });
  }

  async update(
    id: number | string,
    data: Prisma.UserUpdateInput,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    const employee = await this.findById(id, restaurantId, db);

    if (!employee) {
      throw new Error("Funcionário não encontrado!");
    }

    return db.user.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async deactivate(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    const employee = await this.findById(id, restaurantId, db);

    if (!employee) {
      throw new Error("Funcionário não encontrado!");
    }

    return db.user.update({
      where: {
        id: Number(id),
      },
      data: {
        active: false,
      },
    });
  }

  async reactivate(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    const employee = await this.findById(id, restaurantId, db);

    if (!employee) {
      throw new Error("Funcionário não encontrado!");
    }

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

export default new EmployeeRepository();
