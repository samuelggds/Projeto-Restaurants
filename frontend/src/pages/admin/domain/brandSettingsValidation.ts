import { isPersistentImageSource } from '../../../utils/persistentImage';
import type { AdminSettings } from '../types';
import { validatePromotionBanners } from './promotionBannerValidation';

export type BrandSettingsErrors = Partial<
  Record<
    | 'restaurantName'
    | 'primaryColor'
    | 'description'
    | 'logoUrl'
    | 'coverImageUrl'
    | 'promotionalBanners',
    string
  >
>;

export function validateBrandSettings(settings: AdminSettings): BrandSettingsErrors {
  const errors: BrandSettingsErrors = {};
  const restaurantName = settings.restaurantName.trim();

  if (restaurantName.length < 2) {
    errors.restaurantName = 'Informe um nome com pelo menos 2 caracteres.';
  } else if (restaurantName.length > 120) {
    errors.restaurantName = 'O nome pode ter no máximo 120 caracteres.';
  }

  if (!/^#[0-9a-f]{6}$/i.test(settings.primaryColor.trim())) {
    errors.primaryColor = 'Use uma cor hexadecimal no formato #RRGGBB.';
  }

  if (settings.description.trim().length > 500) {
    errors.description = 'A descrição pode ter no máximo 500 caracteres.';
  }

  const imageFields = [
    ['logoUrl', settings.logoUrl],
    ['coverImageUrl', settings.coverImageUrl],
  ] as const;

  imageFields.forEach(([key, value]) => {
    if (value && !isPersistentImageSource(value)) {
      errors[key] = 'Selecione novamente a imagem para que ela possa ser salva.';
    }
  });

  if (Object.keys(validatePromotionBanners(settings.promotionalBanners)).length > 0) {
    errors.promotionalBanners = 'Revise os banners destacados antes de salvar.';
  }

  return errors;
}
