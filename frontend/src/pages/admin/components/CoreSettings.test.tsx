import { act } from 'react';
import { createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import { AddressSettings } from './AddressSettings';
import { BrandSettings } from './BrandSettings';
import { BusinessSettings } from './BusinessSettings';
import { OrderFlowSettings } from './OrderFlowSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function changeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('configurações principais do administrador', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('mantém marca e identidade como controles gerenciados e restringe os uploads', () => {
    const update = vi.fn();
    act(() =>
      root.render(
        <BrandSettings
          settings={{ ...adminMockSettings, restaurantName: 'Casa Teste' }}
          update={update}
          logoInput={createRef<HTMLInputElement>()}
          onLogoChange={() => undefined}
          onCoverChange={() => undefined}
          onEnhanceCover={() => undefined}
          isEnhancingCover={false}
          onBannerChange={() => undefined}
        />,
      ),
    );

    expect(
      Array.from(container.querySelectorAll('input[type="file"]')).every(
        (input) => input.getAttribute('accept') === 'image/jpeg,image/png,image/webp',
      ),
    ).toBe(true);
    const name = container.querySelector('[aria-label="Nome do restaurante"]') as HTMLInputElement;
    expect(name.value).toBe('Casa Teste');
    act(() => changeValue(name, 'Casa Atualizada'));
    expect(update).toHaveBeenCalledWith('restaurantName', 'Casa Atualizada');
  });

  it('expõe dados do negócio persistidos em campos controlados', () => {
    act(() =>
      root.render(
        <BusinessSettings
          settings={{
            ...adminMockSettings,
            companyLegalName: 'Restaurante Exemplo LTDA',
            companyDocument: '11.222.333/0001-81',
            businessPhone: '(85) 99999-1234',
            businessEmail: 'contato@restaurante.com.br',
          }}
          update={() => undefined}
        />,
      ),
    );

    expect((container.querySelector('[aria-label="Razão social"]') as HTMLInputElement).value).toBe(
      'Restaurante Exemplo LTDA',
    );
    expect((container.querySelector('[aria-label="CNPJ"]') as HTMLInputElement).value).toBe(
      '11.222.333/0001-81',
    );
  });

  it('normaliza a UF do endereço antes de atualizar o estado', () => {
    const update = vi.fn();
    act(() => root.render(<AddressSettings settings={adminMockSettings} update={update} />));

    const state = container.querySelector('[aria-label="UF"]') as HTMLInputElement;
    act(() => changeValue(state, 'ce'));
    expect(update).toHaveBeenCalledWith('businessState', 'CE');
  });

  it('limita prazos e capacidade dos pedidos às faixas aceitas pelo backend', () => {
    const update = vi.fn();
    act(() => root.render(<OrderFlowSettings settings={adminMockSettings} update={update} />));

    const preparation = container.querySelector(
      '[aria-label="Tempo médio em minutos"]',
    ) as HTMLInputElement;
    const capacity = container.querySelector(
      '[aria-label="Limite de pedidos simultâneos"]',
    ) as HTMLInputElement;
    act(() => {
      changeValue(preparation, '999');
      changeValue(capacity, '900');
    });
    expect(update).toHaveBeenCalledWith('deliveryTime', 240);
    expect(update).toHaveBeenCalledWith('maxConcurrentOrders', 500);
  });
});
