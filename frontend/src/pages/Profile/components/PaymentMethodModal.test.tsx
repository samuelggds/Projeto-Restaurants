import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PaymentMethodModal } from './PaymentMethodModal';

function renderModal(overrides: Partial<ComponentProps<typeof PaymentMethodModal>> = {}) {
  return renderToStaticMarkup(
    <PaymentMethodModal
      restaurantId={9}
      restaurantName="North Pizza"
      restaurantLogoUrl="https://cdn.example.test/north-pizza.png"
      restaurantDescription="Pizzas artesanais."
      userName="Cliente Teste"
      userAvatarUrl="https://cdn.example.test/cliente.png"
      primaryColor="#d05632"
      cartCount={2}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      onGoHome={vi.fn()}
      onOpenSearch={vi.fn()}
      onOpenCart={vi.fn()}
      onCoupons={vi.fn()}
      onHelp={vi.fn()}
      onSupport={vi.fn()}
      {...overrides}
    />,
  );
}

describe('PaymentMethodModal', () => {
  it('renderiza a nova experiência responsiva do Figma com dados reais do restaurante e cliente', () => {
    const markup = renderModal();

    expect(markup).toContain('Adicionar Novo Cartão');
    expect(markup).toContain('Novo Cartão');
    expect(markup).toContain('North Pizza');
    expect(markup).toContain('https://cdn.example.test/north-pizza.png');
    expect(markup).toContain('https://cdn.example.test/cliente.png');
    expect(markup).toContain('Meu Carrinho');
    expect(markup).toContain('Salvar Novo Cartão');
    expect(markup).toContain('E-mail do comprador');
    expect(markup).toContain('voce@exemplo.com');
    expect(markup).toContain('CPF do titular');
  });

  it('inclui ondas, contactless, chip e preview seguro do cartão', () => {
    const markup = renderModal();

    expect(markup).toContain('class="card-waves"');
    expect(markup).toContain('class="contactless-icon"');
    expect(markup).toContain('class="payment-chip"');
    expect(markup).toContain('•••• •••• •••• ••••');
    expect(markup).toContain('TITULAR DO CARTÃO');
    expect(markup).toContain('MM/AA');
  });

  it('usa inicial do cliente no header mobile quando não existe avatar', () => {
    const markup = renderModal({ userAvatarUrl: undefined, userName: 'Samuel Gomes' });

    expect(markup).toContain('class="customer-avatar"');
    expect(markup).toContain('<span>S</span>');
  });

  it('mantém o rodapé identificado pelo restaurante e não por uma marca fixa', () => {
    const markup = renderModal();

    expect(markup).toContain('North Pizza. Todos os direitos reservados.');
    expect(markup).toContain('Pizzas artesanais.');
  });
});
