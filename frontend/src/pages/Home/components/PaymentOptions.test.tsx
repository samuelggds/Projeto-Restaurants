import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getAvailablePaymentMethods } from '../domain/publicSettings';
import { PaymentOptions } from './PaymentOptions';

describe('PaymentOptions', () => {
  it('remove Pix quando o restaurante aceita somente cartão', () => {
    const markup = renderToStaticMarkup(
      <PaymentOptions
        paymentMethod="card"
        allowPayOnDelivery
        allowPix={false}
        allowCard
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Cartão');
    expect(markup).toContain('Cartão na entrega');
    expect(markup).not.toContain('Pix');
  });

  it('bloqueia visualmente o checkout quando não existe pagamento habilitado', () => {
    const markup = renderToStaticMarkup(
      <PaymentOptions
        paymentMethod="pix"
        allowPayOnDelivery={false}
        allowPix={false}
        allowCard={false}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('não disponibilizou uma forma de pagamento');
  });

  it('calcula os métodos válidos para cada canal', () => {
    expect(
      getAvailablePaymentMethods({ allowPayOnDelivery: true, allowPix: true, allowCard: false }),
    ).toEqual(['pix', 'delivery_pix']);
    expect(
      getAvailablePaymentMethods({ allowPayOnDelivery: false, allowPix: false, allowCard: true }),
    ).toEqual(['card']);
  });
});
