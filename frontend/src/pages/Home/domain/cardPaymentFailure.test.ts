import { describe, expect, it } from 'vitest';
import { cardPaymentFailurePresentation } from './cardPaymentFailure';

describe('cardPaymentFailurePresentation', () => {
  it.each([
    ['high_risk', 'análise de segurança'],
    ['cc_rejected_high_risk', 'análise de segurança'],
    ['bad_filled_security_code', 'Confira o CVV'],
    ['cc_rejected_bad_filled_security_code', 'Confira o CVV'],
    ['bad_filled_card_data', 'Confira os dados'],
    ['cc_rejected_bad_filled_card_number', 'Confira os dados'],
    ['insufficient_amount', 'saldo ou limite insuficiente'],
    ['cc_rejected_insufficient_amount', 'saldo ou limite insuficiente'],
    ['rejected_by_issuer', 'banco emissor'],
    ['card_disabled', 'desabilitado'],
    ['max_attempts_exceeded', 'limite de tentativas'],
    ['saved_card_refresh_failed', 'Nenhuma cobrança foi enviada'],
    ['saved_card_refresh_unavailable', 'Nenhuma cobrança foi enviada'],
    ['saved_card_reference_mismatch', 'validar o vínculo'],
    ['invalid_card_token', 'validação segura'],
    ['processing_error', 'falha técnica'],
  ])('explica o motivo permitido %s', (providerStatusDetail, message) => {
    expect(cardPaymentFailurePresentation({ providerStatusDetail }).message).toContain(message);
  });

  it('não inventa a causa específica da análise de segurança nem recomenda insistir', () => {
    const { message } = cardPaymentFailurePresentation({ failureCode: 'high_risk' });
    expect(message).toContain('O motivo específico não foi informado');
    expect(message).toContain('Evite repetir a tentativa imediatamente');
    expect(message).not.toContain('CVV');
    expect(message).not.toContain('CPF');
  });

  it('usa o código de falha conhecido quando o detalhe é genérico', () => {
    expect(cardPaymentFailurePresentation({
      providerStatusDetail: 'failed',
      failureCode: 'cc_rejected_bad_filled_security_code',
    }).message).toContain('Confira o CVV');
  });

  it.each(['raw email: buyer@example.test cpf: 12345678901', 'constructor', '__proto__', '']) (
    'não exibe texto bruto ou motivo desconhecido: %s', (providerStatusDetail) => {
      const presentation = cardPaymentFailurePresentation({ providerStatusDetail });
      expect(presentation.message).toContain('O provedor não informou um motivo específico');
      expect(presentation.supportReference).toBeNull();
      if (providerStatusDetail) expect(presentation.message).not.toContain(providerStatusDetail);
    },
  );

  it('usa apenas o UUID público da tentativa como referência de suporte', () => {
    const publicId = '123e4567-e89b-42d3-a456-426614174001';
    expect(cardPaymentFailurePresentation({ publicId }).supportReference).toBe(publicId);
    expect(cardPaymentFailurePresentation({ publicId: 'provider-request-123' }).supportReference).toBeNull();
    expect(cardPaymentFailurePresentation({ publicId: 'buyer@example.test' }).supportReference).toBeNull();
  });
});
