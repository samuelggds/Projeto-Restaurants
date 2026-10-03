import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FigmaDeliveryExperience } from './FigmaDeliveryExperience';
import { homeMockData } from './data';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('FigmaDeliveryExperience product flow', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('scrollTo', vi.fn());
  });




  it('usa a foto salva no atalho de perfil e abre os atalhos da conta no mobile', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onOpenProfileView = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
          }}
          userLoggedIn
          userName="Cliente Teste"
          userAvatar="data:image/jpeg;base64,avatar-salvo"
          savedAddresses={[
            {
              id: 1,
              label: 'Casa',
              address: 'Rua das Flores',
              number: '123',
              district: 'Centro',
              city: 'Fortaleza',
              state: 'CE',
              zipCode: '60000-000',
              complement: null,
              isDefault: true,
            },
          ]}
          onOpenProfileView={onOpenProfileView}
          onOpenProfile={vi.fn()}
        />,
      );
    });

    const trigger = container.querySelector(
      'button[aria-label="Abrir atalhos da minha conta"]',
    ) as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();
    expect(trigger?.classList.contains('mobile-profile-trigger')).toBe(true);
    expect(trigger?.classList.contains('mobile-address-trigger')).toBe(false);
    expect(trigger?.querySelector('img')?.getAttribute('src')).toBe(
      'data:image/jpeg;base64,avatar-salvo',
    );

    await act(async () => trigger?.click());

    const dialog = container.querySelector(
      '[aria-labelledby="profile-quick-menu-title"]',
    ) as HTMLElement | null;
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('Meus pedidos');
    expect(dialog?.textContent).toContain('Endereços salvos');
    expect(dialog?.textContent).toContain('Métodos de pagamento');
    expect(dialog?.textContent).toContain('Meus Cupons');
    expect(dialog?.textContent).toContain('Programa de Fidelidade');
    expect(dialog?.textContent).toContain('Ajuda e suporte');
    expect(dialog?.textContent).toContain('Configurações');

    const addressesButton = Array.from(
      dialog?.querySelectorAll<HTMLButtonElement>('.quick-profile-links button') || [],
    ).find((button) => button.textContent?.includes('Endereços salvos'));

    await act(async () => addressesButton?.click());

    const closingDialog = container.querySelector(
      '[aria-labelledby="profile-quick-menu-title"]',
    ) as HTMLElement | null;
    expect(closingDialog?.classList.contains('closing')).toBe(true);
    expect(onOpenProfileView).not.toHaveBeenCalled();

    await act(async () => {
      closingDialog?.dispatchEvent(
        new AnimationEvent('animationend', {
          animationName: 'profile-quick-sheet-out',
          bubbles: true,
        }),
      );
    });

    expect(onOpenProfileView).toHaveBeenCalledWith('addresses');
    expect(container.querySelector('[aria-labelledby="profile-quick-menu-title"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it('envia visitante para o login ao tocar no atalho de perfil', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onOpenProfile = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
          }}
          userLoggedIn={false}
          onOpenProfile={onOpenProfile}
        />,
      );
    });

    const trigger = container.querySelector(
      'button[aria-label="Entrar na minha conta"]',
    ) as HTMLButtonElement | null;
    await act(async () => trigger?.click());

    expect(onOpenProfile).toHaveBeenCalledOnce();
    expect(container.querySelector('[aria-labelledby="profile-quick-menu-title"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it('não reserva espaço de banner quando o admin não configurou banner', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
            hero: { title: '', highlight: '', description: '', image: '' },
            banners: [],
          }}
        />,
      );
    });

    expect(container.querySelector('[aria-label="Promoções do restaurante"]')).toBeNull();
    expect(container.querySelector('#cardapio')).toBeTruthy();
    expect(container.querySelector('#cardapio')?.classList.contains('no-banner')).toBe(true);

    act(() => root.unmount());
    container.remove();
  });



  it('não renderiza cartão vazio de métricas no hero desktop quando existe apenas endereço', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            brand: {
              ...homeMockData.brand,
              name: 'Restaurante Demo',
              address: 'Rua Francisco Calaça, 1688 - Floresta - Fortaleza',
            },
            hero: {
              title: 'Promoção',
              highlight: 'Hoje',
              description: '',
              image: '/banner.jpg',
            },
            deliveryTime: '',
            deliveryFee: 0,
          }}
        />,
      );
    });

    const heroSummary = container.querySelector('[aria-label="Resumo do restaurante"]');
    expect(heroSummary).toBeTruthy();
    expect(heroSummary?.querySelector('.metric-card')).toBeNull();
    expect(heroSummary?.textContent).toContain(
      'Rua Francisco Calaça, 1688 - Floresta - Fortaleza',
    );

    act(() => root.unmount());
    container.remove();
  });

  it('mantém entrega e retirada ligadas ao estado real do checkout', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onFulfillmentMethodChange = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            acceptsDelivery: true,
            acceptsPickup: true,
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
          }}
          fulfillmentMethod="pickup"
          onFulfillmentMethodChange={onFulfillmentMethodChange}
        />,
      );
    });

    const deliveryButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[aria-pressed="false"]'),
    ).filter((button) => button.textContent?.includes('Entrega'));
    expect(deliveryButtons.length).toBeGreaterThan(0);

    await act(async () => deliveryButtons[0].click());
    expect(onFulfillmentMethodChange).toHaveBeenCalledWith('delivery');

    act(() => root.unmount());
    container.remove();
  });


  it('abre seletor inferior e troca para outro endereço cadastrado', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSelectAddress = vi.fn();
    const onManageAddresses = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            acceptsDelivery: true,
            acceptsPickup: true,
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
          }}
          fulfillmentMethod="delivery"
          savedAddresses={[
            {
              id: 1,
              label: 'Casa',
              address: 'Rua das Flores',
              number: '123',
              district: 'Centro',
              city: 'Fortaleza',
              state: 'CE',
              zipCode: '60000-000',
              complement: null,
              isDefault: true,
            },
            {
              id: 2,
              label: 'Trabalho',
              address: 'Avenida Santos Dumont',
              number: '2000',
              district: 'Aldeota',
              city: 'Fortaleza',
              state: 'CE',
              zipCode: '60150-161',
              complement: 'Sala 4',
              isDefault: false,
            },
          ]}
          selectedAddressId="1"
          onSelectAddress={onSelectAddress}
          onManageAddresses={onManageAddresses}
        />,
      );
    });

    const addressTrigger = container.querySelector(
      'button[aria-label="Endereço de entrega: Rua das Flores, 123 - Centro"]',
    ) as HTMLButtonElement | null;
    expect(addressTrigger).toBeTruthy();

    await act(async () => addressTrigger?.click());

    const dialog = container.querySelector(
      '[aria-labelledby="address-picker-title"]',
    ) as HTMLElement | null;
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('Onde você quer receber?');
    expect(dialog?.textContent).toContain('Casa');
    expect(dialog?.textContent).toContain('Trabalho');

    const workAddress = dialog?.querySelector(
      'button[aria-label="Usar endereço Trabalho"]',
    ) as HTMLButtonElement | null;
    expect(workAddress).toBeTruthy();

    await act(async () => workAddress?.click());

    expect(onSelectAddress).toHaveBeenCalledWith('2');
    expect(container.querySelector('[aria-labelledby="address-picker-title"]')).toBeNull();
    expect(onManageAddresses).not.toHaveBeenCalled();

    act(() => root.unmount());
    container.remove();
  });

  it('mantém o cadastro de endereço como fallback quando não há endereço salvo', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onManageAddresses = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            acceptsDelivery: true,
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
          }}
          fulfillmentMethod="delivery"
          savedAddresses={[]}
          onManageAddresses={onManageAddresses}
        />,
      );
    });

    const addressTrigger = container.querySelector(
      'button[aria-label="Endereço de entrega: Escolher endereço"]',
    ) as HTMLButtonElement | null;

    await act(async () => addressTrigger?.click());

    expect(onManageAddresses).toHaveBeenCalledOnce();
    expect(container.querySelector('[aria-labelledby="address-picker-title"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it('adiciona produto COMPLETE direto pelo botão e mantém detalhes no clique do card', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onAddProduct = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            isOpen: true,
            deliveryTime: '25-35',
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
            categories: [{ id: 'lanches', name: 'Lanches', image: '' }],
            products: [
              {
                id: 'ready-1',
                categoryId: 'lanches',
                name: 'Refrigerante',
                description: 'Produto pronto',
                image: '',
                price: 6,
                originalPrice: 6,
                rating: 0,
                preparationTime: 35,
                available: true,
                kind: 'STANDARD',
                saleMode: 'COMPLETE',
                configurationVersion: 2,
              },
            ],
          }}
          onAddProduct={onAddProduct}
        />,
      );
    });

    const add = container.querySelector(
      'button[aria-label="Adicionar Refrigerante"]',
    ) as HTMLButtonElement;
    expect(add).toBeTruthy();

    await act(async () => add.click());

    expect(onAddProduct).toHaveBeenCalledWith(
      'ready-1',
      {
        selectedOptions: [],
        selectedOptionIds: [],
        observation: '',
        configurationVersion: 2,
      },
      1,
    );
    expect(document.querySelector('[data-ready-product-detail]')).toBeNull();
    expect(document.querySelector('[aria-label="Montar Refrigerante"]')).toBeNull();

    onAddProduct.mockClear();

    const detailsTrigger = container.querySelector(
      'button[aria-label="Ver detalhes de Refrigerante"]',
    ) as HTMLButtonElement;
    expect(detailsTrigger).toBeTruthy();

    await act(async () => detailsTrigger.click());

    const detail = document.querySelector('[data-ready-product-detail]') as HTMLElement;
    expect(detail).toBeTruthy();
    expect(detail.textContent).toContain('Refrigerante');
    expect(detail.textContent).toContain('35 min');
    expect(detail.textContent).not.toContain('25-35 min');
    expect(onAddProduct).not.toHaveBeenCalled();
    expect(document.querySelector('[aria-label="Montar Refrigerante"]')).toBeNull();

    const observation = detail.querySelector('textarea') as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set?.call(
        observation,
        'Bem gelado',
      );
      observation.dispatchEvent(new Event('input', { bubbles: true }));
      observation.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      (
        detail.querySelector('button[data-cart-fly-source="dialog"]') as HTMLButtonElement
      ).click();
    });

    expect(onAddProduct).toHaveBeenCalledWith(
      'ready-1',
      {
        selectedOptions: [],
        selectedOptionIds: [],
        observation: 'Bem gelado',
        configurationVersion: 2,
      },
      1,
    );

    act(() => root.unmount());
    container.remove();
  });

  it('mantém combos fora da tela de produto pronto', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onAddProduct = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            isOpen: true,
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
            categories: [{ id: 'combos', name: 'Combos', image: '' }],
            products: [
              {
                id: 'combo-1',
                categoryId: 'combos',
                name: 'Combo Família',
                description: 'Combo configurável',
                image: '',
                price: 79.9,
                originalPrice: 79.9,
                rating: 0,
                available: true,
                kind: 'COMBO',
                saleMode: 'COMPLETE',
                comboGroups: [],
              },
            ],
          }}
          onAddProduct={onAddProduct}
        />,
      );
    });

    const add = container.querySelector(
      'button[aria-label="Adicionar Combo Família"]',
    ) as HTMLButtonElement;

    await act(async () => add.click());

    await vi.waitFor(() => {
      expect(document.querySelector('[aria-label="Montar Combo Família"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-ready-product-detail]')).toBeNull();
    expect(onAddProduct).not.toHaveBeenCalled();

    act(() => root.unmount());
    container.remove();
  });

  it('abre configurador para produto BUILDABLE e só adiciona após confirmar', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onAddProduct = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            isOpen: true,
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
            categories: [{ id: 'lanches', name: 'Lanches', image: '' }],
            products: [
              {
                id: 'custom-1',
                categoryId: 'lanches',
                name: 'Smash Bacon',
                description: 'Personalizável',
                image: '',
                price: 28.9,
                originalPrice: 28.9,
                rating: 0,
                available: true,
                kind: 'STANDARD',
                saleMode: 'BUILDABLE',
                optionGroups: [
                  {
                    id: 'ponto',
                    name: 'Ponto da carne',
                    required: true,
                    selectionType: 'SINGLE',
                    minSelections: 1,
                    maxSelections: 1,
                    options: [
                      { id: 'ao-ponto', name: 'Ao ponto', price: 0, active: true },
                    ],
                  },
                ],
              },
            ],
          }}
          onAddProduct={onAddProduct}
        />,
      );
    });

    const add = container.querySelector(
      'button[aria-label="Adicionar Smash Bacon"]',
    ) as HTMLButtonElement;

    await act(async () => add.click());

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[aria-label="Montar Smash Bacon"]')).toBeTruthy();
    });

    const dialog = container.querySelector(
      '[aria-label="Montar Smash Bacon"]',
    ) as HTMLElement;

    expect(onAddProduct).not.toHaveBeenCalled();

    await act(async () => {
      (dialog.querySelector('input[value="ao-ponto"]') as HTMLInputElement).click();
      (dialog.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    });

    expect(onAddProduct).toHaveBeenCalledWith(
      'custom-1',
      expect.objectContaining({ selectedOptionIds: ['ao-ponto'] }),
      1,
    );

    act(() => root.unmount());
    container.remove();
  });
});
