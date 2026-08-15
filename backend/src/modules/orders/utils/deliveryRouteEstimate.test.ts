import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeliveryDestination,
  parseOsrmRouteEstimate,
} from "./deliveryRouteEstimate.js";

test("monta o destino completo do pedido para a rota", () => {
  assert.equal(
    buildDeliveryDestination({
      address: "Rua das Flores",
      number: "123",
      district: "Centro",
      city: "Fortaleza",
      state: "CE",
    }),
    "Rua das Flores, 123, Centro, Fortaleza, CE, Brasil",
  );
});

test("interpreta a duracao retornada pelo OSRM", () => {
  assert.deepEqual(
    parseOsrmRouteEstimate({
      code: "Ok",
      routes: [{ duration: 765.4, distance: 4200.2 }],
    }),
    { durationSeconds: 765, distanceMeters: 4200, provider: "OSRM" },
  );
  assert.equal(parseOsrmRouteEstimate({ routes: [{ duration: 0 }] }), null);
});
