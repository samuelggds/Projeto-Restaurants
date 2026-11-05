import { describe, expect, it } from 'vitest';
import { sameNfcConfirmedItems } from './nfcConfirmedItems.js';

describe('strict NFC confirmed order item comparison', () => {
  const submitted = [{ productId: 12, quantity: 3 }, { productId: 44, quantity: 1 }];

  it('accepts identical confirmed items even when JSONB reordered keys', () => {
    const persisted = [{ quantity: 3, productId: 12 }, { quantity: 1, productId: 44 }];
    expect(JSON.stringify(persisted)).not.toBe(JSON.stringify(submitted));
    expect(sameNfcConfirmedItems(persisted, submitted)).toBe(true);
  });

  it('rejects changes to quantities, products or position', () => {
    expect(sameNfcConfirmedItems([{ quantity: 4, productId: 12 }, { productId: 44, quantity: 1 }], submitted)).toBe(false);
    expect(sameNfcConfirmedItems([{ quantity: 3, productId: 13 }, { productId: 44, quantity: 1 }], submitted)).toBe(false);
    expect(sameNfcConfirmedItems([...submitted].reverse(), submitted)).toBe(false);
    expect(sameNfcConfirmedItems([submitted[0]], submitted)).toBe(false);
  });

  it('rejects malformed or altered drafts instead of loosening confirmation', () => {
    expect(sameNfcConfirmedItems([{ ...submitted[0], price: 0 }, submitted[1]], submitted)).toBe(false);
    expect(sameNfcConfirmedItems([{ productId: '12', quantity: 3 }, submitted[1]], submitted)).toBe(false);
    expect(sameNfcConfirmedItems(null, submitted)).toBe(false);
    expect(sameNfcConfirmedItems({ items: submitted }, submitted)).toBe(false);
  });
});
