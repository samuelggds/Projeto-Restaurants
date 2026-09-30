import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import type { DeliveryRouteAddress } from './DeliveryRoutingProvider.js';
import { getDeliveryRoutingProvider } from './GetDeliveryRoutingProvider.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

type ResolveDeliveryDistanceInput = {
  restaurantId: number | string;
  destination: DeliveryRouteAddress;
  db?: PrismaClientLike;
  force?: boolean;
};

class ResolveDeliveryDistanceService {
  async execute({
    restaurantId,
    destination,
    db = prisma,
    force = false,
  }: ResolveDeliveryDistanceInput): Promise<number | null> {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para calcular a distância da entrega.');
    }

    const settings = await db.restaurantSettings.findUnique({
      where: { restaurantId: normalizedRestaurantId },
      select: { deliveryFeeMode: true },
    });

    if (settings?.deliveryFeeMode !== 'DISTANCE' && !force) {
      return null;
    }

    const requiredDestinationFields = [
      destination.address,
      destination.number,
      destination.district,
      destination.city,
      destination.state,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    if (requiredDestinationFields.length < 5) {
      throw new Error('Informe o endereço completo para calcular a taxa de entrega.');
    }

    const restaurant = await db.restaurant.findUnique({
      where: { id: normalizedRestaurantId },
      select: {
        address: true,
        addressNumber: true,
        addressDistrict: true,
        city: true,
        state: true,
      },
    });

    if (!restaurant) {
      throw new Error('Restaurante não encontrado para calcular a taxa de entrega.');
    }

    const originAddress: DeliveryRouteAddress = {
      address: restaurant.address,
      number: restaurant.addressNumber,
      district: restaurant.addressDistrict,
      city: restaurant.city,
      state: restaurant.state,
    };

    const requiredOriginFields = [
      originAddress.address,
      originAddress.number,
      originAddress.district,
      originAddress.city,
      originAddress.state,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    if (requiredOriginFields.length < 5) {
      return null;
    }

    try {
      const provider = getDeliveryRoutingProvider();
      const resolvedDistanceMeters = await provider.calculateDistanceMeters({
        origin: originAddress,
        destination,
      });
      if (resolvedDistanceMeters === null || resolvedDistanceMeters === undefined) {
        return null;
      }

      const distanceMeters = Number(resolvedDistanceMeters);
      if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
        return null;
      }

      return Math.round(distanceMeters);
    } catch {
      return null;
    }
  }
}

export default new ResolveDeliveryDistanceService();
