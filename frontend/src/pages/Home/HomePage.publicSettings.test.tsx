import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { homeMockData } from './data';
import { HomePage } from './HomePage';

describe('HomePage com configurações públicas', () => {
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
