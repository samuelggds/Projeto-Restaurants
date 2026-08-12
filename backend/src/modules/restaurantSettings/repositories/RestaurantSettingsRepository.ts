import type { Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.js";

class RestaurantSettingsRepository {
  async findByRestaurantId(restaurantId: number | string) {
    return prisma.restaurantSettings.findUnique({
      where: {
        restaurantId: Number(restaurantId),
      },
      include: {
        restaurant: {
          select: {
            name: true,
            slug: true,
            logo: true,
            coverImage: true,
            description: true,
            whatsapp: true,
          },
        },
      },
    });
  }

  async findRestaurantById(restaurantId: number | string) {
    return prisma.restaurant.findUnique({
      where: {
        id: Number(restaurantId),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        coverImage: true,
        description: true,
        whatsapp: true,
        banners: {
          where: { active: true },
          select: { id: true, title: true, image: true },
          orderBy: { id: "asc" },
        },
      },
    });
  }

  async findDefaultActiveRestaurant() {
    return prisma.restaurant.findFirst({
      where: { active: true },
      select: { id: true },
      orderBy: { id: "asc" },
    });
  }

  async findPublicByRestaurantId(restaurantId: number | string) {
    return prisma.restaurantSettings.findUnique({
      where: {
        restaurantId: Number(restaurantId),
      },
      select: {
        restaurantId: true,
        primaryColor: true,
        deliveryFee: true,
        minimumOrder: true,
        pixProvider: true,
        pixKey: true,
        instagram: true,
        facebook: true,
        restaurant: {
          select: {
            name: true,
            slug: true,
            logo: true,
            coverImage: true,
            description: true,
            banners: {
              where: { active: true },
              select: { id: true, title: true, image: true },
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });
  }

  async create(data: Prisma.RestaurantSettingsUncheckedCreateInput) {
    return prisma.restaurantSettings.create({
      data,
    });
  }

  async update(
    restaurantId: number | string,
    data: Prisma.RestaurantSettingsUpdateInput,
  ) {
    return prisma.restaurantSettings.update({
      where: {
        restaurantId: Number(restaurantId),
      },
      data,
    });
  }
}

export default new RestaurantSettingsRepository();
