import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import tablesService from '../../../Services/tablesService';
import { PremiumTableFeatureGate } from './PremiumTableFeatureGate';

vi.mock('../../../Services/tablesService', () => ({
  default: {
    listTables: vi.fn(),
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
  it('mantém o sistema de mesas bloqueado quando o backend exige Premium', async () => {
    vi.mocked(tablesService.listTables).mockRejectedValue({
      response: {
        status: 403,
        data: { code: 'PREMIUM_TABLE_PLAN_REQUIRED' },
      },
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

  it('libera o conteúdo quando a API protegida de mesas autoriza o restaurante', async () => {
    vi.mocked(tablesService.listTables).mockResolvedValue([]);

    const { container, root } = renderGate();
    await flush();

    expect(container.textContent).toContain('Conteúdo de mesas liberado');
    expect(container.textContent).not.toContain('Sistema de mesas disponível no Premium');

    cleanup(root, container);
  });

  it('não libera o recurso quando a verificação falha por um erro inesperado', async () => {
    vi.mocked(tablesService.listTables).mockRejectedValue(new Error('Falha de rede'));

    const { container, root } = renderGate();
    await flush();

    expect(container.textContent).toContain(
      'Não foi possível verificar os recursos do plano do restaurante agora.',
    );
    expect(container.textContent).toContain('Tentar novamente');
    expect(container.textContent).not.toContain('Conteúdo de mesas liberado');

    cleanup(root, container);
  });
});
