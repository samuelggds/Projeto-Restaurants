import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaymentCardVisual } from './PaymentCardVisual';

describe('PaymentCardVisual', () => {
  it('reutiliza chip, contactless, ondas animáveis e bandeira real no cartão salvo', () => {
    const markup = renderToStaticMarkup(
      <PaymentCardVisual
        compact
        brand="visa"
        numberLabel="•••• •••• •••• 4532"
        holderName="JOÃO SILVA"
        expiryLabel="12/28"
      />,
    );

    expect(markup).toContain('data-testid="payment-card-visual"');
    expect(markup).toContain('class="card-waves"');
    expect(markup).toContain('class="payment-chip"');
    expect(markup).toContain('class="contactless-icon"');
    expect(markup).toContain('alt="Visa"');
    expect(markup).toContain('•••• •••• •••• 4532');
    expect(markup).toContain('JOÃO SILVA');
    expect(markup).toContain('12/28');
  });

  it('mantém fallback genérico quando a bandeira salva não é reconhecida', () => {
    const markup = renderToStaticMarkup(
      <PaymentCardVisual
        brand="unknown-provider-brand"
        numberLabel="•••• •••• •••• 9999"
        holderName="Cliente"
        expiryLabel="01/30"
      />,
    );

    expect(markup).toContain('card-generic-icon');
    expect(markup).not.toContain('data-card-brand="visa"');
  });
});
