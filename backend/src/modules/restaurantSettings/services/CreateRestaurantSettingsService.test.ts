// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import createRestaurantSettingsService from './CreateRestaurantSettingsService.js';
import updateRestaurantSettingsService from './UpdateRestaurantSettingsService.js';
import { BUSINESS_DAY_IDS } from '../utils/businessHours.js';

const originalRepositoryMethods = {
  findByRestaurantId: restaurantSettingsRepository.findByRestaurantId,
  create: restaurantSettingsRepository.create,
  update: restaurantSettingsRepository.update,
};

const originalRestaurantUpdate = prisma.restaurant.update;

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalRepositoryMethods.findByRestaurantId;
  restaurantSettingsRepository.create = originalRepositoryMethods.create;
  restaurantSettingsRepository.update = originalRepositoryMethods.update;
  prisma.restaurant.update = originalRestaurantUpdate;
});

const weeklySchedule = () =>
  BUSINESS_DAY_IDS.map((id) => ({
    id,
    label: 'rótulo enviado pelo cliente',
    enabled: id !== 'sunday',
    openingTime: id === 'saturday' ? '18:00' : '11:00',
    closingTime: id === 'saturday' ? '02:00' : '23:00',
  }));

test('deve cadastrar banco e cartao como um dono de restaurante e normalizar os dados', async () => {
  let capturedCreateData = null;
  let capturedRestaurantUpdate = null;

  restaurantSettingsRepository.findByRestaurantId = async () => null;
  restaurantSettingsRepository.create = async (data) => {
    capturedCreateData = data;
    return {
      id: 1,
      ...data,
    };
  };
  prisma.restaurant.update = async ({ data }) => {
    capturedRestaurantUpdate = data;
    return { id: 7, ...data };
  };

  const result = await createRestaurantSettingsService.execute({
    restaurantId: 7,
    deliveryFee: 5,
    minimumOrder: 25,
    legalDocumentType: 'cnpj',
    companyDocument: '11.222.333/0001-81',
    companyLegalName: 'Pizzaria do Carlos LTDA',
    companyTradeName: 'Pizzaria do Carlos',
    companyAddress: 'Rua das Flores, 100',
    companyCnae: '5611-2/01',
    ownerFullName: 'Carlos Silva',
    ownerCpf: '123.456.789-00',
    ownerBirthDate: '1988-05-10',
    ownerEmail: 'carlos@pizzaria.com',
    ownerPhone: '(11) 99999-8888',
    ownerAddress: 'Rua das Flores, 100',
    bankName: 'Banco do Brasil',
    bankCode: '001',
    bankAccountType: 'cc',
    bankBranch: '1234-5',
    bankAccount: '99876-5',
    bankHolderDocument: '11222333000181',
    cardGateway: 'PAGBANK',
    gatewayMerchantId: 'merchant-123',
    pagbankEmail: 'pagbank@pizzaria.com',
    pagbankToken: 'token-real',
    whatsapp: '5511999998888',
    instagram: '@pizzariadocarlos',
    restaurantName: 'Pizzaria do Carlos',
  });

  assert.equal(result.restaurantId, 7);
  assert.equal(result.pagbankToken, null);
  assert.equal(result.restaurantName, 'Pizzaria do Carlos');
  assert.equal(capturedCreateData.companyDocument, '11222333000181');
  assert.equal(capturedCreateData.bankHolderDocument, '11222333000181');
  assert.equal(capturedCreateData.bankAccountType, 'CC');
  assert.equal(capturedCreateData.cardGateway, 'PAGBANK');
  assert.equal(capturedCreateData.pagbankEnvironment, 'production');
  assert.equal(capturedCreateData.pagbankEmail, 'pagbank@pizzaria.com');
  assert.equal(capturedCreateData.pagbankToken, 'token-real');
  assert.deepEqual(capturedRestaurantUpdate, {
    name: 'Pizzaria do Carlos',
    whatsapp: '5511999998888',
  });
});

test('deve rejeitar cadastro quando o documento do titular da conta nao bater com o cadastro', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => null;

  await assert.rejects(
    () =>
      createRestaurantSettingsService.execute({
        restaurantId: 7,
        deliveryFee: 5,
        minimumOrder: 25,
        legalDocumentType: 'CNPJ',
        companyDocument: '11.222.333/0001-81',
        companyLegalName: 'Pizzaria do Carlos LTDA',
        companyTradeName: 'Pizzaria do Carlos',
        bankName: 'Banco do Brasil',
        bankCode: '001',
        bankAccountType: 'cc',
        bankBranch: '1234-5',
        bankAccount: '99876-5',
        bankHolderDocument: '11.111.111/1111-11',
        cardGateway: 'PAGBANK',
      }),
    /A titularidade da conta bancária deve ser igual ao documento cadastrado/,
  );
});

