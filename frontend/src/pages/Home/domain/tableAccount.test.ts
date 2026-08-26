import { describe, expect, it } from 'vitest';
import {
  buildTablePaymentPayload,
  createTablePaymentIdempotencyKey,
  isCancelableOwnTablePayment,
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
