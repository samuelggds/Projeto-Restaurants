import { type Prisma, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class CourierAccessService {
  async assertActiveCourier(
    courierId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    if (
      !Number.isInteger(courierId) ||
      courierId <= 0 ||
      !Number.isInteger(restaurantId) ||
      restaurantId <= 0
    ) {
      throw new Error('Conta de motoqueiro inválida para este restaurante.');
    }

    const courier = await db.user.findFirst({
      where: {
        id: courierId,
        restaurantId,
        role: UserRole.MOTOQUEIRO,
        active: true,
      },
      select: { id: true, restaurantId: true },
    });

    if (!courier) {
      throw new Error(
        'Sua conta de motoqueiro não está ativa neste restaurante. Entre novamente ou fale com o administrador.',
      );
    }

    return courier;
  }
}

export default new CourierAccessService();
