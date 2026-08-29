import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { roundMoney } from '../../products/utils/productDiscount.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

type CalculateDeliveryFeeInput = {
  restaurantId: number;
  distanceMeters: number;
  db?: PrismaClientLike;
};

class DeliveryFeeByDistanceService {
  async calculate({
    restaurantId,
    distanceMeters,
    db = prisma,
  }: CalculateDeliveryFeeInput) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedDistanceMeters = Number(distanceMeters);

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para calcular a taxa de entrega.');
    }

    if (!Number.isFinite(normalizedDistanceMeters) || normalizedDistanceMeters < 0) {
      throw new Error('Distância inválida para calcular a taxa de entrega.');
    }

    const distanceKm = normalizedDistanceMeters / 1000;

    const range = await db.deliveryFeeRange.findFirst({
      where: {
        restaurantId: normalizedRestaurantId,
        active: true,
        maxDistanceKm: {
          gte: distanceKm,
        },
      },
      orderBy: {
        maxDistanceKm: 'asc',
      },
    });

    if (!range) {
      throw new Error('Este endereço está fora da área de entrega do restaurante.');
    }

    return {
      distanceMeters: normalizedDistanceMeters,
      distanceKm,
      maxDistanceKm: Number(range.maxDistanceKm),
      deliveryFeeAmount: roundMoney(Math.max(Number(range.fee), 0)),
    };
  }
}

export default new DeliveryFeeByDistanceService();
