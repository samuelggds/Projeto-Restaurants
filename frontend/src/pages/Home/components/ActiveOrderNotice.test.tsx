import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveOrderNotice as ActiveOrder } from '../domain/activeOrderNotice';
import { ActiveOrderNotice } from './ActiveOrderNotice';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const order: ActiveOrder = {
  id: '114',
  status: 'PRONTO',
  summary: 'Pizza da casa + 2 itens',
  statusLabel: 'Pronto para entrega',
};

describe('ActiveOrderNotice', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderNotice = async (
    overrides: Partial<React.ComponentProps<typeof ActiveOrderNotice>> = {},
  ) => {
    const props = {
      primaryColor: '#972bcc',
      order,
      embedded: true,
      onTrack: vi.fn(),
      onConfirmDelivery: vi.fn(async () => undefined),
      ...overrides,
    };
    await act(async () => root.render(<ActiveOrderNotice {...props} />));
    return props;
  };

  const openNotice = async () => {
    const button = container.querySelector('button')!;
    button.focus();
    await act(async () => button.click());
    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });
    return button;
  };

  it('mantém foco no diálogo e devolve ao pedido ao fechar por Escape', async () => {
    await renderNotice();
    const trigger = await openNotice();
    const close = document.querySelector<HTMLButtonElement>('[aria-label="Fechar aviso"]');

    expect(document.activeElement).toBe(close);
    expect(document.body.style.overflow).toBe('hidden');
    expect(container.textContent).toContain('Pedido em andamento');
    expect(container.textContent).toContain('#114 · Pronto para entrega');
    expect(container.textContent).toContain('Ver meu pedido');
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => document.dispatchEvent(tab));
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);

    await act(async () =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(trigger);
  });

  it.each(['PENDENTE', 'PREPARANDO', 'PRONTO'])(
    'não libera GPS nem recebimento em %s',
    async (status) => {
      const props = await renderNotice({ order: { ...order, status } });
      await openNotice();

      expect(document.querySelector('.track')).toBeNull();
      expect(document.querySelector('.receipt')).toBeNull();
      expect(document.body.textContent).toContain('O rastreamento por GPS será liberado');
      expect(props.onTrack).not.toHaveBeenCalled();
      expect(props.onConfirmDelivery).not.toHaveBeenCalled();
    },
  );

  it('abre o rastreamento do pedido somente quando saiu para entrega', async () => {
    const props = await renderNotice({
      order: { ...order, status: 'SAIU_PARA_ENTREGA', statusLabel: 'Saiu para entrega' },
    });
    await openNotice();
    const track = document.querySelector<HTMLButtonElement>('.track')!;
    expect(track.textContent).toContain('Acompanhar entrega no GPS');
    expect(document.querySelector('.receipt')).toBeNull();

    await act(async () => track.click());
    expect(props.onTrack).toHaveBeenCalledExactlyOnceWith('114');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('mantém o diálogo em uma falha no recebimento e permite tentar novamente', async () => {
    const onConfirmDelivery = vi
      .fn<(orderId: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Não foi possível confirmar agora.'))
      .mockResolvedValueOnce(undefined);
    await renderNotice({
      order: { ...order, status: 'ENTREGUE', statusLabel: 'Entrega realizada' },
      onConfirmDelivery,
    });
    await openNotice();
    expect(document.querySelector('.track')).toBeNull();
    const confirm = document.querySelector<HTMLButtonElement>('.receipt button')!;

    await act(async () => confirm.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      'Não foi possível confirmar agora.',
    );
    expect(confirm.disabled).toBe(false);

    await act(async () => confirm.click());
    expect(onConfirmDelivery).toHaveBeenNthCalledWith(1, '114');
    expect(onConfirmDelivery).toHaveBeenNthCalledWith(2, '114');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('libera a rolagem quando o pedido deixa de existir com o diálogo aberto', async () => {
    await renderNotice();
    await openNotice();
    await renderNotice({ order: null });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(container.textContent).toBe('');
  });
});
