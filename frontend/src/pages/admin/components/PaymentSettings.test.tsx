import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import { PaymentSettings } from './PaymentSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function changeValue(element: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
    element,
    value,
  );
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('PaymentSettings', () => {
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

  it('controla os meios aceitos e desabilita configurações indisponíveis', () => {
    const update = vi.fn();
    act(() =>
      root.render(
        <PaymentSettings
          settings={{ ...adminMockSettings, acceptsPix: false, acceptsCard: false }}
          update={update}
        />,
      ),
    );

    const pixToggle = container.querySelector(
      '[aria-label="Aceitar pagamentos por Pix"]',
    ) as HTMLInputElement;
    const cardToggle = container.querySelector(
      '[aria-label="Aceitar pagamentos com cartão"]',
    ) as HTMLInputElement;
    expect(pixToggle.checked).toBe(false);
    expect(cardToggle.checked).toBe(false);
    expect(Array.from(container.querySelectorAll('select')).every((field) => field.disabled)).toBe(
      true,
    );

    act(() => pixToggle.click());
    expect(update).toHaveBeenCalledWith('acceptsPix', true);
  });

  it('diferencia método ativo de conta vinculada no resumo', () => {
    act(() =>
      root.render(
        <PaymentSettings
          settings={{
            ...adminMockSettings,
            acceptsPix: true,
            acceptsCard: true,
            pixProvider: 'MERCADO_PAGO',
            cardGateway: 'MERCADO_PAGO',
            pixKey: '',
            mercadoPagoAccessTokenConfigured: false,
          }}
          update={() => undefined}
        />,
      ),
    );

    expect(container.textContent).toContain('2meios ativos');
    expect(container.textContent).toContain('0/1contas vinculadas');
    expect(container.textContent).toContain('Há etapas pendentes');
    expect(container.textContent).toContain('Conta não vinculada');
  });

  it('valida CPF ou CNPJ antes de criar a subconta Asaas', async () => {
    const update = vi.fn();
    const onboard = vi.fn().mockResolvedValue(undefined);
    act(() =>
      root.render(
        <PaymentSettings
          settings={{
            ...adminMockSettings,
            restaurantName: 'Restaurante Teste',
            acceptsPix: true,
            acceptsCard: false,
            pixProvider: 'ASAAS',
            pixKey: 'financeiro@restaurante.test',
            asaasAccessTokenConfigured: false,
          }}
          update={update}
          onOnboardAsaas={onboard}
        />,
      ),
    );

    const documentInput = container.querySelector(
      'input[placeholder="Somente números"]',
    ) as HTMLInputElement;
    const incomeInput = container.querySelector(
      'input[placeholder="Ex.: 25000"]',
    ) as HTMLInputElement;
    const connect = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Criar e vincular conta Asaas'),
    ) as HTMLButtonElement;

    act(() => changeValue(documentInput, '11111111111'));
    await act(async () => connect.click());
    expect(onboard).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Informe um CPF ou CNPJ válido');

    act(() => changeValue(documentInput, '52998224725'));
    await act(async () => connect.click());
    expect(onboard).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Informe um faturamento mensal maior que zero');

    act(() => changeValue(incomeInput, '25.000,50'));
    await act(async () => connect.click());
    expect(onboard).toHaveBeenCalledWith({
      cpf: '52998224725',
      restaurantName: 'Restaurante Teste',
      pixKey: 'financeiro@restaurante.test',
      incomeValue: 25000.5,
    });
    expect(update).toHaveBeenCalledWith('asaasAccessTokenConfigured', true);
  });
});
