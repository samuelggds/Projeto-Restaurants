import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';

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
            email: true,
            phone: true,
            cnpj: true,
            slug: true,
            logo: true,
            coverImage: true,
            description: true,
            whatsapp: true,
            address: true,
            addressNumber: true,
            addressComplement: true,
            addressDistrict: true,
            city: true,
            state: true,
            zipCode: true,
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
        active: true,
        name: true,
        email: true,
        phone: true,
        cnpj: true,
        slug: true,
        logo: true,
        coverImage: true,
        description: true,
        whatsapp: true,
        address: true,
        addressNumber: true,
        addressComplement: true,
        addressDistrict: true,
        city: true,
        state: true,
        zipCode: true,
        banners: {
          where: { active: true },
          select: { id: true, title: true, image: true },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  async findDefaultActiveRestaurant() {
    return prisma.restaurant.findFirst({
      where: { active: true },
      select: { id: true },
      orderBy: { id: 'asc' },
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
        freeShippingMinimum: true,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsPix: true,
        acceptsCard: true,
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
        pixProvider: true,
        pixKey: true,
        whatsappEnabled: true,
        whatsappDisplayName: true,
        whatsappDefaultMessage: true,
        receiveOrdersOnWhatsapp: true,
        receiveStatusNotifications: true,
        instagram: true,
        facebook: true,
        tiktok: true,
        youtube: true,
        fontFamily: true,
        seoTitle: true,
        seoDescription: true,
        companyLegalName: true,
        ownerEmail: true,
        ownerPhone: true,
        businessHours: true,
        isOpenForOrders: true,
        averageDeliveryTime: true,
        autoAcceptOrders: true,
        trackingRequiresLogin: true,
        soundNotifications: true,
        maxConcurrentOrders: true,
        restaurant: {
          select: {
            name: true,
            active: true,
            slug: true,
            logo: true,
            coverImage: true,
            description: true,
            whatsapp: true,
            address: true,
            addressNumber: true,
            addressComplement: true,
            addressDistrict: true,
            city: true,
            state: true,
            zipCode: true,
            banners: {
              where: { active: true },
              select: { id: true, title: true, image: true },
              orderBy: { id: 'asc' },
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

  async update(restaurantId: number | string, data: Prisma.RestaurantSettingsUpdateInput) {
    return prisma.restaurantSettings.update({
      where: {
        restaurantId: Number(restaurantId),
      },
      data,
    });
  }
}

export default new RestaurantSettingsRepository();
