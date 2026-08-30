import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HomeHeader } from './HomeHeader';

const brand = {
  name: 'Restaurante Teste',
  monogram: 'RT',
  address: 'Rua Principal, 10',
};

describe('status de funcionamento da Home', () => {
  it('mantém o nome completo do restaurante no cabeçalho', () => {
    const fullName = 'Restaurante Pizzaria e Hamburgueria Sabor da Família';
    const markup = renderToStaticMarkup(
      <HomeHeader brand={{ ...brand, name: fullName }} cartCount={0} />,
    );

    expect(markup).toContain(fullName);
  });

  it('não renderiza o menu de navegação removido', () => {
    const markup = renderToStaticMarkup(<HomeHeader brand={brand} cartCount={0} />);

    expect(markup).not.toContain('<nav');
    expect(markup).not.toContain('Cardápio');
    expect(markup).not.toContain('Sobre');
    expect(markup).not.toContain('Abrir menu');
  });

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

describe('endereço de entrega da Home', () => {
  it('não apresenta o endereço do restaurante como destino de um visitante', () => {
    const markup = renderToStaticMarkup(<HomeHeader brand={brand} cartCount={0} />);

    expect(markup).toContain('Cadastrar endereço');
    expect(markup).not.toContain(brand.address);
  });

  it('não apresenta o endereço do restaurante para um cliente sem endereço salvo', () => {
    const markup = renderToStaticMarkup(
      <HomeHeader brand={brand} cartCount={0} userLoggedIn savedAddresses={[]} />,
    );

    expect(markup).toContain('Cadastrar endereço');
    expect(markup).not.toContain(brand.address);
  });

  it('ignora endereços residuais quando a sessão não está autenticada', () => {
    const markup = renderToStaticMarkup(
      <HomeHeader
        brand={brand}
        cartCount={0}
        savedAddresses={[
          {
            id: 9,
            label: 'Casa',
            address: 'Rua privada',
            number: '99',
            district: 'Centro',
            city: 'Fortaleza',
            state: 'CE',
            zipCode: '60000000',
            isDefault: true,
          },
        ]}
        selectedAddressId="9"
      />,
    );

    expect(markup).not.toContain('Rua privada');
    expect(markup).toContain('Cadastrar endereço');
  });

  it('mostra somente o endereço real selecionado do cliente autenticado', () => {
    const markup = renderToStaticMarkup(
      <HomeHeader
        brand={brand}
        cartCount={0}
        userLoggedIn
        savedAddresses={[
          {
            id: 3,
            label: 'Casa',
            address: 'Avenida do Cliente',
            number: '42',
            district: 'Centro',
            city: 'Fortaleza',
            state: 'CE',
            zipCode: '60000000',
            isDefault: true,
          },
        ]}
        selectedAddressId="3"
      />,
    );

    expect(markup).toContain('Avenida do Cliente, 42');
    expect(markup).not.toContain(brand.address);
  });

  it('explica a exigência de login antes de encaminhar o visitante', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onManageAddresses = vi.fn();

    act(() =>
      root.render(<HomeHeader brand={brand} cartCount={0} onManageAddresses={onManageAddresses} />),
    );

    const locationButton = container.querySelector(
      'button[aria-label="Cadastrar endereço"]',
    ) as HTMLButtonElement;
    act(() => locationButton.click());

    expect(locationButton.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Entre para cadastrar um endereço');
    expect(container.textContent).toContain(
      'Faça login para salvar e escolher seus endereços de entrega.',
    );
    expect(onManageAddresses).not.toHaveBeenCalled();

    const loginButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Entrar na conta',
    ) as HTMLButtonElement;
    act(() => loginButton.click());
    expect(onManageAddresses).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    container.remove();
  });
});
