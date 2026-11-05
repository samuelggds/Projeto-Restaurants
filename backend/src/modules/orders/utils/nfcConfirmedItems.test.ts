import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sameNfcConfirmedItems } from './nfcConfirmedItems.js';

describe('strict NFC confirmed order item comparison', () => {
  const submitted = [{ productId: 12, quantity: 3 }, { productId: 44, quantity: 1 }];

  it('accepts identical confirmed items even when JSONB reordered keys', () => {
    const persisted = [{ quantity: 3, productId: 12 }, { quantity: 1, productId: 44 }];
    assert.notEqual(JSON.stringify(persisted), JSON.stringify(submitted));
    assert.equal(sameNfcConfirmedItems(persisted, submitted), true);
  });

  it('rejects changes to quantities, products or position', () => {
    assert.equal(sameNfcConfirmedItems([{ quantity: 4, productId: 12 }, { productId: 44, quantity: 1 }], submitted), false);
    assert.equal(sameNfcConfirmedItems([{ quantity: 3, productId: 13 }, { productId: 44, quantity: 1 }], submitted), false);
    assert.equal(sameNfcConfirmedItems([...submitted].reverse(), submitted), false);
    assert.equal(sameNfcConfirmedItems([submitted[0]], submitted), false);
  });

  it('rejects malformed or altered drafts instead of loosening confirmation', () => {
    assert.equal(sameNfcConfirmedItems([{ ...submitted[0], price: 0 }, submitted[1]], submitted), false);
    assert.equal(sameNfcConfirmedItems([{ productId: '12', quantity: 3 }, submitted[1]], submitted), false);
    assert.equal(sameNfcConfirmedItems(null, submitted), false);
    assert.equal(sameNfcConfirmedItems({ items: submitted }, submitted), false);
  });
});
