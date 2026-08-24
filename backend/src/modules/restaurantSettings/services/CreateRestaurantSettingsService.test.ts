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
    companyDocument: '12.345.678/0001-90',
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
    bankHolderDocument: '12345678000190',
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
  assert.equal(capturedCreateData.companyDocument, '12345678000190');
  assert.equal(capturedCreateData.bankHolderDocument, '12345678000190');
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
        companyDocument: '12.345.678/0001-90',
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
