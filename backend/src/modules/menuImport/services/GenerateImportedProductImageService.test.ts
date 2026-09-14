import assert from 'node:assert/strict';
import test from 'node:test';
import { detectBrandedImportedProduct } from './GenerateImportedProductImageService.js';

test('detecta produtos de marca que exigem imagem manual', () => {
  assert.equal(detectBrandedImportedProduct('Coca-Cola 350ml').branded, true);
  assert.equal(detectBrandedImportedProduct('Heineken Long Neck').branded, true);
  assert.equal(detectBrandedImportedProduct('Açaí com Nutella').branded, true);
});

test('mantém pratos genéricos elegíveis para imagem por IA', () => {
  assert.equal(detectBrandedImportedProduct('Hambúrguer com queijo').branded, false);
  assert.equal(detectBrandedImportedProduct('Pizza de calabresa').branded, false);
  assert.equal(detectBrandedImportedProduct('Batata frita').branded, false);
});
