import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConfiguration: vi.fn(),
  updateSettings: vi.fn(),
  issueCredential: vi.fn(),
  revokeCredential: vi.fn(),
  printTest: vi.fn(),
  listJobs: vi.fn(),
  retryJob: vi.fn(),
}));

vi.mock('../../../Services/kitchenPrintingService', () => ({
  default: mocks,
}));

import { KitchenPrintingSettings } from './KitchenPrintingSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialConfiguration = {
  settings: {
    enabled: false,
    autoPrintEnabled: false,
    autoPrintTrigger: 'NEW_ORDER' as const,
    paperWidth: 'MM80' as const,
    copies: 1,
  },
  agent: null,
  queue: { PENDING: 2 },
  onlineWindowSeconds: 90,
};

async function flush() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 1));
  });
}

describe('configuração da impressora da cozinha', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfiguration.mockResolvedValue(initialConfiguration);
    mocks.updateSettings.mockImplementation(async (settings) => {
      mocks.getConfiguration.mockResolvedValue({ ...initialConfiguration, settings });
      return settings;
    });
    mocks.issueCredential.mockResolvedValue({
      device: { publicId: '735ba097-8f74-450c-b836-e52a14f60df5', name: 'Cozinha' },
      credential: 'pa_735ba097-8f74-450c-b836-e52a14f60df5.segredo-unico',
      shownOnce: true,
    });
    mocks.listJobs.mockResolvedValue([]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('mantém o recurso opcional e salva somente a configuração privada escolhida', async () => {
    await act(async () => root.render(<KitchenPrintingSettings />));
    await flush();

    expect(container.textContent).toContain('Impressão desativada');
    const enabled = container.querySelector(
      '[aria-label="Usar impressora da cozinha"] input',
    ) as HTMLInputElement;
    act(() => enabled.click());
    await flush();

    const automatic = container.querySelector(
      '[aria-label="Ativar impressão automática"] input',
    ) as HTMLInputElement;
    act(() => automatic.click());
    await flush();

    const paymentTrigger = container.querySelector(
      'input[value="PAYMENT_CONFIRMED"]',
    ) as HTMLInputElement;
    act(() => paymentTrigger.click());

    const save = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Salvar configuração'),
    ) as HTMLButtonElement;
    await act(async () => save.click());

    expect(mocks.updateSettings).toHaveBeenCalledWith({
      enabled: true,
      autoPrintEnabled: true,
      autoPrintTrigger: 'PAYMENT_CONFIRMED',
      paperWidth: 'MM80',
      copies: 1,
    });
    expect(container.textContent).toContain('Configuração de impressão salva com segurança.');
    expect(container.textContent).toContain('pagamento na entrega e contas de mesa');
  });

  it('exibe a credencial apenas depois da emissão e explica que ela aparece uma vez', async () => {
    await act(async () => root.render(<KitchenPrintingSettings />));
    await flush();

    expect(container.querySelector('[aria-label="Credencial do Print Agent"]')).toBeNull();
    expect(container.textContent).toContain('Conclua os passos anteriores');

    const enabled = container.querySelector(
      '[aria-label="Usar impressora da cozinha"] input',
    ) as HTMLInputElement;
    act(() => enabled.click());
    await flush();

    const save = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Salvar configuração'),
    ) as HTMLButtonElement;
    await act(async () => save.click());
    await flush();

    const issue = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Gerar chave'),
    ) as HTMLButtonElement;
    await act(async () => issue.click());

    expect(mocks.issueCredential).toHaveBeenCalledWith({
      name: 'Agente principal da cozinha',
    });
    const secret = container.querySelector(
      '[aria-label="Credencial do Print Agent"]',
    ) as HTMLInputElement;
    expect(secret.value).toContain('segredo-unico');
    expect(container.textContent).toContain('o servidor armazena somente o hash');
  });
});
