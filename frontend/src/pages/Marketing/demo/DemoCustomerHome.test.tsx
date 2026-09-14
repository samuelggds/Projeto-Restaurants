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
vi.mock('./DemoTableAccountPanel', () => ({ DemoTableAccountPanel: () => null }));
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
    await click('Revisar e continuar');
    return onState;
  }

  it('mostra a recusa da conta e permite pagar o mesmo pedido logo depois', async () => {
    vi.mocked(useDemoHomeData).mockReturnValue({ ...demoHomeData, tableAccount: settings() });
    const onState = await render();
    await click('Adicionar à conta');
    expect(onState).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('pagar este pedido agora'));
    expect(container.textContent).toContain('Como deseja continuar?');

    await click('Escolher forma de pagamento');
    await click('Continuar para pagar');
    expect(onState).toHaveBeenCalledTimes(1);
    expect(onState.mock.calls[0][0].orders[0]).toMatchObject({
      channel: 'TABLE',
      paymentMethod: 'PIX',
      paid: true,
    });
    expect(onState.mock.calls[0][0].cart).toEqual([]);
  });

  it('usa cartão quando é a única forma online disponível', async () => {
    vi.mocked(useDemoHomeData).mockReturnValue({
      ...demoHomeData,
      acceptsPix: false,
      acceptsCard: true,
      tableAccount: settings(),
    });
    const onState = await render();
    await click('Escolher forma de pagamento');
    await click('Continuar para pagar');
    expect(onState.mock.calls[0][0].orders[0]).toMatchObject({ paymentMethod: 'CARD', paid: true });
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
    expect(container.textContent).not.toContain('Escolher forma de pagamento');
    await click('Adicionar à conta');
    expect(onState.mock.calls[0][0].orders[0]).toMatchObject({ channel: 'TABLE', paid: false });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
