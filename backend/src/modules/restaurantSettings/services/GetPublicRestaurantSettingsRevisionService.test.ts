// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import restaurantRepository from '../../restaurants/repositories/RestaurantRepository.js';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import service from './GetPublicRestaurantSettingsRevisionService.js';

const originals = {
  findBySlug: restaurantRepository.findBySlug,
  findDefaultActiveRestaurant: restaurantSettingsRepository.findDefaultActiveRestaurant,
  findPublicRevisionByRestaurantId: restaurantSettingsRepository.findPublicRevisionByRestaurantId,
};

afterEach(() => {
  restaurantRepository.findBySlug = originals.findBySlug;
  restaurantSettingsRepository.findDefaultActiveRestaurant = originals.findDefaultActiveRestaurant;
  restaurantSettingsRepository.findPublicRevisionByRestaurantId =
    originals.findPublicRevisionByRestaurantId;
});

function revisionSource(overrides = {}) {
  return {
    id: 7,
    active: true,
    updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    settings: { updatedAt: new Date('2026-08-02T12:00:00.000Z') },
    banners: [
      { id: 2, updatedAt: new Date('2026-08-03T12:00:00.000Z') },
      { id: 9, updatedAt: new Date('2026-08-04T12:00:00.000Z') },
    ],
    ...overrides,
  };
}

test('gera uma revisão estável usando restaurante, configurações e banners ativos', async () => {
  restaurantSettingsRepository.findPublicRevisionByRestaurantId = async () => revisionSource();

  const first = await service.execute({ restaurantId: 7 });
  const second = await service.execute({ restaurantId: '7' });

  assert.equal(first.restaurantId, 7);
  assert.match(first.revision, /^v1-[A-Za-z0-9_-]{43}$/);
  assert.equal(second.revision, first.revision);
});

test('altera a revisão quando uma configuração ou a lista de banners ativos muda', async () => {
  let source = revisionSource();
  restaurantSettingsRepository.findPublicRevisionByRestaurantId = async () => source;

  const initial = await service.execute({ restaurantId: 7 });

  source = revisionSource({
    settings: { updatedAt: new Date('2026-08-05T12:00:00.000Z') },
  });
  const afterSettingsUpdate = await service.execute({ restaurantId: 7 });

  source = revisionSource({
    settings: { updatedAt: new Date('2026-08-05T12:00:00.000Z') },
    banners: [{ id: 9, updatedAt: new Date('2026-08-04T12:00:00.000Z') }],
  });
  const afterBannerRemoval = await service.execute({ restaurantId: 7 });

  assert.notEqual(afterSettingsUpdate.revision, initial.revision);
  assert.notEqual(afterBannerRemoval.revision, afterSettingsUpdate.revision);
});

test('resolve slug e default mantendo a consulta restrita ao restaurante resolvido', async () => {
  const queriedIds = [];
  restaurantRepository.findBySlug = async (slug) => {
    assert.equal(slug, 'pizza-norte');
    return { id: 22, active: true };
  };
  restaurantSettingsRepository.findDefaultActiveRestaurant = async () => ({ id: 3 });
  restaurantSettingsRepository.findPublicRevisionByRestaurantId = async (restaurantId) => {
    queriedIds.push(Number(restaurantId));
    return revisionSource({ id: Number(restaurantId) });
  };

  const bySlug = await service.execute({ slug: ' pizza-norte ' });
  const defaultRestaurant = await service.execute({ useDefault: true });

  assert.equal(bySlug.restaurantId, 22);
  assert.equal(defaultRestaurant.restaurantId, 3);
  assert.deepEqual(queriedIds, [22, 3]);
});

test('rejeita identificador inválido antes de consultar dados de qualquer tenant', async () => {
  let queried = false;
  restaurantSettingsRepository.findPublicRevisionByRestaurantId = async () => {
    queried = true;
    return revisionSource();
  };

  await assert.rejects(() => service.execute({ restaurantId: '7x' }), /Restaurante inválido/);
  assert.equal(queried, false);
});

test('não publica revisão de restaurante inexistente ou inativo', async () => {
  restaurantSettingsRepository.findPublicRevisionByRestaurantId = async () =>
    revisionSource({ active: false });

  await assert.rejects(
    () => service.execute({ restaurantId: 7 }),
    /não encontrado ou indisponível/i,
  );
});