test('normaliza e persiste uma agenda semanal válida ao criar configurações', async () => {
  let capturedCreateData = null;
  restaurantSettingsRepository.findByRestaurantId = async () => null;
  restaurantSettingsRepository.create = async (data) => {
    capturedCreateData = data;
    return { id: 1, ...data };
  };

  await createRestaurantSettingsService.execute({
    restaurantId: 7,
    deliveryFee: 0,
    minimumOrder: 0,
    businessHours: weeklySchedule().reverse(),
  });

  assert.equal(capturedCreateData.businessHours.length, 7);
  assert.equal(capturedCreateData.businessHours[0].id, 'monday');
  assert.equal(capturedCreateData.businessHours[0].label, 'Segunda-feira');
  assert.equal(capturedCreateData.businessHours[5].closingTime, '02:00');
});

test('rejeita agenda semanal inválida ao criar configurações', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => null;

  await assert.rejects(
    () =>
      createRestaurantSettingsService.execute({
        restaurantId: 7,
        deliveryFee: 0,
        minimumOrder: 0,
        businessHours: weeklySchedule().slice(0, 6),
      }),
    /7 dias/,
  );
});

test('normaliza a agenda semanal antes de atualizar configurações', async () => {
  let capturedUpdateData = null;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    restaurantId: 7,
    pixProvider: 'MERCADO_PAGO',
    restaurant: {},
  });
  restaurantSettingsRepository.update = async (_restaurantId, data) => {
    capturedUpdateData = data;
    return { id: 1, restaurantId: 7, ...data };
  };

  await updateRestaurantSettingsService.execute({
    restaurantId: 7,
    businessHours: weeklySchedule().reverse(),
  });

  assert.equal(capturedUpdateData.businessHours.length, 7);
  assert.equal(capturedUpdateData.businessHours[0].id, 'monday');
  assert.equal(capturedUpdateData.businessHours[5].openingTime, '18:00');
});

test('rejeita horário igual em dia aberto ao atualizar configurações', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    restaurantId: 7,
    pixProvider: 'MERCADO_PAGO',
    restaurant: {},
  });
  const schedule = weeklySchedule();
  schedule[0] = { ...schedule[0], openingTime: '18:00', closingTime: '18:00' };

  await assert.rejects(
    () =>
      updateRestaurantSettingsService.execute({
        restaurantId: 7,
        businessHours: schedule,
      }),
    /mesmo horário/,
  );
});

test('persiste os canais, aparência, SEO, WhatsApp e redes sociais do restaurante', async () => {
  let capturedCreateData = null;
  let capturedRestaurantUpdate = null;
  restaurantSettingsRepository.findByRestaurantId = async () => null;
  restaurantSettingsRepository.create = async (data) => {
    capturedCreateData = data;
    return { id: 1, ...data };
  };
  prisma.restaurant.update = async ({ data }) => {
    capturedRestaurantUpdate = data;
    return { id: 7, ...data };
  };

  await createRestaurantSettingsService.execute({
    restaurantId: 7,
    deliveryFee: 8.5,
    minimumOrder: 20,
    freeShippingMinimum: 90,
    acceptsDelivery: false,
    acceptsPickup: true,
    acceptsPix: true,
    acceptsCard: false,
    tableOrderingEnabled: true,
    waiterCallEnabled: false,
    billRequestEnabled: true,
    whatsapp: '+55 (85) 99999-9999',
    whatsappEnabled: true,
    whatsappDisplayName: 'Atendimento da casa',
    whatsappDefaultMessage: 'Olá, preciso de ajuda.',
    receiveOrdersOnWhatsapp: false,
    receiveStatusNotifications: true,
    instagram: '@restaurante',
    tiktok: '@restaurante',
    youtube: 'https://youtube.com/@restaurante',
    primaryColor: '#AABBCC',
    fontFamily: 'Manrope',
    seoTitle: 'Restaurante do Bairro',
    seoDescription: 'Peça pelo cardápio digital.',
  });

  assert.equal(capturedCreateData.deliveryFee, 8.5);
  assert.equal(capturedCreateData.freeShippingMinimum, 90);
  assert.equal(capturedCreateData.acceptsDelivery, false);
  assert.equal(capturedCreateData.acceptsCard, false);
  assert.equal(capturedCreateData.waiterCallEnabled, false);
  assert.equal(capturedCreateData.primaryColor, '#aabbcc');
  assert.equal(capturedCreateData.fontFamily, 'Manrope');
  assert.equal(capturedCreateData.seoTitle, 'Restaurante do Bairro');
  assert.equal(capturedCreateData.whatsappEnabled, true);
  assert.equal(capturedCreateData.receiveStatusNotifications, true);
  assert.deepEqual(capturedRestaurantUpdate, { whatsapp: '5585999999999' });
});

