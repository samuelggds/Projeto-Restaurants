// @ts-nocheck
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import GetPublicRestaurantSettingsService from './GetPublicRestaurantSettingsService.js';

const originalFindPublic = restaurantSettingsRepository.findPublicByRestaurantId;
const originalFindSettings = restaurantSettingsRepository.findByRestaurantId;
const originalFindRestaurant = restaurantSettingsRepository.findRestaurantById;
const originalFindDefault = restaurantSettingsRepository.findDefaultActiveRestaurant;
const originalAggregateRatings = prisma.order.aggregate;
const originalEnv = { ...process.env };

beforeEach(() => {
  restaurantSettingsRepository.findByRestaurantId = async () => null as never;
  prisma.order.aggregate = async () =>
    ({ _avg: { deliveryRating: null }, _count: { deliveryRating: 0 } }) as never;
  Object.assign(process.env, {
    CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64'),
    BACKEND_URL: 'https://api.gastronexa.example',
    FRONTEND_URL: 'https://gastronexa.example',
    MP_OAUTH_CLIENT_ID: 'test-mp-id',
    MP_OAUTH_CLIENT_SECRET: 'test-mp-secret',
    MP_WEBHOOK_SECRET: 'test-webhook',
    EFI_OPEN_FINANCE_ENABLED: 'true',
    EFI_OPEN_FINANCE_ENV: 'homologation',
    EFI_OPEN_FINANCE_CLIENT_ID: 'efi-client',
    EFI_OPEN_FINANCE_CLIENT_SECRET: 'efi-client-secret',
    EFI_OPEN_FINANCE_P12_BASE64: Buffer.from('test-p12').toString('base64'),
    EFI_OPEN_FINANCE_WEBHOOK_HMAC: 'efi-test-hmac-with-at-least-24-chars',
  });
});

afterEach(() => {
  restaurantSettingsRepository.findPublicByRestaurantId = originalFindPublic;
  restaurantSettingsRepository.findByRestaurantId = originalFindSettings;
  restaurantSettingsRepository.findRestaurantById = originalFindRestaurant;
  restaurantSettingsRepository.findDefaultActiveRestaurant = originalFindDefault;
  prisma.order.aggregate = originalAggregateRatings;
  for (const name of Object.keys(process.env)) if (!(name in originalEnv)) delete process.env[name];
  Object.assign(process.env, originalEnv);
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
    acceptsDebitCard: false,
    openFinancePixEnabled: false,
    whatsapp: null,
    whatsappEnabled: false,
    whatsappDisplayName: null,
  });
});

test('expõe Open Finance somente quando Efí está configurada e há chave Pix beneficiária', async () => {
  restaurantSettingsRepository.findPublicByRestaurantId = async () =>
    ({
      restaurantId: 7,
      openFinancePixEnabled: true,
      restaurant: { active: true, banners: [] },
    }) as never;
  restaurantSettingsRepository.findByRestaurantId = async () =>
    ({
      restaurantId: 7,
      pixKey: 'financeiro@restaurante.test',
    }) as never;

  const settings = await GetPublicRestaurantSettingsService.execute({ restaurantId: 7 });
  assert.equal(settings.openFinancePixEnabled, true);

  restaurantSettingsRepository.findByRestaurantId = async () =>
    ({ restaurantId: 7, pixKey: null }) as never;
  const missingBeneficiary = await GetPublicRestaurantSettingsService.execute({ restaurantId: 7 });
  assert.equal(missingBeneficiary.openFinancePixEnabled, false);
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
      landingPageEnabled: true,
      restaurant: {
        active: true,
        whatsapp: '+55 (85) 99999-9999',
        banners: [
          {
            id: 9,
            title: 'Festival de pizzas',
            highlight: '30% OFF',
            description: 'Somente neste fim de semana.',
            buttonLabel: 'Ver promoção',
            image: 'https://cdn.example.com/banner.webp',
            position: 0,
          },
        ],
      },
    }) as never;

  const settings = await GetPublicRestaurantSettingsService.execute({ restaurantId: 7 });

  assert.equal(settings.whatsapp, '5585999999999');
  assert.equal(settings.acceptsDelivery, false);
  assert.equal(settings.acceptsPickup, true);
  assert.equal(settings.freeShippingMinimum, 80);
  assert.equal(settings.fontFamily, 'Manrope');
  assert.equal(settings.seoTitle, 'Restaurante do Bairro');
  assert.equal(settings.landingPageEnabled, true);
  assert.deepEqual(settings.restaurant.banners, [
    {
      id: 9,
      title: 'Festival de pizzas',
      highlight: '30% OFF',
      description: 'Somente neste fim de semana.',
      buttonLabel: 'Ver promoção',
      image: 'https://cdn.example.com/banner.webp',
      position: 0,
    },
  ]);
});

