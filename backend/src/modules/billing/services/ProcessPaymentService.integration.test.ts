// @ts-nocheck
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import processPaymentService from "./ProcessPaymentService.js";
import billingRepository from "../repositories/BillingRepository.js";
import prisma from "../../../config/prisma.js";

const originalConsoleLog = console.log;

const originalMethods = {
  transaction: prisma.$transaction,
  findInvoiceById: billingRepository.findInvoiceById,
  updateInvoice: billingRepository.updateInvoice,
  findSubscriptionByRestaurantId:
    billingRepository.findSubscriptionByRestaurantId,
  updateSubscription: billingRepository.updateSubscription,
  activateRestaurant: billingRepository.activateRestaurant,
  deactivateRestaurant: billingRepository.deactivateRestaurant,
  invoiceFindMany: prisma.invoice.findMany,
};

afterEach(() => {
  console.log = originalConsoleLog;

  prisma.$transaction = originalMethods.transaction;
  billingRepository.findInvoiceById = originalMethods.findInvoiceById;
  billingRepository.updateInvoice = originalMethods.updateInvoice;
  billingRepository.findSubscriptionByRestaurantId =
    originalMethods.findSubscriptionByRestaurantId;
  billingRepository.updateSubscription = originalMethods.updateSubscription;
  billingRepository.activateRestaurant = originalMethods.activateRestaurant;
  billingRepository.deactivateRestaurant = originalMethods.deactivateRestaurant;
  prisma.invoice.findMany = originalMethods.invoiceFindMany;
});

function useImmediateTransaction() {
  prisma.$transaction = async (callback) => callback(prisma);
}

function silenceServiceLogs() {
  console.log = () => {};
}

test("pagando deve liberar o sistema para o dono do restaurante", async () => {
  silenceServiceLogs();
  useImmediateTransaction();

  billingRepository.findInvoiceById = async (invoiceId) => ({
    id: invoiceId,
    restaurantId: 10,
    status: "PENDENTE",
  });

  const calls = {
    updateSubscriptionStatus: null,
    activatedRestaurantId: null,
    deactivatedRestaurantId: null,
  };

  billingRepository.updateInvoice = async (invoiceId, data) => {
    assert.equal(invoiceId, 123);
    assert.equal(data.status, "PAGO");
    assert.ok(data.paidAt instanceof Date);

    return {
      id: invoiceId,
      restaurantId: 10,
      status: "PAGO",
    };
  };

  billingRepository.findSubscriptionByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 10);
    return { id: 55, restaurantId };
  };

  prisma.invoice.findMany = async () => [
    {
      id: 1,
      restaurantId: 10,
      status: "PENDENTE",
      dueDate: new Date("2099-01-01T12:00:00.000Z"),
    },
  ];

  billingRepository.updateSubscription = async (_id, data) => {
    calls.updateSubscriptionStatus = data.status;
    return { id: 55, status: data.status };
  };

  billingRepository.activateRestaurant = async (restaurantId) => {
    calls.activatedRestaurantId = restaurantId;
    return { id: restaurantId, active: true };
  };

  billingRepository.deactivateRestaurant = async (restaurantId) => {
    calls.deactivatedRestaurantId = restaurantId;
    return { id: restaurantId, active: false };
  };

  const result = await processPaymentService.execute({ invoiceId: 123 });

  assert.equal(result.status, "PAGO");
  assert.equal(calls.updateSubscriptionStatus, "ATIVA");
  assert.equal(calls.activatedRestaurantId, 10);
  assert.equal(calls.deactivatedRestaurantId, null);
});

test("deve manter bloqueio quando existir invoice bloqueante em aberto", async () => {
  silenceServiceLogs();
  useImmediateTransaction();

  billingRepository.findInvoiceById = async (invoiceId) => ({
    id: invoiceId,
    restaurantId: 20,
    status: "PENDENTE",
  });

  const calls = {
    updateSubscriptionStatus: null,
    activatedRestaurantId: null,
    deactivatedRestaurantId: null,
  };

  billingRepository.updateInvoice = async (invoiceId) => ({
    id: invoiceId,
    restaurantId: 20,
    status: "PAGO",
  });

  billingRepository.findSubscriptionByRestaurantId = async (restaurantId) => ({
    id: 77,
    restaurantId,
  });

  prisma.invoice.findMany = async () => [
    {
      id: 2,
      restaurantId: 20,
      status: "ATRASADO",
      dueDate: new Date("2026-01-01T12:00:00.000Z"),
    },
  ];

  billingRepository.updateSubscription = async (_id, data) => {
    calls.updateSubscriptionStatus = data.status;
    return { id: 77, status: data.status };
  };

  billingRepository.activateRestaurant = async (restaurantId) => {
    calls.activatedRestaurantId = restaurantId;
    return { id: restaurantId, active: true };
  };

  billingRepository.deactivateRestaurant = async (restaurantId) => {
    calls.deactivatedRestaurantId = restaurantId;
    return { id: restaurantId, active: false };
  };

  const result = await processPaymentService.execute({ invoiceId: 999 });

  assert.equal(result.status, "PAGO");
  assert.equal(calls.updateSubscriptionStatus, "EXPIRADA");
  assert.equal(calls.activatedRestaurantId, null);
  assert.equal(calls.deactivatedRestaurantId, 20);
});

