import type { Prisma } from '@prisma/client';
import bannerRepository from '../repositories/BannerRepository.js';
import {
  normalizeBannerActive,
  normalizeBannerId,
  normalizeBannerImage,
  normalizeBannerPosition,
  normalizeBannerTitle,
  normalizeOptionalBannerText,
} from '../domain/bannerValidation.js';

type UpdateBannerPayload = {
  id: number | string;
  restaurantId: number | string;
  title?: unknown;
  highlight?: unknown;
  description?: unknown;
  buttonLabel?: unknown;
  image?: unknown;
  active?: unknown;
  position?: unknown;
};

class UpdateBannerService {
  async execute({
    id,
    restaurantId,
    title,
    highlight,
    description,
    buttonLabel,
    image,
    active,
    position,
  }: UpdateBannerPayload) {
    const normalizedId = normalizeBannerId(id);
    const normalizedRestaurantId = normalizeBannerId(restaurantId, 'Restaurante');
    const banner = await bannerRepository.findById(normalizedId, normalizedRestaurantId);

    if (!banner) {
      throw new Error('Banner não encontrado');
    }

    const data: Prisma.BannerUpdateInput = {};
    if (title !== undefined) data.title = normalizeBannerTitle(title);
    if (highlight !== undefined) {
      data.highlight = normalizeOptionalBannerText(highlight, {
        field: 'O destaque',
        maxLength: 50,
      });
    }
    if (description !== undefined) {
      data.description = normalizeOptionalBannerText(description, {
        field: 'A descrição',
        maxLength: 180,
      });
    }
    if (buttonLabel !== undefined) {
      data.buttonLabel = normalizeOptionalBannerText(buttonLabel, {
        field: 'O texto do botão',
        maxLength: 30,
      });
    }
    if (image !== undefined) data.image = normalizeBannerImage(image);
    if (active !== undefined) data.active = normalizeBannerActive(active);
    if (position !== undefined) data.position = normalizeBannerPosition(position);

    return bannerRepository.update(normalizedId, normalizedRestaurantId, data);
  }
}

export default new UpdateBannerService();
