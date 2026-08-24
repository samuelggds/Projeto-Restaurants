import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomeHeader } from './HomeHeader';

const brand = {
  name: 'Restaurante Teste',
  monogram: 'RT',
  address: 'Rua Principal, 10',
};

describe('status de funcionamento da Home', () => {
  it('mostra um único estado aberto com o horário de fechamento', () => {
    const markup = renderToStaticMarkup(
      <HomeHeader
        brand={brand}
        cartCount={0}
        isRestaurantOpen
        availabilityLabel="Aberto agora"
        availabilityDetail="Fecha às 23:00"
      />,
    );

    expect(markup).toContain('Aberto agora');
    expect(markup).toContain('Fecha às 23:00');
    expect(markup).not.toMatch(/Fechado/i);
  });

  it('mostra o estado fechado e a próxima abertura', () => {
    const markup = renderToStaticMarkup(
      <HomeHeader
        brand={brand}
        cartCount={0}
        isRestaurantOpen={false}
        availabilityLabel="Fechado agora"
        availabilityDetail="Abre amanhã às 11:00"
      />,
    );

    expect(markup).toContain('Fechado agora');
    expect(markup).toContain('Abre amanhã às 11:00');
  });

  it('omite um detalhe legado que contradiz o estado principal', () => {
    const markup = renderToStaticMarkup(
      <HomeHeader
        brand={brand}
        cartCount={0}
        isRestaurantOpen
        businessHoursLabel="Hoje: fechado"
      />,
    );

    expect(markup).toContain('Aberto agora');
    expect(markup).not.toMatch(/fechado/i);
  });
});
