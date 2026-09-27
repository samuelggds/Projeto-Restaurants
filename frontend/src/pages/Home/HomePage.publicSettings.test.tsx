import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { homeMockData } from './data';
import { HomePage } from './HomePage';

describe('HomePage com configurações públicas', () => {
  it('oculta favoritos sem ação no cardápio de mesa e mantém a ação da loja', () => {
    const data = {
      ...homeMockData,
      categories: [{ id: 'pizzas', name: 'Pizzas', image: '/pizza.webp' }],
      products: [
        {
          id: 'pizza-1',
          categoryId: 'pizzas',
          name: 'Pizza da casa',
          description: 'Pizza',
          price: 30,
          originalPrice: 30,
          image: '/pizza.webp',
          rating: 0,
          available: true,
        },
      ],
    };
    const tableMarkup = renderToStaticMarkup(<HomePage data={data} isTableMenu />);
    expect(tableMarkup).toContain('Ver detalhes de Pizza da casa');
    expect(tableMarkup).not.toContain('aria-label="Favoritar ');
    const storeMarkup = renderToStaticMarkup(
      <HomePage data={data} onToggleFavorite={() => undefined} />,
    );
    expect(storeMarkup).toContain('aria-label="Favoritar Pizza da casa"');
  });

  it('exibe frete grátis e somente contatos realmente configurados', () => {
    const markup = renderToStaticMarkup(
      <HomePage
        data={{
          ...homeMockData,
          isOpen: true,
          acceptsDelivery: true,
          freeDeliveryFrom: 60,
          brand: {
            ...homeMockData.brand,
            name: 'Casa Teste',
            whatsapp: '5585999990000',
            whatsappDisplayName: 'Atendimento da Casa',
            whatsappDefaultMessage: 'Olá, quero pedir.',
            tiktok: '@casateste',
            youtube: 'youtube.com/@casateste',
          },
        }}
      />,
    );

    expect(markup).toContain('Frete grátis a partir de');
    expect(markup).toContain('R$ 60,00');
    expect(markup).toContain('Atendimento da Casa');
    expect(markup).toContain('text=Ol%C3%A1%2C%20quero%20pedir.');
    expect(markup).toContain('https://tiktok.com/@casateste');
    expect(markup).toContain('https://youtube.com/@casateste');
    expect(markup).toContain('data-testid="footer-contact-grid"');
    expect(markup).toContain('Desenvolvido por');
    expect(markup).toContain('GastroNexa');
  });

  it('não anuncia frete grátis quando o delivery está desativado', () => {
    const markup = renderToStaticMarkup(
      <HomePage
        data={{
          ...homeMockData,
          acceptsDelivery: false,
          freeDeliveryFrom: 60,
        }}
      />,
    );

    expect(markup).not.toContain('Frete grátis');
  });
});
