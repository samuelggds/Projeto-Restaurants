import { describe, expect, it } from 'vitest';
import {
  buildTablePaymentPayload,
  createTablePaymentIdempotencyKey,
  isCancelableOwnTablePayment,
  shouldReuseActiveTablePayment,
  tablePaymentFingerprint,
} from './tableAccount';

describe('tableAccount do cliente', () => {
  it('envia somente os campos permitidos para cada forma de divisão', () => {
    expect(
      buildTablePaymentPayload({
        selectionMode: 'SELECTED_ITEMS',
        method: 'PIX',
        billItemPublicIds: ['item-2', 'item-1'],
        splitCount: 9,
        includeOptionalServiceFee: true,
      }),
    ).toEqual({
      selectionMode: 'SELECTED_ITEMS',
      method: 'PIX',
      billItemPublicIds: ['item-2', 'item-1'],
      includeOptionalServiceFee: true,
    });

    expect(
      buildTablePaymentPayload({
        selectionMode: 'EQUAL_SPLIT',
        method: 'CARD',
        splitCount: 3,
        billItemPublicIds: ['não-deve-sair'],
      }),
    ).toEqual({
      selectionMode: 'EQUAL_SPLIT',
      method: 'CARD',
      splitCount: 3,
      includeOptionalServiceFee: false,
    });
  });

  it('inclui o payload protegido quando o pagamento da mesa é por cartão', () => {
    const protectedCard = {
      cardPaymentType: 'credit' as const,
      cardToken: 'opaque-provider-reference',
      cardPaymentMethodId: 'test-brand',
    };

    expect(
      buildTablePaymentPayload({
        selectionMode: 'MY_ITEMS',
        method: 'CARD',
        cardPayment: protectedCard,
      }),
    ).toEqual({
      selectionMode: 'MY_ITEMS',
      method: 'CARD',
      includeOptionalServiceFee: false,
      cardPayment: protectedCard,
    });
  });

  it('mantém a mesma tentativa quando o provedor renova somente o token do cartão', () => {
    const first = tablePaymentFingerprint({
      selectionMode: 'MY_ITEMS',
      method: 'CARD',
      cardPayment: {
        cardPaymentType: 'credit',
        cardToken: 'provider-token-a',
        cardPaymentMethodId: 'visa',
        cardBrand: 'visa',
        cardLast4: '4242',
        mercadoPagoDeviceId: 'device-a',
      },
    });
    const retried = tablePaymentFingerprint({
      selectionMode: 'MY_ITEMS',
      method: 'CARD',
      cardPayment: {
        cardPaymentType: 'credit',
        cardToken: 'provider-token-b',
        cardPaymentMethodId: 'visa',
        cardBrand: 'visa',
        cardLast4: '4242',
        mercadoPagoDeviceId: 'device-b',
      },
    });

    expect(retried).toBe(first);
  });

  it('reenvia tentativa online RESERVED sem referência do provedor e reutiliza somente cobrança realmente iniciada', () => {
    const basePayment = {
      publicId: 'payment-1',
      sessionPublicId: 'session-1',
      payerParticipantPublicId: 'participant-1',
      selectionMode: 'MY_ITEMS' as const,
      method: 'CARD' as const,
      status: 'RESERVED' as const,
      billItemPublicIds: ['item-1'],
      subtotalCents: 2_000,
      serviceFeeCents: 0,
      totalCents: 2_000,
      provider: null,
      externalId: null,
      checkoutUrl: null,
      paymentCode: null,
      expiresAt: '2026-10-01T23:30:00.000Z',
      createdAt: '2026-10-01T23:00:00.000Z',
      updatedAt: '2026-10-01T23:00:00.000Z',
    };

    expect(shouldReuseActiveTablePayment(basePayment, 'CARD')).toBe(false);
    expect(
      shouldReuseActiveTablePayment(
        { ...basePayment, provider: 'MERCADO_PAGO', externalId: 'mp_order:123' },
        'CARD',
      ),
    ).toBe(true);
    expect(
      shouldReuseActiveTablePayment(
        { ...basePayment, method: 'PIX', externalId: 'mp:456' },
        'PIX',
      ),
    ).toBe(true);
    expect(
      shouldReuseActiveTablePayment(
        { ...basePayment, method: 'CASH', externalId: null },
        'CASH',
      ),
    ).toBe(true);
  });

  it('só permite cancelar uma cobrança ativa criada pelo participante atual', () => {
    const payment = {
      publicId: 'payment-1',
      payerParticipantPublicId: 'participant-1',
      selectionMode: 'MY_ITEMS' as const,
      status: 'PROCESSING' as const,
      totalCents: 2_000,
      createdAt: '2026-08-26T12:00:00.000Z',
    };
    expect(isCancelableOwnTablePayment(payment, 'participant-1')).toBe(true);
    expect(isCancelableOwnTablePayment(payment, 'participant-2')).toBe(false);
    expect(isCancelableOwnTablePayment({ ...payment, status: 'PAID' }, 'participant-1')).toBe(
      false,
    );
  });

  it('gera chave de idempotência longa e compatível com a API', () => {
    expect(createTablePaymentIdempotencyKey()).toMatch(/^[A-Za-z0-9._:-]{16,128}$/);
  });
});
