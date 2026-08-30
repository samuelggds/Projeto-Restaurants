import { createHash } from 'node:crypto';

import restaurantRepository from '../../restaurants/repositories/RestaurantRepository.js';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';

type PublicSettingsRevisionPayload = {
  restaurantId?: number | string;
  slug?: string;
  useDefault?: boolean;
};

type PublicRevisionSource = NonNullable<
  Awaited<ReturnType<typeof restaurantSettingsRepository.findPublicRevisionByRestaurantId>>
>;

function createRevision(source: PublicRevisionSource) {
  const parts = [
    'v1',
    `restaurant:${source.updatedAt.toISOString()}`,
    `settings:${source.settings?.updatedAt.toISOString() || '-'}`,
    ...source.banners.map((banner) => `banner:${banner.id}:${banner.updatedAt.toISOString()}`),
  ];

  return `v1-${createHash('sha256').update(parts.join('|')).digest('base64url')}`;
}

class GetPublicRestaurantSettingsRevisionService {
  async execute({ restaurantId, slug, useDefault }: PublicSettingsRevisionPayload) {
    let normalizedRestaurantId = Number(restaurantId);

    if ((!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) && slug) {
      const normalizedSlug = String(slug).trim();
      const restaurant = normalizedSlug
        ? await restaurantRepository.findBySlug(normalizedSlug)
        : null;

      if (!restaurant || restaurant.active === false) {
        throw new Error('Restaurante não encontrado ou indisponível.');
      }

      normalizedRestaurantId = Number(restaurant.id);
    }

    if (useDefault && (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0)) {
      const restaurant = await restaurantSettingsRepository.findDefaultActiveRestaurant();
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido.');
    }

    const source =
      await restaurantSettingsRepository.findPublicRevisionByRestaurantId(normalizedRestaurantId);

    if (!source || source.active === false) {
      throw new Error('Restaurante não encontrado ou indisponível.');
    }

    return {
      restaurantId: source.id,
      revision: createRevision(source),
    };
  }
}

export default new GetPublicRestaurantSettingsRevisionService();
