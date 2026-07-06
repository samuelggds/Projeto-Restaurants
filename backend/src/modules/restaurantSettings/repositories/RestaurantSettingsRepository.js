import prisma from "../../../config/prisma.js";

class RestaurantSettingsRepository {
  async findByRestaurantId(restaurantId) {
    return prisma.restaurantSettings.findUnique({
      where: {
        restaurantId: Number(restaurantId),
      },
    });
  }

  async create(data) {
    return prisma.restaurantSettings.create({
      data,
    });
  }

  async update(restaurantId, data) {
    return prisma.restaurantSettings.update({
      where: {
        restaurantId: Number(restaurantId),
      },
      data,
    });
  }
}

export default new RestaurantSettingsRepository();
