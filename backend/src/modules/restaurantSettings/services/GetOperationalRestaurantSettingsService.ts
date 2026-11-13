import prisma from '../../../config/prisma.js';
import getPublicRestaurantSettingsService from './GetPublicRestaurantSettingsService.js';

/** Staff-only projection; the tenant comes exclusively from req.user. */
class GetOperationalRestaurantSettingsService {
  async execute(restaurantId: number) {
    if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
      throw new Error('Restaurante inválido.');
    }
    const [publicSettings, operation] = await Promise.all([
      getPublicRestaurantSettingsService.execute({ restaurantId }),
      prisma.restaurantSettings.findUnique({
        where: { restaurantId },
        select: {
          autoAcceptOrders: true,
          trackingRequiresLogin: true,
          soundNotifications: true,
          maxConcurrentOrders: true,
          receiveOrdersOnWhatsapp: true,
          receiveStatusNotifications: true,
        },
      }),
    ]);
    return { ...publicSettings, ...operation };
  }
}

export default new GetOperationalRestaurantSettingsService();
