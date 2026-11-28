import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { restaurantCategorySchema } from '../../../validators/RestaurantValidator.js';
import { trialMenus } from './seedRestaurantTrialMenu.js';

test('cada ramo oferecido tem produtos editáveis com nome, descrição, preço e fotografia local', () => {
  assert.deepEqual(Object.keys(trialMenus).sort(), [...restaurantCategorySchema.options].sort());
  for (const [category, products] of Object.entries(trialMenus)) {
    assert.ok(products.length >= 3, category);
    assert.equal(new Set(products.map((product) => product[1])).size, products.length, category);
    for (const [section, name, description, price, image] of products) {
      assert.ok(section && name && description && price > 0);
      assert.match(image, /^\/(?:cardapio-inicial|marketing-vitrines\/cardapios|demo)\/[a-z0-9-]+\.webp$/u);
      assert.ok(existsSync(resolve('..', 'frontend', 'public', image.slice(1))), image);
    }
  }
});
