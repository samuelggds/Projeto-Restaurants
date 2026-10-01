// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import getPublicRestaurantSettingsService from './GetPublicRestaurantSettingsService.js';

const originals = {
  aggregate: prisma.order.aggregate,
  publicSettings: restaurantSettingsRepository.findPublicByRestaurantId,
  restaurant: restaurantSettingsRepository.findRestaurantById,
};

afterEach(() => {
  prisma.order.aggregate = originals.aggregate;
  restaurantSettingsRepository.findPublicByRestaurantId = originals.publicSettings;
  restaurantSettingsRepository.findRestaurantById = originals.restaurant;
});

test('média pública usa somente avaliações do restaurantId solicitado', async () => {
  let aggregateWhere;
  prisma.order.aggregate = async ({ where }) => {
    aggregateWhere = where;
    return { _avg: { deliveryRating: 4.5 }, _count: { deliveryRating: 8 } };
  };
  restaurantSettingsRepository.findPublicByRestaurantId = async () => null;
  restaurantSettingsRepository.findRestaurantById = async () => ({
    id: 7,
    active: true,
    name: 'North Pizza',
    slug: 'north-pizza',
    logo: null,
    banners: [],
  });

  const result = await getPublicRestaurantSettingsService.execute({ restaurantId: 7 });

  assert.equal(aggregateWhere.restaurantId, 7);
  assert.equal(aggregateWhere.deliveryConfirmedAt.not, null);
  assert.equal(result.restaurantRatingAverage, 4.5);
  assert.equal(result.restaurantRatingCount, 8);
});
