import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasReusablePix,
  pixIdempotencyKey,
} from './RegenerateInvoicePaymentLinkService.js';

test('reutiliza Pix enquanto a cobrança ainda está válida', () => {
  assert.equal(
    hasReusablePix({
      paymentLink: 'https://example.test/pix',
      paymentExternalId: '123',
      pixQrCode: '000201...',
      pixQrCodeBase64: 'base64',
      pixExpiresAt: new Date(Date.now() + 60_000),
    }),
    true,
  );
});

test('não reutiliza Pix expirado ou incompleto', () => {
  assert.equal(
    hasReusablePix({
      paymentExternalId: '123',
      pixQrCode: '000201...',
      pixQrCodeBase64: 'base64',
      pixExpiresAt: new Date(Date.now() - 1_000),
    }),
    false,
  );
  assert.equal(
    hasReusablePix({
      paymentExternalId: '123',
      pixQrCode: null,
      pixQrCodeBase64: null,
      pixExpiresAt: new Date(Date.now() + 60_000),
    }),
    false,
  );
});

test('usa a mesma chave para regenerações concorrentes da mesma geração', () => {
  assert.equal(
    pixIdempotencyKey({ id: 42, paymentExternalId: 'mp-old-123' }),
    'invoice-pix-42-mp-old-123',
  );
  assert.equal(pixIdempotencyKey({ id: 42, paymentExternalId: null }), 'invoice-pix-42-initial');
});
