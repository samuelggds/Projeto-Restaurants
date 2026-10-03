import { act } from 'react';
import { createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lookupCep } from '../../../Services/cepService';
import { adminMockSettings } from '../data';
import { AddressSettings } from './AddressSettings';
import { BrandSettings } from './BrandSettings';
import { BusinessSettings } from './BusinessSettings';
import { OrderFlowSettings } from './OrderFlowSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock('../../../Services/cepService', () => ({
  lookupCep: vi.fn(),
}));

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
          restaurantSlug="casa-teste"
          currentPlanCode="GESTAO_TOTAL"
          subscriptionStatus="ATIVA"
          logoInput={createRef<HTMLInputElement>()}
          onLogoChange={() => undefined}
          onCoverChange={() => undefined}
          onEnhanceCover={() => undefined}
          isEnhancingCover={false}
          onBannerImageChange={() => undefined}
          onEnhanceBanner={() => undefined}
          enhancingBannerLocalId={null}
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

  it('mantém /slug em todos os planos e bloqueia domínio e landing conforme o plano', () => {
    const renderBrand = (plan: string, customDomainRequested = false) => {
      const update = vi.fn();
      act(() =>
        root.render(
          <BrandSettings
            settings={{
              ...adminMockSettings,
              restaurantName: 'Casa Teste',
              customDomainRequested,
            }}
            update={update}
            restaurantSlug="casa-teste"
            currentPlanCode={plan}
            subscriptionStatus="ATIVA"
            logoInput={createRef<HTMLInputElement>()}
            onLogoChange={() => undefined}
            onCoverChange={() => undefined}
            onEnhanceCover={() => undefined}
            isEnhancingCover={false}
            onBannerImageChange={() => undefined}
            onEnhanceBanner={() => undefined}
            enhancingBannerLocalId={null}
          />,
        ),
      );
      return update;
    };

    renderBrand('BASICO');
    expect(
      (container.querySelector('[aria-label="Endereço GastroNexa permanente"]') as HTMLInputElement)
        .value,
    ).toContain('/casa-teste');
    const basicCheckboxes = Array.from(
      container.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];
    expect(basicCheckboxes.at(-2)?.disabled).toBe(true);
    expect(basicCheckboxes.at(-1)?.disabled).toBe(true);

    renderBrand('PREMIUM');
    const premiumCheckboxes = Array.from(
      container.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];
    expect(premiumCheckboxes.at(-2)?.disabled).toBe(false);
    expect(premiumCheckboxes.at(-1)?.disabled).toBe(true);

    renderBrand('GESTAO_TOTAL', true);
    const totalCheckboxes = Array.from(
      container.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];
    expect(totalCheckboxes.at(-2)?.disabled).toBe(false);
    expect(totalCheckboxes.at(-1)?.disabled).toBe(false);
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

  it('consulta o CEP completo e preenche rua, bairro, cidade e UF automaticamente', async () => {
    vi.mocked(lookupCep).mockResolvedValueOnce({
      cep: '60170-001',
      address: 'Avenida Beira Mar',
      district: 'Meireles',
      city: 'Fortaleza',
      state: 'CE',
      complement: '',
    });
    const update = vi.fn();
    act(() => root.render(<AddressSettings settings={adminMockSettings} update={update} />));

    const cep = container.querySelector('[aria-label="CEP"]') as HTMLInputElement;
    await act(async () => {
      changeValue(cep, '60170001');
      await Promise.resolve();
    });

    expect(lookupCep).toHaveBeenCalledWith('60170001');
    expect(update).toHaveBeenCalledWith('businessZipCode', '60170-001');
    expect(update).toHaveBeenCalledWith('businessAddress', 'Avenida Beira Mar');
    expect(update).toHaveBeenCalledWith('businessAddressDistrict', 'Meireles');
    expect(update).toHaveBeenCalledWith('businessCity', 'Fortaleza');
    expect(update).toHaveBeenCalledWith('businessState', 'CE');
    expect(container.textContent).toContain('Endereço preenchido automaticamente.');
  });

  it('limita prazos e capacidade dos pedidos às faixas aceitas pelo backend', () => {
    const update = vi.fn();
    act(() => root.render(<OrderFlowSettings settings={adminMockSettings} update={update} />));

    const minimum = container.querySelector(
      '[aria-label="Tempo mínimo de entrega"]',
    ) as HTMLInputElement;
    const maximum = container.querySelector(
      '[aria-label="Tempo máximo de entrega"]',
    ) as HTMLInputElement;
    const capacity = container.querySelector(
      '[aria-label="Limite de pedidos simultâneos"]',
    ) as HTMLInputElement;
    act(() => {
      minimum.focus();
      changeValue(minimum, '999');
      minimum.blur();
      maximum.focus();
      changeValue(maximum, '999');
      maximum.blur();
      capacity.focus();
      changeValue(capacity, '900');
      capacity.blur();
    });
    expect(update).toHaveBeenCalledWith('deliveryTimeMin', 240);
    expect(update).toHaveBeenCalledWith('deliveryTime', 240);
    expect(update).toHaveBeenCalledWith('deliveryTimeMax', 240);
    expect(update).toHaveBeenCalledWith('maxConcurrentOrders', 500);
  });
});