test('troca imagens base64 por recursos HTTP versionados e mantém URLs externas', async () => {
  const restaurantUpdatedAt = new Date('2026-08-10T12:00:00.000Z');
  const bannerUpdatedAt = new Date('2026-08-11T12:00:00.000Z');
  restaurantSettingsRepository.findPublicByRestaurantId = async () =>
    ({
      restaurantId: 7,
      restaurant: {
        active: true,
        updatedAt: restaurantUpdatedAt,
        logo: 'data:image/webp;base64,UklGRg==',
        coverImage: 'https://cdn.example.com/cover.webp',
        banners: [
          {
            id: 9,
            title: 'Oferta',
            image: 'data:image/webp;base64,UklGRg==',
            position: 0,
            updatedAt: bannerUpdatedAt,
          },
        ],
      },
    }) as never;

  const settings = await GetPublicRestaurantSettingsService.execute({ restaurantId: 7 });

  assert.equal(
    settings.restaurant.logo,
    `/public-media/restaurants/7/logo?v=${restaurantUpdatedAt.getTime()}`,
  );
  assert.equal(settings.restaurant.coverImage, 'https://cdn.example.com/cover.webp');
  assert.equal(
    settings.restaurant.banners[0].image,
    `/public-media/restaurants/7/banners/9?v=${bannerUpdatedAt.getTime()}`,
  );
  assert.equal('updatedAt' in settings.restaurant, false);
  assert.equal('updatedAt' in settings.restaurant.banners[0], false);
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
  assert.equal(settings.landingPageEnabled, false);
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

test('expõe débito somente para o restaurante com Mercado Pago realmente pronto sem vazar credenciais', async () => {
  restaurantSettingsRepository.findPublicByRestaurantId = async (restaurantId) =>
    ({
      restaurantId: Number(restaurantId),
      acceptsCard: true,
      acceptsPix: true,
      restaurant: { active: true, banners: [] },
    }) as never;

  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) =>
    Number(restaurantId) === 7
      ? ({
          restaurantId: 7,
          cardGateway: 'MERCADO_PAGO',
          pixProvider: 'MERCADO_PAGO',
          mercadoPagoAccessToken: 'test-only-access-token',
          mercadoPagoRefreshToken: 'test-only-refresh-token',
          mercadoPagoTokenExpiresAt: new Date(Date.now() + 3_600_000),
          mercadoPagoPublicKey: 'TEST-public-key',
        } as never)
      : ({
          restaurantId: 8,
          cardGateway: 'MERCADO_PAGO',
          pixProvider: 'MERCADO_PAGO',
          mercadoPagoAccessToken: null,
          mercadoPagoPublicKey: null,
        } as never);

  const ready = await GetPublicRestaurantSettingsService.execute({ restaurantId: 7 });
  const notReady = await GetPublicRestaurantSettingsService.execute({ restaurantId: 8 });

  assert.equal(ready.acceptsPix, true);
  assert.equal(ready.acceptsCard, true);
  assert.equal(ready.acceptsDebitCard, true);
  assert.equal(notReady.acceptsPix, false);
  assert.equal(notReady.acceptsCard, false);
  assert.equal(notReady.acceptsDebitCard, false);
  assert.equal('mercadoPagoAccessToken' in ready, false);
  assert.equal('mercadoPagoPublicKey' in ready, false);
  assert.equal(JSON.stringify(ready).includes('test-only-access-token'), false);
});


test('não anuncia Pix ou cartão para grant legado sem renovação automática', async () => {
  restaurantSettingsRepository.findPublicByRestaurantId = async () =>
    ({
      restaurantId: 7,
      acceptsCard: true,
      acceptsPix: true,
      restaurant: { active: true, banners: [] },
    }) as never;
  restaurantSettingsRepository.findByRestaurantId = async () =>
    ({
      restaurantId: 7,
      cardGateway: 'MERCADO_PAGO',
      pixProvider: 'MERCADO_PAGO',
      mercadoPagoAccessToken: 'legacy-access-token',
      mercadoPagoRefreshToken: null,
      mercadoPagoPublicKey: 'TEST-public-key',
    }) as never;

  const settings = await GetPublicRestaurantSettingsService.execute({ restaurantId: 7 });

  assert.equal(settings.acceptsPix, false);
  assert.equal(settings.acceptsCard, false);
  assert.equal(settings.acceptsDebitCard, false);
});

