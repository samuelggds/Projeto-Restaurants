import type { Prisma } from "@prisma/client";
import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";
import prisma from "../../../config/prisma.js";

type UpdateRestaurantSettingsPayload = {
  restaurantId: number | string;
  deliveryFee?: number;
  minimumOrder?: number;
  pixProvider?: string;
  pixKey?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  restaurantName?: string | null;
  restaurantLogo?: string | null;
  restaurantCoverImage?: string | null;
};

class UpdateRestaurantSettingsService {
  async execute({
    restaurantId,
    deliveryFee,
    minimumOrder,
    pixProvider,
    pixKey,
    whatsapp,
    instagram,
    facebook,
    restaurantName,
    restaurantLogo,
    restaurantCoverImage,
  }: UpdateRestaurantSettingsPayload) {
    const settings =
      await restaurantSettingsRepository.findByRestaurantId(restaurantId);

    if (!settings) {
      throw new Error("Configurações não encontradas!");
    }

    const normalizedWhatsapp =
      whatsapp === undefined
        ? undefined
        : String(whatsapp || "").trim() || null;
    const normalizedRestaurantName =
      restaurantName === undefined
        ? undefined
        : String(restaurantName || "").trim();
    const normalizedRestaurantLogo =
      restaurantLogo === undefined
        ? undefined
        : String(restaurantLogo || "").trim() || null;
    const normalizedRestaurantCoverImage =
      restaurantCoverImage === undefined
        ? undefined
        : String(restaurantCoverImage || "").trim() || null;

    if (
      restaurantName !== undefined &&
      String(normalizedRestaurantName || "").length < 2
    ) {
      throw new Error("Nome do restaurante inválido.");
    }

    const updated = await restaurantSettingsRepository.update(restaurantId, {
      deliveryFee,
      minimumOrder,
      pixProvider: String(pixProvider || settings.pixProvider || "MERCADO_PAGO")
        .trim()
        .toUpperCase(),
      pixKey,
      instagram,
      facebook,
    });

    const restaurantData: Prisma.RestaurantUpdateInput = {};

    if (normalizedWhatsapp !== undefined) {
      restaurantData.whatsapp = normalizedWhatsapp;
    }

    if (normalizedRestaurantName !== undefined) {
      restaurantData.name = normalizedRestaurantName;
    }

    if (normalizedRestaurantLogo !== undefined) {
      restaurantData.logo = normalizedRestaurantLogo;
    }

    if (normalizedRestaurantCoverImage !== undefined) {
      restaurantData.coverImage = normalizedRestaurantCoverImage;
    }

    if (Object.keys(restaurantData).length > 0) {
      await prisma.restaurant.update({
        where: {
          id: Number(restaurantId),
        },
        data: restaurantData,
      });
    }

    return {
      ...updated,
      whatsapp:
        whatsapp !== undefined
          ? normalizedWhatsapp
          : String(settings?.restaurant?.whatsapp || "").trim() || null,
      restaurantName:
        restaurantName !== undefined
          ? normalizedRestaurantName
          : String(settings?.restaurant?.name || "").trim() || null,
      restaurantLogo:
        restaurantLogo !== undefined
          ? normalizedRestaurantLogo
          : String(settings?.restaurant?.logo || "").trim() || null,
      restaurantCoverImage:
        restaurantCoverImage !== undefined
          ? normalizedRestaurantCoverImage
          : String(settings?.restaurant?.coverImage || "").trim() || null,
    };
  }
}

export default new UpdateRestaurantSettingsService();
