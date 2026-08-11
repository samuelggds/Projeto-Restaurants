// @ts-nocheck
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";
import GetPublicRestaurantSettingsService from "./GetPublicRestaurantSettingsService.js";

const originalFindPublic = restaurantSettingsRepository.findPublicByRestaurantId;
const originalFindRestaurant = restaurantSettingsRepository.findRestaurantById;

afterEach(() => {
  restaurantSettingsRepository.findPublicByRestaurantId = originalFindPublic;
  restaurantSettingsRepository.findRestaurantById = originalFindRestaurant;
});

test("mantém a cor personalizada na configuração pública", async () => {
    restaurantSettingsRepository.findPublicByRestaurantId = async () =>
      ({ restaurantId: 7, primaryColor: "#123456" }) as never;

    const settings = await GetPublicRestaurantSettingsService.execute({
      restaurantId: 7,
    });

    assert.deepEqual(settings, {
      restaurantId: 7,
      primaryColor: "#123456",
    });
});

test("usa uma cor segura quando o restaurante ainda não possui configurações", async () => {
    restaurantSettingsRepository.findPublicByRestaurantId = async () => null;
    restaurantSettingsRepository.findRestaurantById = async () =>
      ({ id: 7, name: "Restaurante" }) as never;

    const settings = await GetPublicRestaurantSettingsService.execute({
      restaurantId: 7,
    });

    assert.equal(settings.primaryColor, "#c95d3d");
});
