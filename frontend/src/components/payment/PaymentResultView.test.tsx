import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentResultView, type PaymentResultViewProps } from './PaymentResultView';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('PaymentResultView', () => {
  let container: HTMLDivElement;
  let root: Root | null;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function render(props: Partial<PaymentResultViewProps> = {}) {
    await act(async () => {
      root?.render(<PaymentResultView status="PAID" method="Pix" {...props} />);
    });
  }

  async function advance(milliseconds: number) {
    await act(async () => {
      vi.advanceTimersByTime(milliseconds);
    });
  }

  function expectCountdown(seconds: number) {
    const countdown = container.querySelector('[aria-label="Retorno automático"]');
    expect(countdown?.textContent).toMatch(new RegExp(`${seconds}\\s*(?:s\\b|segundo)`));
  }

  it.each(['PAID', 'FAILED', 'CANCELED'] as const)(
    'mostra contagem e retorna uma única vez após cinco segundos no estado %s',
    async (status) => {
      const onAutoReturn = vi.fn();
      await render({ status, onAutoReturn });

      expectCountdown(5);
      for (const seconds of [4, 3, 2, 1]) {
        await advance(1_000);
        expectCountdown(seconds);
        expect(onAutoReturn).not.toHaveBeenCalled();
      }

      await advance(999);
      expect(onAutoReturn).not.toHaveBeenCalled();
      await advance(1);
      expect(onAutoReturn).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      await advance(10_000);
      expect(onAutoReturn).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['PENDING', 'VERIFYING', 'ERROR', 'EXPIRED', 'REFUNDED'] as const)(
    'permanece na tela e não inicia contagem no estado %s',
    async (status) => {
      const onAutoReturn = vi.fn();
      await render({ status, onAutoReturn });

      expect(container.textContent).not.toMatch(/\d+\s*(?:s\b|segundo)/);
      await advance(30_000);
      expect(onAutoReturn).not.toHaveBeenCalled();
    },
  );

  it('não anuncia retorno automático quando nenhuma ação de retorno foi fornecida', async () => {
    await render();

    expect(container.textContent).not.toMatch(/\d+\s*(?:s\b|segundo)/);
    await advance(10_000);
    expect(container.querySelector('h1')?.textContent).toContain('Pix confirmado');
  });

  it('cancela o retorno quando o status deixa de ser elegível', async () => {
    const onAutoReturn = vi.fn();
    await render({ onAutoReturn });
    await advance(2_000);
    await render({ status: 'PENDING', onAutoReturn });
    await advance(10_000);

    expect(onAutoReturn).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(/\d+\s*(?:s\b|segundo)/);
  });

  it('dá cinco segundos completos para um novo resultado terminal', async () => {
    const onAutoReturn = vi.fn();
    await render({ onAutoReturn });
    await advance(2_000);
    await render({ status: 'FAILED', onAutoReturn });

    expectCountdown(5);
    await advance(4_999);
    expect(onAutoReturn).not.toHaveBeenCalled();
    await advance(1);
    expect(onAutoReturn).toHaveBeenCalledTimes(1);
  });

  it('limpa o retorno pendente ao desmontar a tela', async () => {
    const onAutoReturn = vi.fn();
    await render({ onAutoReturn });
    await advance(1_000);
    await act(async () => root?.unmount());
    root = null;
    await advance(10_000);

    expect(onAutoReturn).not.toHaveBeenCalled();
  });

  it('usa o callback mais recente sem reiniciar a contagem a cada renderização', async () => {
    const previousReturn = vi.fn();
    const latestReturn = vi.fn();
    await render({ onAutoReturn: previousReturn });
    await advance(2_000);
    await render({ onAutoReturn: latestReturn });

    expectCountdown(3);
    await advance(2_999);
    expect(previousReturn).not.toHaveBeenCalled();
    expect(latestReturn).not.toHaveBeenCalled();
    await advance(1);
    expect(previousReturn).not.toHaveBeenCalled();
    expect(latestReturn).toHaveBeenCalledTimes(1);
  });

  it('cancela a contagem quando a ação de retorno é removida', async () => {
    const onAutoReturn = vi.fn();
    await render({ onAutoReturn });
    await advance(2_000);
    await render({ onAutoReturn: undefined });
    await advance(10_000);

    expect(onAutoReturn).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(/\d+\s*(?:s\b|segundo)/);
  });

  it('anuncia o novo resultado e move o foco para o título', async () => {
    await render({ status: 'PENDING' });
    await render({ status: 'PAID' });

    const heading = container.querySelector('h1');
    expect(heading?.textContent).toContain('Pix confirmado');
    expect(document.activeElement).toBe(heading);
    expect(container.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
  });

  it('mantém as ações manuais disponíveis antes do retorno automático', async () => {
    const primaryClick = vi.fn();
    const secondaryClick = vi.fn();
    await render({
      onAutoReturn: vi.fn(),
      primaryAction: { label: 'Voltar ao cardápio', onClick: primaryClick },
      secondaryAction: { label: 'Ver pedido', onClick: secondaryClick },
    });

    const buttons = container.querySelectorAll('button');
    await act(async () => buttons[0]?.click());
    await act(async () => buttons[1]?.click());

    expect(primaryClick).toHaveBeenCalledTimes(1);
    expect(secondaryClick).toHaveBeenCalledTimes(1);
  });

  it('distingue o título de confirmação do cartão e do Pix', async () => {
    await render({ method: 'Cartão' });
    expect(container.querySelector('h1')?.textContent).toBe('Pagamento confirmado!');
    await render({ method: 'Pix' });
    expect(container.querySelector('h1')?.textContent).toBe('Pix confirmado!');
  });

  it('usa o ícone da categoria do restaurante no cabeçalho', async () => {
    await render({ restaurantCategory: 'PIZZARIA' });

    const categoryIcon = container.querySelector('[data-category-icon="PIZZARIA"]');
    expect(categoryIcon).not.toBeNull();
  });
});
