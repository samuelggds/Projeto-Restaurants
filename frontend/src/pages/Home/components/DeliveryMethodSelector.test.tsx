import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DeliveryMethodSelector } from './DeliveryMethodSelector';

describe('DeliveryMethodSelector', () => {
  it('mostra somente os canais habilitados pelo restaurante', () => {
    const markup = renderToStaticMarkup(
      <DeliveryMethodSelector
        value="pickup"
        allowDelivery={false}
        allowPickup
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Retirada');
    expect(markup).not.toContain('Delivery');
  });

  it('explica quando nenhum canal está recebendo pedidos', () => {
    const markup = renderToStaticMarkup(
      <DeliveryMethodSelector
        value="delivery"
        allowDelivery={false}
        allowPickup={false}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('não está aceitando delivery ou retirada');
  });
});
