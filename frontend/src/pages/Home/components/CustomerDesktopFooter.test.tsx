import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CustomerDesktopFooter } from './CustomerDesktopFooter';

describe('CustomerDesktopFooter', () => {
  it('renderiza nome, logo e descrição atuais do restaurante vindos do backend', () => {
    const markup = renderToStaticMarkup(
      <CustomerDesktopFooter
        restaurantName="North Pizza"
        restaurantLogoUrl="https://cdn.example.test/north-pizza.png"
        description="Pizzas artesanais."
        primaryColor="#d05632"
        phone="85999999999"
        onMenu={vi.fn()}
        onCoupons={vi.fn()}
        onHelp={vi.fn()}
        onSupport={vi.fn()}
      />,
    );

    expect(markup).toContain('North Pizza');
    expect(markup).toContain('https://cdn.example.test/north-pizza.png');
    expect(markup).toContain('Pizzas artesanais.');
    expect(markup).toContain('© ');
    expect(markup).toContain('North Pizza. Todos os direitos reservados.');
    expect(markup).not.toContain('GastroNexa</strong>');
  });

  it('usa a inicial do restaurante apenas quando o backend não fornece logo', () => {
    const markup = renderToStaticMarkup(
      <CustomerDesktopFooter restaurantName="North Pizza" description="Pizzas artesanais." />,
    );

    expect(markup).toContain('>N</span>');
    expect(markup).toContain('<strong>North Pizza</strong>');
    expect(markup).not.toContain('<img');
  });

  it('mantém os links legais e suporte sem substituir a marca do restaurante', () => {
    const markup = renderToStaticMarkup(
      <CustomerDesktopFooter
        restaurantName="Restaurante Demo"
        email="contato@demo.test"
        onSupport={vi.fn()}
      />,
    );

    expect(markup).toContain('/termos/');
    expect(markup).toContain('/privacidade/');
    expect(markup).toContain('/cookies/');
    expect(markup).toContain('contato@demo.test');
    expect(markup).toContain('Restaurante Demo');
  });
});
