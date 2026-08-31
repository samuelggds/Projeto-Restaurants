import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import {
  credentialEncryptionContext,
  decryptCredential,
  encryptCredential,
  RESTAURANT_CREDENTIAL_FIELDS,
} from '../security/credentialEncryption.js';

export function encryptCredentialData<T extends Record<string, any>>(
  data: T,
  restaurantId: number | string,
) {
  const result: Record<string, any> = { ...data };
  for (const field of RESTAURANT_CREDENTIAL_FIELDS) {
    if (!(field in result)) continue;
    const value = result[field];
    // Em updates parciais o Prisma ignora `undefined`. Converter esse valor em
    // `null` apagava todas as outras credenciais sempre que o admin alterava
    // apenas uma configuração não sensível.
    if (value === undefined) continue;
    if (value && typeof value === 'object' && 'set' in value && value.set === undefined) continue;
    result[field] =
      value && typeof value === 'object' && 'set' in value
        ? {
            ...value,
            set: encryptCredential(value.set, credentialEncryptionContext(restaurantId, field)),
          }
        : encryptCredential(value, credentialEncryptionContext(restaurantId, field));
  }
  return result as T;
}

function decryptCredentialRecord<T extends Record<string, any> | null>(
  record: T,
  restaurantId: number | string,
) {
  if (!record) return record;
  const result: Record<string, any> = { ...record };
  for (const field of RESTAURANT_CREDENTIAL_FIELDS) {
    if (field in result) {
      result[field] = decryptCredential(
        result[field],
        credentialEncryptionContext(restaurantId, field),
      );
    }
  }
  return result as T;
}

class RestaurantSettingsRepository {
  async findByRestaurantId(restaurantId: number | string) {
    const settings = await prisma.restaurantSettings.findUnique({
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
            deliveryFeeRanges: {
              select: {
                id: true,
                maxDistanceKm: true,
                fee: true,
                active: true,
              },
              orderBy: {
                maxDistanceKm: 'asc',
              },
            },
          },
        },
      },
    });
    return decryptCredentialRecord(settings, restaurantId);
  }

  async findRestaurantById(restaurantId: number | string) {
    return prisma.restaurant.findUnique({
      where: {
        id: Number(restaurantId),
      },
      select: {
        id: true,
        active: true,
        updatedAt: true,
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
          select: {
            id: true,
            title: true,
            highlight: true,
            description: true,
            buttonLabel: true,
            image: true,
            position: true,
            updatedAt: true,
          },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
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

  async findPublicRevisionByRestaurantId(restaurantId: number | string) {
    return prisma.restaurant.findUnique({
      where: {
        id: Number(restaurantId),
      },
      select: {
        id: true,
        active: true,
        updatedAt: true,
        settings: {
          select: {
            updatedAt: true,
          },
        },
        banners: {
          where: { active: true },
          select: {
            id: true,
            updatedAt: true,
          },
          orderBy: { id: 'asc' },
        },
      },
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
            updatedAt: true,
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
              select: {
                id: true,
                title: true,
                highlight: true,
                description: true,
                buttonLabel: true,
                image: true,
                position: true,
                updatedAt: true,
              },
              orderBy: [{ position: 'asc' }, { id: 'asc' }],
            },
          },
        },
      },
    });
  }

  async create(data: Prisma.RestaurantSettingsUncheckedCreateInput) {
    const restaurantId = Number(data.restaurantId);
    const created = await prisma.restaurantSettings.create({
      data: encryptCredentialData(data, restaurantId),
    });
    return decryptCredentialRecord(created, restaurantId);
  }

  async update(restaurantId: number | string, data: Prisma.RestaurantSettingsUpdateInput) {
    const updated = await prisma.restaurantSettings.update({
      where: {
        restaurantId: Number(restaurantId),
      },
      data: encryptCredentialData(data, restaurantId),
    });
    return decryptCredentialRecord(updated, restaurantId);
  }
}

export default new RestaurantSettingsRepository();
