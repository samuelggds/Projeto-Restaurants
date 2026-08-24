// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import GetPublicRestaurantSettingsService from './GetPublicRestaurantSettingsService.js';

const originalFindPublic = restaurantSettingsRepository.findPublicByRestaurantId;
const originalFindRestaurant = restaurantSettingsRepository.findRestaurantById;
const originalFindDefault = restaurantSettingsRepository.findDefaultActiveRestaurant;

afterEach(() => {
  restaurantSettingsRepository.findPublicByRestaurantId = originalFindPublic;
  restaurantSettingsRepository.findRestaurantById = originalFindRestaurant;
  restaurantSettingsRepository.findDefaultActiveRestaurant = originalFindDefault;
});

test('mantém a cor personalizada na configuração pública', async () => {
  restaurantSettingsRepository.findPublicByRestaurantId = async () =>
    ({ restaurantId: 7, primaryColor: '#123456' }) as never;

  const settings = await GetPublicRestaurantSettingsService.execute({
    restaurantId: 7,
  });

  assert.deepEqual(settings, {
    restaurantId: 7,
    primaryColor: '#123456',
    whatsapp: null,
  });
});

test('expõe somente os campos públicos necessários para a Home respeitar a configuração', async () => {
  restaurantSettingsRepository.findPublicByRestaurantId = async () =>
    ({
      restaurantId: 7,
      acceptsDelivery: false,
      acceptsPickup: true,
      freeShippingMinimum: 80,
      whatsappEnabled: true,
      whatsappDefaultMessage: 'Olá, preciso de ajuda.',
      tiktok: '@restaurante',
      youtube: 'https://youtube.com/@restaurante',
      fontFamily: 'Manrope',
      seoTitle: 'Restaurante do Bairro',
      seoDescription: 'Peça online com segurança.',
      restaurant: {
        active: true,
        whatsapp: '+55 (85) 99999-9999',
      },
    }) as never;

  const settings = await GetPublicRestaurantSettingsService.execute({ restaurantId: 7 });

  assert.equal(settings.whatsapp, '5585999999999');
  assert.equal(settings.acceptsDelivery, false);
  assert.equal(settings.acceptsPickup, true);
  assert.equal(settings.freeShippingMinimum, 80);
  assert.equal(settings.fontFamily, 'Manrope');
  assert.equal(settings.seoTitle, 'Restaurante do Bairro');
});

test('não publica um restaurante que foi desativado', async () => {
  restaurantSettingsRepository.findPublicByRestaurantId = async () =>
    ({ restaurantId: 7, restaurant: { active: false } }) as never;

  await assert.rejects(
    () => GetPublicRestaurantSettingsService.execute({ restaurantId: 7 }),
    /não encontrado ou indisponível/i,
  );
});

test('usa uma cor segura quando o restaurante ainda não possui configurações', async () => {
  restaurantSettingsRepository.findPublicByRestaurantId = async () => null;
  restaurantSettingsRepository.findRestaurantById = async () =>
    ({ id: 7, name: 'Restaurante' }) as never;

  const settings = await GetPublicRestaurantSettingsService.execute({
    restaurantId: 7,
  });

  assert.equal(settings.primaryColor, '#c95d3d');
});

test('carrega a identidade do restaurante ativo ao abrir o login diretamente', async () => {
  restaurantSettingsRepository.findDefaultActiveRestaurant = async () => ({ id: 3 }) as never;
  restaurantSettingsRepository.findPublicByRestaurantId = async (id) =>
    ({
      restaurantId: Number(id),
      primaryColor: '#c95d3d',
      restaurant: { name: 'North Pizza', coverImage: 'capa-salva' },
    }) as never;

  const settings = await GetPublicRestaurantSettingsService.execute({
    useDefault: true,
  });

  assert.equal(settings.restaurantId, 3);
  assert.equal(settings.restaurant.name, 'North Pizza');
  assert.equal(settings.restaurant.coverImage, 'capa-salva');
});
