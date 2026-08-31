import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { UserRole } from '@prisma/client';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const employeePublicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  restaurantId: true,
  role: true,
  subRole: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

class EmployeeRepository {
  async findByEmail(email: string, db: PrismaClientLike = prisma) {
    return db.user.findFirst({
      where: { email },
      select: employeePublicSelect,
    });
  }

  async create(data: Prisma.UserUncheckedCreateInput, db: PrismaClientLike = prisma) {
    return db.user.create({
      data,
      select: employeePublicSelect,
    });
  }

  async findAllByRestaurant(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.user.findMany({
      where: {
        restaurantId,
        role: {
          in: [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO],
        },
      },
      select: employeePublicSelect,
    });
  }

  async findById(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    return db.user.findFirst({
      where: {
        id: Number(id),
        restaurantId,
        role: {
          in: [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO],
        },
      },
      select: employeePublicSelect,
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
      throw new Error('Funcionário não encontrado!');
    }

    return db.user.update({
      where: {
        id: Number(id),
        restaurantId,
        role: {
          in: [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO],
        },
      },
      data,
      select: employeePublicSelect,
    });
  }

  async deactivate(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    const employee = await this.findById(id, restaurantId, db);

    if (!employee) {
      throw new Error('Funcionário não encontrado!');
    }

    return db.user.update({
      where: {
        id: Number(id),
        restaurantId,
        role: {
          in: [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO],
        },
      },
      data: {
        active: false,
        authVersion: { increment: 1 },
      },
      select: employeePublicSelect,
    });
  }

  async reactivate(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    const employee = await this.findById(id, restaurantId, db);

    if (!employee) {
      throw new Error('Funcionário não encontrado!');
    }

    return db.user.update({
      where: {
        id: Number(id),
        restaurantId,
        role: {
          in: [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO],
        },
      },
      data: {
        active: true,
      },
      select: employeePublicSelect,
    });
  }
}

export default new EmployeeRepository();
