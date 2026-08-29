import { describe, expect, it } from 'vitest';
import {
  PROMOTION_BANNER_LIMITS,
  createEmptyPromotionBanner,
  reindexPromotionBanners,
  validatePromotionBanner,
  validatePromotionBanners,
} from './promotionBannerValidation';

describe('promotion banner validation', () => {
  it('aceita um banner completo e persistível', () => {
    const banner = {
      ...createEmptyPromotionBanner(0),
      title: 'Festival de pizzas',
      highlight: '30% OFF',
      description: 'Somente nesta sexta-feira.',
      image: 'data:image/webp;base64,UklGRg==',
    };

    expect(validatePromotionBanner(banner)).toEqual({});
  });

  it('exige título e imagem e aplica os limites editoriais', () => {
    const banner = {
      ...createEmptyPromotionBanner(0),
      title: '',
      highlight: 'x'.repeat(PROMOTION_BANNER_LIMITS.highlight + 1),
      description: 'x'.repeat(PROMOTION_BANNER_LIMITS.description + 1),
      buttonLabel: 'x'.repeat(PROMOTION_BANNER_LIMITS.buttonLabel + 1),
      image: 'blob:http://localhost/banner',
    };

    expect(validatePromotionBanner(banner)).toMatchObject({
      title: expect.any(String),
      highlight: expect.any(String),
      description: expect.any(String),
      buttonLabel: expect.any(String),
      image: expect.any(String),
    });
  });

  it('mantém os erros associados ao localId e normaliza a ordem após mover ou remover', () => {
    const first = createEmptyPromotionBanner(5);
    const second = createEmptyPromotionBanner(9);
    const errors = validatePromotionBanners([first, second]);

    expect(Object.keys(errors)).toEqual([first.localId, second.localId]);
    expect(reindexPromotionBanners([second, first]).map((banner) => banner.position)).toEqual([
      0, 1,
    ]);
  });
});
