import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import { PaymentSettings } from './PaymentSettings';
import type { PaymentConnectionOverview } from '../../../Services/paymentConnectionService';

vi.mock('./PaymentTerminalSettings', () => ({ PaymentTerminalSettings: () => null }));

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
    expect(container.textContent).toContain(
      'Há etapas pendentes: vincule a conta Mercado Pago para liberar o Pix.',
    );
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
    act(() =>
      changeValue(container.querySelector('input[type="date"]') as HTMLInputElement, '1990-05-10'),
    );
    await act(async () => connect.click());
    expect(onboard).toHaveBeenCalledWith({
      cpf: '52998224725',
      restaurantName: 'Restaurante Teste',
      pixKey: 'financeiro@restaurante.test',
      incomeValue: 25000.5,
      birthDate: '1990-05-10',
    });
    expect(update).not.toHaveBeenCalledWith('asaasAccessTokenConfigured', true);
  });

  it('não exige chave Pix manual quando a conta conectada gera o QR Code', () => {
    act(() =>
      root.render(
        <PaymentSettings
          settings={{
            ...adminMockSettings,
            acceptsPix: true,
            acceptsCard: false,
            pixProvider: 'PAGBANK',
            pixKey: '',
            pagbankTokenConfigured: true,
          }}
          update={() => undefined}
        />,
      ),
    );
    expect(container.textContent).toContain('Configuração completa');
    expect(container.textContent).toContain(
      'O QR Code é gerado automaticamente pela conta conectada',
    );
  });

  it('mantém cadastro Asaas pendente até a aprovação e permite conferir a atualização', async () => {
    const pending: PaymentConnectionOverview = {
      connections: [
        {
          provider: 'ASAAS',
          connected: true,
          canConnect: true,
          readyForPix: false,
          readyForCard: false,
          status: 'PENDING_APPROVAL',
          message: 'Conclua os documentos solicitados pelo Asaas.',
          onboardingUrl: 'https://www.asaas.com/onboarding/exemplo',
        },
      ],
    };
    const load = vi
      .fn()
      .mockResolvedValueOnce(pending)
      .mockResolvedValue({
        connections: [
          {
            ...pending.connections[0],
            status: 'CONNECTED',
            readyForPix: true,
            readyForCard: true,
            message: 'Conta aprovada e confirmação configurada.',
            onboardingUrl: null,
          },
        ],
      });
    act(() =>
      root.render(
        <PaymentSettings
          settings={{
            ...adminMockSettings,
            acceptsPix: true,
            acceptsCard: true,
            pixProvider: 'ASAAS',
            cardGateway: 'ASAAS',
            asaasAccessTokenConfigured: true,
          }}
          update={() => undefined}
          onLoadPaymentConnections={load}
        />,
      ),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
    expect(container.textContent).toContain('Cadastro em análise');
    expect(container.textContent).not.toContain('Configuração completa');
    expect(container.querySelector('a')?.href).toBe('https://www.asaas.com/onboarding/exemplo');
    const refresh = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Verificar conexões'),
    )!;
    await act(async () => refresh.click());
    expect(container.textContent).toContain('Configuração completa');
    expect(container.querySelector('a')).toBeNull();
  });

  it('não anuncia conexão pronta nem libera autorização quando a consulta falha', async () => {
    const load = vi.fn().mockRejectedValue(new Error('Falha de rede'));
    act(() =>
      root.render(
        <PaymentSettings
          settings={{
            ...adminMockSettings,
            acceptsPix: true,
            acceptsCard: false,
            pixProvider: 'PAGBANK',
            pagbankTokenConfigured: true,
          }}
          update={() => undefined}
          onLoadPaymentConnections={load}
        />,
      ),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
    expect(container.textContent).not.toContain('Configuração completa');
    expect(container.textContent).toContain('Não foi possível verificar as conexões');
    const connect = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Conectar PagBank',
    )!;
    expect(connect.disabled).toBe(true);
  });

  it('bloqueia cliques duplicados enquanto salva e inicia a autorização', async () => {
    let finish!: () => void;
    const connect = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    act(() =>
      root.render(
        <PaymentSettings
          settings={{
            ...adminMockSettings,
            acceptsPix: true,
            acceptsCard: false,
            pixProvider: 'PAGBANK',
            pagbankTokenConfigured: false,
          }}
          update={() => undefined}
          onConnectPagBank={connect}
        />,
      ),
    );
    const button = Array.from(container.querySelectorAll('button')).find(
      (item) => item.textContent === 'Conectar PagBank',
    )!;
    act(() => {
      button.click();
      button.click();
    });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    expect((container.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
    await act(async () => finish());
    expect(button.disabled).toBe(false);
  });
});


  it('permite desconectar Mercado Pago somente quando a conta está vinculada', async () => {
    const disconnect = vi.fn().mockResolvedValue(true);
    act(() =>
      root.render(
        <PaymentSettings
          settings={{
            ...adminMockSettings,
            acceptsPix: true,
            acceptsCard: true,
            pixProvider: 'MERCADO_PAGO',
            cardGateway: 'MERCADO_PAGO',
            mercadoPagoAccessTokenConfigured: true,
          }}
          update={() => undefined}
          onDisconnectMercadoPago={disconnect}
        />,
      ),
    );

    const button = Array.from(container.querySelectorAll('button')).find(
      (item) => item.textContent === 'Desconectar Mercado Pago',
    ) as HTMLButtonElement | undefined;
    expect(button).toBeTruthy();

    await act(async () => button?.click());
    expect(disconnect).toHaveBeenCalledTimes(1);

    act(() =>
      root.render(
        <PaymentSettings
          settings={{
            ...adminMockSettings,
            acceptsPix: true,
            acceptsCard: true,
            pixProvider: 'MERCADO_PAGO',
            cardGateway: 'MERCADO_PAGO',
            mercadoPagoAccessTokenConfigured: false,
          }}
          update={() => undefined}
          onDisconnectMercadoPago={disconnect}
        />,
      ),
    );

    expect(container.textContent).not.toContain('Desconectar Mercado Pago');
  });
