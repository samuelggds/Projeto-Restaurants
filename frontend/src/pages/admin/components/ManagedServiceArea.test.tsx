import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../../Services/api', () => ({
  default: { get: mocks.get, post: mocks.post },
}));

import ManagedServiceArea from './ManagedServiceArea';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

async function flush() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 1));
  });
}

describe('ManagedServiceArea', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('Premium mostra implantação única sem formulário de atualização contínua', async () => {
    mocks.get.mockResolvedValue({
      data: {
        plan: 'PREMIUM',
        subscriptionStatus: 'ATIVA',
        implementationEligible: true,
        continuousManagementEnabled: false,
        implementation: {
          status: 'EM_IMPLANTACAO',
          productLimit: 150,
        },
        requests: [],
      },
    });

    await act(async () => root.render(<ManagedServiceArea />));
    await flush();

    expect(container.textContent).toContain('Implantação assistida');
    expect(container.textContent).toContain('Até 150 produtos');
    expect(container.textContent).toContain('Seu Premium inclui a implantação inicial');
    expect(container.querySelector('form')).toBeNull();
  });

  it('Gestão Total envia solicitação sem permitir restaurantId no payload', async () => {
    mocks.get.mockResolvedValue({
      data: {
        plan: 'GESTAO_TOTAL',
        subscriptionStatus: 'ATIVA',
        implementationEligible: true,
        continuousManagementEnabled: true,
        implementation: {
          status: 'CONCLUIDA',
          productLimit: null,
        },
        requests: [],
      },
    });
    mocks.post.mockResolvedValue({ data: { id: 'request-1' } });

    await act(async () => root.render(<ManagedServiceArea />));
    await flush();

    expect(container.textContent).toContain('Produtos ilimitados na implantação inicial');

    const inputs = container.querySelectorAll('input');
    const title = inputs[0] as HTMLInputElement;
    const description = container.querySelector('textarea') as HTMLTextAreaElement;
    await act(async () => {
      title.value = 'Atualizar preço das pizzas';
      title.dispatchEvent(new Event('input', { bubbles: true }));
      description.value = 'Atualizar a pizza grande para R$ 59,90 conforme solicitado.';
      description.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await flush();

    expect(mocks.post).toHaveBeenCalledWith(
      '/managed-service/requests',
      expect.objectContaining({
        category: 'PRODUTO',
        title: 'Atualizar preço das pizzas',
      }),
    );
    expect(mocks.post.mock.calls[0]?.[1]).not.toHaveProperty('restaurantId');
  });
});
