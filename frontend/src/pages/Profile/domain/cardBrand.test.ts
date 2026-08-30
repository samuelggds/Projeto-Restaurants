import { describe, expect, it } from 'vitest';
import { detectCardBrand, getCardBrandDetails, maskedCardNumber } from './cardBrand';

describe('cardBrand', () => {
  it.each([
    ['4111111111111111', 'visa'],
    ['5555555555554444', 'mastercard'],
    ['378282246310005', 'amex'],
    ['4011780000000000', 'elo'],
    ['6062820000000000', 'hipercard'],
    ['6011111111111117', 'discover'],
    ['3530111333300000', 'jcb'],
  ])('detects %s as %s', (number, brand) => {
    expect(detectCardBrand(number).id).toBe(brand);
  });

  it('normalizes the provider brand identifier', () => {
    expect(getCardBrandDetails('master').id).toBe('mastercard');
    expect(getCardBrandDetails('american_express').id).toBe('amex');
  });

  it('shows only the last four digits in the visual preview', () => {
    expect(maskedCardNumber('4111 1111 1111 1234')).toBe('•••• •••• •••• 1234');
  });
});