test('rejeita documento comercial com dígitos verificadores inválidos ao criar', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => null;

  await assert.rejects(
    () =>
      createRestaurantSettingsService.execute({
        restaurantId: 7,
        deliveryFee: 0,
        minimumOrder: 0,
        legalDocumentType: 'CNPJ',
        companyDocument: '11.222.333/0001-80',
      }),
    /CNPJ inválido/,
  );
});

test('rejeita valores e booleanos inválidos nas regras de pedidos', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => null;

  await assert.rejects(
    () =>
      createRestaurantSettingsService.execute({
        restaurantId: 7,
        deliveryFee: 0,
        minimumOrder: 0,
        averageDeliveryTime: 241,
      }),
    /entre 1 e 240/,
  );

  await assert.rejects(
    () =>
      createRestaurantSettingsService.execute({
        restaurantId: 7,
        deliveryFee: 0,
        minimumOrder: 0,
        autoAcceptOrders: 'false',
      }),
    /verdadeiro ou falso/,
  );
});

test('valida capa, descrição e nome antes de persistir a identidade', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => null;

  await assert.rejects(
    () =>
      createRestaurantSettingsService.execute({
        restaurantId: 7,
        deliveryFee: 0,
        minimumOrder: 0,
        restaurantCoverImage: 'blob:http://localhost/capa',
      }),
    /temporária/,
  );
  await assert.rejects(
    () =>
      createRestaurantSettingsService.execute({
        restaurantId: 7,
        deliveryFee: 0,
        minimumOrder: 0,
        restaurantDescription: 'x'.repeat(501),
      }),
    /no máximo 500/,
  );
  await assert.rejects(
    () =>
      createRestaurantSettingsService.execute({
        restaurantId: 7,
        deliveryFee: 0,
        minimumOrder: 0,
        restaurantName: 'x'.repeat(121),
      }),
    /entre 2 e 120/,
  );
});

test('atualiza marca, negócio, endereço e regras dos pedidos no restaurante correto', async () => {
  let capturedSettingsUpdate = null;
  let capturedRestaurantUpdate = null;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    id: 1,
    restaurantId: 7,
    pixProvider: 'MERCADO_PAGO',
    restaurant: { whatsapp: null },
  });
  restaurantSettingsRepository.update = async (_restaurantId, data) => {
    capturedSettingsUpdate = data;
    return { id: 1, restaurantId: 7, ...data };
  };
  prisma.restaurant.update = async ({ data }) => {
    capturedRestaurantUpdate = data;
    return { id: 7, ...data };
  };

  await updateRestaurantSettingsService.execute({
    restaurantId: 7,
    restaurantName: 'Restaurante Atualizado',
    restaurantLogo: 'https://cdn.example.com/logo.webp',
    restaurantCoverImage: 'https://cdn.example.com/capa.webp',
    restaurantDescription: 'Descrição pública atualizada.',
    legalDocumentType: 'CNPJ',
    companyDocument: '11.222.333/0001-81',
    companyLegalName: 'Restaurante Atualizado LTDA',
    ownerPhone: '(85) 99999-1234',
    ownerEmail: 'CONTATO@EXEMPLO.COM.BR',
    restaurantZipCode: '60.000-000',
    restaurantAddress: 'Rua das Flores',
    restaurantAddressNumber: '120',
    restaurantAddressComplement: 'Loja 2',
    restaurantAddressDistrict: 'Centro',
    restaurantCity: 'Fortaleza',
    restaurantState: 'ce',
    averageDeliveryTime: 45,
    autoAcceptOrders: true,
    trackingRequiresLogin: false,
    soundNotifications: false,
    maxConcurrentOrders: 75,
  });

  assert.equal(capturedSettingsUpdate.companyDocument, '11222333000181');
  assert.equal(capturedSettingsUpdate.ownerPhone, '85999991234');
  assert.equal(capturedSettingsUpdate.ownerEmail, 'contato@exemplo.com.br');
  assert.equal(capturedSettingsUpdate.averageDeliveryTime, '45');
  assert.equal(capturedSettingsUpdate.autoAcceptOrders, true);
  assert.equal(capturedSettingsUpdate.trackingRequiresLogin, false);
  assert.equal(capturedSettingsUpdate.soundNotifications, false);
  assert.equal(capturedSettingsUpdate.maxConcurrentOrders, 75);
  assert.deepEqual(capturedRestaurantUpdate, {
    name: 'Restaurante Atualizado',
    logo: 'https://cdn.example.com/logo.webp',
    coverImage: 'https://cdn.example.com/capa.webp',
    description: 'Descrição pública atualizada.',
    address: 'Rua das Flores',
    addressNumber: '120',
    addressComplement: 'Loja 2',
    addressDistrict: 'Centro',
    city: 'Fortaleza',
    state: 'CE',
    zipCode: '60000000',
  });
});
