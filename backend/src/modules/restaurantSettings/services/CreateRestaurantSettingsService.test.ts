// @ts-nocheck
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import prisma from "../../../config/prisma.js";
import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";
import createRestaurantSettingsService from "./CreateRestaurantSettingsService.js";

const originalRepositoryMethods = {
  findByRestaurantId: restaurantSettingsRepository.findByRestaurantId,
  create: restaurantSettingsRepository.create,
};

const originalRestaurantUpdate = prisma.restaurant.update;

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId =
    originalRepositoryMethods.findByRestaurantId;
  restaurantSettingsRepository.create = originalRepositoryMethods.create;
  prisma.restaurant.update = originalRestaurantUpdate;
});

test("deve cadastrar banco e cartao como um dono de restaurante e normalizar os dados", async () => {
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
    legalDocumentType: "cnpj",
    companyDocument: "12.345.678/0001-90",
    companyLegalName: "Pizzaria do Carlos LTDA",
    companyTradeName: "Pizzaria do Carlos",
    companyAddress: "Rua das Flores, 100",
    companyCnae: "5611-2/01",
    ownerFullName: "Carlos Silva",
    ownerCpf: "123.456.789-00",
    ownerBirthDate: "1988-05-10",
    ownerEmail: "carlos@pizzaria.com",
    ownerPhone: "(11) 99999-8888",
    ownerAddress: "Rua das Flores, 100",
    bankName: "Banco do Brasil",
    bankCode: "001",
    bankAccountType: "cc",
    bankBranch: "1234-5",
    bankAccount: "99876-5",
    bankHolderDocument: "12345678000190",
    cardGateway: "PAGBANK",
    gatewayMerchantId: "merchant-123",
    pagbankEmail: "pagbank@pizzaria.com",
    pagbankToken: "token-real",
    whatsapp: "5511999998888",
    instagram: "@pizzariadocarlos",
    restaurantName: "Pizzaria do Carlos",
  });

  assert.equal(result.restaurantId, 7);
  assert.equal(result.pagbankToken, null);
  assert.equal(result.restaurantName, "Pizzaria do Carlos");
  assert.equal(capturedCreateData.companyDocument, "12345678000190");
  assert.equal(capturedCreateData.bankHolderDocument, "12345678000190");
  assert.equal(capturedCreateData.bankAccountType, "CC");
  assert.equal(capturedCreateData.cardGateway, "PAGBANK");
  assert.equal(capturedCreateData.pagbankEnvironment, "production");
  assert.equal(capturedCreateData.pagbankEmail, "pagbank@pizzaria.com");
  assert.equal(capturedCreateData.pagbankToken, "token-real");
  assert.deepEqual(capturedRestaurantUpdate, {
    name: "Pizzaria do Carlos",
    whatsapp: "5511999998888",
  });
});

test("deve rejeitar cadastro quando o documento do titular da conta nao bater com o cadastro", async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => null;

  await assert.rejects(
    () =>
      createRestaurantSettingsService.execute({
        restaurantId: 7,
        deliveryFee: 5,
        minimumOrder: 25,
        legalDocumentType: "CNPJ",
        companyDocument: "12.345.678/0001-90",
        companyLegalName: "Pizzaria do Carlos LTDA",
        companyTradeName: "Pizzaria do Carlos",
        bankName: "Banco do Brasil",
        bankCode: "001",
        bankAccountType: "cc",
        bankBranch: "1234-5",
        bankAccount: "99876-5",
        bankHolderDocument: "11.111.111/1111-11",
        cardGateway: "PAGBANK",
      }),
    /A titularidade da conta bancária deve ser igual ao documento cadastrado/,
  );
});
