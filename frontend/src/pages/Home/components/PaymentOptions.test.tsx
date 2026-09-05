import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getAvailablePaymentMethods } from '../domain/publicSettings';
import { shouldShowSavedCardAccountNotice } from '../domain/paymentAccountNotice';
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

  it('bloqueia visualmente o checkout quando nenhum canal de pagamento está disponível', () => {
    const markup = renderToStaticMarkup(
      <PaymentOptions
        paymentMethod="pix"
        allowPayOnDelivery={false}
        allowPayAtPickup={false}
        allowPix={false}
        allowCard={false}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Serviço indisponível');
  });

  it('oferece pagar no restaurante no canal de retirada mesmo sem pagamento online', () => {
    const markup = renderToStaticMarkup(
      <PaymentOptions
        paymentMethod="pickup_store"
        allowPayOnDelivery={false}
        allowPix={false}
        allowCard={false}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Pagar no restaurante');
    expect(markup).toContain('Pix e cartão são confirmados');
  });

  it('calcula os métodos válidos para cada canal', () => {
    expect(
      getAvailablePaymentMethods({ allowPayOnDelivery: true, allowPix: true, allowCard: false }),
    ).toEqual(['pix', 'delivery_pix']);
    expect(
      getAvailablePaymentMethods({ allowPayOnDelivery: false, allowPix: false, allowCard: true }),
    ).toEqual(['card', 'pickup_store']);
    expect(
      getAvailablePaymentMethods({
        allowPayOnDelivery: false,
        allowPayAtPickup: false,
        allowPix: false,
        allowCard: true,
      }),
    ).toEqual(['card']);
  });

  it('solicita uma conta somente para cartão online de visitante', () => {
    expect(shouldShowSavedCardAccountNotice(false, 'card')).toBe(true);
    expect(shouldShowSavedCardAccountNotice(true, 'card')).toBe(false);
    expect(shouldShowSavedCardAccountNotice(false, 'delivery_card')).toBe(false);
    expect(shouldShowSavedCardAccountNotice(false, 'pix')).toBe(false);
  });

  it('direciona o cadastro para a aba Meus cartões do perfil', () => {
    const markup = renderToStaticMarkup(
      <PaymentOptions
        paymentMethod="card"
        allowPayOnDelivery
        allowCard
        onChange={() => undefined}
        loggedIn
        restaurantId={1}
      />,
    );

    expect(markup).toContain('href="/profile?view=paymentMethods"');
    expect(markup).toContain('Cadastrar novo cartão');
  });
});
