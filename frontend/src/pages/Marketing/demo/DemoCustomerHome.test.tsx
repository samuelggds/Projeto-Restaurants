import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';
import { DemoCustomerHome } from './DemoCustomerHome';
import { useDemoHomeData } from './useDemoHomeData';
import { demoHomeData } from './demoCatalog';
import { addDemoCartItem, createInitialDemoState } from './demoDomain';
import { adminMockSettings } from '../../admin/data';

vi.mock('./useDemoHomeData', () => ({ useDemoHomeData: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
vi.mock('../../Home/HomePage', () => ({
  HomePage: ({ onOpenCart }: { onOpenCart: () => void }) => (
    <button onClick={onOpenCart}>Abrir sacola</button>
  ),
}));
vi.mock('./DemoTableAccountPanel', () => ({
  DemoTableAccountPanel: ({ open, onReviewDraft }: { open: boolean; onReviewDraft: () => void }) =>
    open ? <button onClick={onReviewDraft}>Revisar e enviar</button> : null,
}));
vi.mock('./DemoTableActions', () => ({ DemoTableActions: () => null }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('continuação do pedido da mesa na demonstração', () => {
  let container: HTMLDivElement;
  let root: Root;
  const settings = () => ({
    ...adminMockSettings.tableAccount,
    enabled: true,
    allowOnlinePayment: true,
    requirePrepaymentAboveCents: 0,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function click(text: string) {
    const button = [...container.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === text,
    );
    expect(button, text).toBeDefined();
    expect(button?.disabled, text).toBe(false);
    await act(async () => button?.click());
  }

  async function render() {
    const state = addDemoCartItem(createInitialDemoState(), demoHomeData.products[0]);
    const onState = vi.fn();
    await act(async () => {
      root.render(
        <DemoCustomerHome
          state={state}
          onState={onState}
          onLogout={() => undefined}
          ordersPanel={null}
          tableMenu
        />,
      );
    });
    await click('Abrir sacola');
    expect(container.textContent).not.toContain('Revisar e continuar');
    await click('Revisar e enviar');
    await click('Revisar e continuar');
    return onState;
  }

  it('mostra a recusa da conta e permite pagar o mesmo pedido logo depois', async () => {
    vi.mocked(useDemoHomeData).mockReturnValue({ ...demoHomeData, tableAccount: settings() });
    const onState = await render();
    await click('Adicionar à minha comanda');
    expect(onState).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('pagar este pedido agora'));
    expect(container.textContent).toContain('Como deseja finalizar?');

    await click('Pagar agora com Pix');
    expect(onState).toHaveBeenCalledTimes(1);
    expect(onState.mock.calls[0][0].orders[0]).toMatchObject({
      channel: 'TABLE',
      paymentMethod: 'PIX',
      paid: true,
    });
    expect(onState.mock.calls[0][0].cart).toEqual([]);
  });

  it('não oferece cartão online na mesa quando Pix está indisponível', async () => {
    vi.mocked(useDemoHomeData).mockReturnValue({
      ...demoHomeData,
      acceptsPix: false,
      acceptsCard: true,
      tableAccount: settings(),
    });
    const onState = await render();
    expect(container.textContent).toContain('Pix ainda não está disponível neste restaurante.');
    expect(container.textContent).toContain('Quer pagar no cartão?');
    expect(container.textContent).toContain('pagamento presencialmente na maquininha');
    expect(
      [...container.querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === 'Pagar agora com Pix',
      ),
    ).toBe(false);
    expect(onState).not.toHaveBeenCalled();
  });

  it('retira a opção online desativada e ainda permite adicionar à conta sem limite', async () => {
    vi.mocked(useDemoHomeData).mockReturnValue({
      ...demoHomeData,
      tableAccount: {
        ...settings(),
        allowOnlinePayment: false,
        requirePrepaymentAboveCents: null,
      },
    });
    const onState = await render();
    expect(container.textContent).not.toContain('Pagar agora com Pix');
    await click('Adicionar à minha comanda');
    expect(onState.mock.calls[0][0].orders[0]).toMatchObject({ channel: 'TABLE', paid: false });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
