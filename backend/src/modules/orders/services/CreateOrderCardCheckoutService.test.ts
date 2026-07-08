// @ts-nocheck
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";
import orderRepository from "../repositories/OrderRepository.js";

const originalHttpCreateServer = http.createServer;

http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const [
  { default: createOrderService },
  { default: createOrderCardCheckoutService },
] = await Promise.all([
  import("./CreateOrderService.js"),
  import("./CreateOrderCardCheckoutService.js"),
]);

http.createServer = originalHttpCreateServer;

const originalRepositoryMethods = {
  findByRestaurantId: restaurantSettingsRepository.findByRestaurantId,
};

const originalCreateOrderExecute = createOrderService.execute;
const originalSetCardCheckoutSessionId =
  orderRepository.setCardCheckoutSessionId;
const originalDeleteById = orderRepository.deleteById;
const originalFetch = globalThis.fetch;

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId =
    originalRepositoryMethods.findByRestaurantId;
  createOrderService.execute = originalCreateOrderExecute;
  orderRepository.setCardCheckoutSessionId = originalSetCardCheckoutSessionId;
  orderRepository.deleteById = originalDeleteById;
  globalThis.fetch = originalFetch;
  delete process.env.BACKEND_URL;
  delete process.env.PAGBANK_EMAIL;
  delete process.env.PAGBANK_TOKEN;
});

test("deve abrir checkout de cartao usando a configuracao PagBank do restaurante", async () => {
  let savedSessionId = null;
  let deletedOrderId = null;

  restaurantSettingsRepository.findByRestaurantId = async () => ({
    cardGateway: "PAGBANK",
    pagbankEmail: "dono@pizzaria.com",
    pagbankToken: "token-real",
  });

  createOrderService.execute = async () => ({
    id: 321,
    restaurantId: 7,
    total: 79.9,
    restaurant: {
      name: "Pizzaria do Carlos",
    },
  });

  orderRepository.setCardCheckoutSessionId = async (
    _orderId,
    _restaurantId,
    sessionId,
  ) => {
    savedSessionId = sessionId;
  };

  orderRepository.deleteById = async (orderId) => {
    deletedOrderId = orderId;
  };

  globalThis.fetch = async () =>
    new Response("<checkout><code>CHK-ABC-123</code></checkout>", {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    });

  const result = await createOrderCardCheckoutService.execute({
    restaurantId: 7,
    userRestaurantId: 7,
    type: "DELIVERY",
    paymentMethod: "CARTAO",
    items: [{ productId: 1, quantity: 2 }],
    customerName: "Carlos Silva",
    customerCpf: "12345678900",
    customerPhone: "11999998888",
    successUrl: "http://frontend.local/cart/sucesso",
    cancelUrl: "http://frontend.local/cart/cancelado",
  });

  assert.equal(result.orderId, 321);
  assert.equal(result.provider, "PAGBANK");
  assert.equal(result.sessionId, "CHK-ABC-123");
  assert.equal(
    result.checkoutUrl,
    "https://pagseguro.uol.com.br/v2/checkout/payment.html?code=CHK-ABC-123",
  );
  assert.equal(savedSessionId, "pagbank_chk:CHK-ABC-123");
  assert.equal(deletedOrderId, null);
});
