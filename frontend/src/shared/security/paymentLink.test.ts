import { expect, it } from 'vitest';
import { isValidPaymentLink } from './paymentLink';

it('accepts only HTTPS Mercado Pago checkout URLs', () => {
  expect(
    isValidPaymentLink('https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=example'),
  ).toBe(true);
  for (const url of [
    'https://evil.example/?mercadopago.com&pref_id=example',
    'https://www.mercadopago.com.br.evil.example/checkout/v1/?pref_id=example',
    'https://mercadopago.com@evil.example/checkout/v1/?pref_id=example',
    'https://user:password@www.mercadopago.com.br/checkout/v1/?pref_id=example',
    'http://www.mercadopago.com.br/checkout/v1/?pref_id=example',
    'javascript:alert("mercadopago.com&pref_id=x")',
    'https://www.mercadopago.com.br/checkout/v1/?pref_id=',
  ])
    expect(isValidPaymentLink(url)).toBe(false);
});
