import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import monthlyBillingService from '../../../Services/monthlyBillingService';
import { PremiumTableFeatureGate } from './PremiumTableFeatureGate';

vi.mock('../../../Services/monthlyBillingService', () => ({
  default: {
    getSubscription: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function renderGate() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      createElement(
        PremiumTableFeatureGate,
        null,
        createElement('div', { 'data-testid': 'premium-content' }, 'Conteúdo de mesas liberado'),
      ),
    );
  });

  return { container, root };
}

function cleanup(root: Root, container: HTMLElement) {
  act(() => root.unmount());
  container.remove();
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('PremiumTableFeatureGate', () => {
  it('mantém o sistema de mesas bloqueado no plano Básico', async () => {
    vi.mocked(monthlyBillingService.getSubscription).mockResolvedValue({
      id: 1,
      plan: 'BASICO',
      status: 'ATIVA',
    });

    const { container, root } = renderGate();
    await flush();

    expect(container.textContent).toContain('Sistema de mesas disponível no Premium');
    expect(container.textContent).toContain('Seu plano Básico continua com o sistema de delivery');
    expect(container.textContent).toContain('Mesas e QR Codes seguros');
    expect(container.textContent).toContain('Conta, divisão e pagamento da mesa');
    expect(container.textContent).not.toContain('Conteúdo de mesas liberado');

    cleanup(root, container);
  });

  it('libera o conteúdo de mesas no plano Premium ativo', async () => {
    vi.mocked(monthlyBillingService.getSubscription).mockResolvedValue({
      id: 2,
      plan: 'PREMIUM',
      status: 'ATIVA',
    });

    const { container, root } = renderGate();
    await flush();

    expect(container.textContent).toContain('Conteúdo de mesas liberado');
    expect(container.textContent).not.toContain('Sistema de mesas disponível no Premium');

    cleanup(root, container);
  });

  it('não libera Premium cancelado ou expirado', async () => {
    vi.mocked(monthlyBillingService.getSubscription).mockResolvedValue({
      id: 3,
      plan: 'PREMIUM',
      status: 'EXPIRADA',
    });

    const { container, root } = renderGate();
    await flush();

    expect(container.textContent).toContain('Sistema de mesas disponível no Premium');
    expect(container.textContent).not.toContain('Conteúdo de mesas liberado');

    cleanup(root, container);
  });
});
