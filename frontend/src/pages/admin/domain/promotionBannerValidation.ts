import { isPersistentImageSource } from '../../../utils/persistentImage';
import type { AdminPromotionBanner } from '../types';

export const PROMOTION_BANNER_LIMITS = {
  title: 80,
  highlight: 50,
  description: 180,
  buttonLabel: 30,
} as const;

export type PromotionBannerField = 'title' | 'highlight' | 'description' | 'buttonLabel' | 'image';

export type PromotionBannerErrors = Partial<Record<PromotionBannerField, string>>;
export type PromotionBannersErrors = Record<string, PromotionBannerErrors>;

let localBannerSequence = 0;

export function createPromotionBannerLocalId() {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `promotion-banner-${randomId}`;
  localBannerSequence += 1;
  return `promotion-banner-${Date.now()}-${localBannerSequence}`;
}

export function createEmptyPromotionBanner(position: number): AdminPromotionBanner {
  return {
    localId: createPromotionBannerLocalId(),
    title: '',
    highlight: '',
    description: '',
    buttonLabel: 'Ver cardápio',
    image: '',
    active: true,
    position,
  };
}

export function reindexPromotionBanners(banners: AdminPromotionBanner[]): AdminPromotionBanner[] {
  return banners.map((banner, position) => ({ ...banner, position }));
}

export function validatePromotionBanner(banner: AdminPromotionBanner): PromotionBannerErrors {
  const errors: PromotionBannerErrors = {};
  const title = banner.title.trim();

  if (title.length < 2) {
    errors.title = 'Informe um título com pelo menos 2 caracteres.';
  } else if (title.length > PROMOTION_BANNER_LIMITS.title) {
    errors.title = `O título pode ter no máximo ${PROMOTION_BANNER_LIMITS.title} caracteres.`;
  }

  if (banner.highlight.trim().length > PROMOTION_BANNER_LIMITS.highlight) {
    errors.highlight = `O destaque pode ter no máximo ${PROMOTION_BANNER_LIMITS.highlight} caracteres.`;
  }

  if (banner.description.trim().length > PROMOTION_BANNER_LIMITS.description) {
    errors.description = `A descrição pode ter no máximo ${PROMOTION_BANNER_LIMITS.description} caracteres.`;
  }

  if (banner.buttonLabel.trim().length > PROMOTION_BANNER_LIMITS.buttonLabel) {
    errors.buttonLabel = `O botão pode ter no máximo ${PROMOTION_BANNER_LIMITS.buttonLabel} caracteres.`;
  }

  if (!banner.image) {
    errors.image = 'Selecione uma imagem para o banner.';
  } else if (!isPersistentImageSource(banner.image)) {
    errors.image = 'Selecione novamente a imagem para que ela possa ser salva.';
  }

  return errors;
}

export function validatePromotionBanners(banners: AdminPromotionBanner[]): PromotionBannersErrors {
  return banners.reduce<PromotionBannersErrors>((allErrors, banner) => {
    const errors = validatePromotionBanner(banner);
    if (Object.keys(errors).length > 0) allErrors[banner.localId] = errors;
    return allErrors;
  }, {});
}