test("deve reativar restaurante mesmo sem assinatura quando nao houver bloqueio", async () => {
  silenceServiceLogs();
  useImmediateTransaction();

  billingRepository.findInvoiceById = async (invoiceId) => ({
    id: invoiceId,
    restaurantId: 30,
    status: "PENDENTE",
  });

  const calls = {
    updateSubscriptionCalled: false,
    activatedRestaurantId: null,
    deactivatedRestaurantId: null,
  };

  billingRepository.updateInvoice = async (invoiceId) => ({
    id: invoiceId,
    restaurantId: 30,
    status: "PAGO",
  });

  billingRepository.findSubscriptionByRestaurantId = async () => null;

  prisma.invoice.findMany = async () => [
    {
      id: 3,
      restaurantId: 30,
      status: "PENDENTE",
      dueDate: new Date("2099-01-01T12:00:00.000Z"),
    },
  ];

  billingRepository.updateSubscription = async () => {
    calls.updateSubscriptionCalled = true;
    return null;
  };

  billingRepository.activateRestaurant = async (restaurantId) => {
    calls.activatedRestaurantId = restaurantId;
    return { id: restaurantId, active: true };
  };

  billingRepository.deactivateRestaurant = async (restaurantId) => {
    calls.deactivatedRestaurantId = restaurantId;
    return { id: restaurantId, active: false };
  };

  const result = await processPaymentService.execute({ invoiceId: 456 });

  assert.equal(result.status, "PAGO");
  assert.equal(calls.updateSubscriptionCalled, false);
  assert.equal(calls.activatedRestaurantId, 30);
  assert.equal(calls.deactivatedRestaurantId, null);
});

test("deve manter bloqueio sem assinatura quando houver invoice bloqueante", async () => {
  silenceServiceLogs();
  useImmediateTransaction();

  billingRepository.findInvoiceById = async (invoiceId) => ({
    id: invoiceId,
    restaurantId: 40,
    status: "PENDENTE",
  });

  const calls = {
    updateSubscriptionCalled: false,
    activatedRestaurantId: null,
    deactivatedRestaurantId: null,
  };

  billingRepository.updateInvoice = async (invoiceId) => ({
    id: invoiceId,
    restaurantId: 40,
    status: "PAGO",
  });

  billingRepository.findSubscriptionByRestaurantId = async () => null;

  prisma.invoice.findMany = async () => [
    {
      id: 4,
      restaurantId: 40,
      status: "ATRASADO",
      dueDate: new Date("2026-01-01T12:00:00.000Z"),
    },
  ];

  billingRepository.updateSubscription = async () => {
    calls.updateSubscriptionCalled = true;
    return null;
  };

  billingRepository.activateRestaurant = async (restaurantId) => {
    calls.activatedRestaurantId = restaurantId;
    return { id: restaurantId, active: true };
  };

  billingRepository.deactivateRestaurant = async (restaurantId) => {
    calls.deactivatedRestaurantId = restaurantId;
    return { id: restaurantId, active: false };
  };

  const result = await processPaymentService.execute({ invoiceId: 789 });

  assert.equal(result.status, "PAGO");
  assert.equal(calls.updateSubscriptionCalled, false);
  assert.equal(calls.activatedRestaurantId, null);
  assert.equal(calls.deactivatedRestaurantId, 40);
});

test("nao deve registrar novamente uma fatura que ja esta paga", async () => {
  silenceServiceLogs();
  useImmediateTransaction();

  const paidAt = new Date("2026-08-01T12:00:00.000Z");
  let updateInvoiceCalled = false;

  billingRepository.findInvoiceById = async (invoiceId) => ({
    id: invoiceId,
    restaurantId: 50,
    status: "PAGO",
    paidAt,
  });
  billingRepository.updateInvoice = async () => {
    updateInvoiceCalled = true;
    throw new Error("nao deveria atualizar a fatura");
  };
  billingRepository.findSubscriptionByRestaurantId = async () => null;
  prisma.invoice.findMany = async () => [];
  billingRepository.activateRestaurant = async (restaurantId) => ({
    id: restaurantId,
    active: true,
  });

  const result = await processPaymentService.execute({ invoiceId: 321 });

  assert.equal(updateInvoiceCalled, false);
  assert.equal(result.status, "PAGO");
  assert.equal(result.paidAt, paidAt);
});
