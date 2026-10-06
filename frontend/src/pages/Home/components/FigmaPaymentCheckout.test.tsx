import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FigmaPaymentCheckout } from './FigmaPaymentCheckout';

describe('FigmaPaymentCheckout tenant branding', () => {
  it('uses the current restaurant logo and name in the logged-in customer header', () => {
    const markup = renderToStaticMarkup(
      <FigmaPaymentCheckout
        primaryColor="#ff4b4b"
        loggedIn
        brandName="North Pizza"
        logoUrl="https://cdn.example.test/north-pizza.png"
        cart={[]}
        cartCount={0}
        subtotal={0}
        couponDiscount={0}
        deliveryFee={0}
        total={0}
        paymentMethods={<div>PIX</div>}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(markup).toContain('North Pizza');
    expect(markup).toContain('https://cdn.example.test/north-pizza.png');
    expect(markup).not.toContain('<b>GastroNexa</b>');
  });
  it('marks checkout buttons busy and shows payment processing copy while submitting', () => {
    const markup = renderToStaticMarkup(
      <FigmaPaymentCheckout
        primaryColor="#ff4b4b"
        loggedIn
        brandName="North Pizza"
        cart={[]}
        cartCount={1}
        subtotal={0.85}
        couponDiscount={0}
        deliveryFee={1}
        total={1.85}
        paymentMethods={<div>Cartão</div>}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        loading
      />,
    );

    expect(markup).toContain('Processando pagamento...');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('data-loading="true"');
    expect(markup).toContain('disabled=""');
  });

});
