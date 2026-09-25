// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import repository from '../repositories/RestaurantSettingsRepository.js';
import service from './GetRestaurantSettingsService.js';

const originals = {
  findByRestaurantId: repository.findByRestaurantId,
  findRestaurantById: repository.findRestaurantById,
};

afterEach(() => {
  repository.findByRestaurantId = originals.findByRestaurantId;
  repository.findRestaurantById = originals.findRestaurantById;
});

test('fallback de configurações preserva o slug público do restaurante', async () => {
  repository.findByRestaurantId = async () => null;
  repository.findRestaurantById = async () => ({
    id: 9,
    name: 'North Pizza',
    slug: 'north-pizza',
    logo: null,
    coverImage: null,
    description: null,
    whatsapp: null,
    address: null,
    addressNumber: null,
    addressComplement: null,
    addressDistrict: null,
    city: null,
    state: null,
    zipCode: null,
  });

  const settings = await service.execute({ restaurantId: 9 });

  assert.equal(settings.restaurant.slug, 'north-pizza');
});
