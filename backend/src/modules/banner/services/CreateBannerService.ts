import bannerRepository from '../repositories/BannerRepository.js';
import {
  DEFAULT_BANNER_BUTTON_LABEL,
  normalizeBannerActive,
  normalizeBannerId,
  normalizeBannerImage,
  normalizeBannerPosition,
  normalizeBannerTitle,
  normalizeOptionalBannerText,
} from '../domain/bannerValidation.js';

type CreateBannerPayload = {
  title: unknown;
  highlight?: unknown;
  description?: unknown;
  buttonLabel?: unknown;
  image: unknown;
  active?: unknown;
  position?: unknown;
  restaurantId: number | string;
};

class CreateBannerService {
  async execute({
    title,
    highlight,
    description,
    buttonLabel,
    image,
    active,
    position,
    restaurantId,
  }: CreateBannerPayload) {
    const normalizedButtonLabel = normalizeOptionalBannerText(buttonLabel, {
      field: 'O texto do botão',
      maxLength: 30,
    });

    return bannerRepository.create({
      title: normalizeBannerTitle(title),
      highlight:
        normalizeOptionalBannerText(highlight, {
          field: 'O destaque',
          maxLength: 50,
        }) ?? null,
      description:
        normalizeOptionalBannerText(description, {
          field: 'A descrição',
          maxLength: 180,
        }) ?? null,
      buttonLabel:
        normalizedButtonLabel === undefined ? DEFAULT_BANNER_BUTTON_LABEL : normalizedButtonLabel,
      image: normalizeBannerImage(image),
      active: normalizeBannerActive(active, true),
      position: normalizeBannerPosition(position, 0),
      restaurantId: normalizeBannerId(restaurantId, 'Restaurante'),
    });
  }
}

export default new CreateBannerService();
