import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import getOsrmDeliveryRouteService, {
  type DeliveryRouteAddress,
} from './GetOsrmDeliveryRouteService.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

type ResolveDeliveryDistanceInput = {
  restaurantId: number | string;
  destination: DeliveryRouteAddress;
  db?: PrismaClientLike;
};

class ResolveDeliveryDistanceService {
  async execute({
    restaurantId,
    destination,
    db = prisma,
  }: ResolveDeliveryDistanceInput): Promise<number | null> {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para calcular a distância da entrega.');
    }

    const settings = await db.restaurantSettings.findUnique({
      where: { restaurantId: normalizedRestaurantId },
      select: { deliveryFeeMode: true },
    });

    if (settings?.deliveryFeeMode !== 'DISTANCE') {
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
      throw new Error(
        'O endereço do restaurante precisa estar completo para usar taxa por distância.',
      );
    }

    const originCoordinates = await getOsrmDeliveryRouteService.geocodeAddress(originAddress);
    if (!originCoordinates) {
      throw new Error('Não foi possível localizar o endereço do restaurante para calcular a entrega.');
    }

    const route = await getOsrmDeliveryRouteService.execute({
      ...originCoordinates,
      destination,
    });

    const distanceMeters = Number(route?.distanceMeters);
    if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
      throw new Error('Não foi possível calcular a rota até este endereço de entrega.');
    }

    return distanceMeters;
  }
}

export default new ResolveDeliveryDistanceService();
