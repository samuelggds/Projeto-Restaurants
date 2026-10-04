import { describe, expect, it } from 'vitest';
import { pixPaymentFailurePresentation } from './pixPaymentFailure';

describe('pixPaymentFailurePresentation', () => {
  it('explica rejected_high_risk do Mercado Pago sem linguagem técnica ou falsa confirmação', () => {
    expect(
      pixPaymentFailurePresentation({
        provider: 'MERCADO_PAGO',
        status: 'rejected',
        statusDetail: 'rejected_high_risk',
      }),
    ).toEqual({
      title: 'Pagamento recusado pelo Mercado Pago',
      message:
        'O Mercado Pago não autorizou esta tentativa por análise de segurança. Nenhum pagamento foi confirmado. Aguarde um pouco antes de tentar novamente ou utilize outra conta ou forma de pagamento.',
    });
  });

  it('não atribui motivo específico quando o provedor não informou high risk', () => {
    expect(
      pixPaymentFailurePresentation({
        provider: 'MERCADO_PAGO',
        status: 'rejected',
        statusDetail: 'cc_rejected_other_reason',
      }),
    ).toBeNull();

    expect(
      pixPaymentFailurePresentation({
        provider: 'PIX',
        status: 'rejected',
        statusDetail: 'rejected_high_risk',
      }),
    ).toBeNull();
  });
});
