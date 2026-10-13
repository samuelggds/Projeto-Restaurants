import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PickupPaymentPanel from './PickupPaymentPanel';

const mocks = vi.hoisted(() => ({ list: vi.fn(), start: vi.fn(), reconcile: vi.fn(), cash: vi.fn() }));
vi.mock('../../../Services/paymentTerminalService', () => ({ default: { list: mocks.list } }));
vi.mock('../../../Services/pickupPaymentService', () => ({
  default: { start: mocks.start, reconcile: mocks.reconcile, confirmCash: mocks.cash },
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PickupPaymentPanel compacto', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onPaid: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({ terminals: [], couriers: [] });
    mocks.cash.mockReset();
    mocks.start.mockReset();
    mocks.reconcile.mockReset();
    container = document.createElement('div'); document.body.appendChild(container);
    root = createRoot(container); onPaid = vi.fn();
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  async function render(preferredMethod = 'DINHEIRO') {
    await act(async () => root.render(<PickupPaymentPanel compact orderId={91} total={35.5} preferredMethod={preferredMethod} onPaid={onPaid} />));
  }
  function button(text: string) {
    const element = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.getAttribute('aria-label') === text || item.textContent?.trim() === text);
    if (!element) throw new Error(`Botão ausente: ${text}`);
    return element;
  }

  it('apresenta as três opções sem criar cobranças ao renderizar ou selecionar', async () => {
    await render();
    expect(button('Dinheiro').getAttribute('aria-pressed')).toBe('true');
    expect(button('Pix no balcão')).not.toBeNull();
    expect(button('Cartão na maquininha')).not.toBeNull();
    act(() => button('Pix no balcão').click());
    expect(button('Pix no balcão').getAttribute('aria-pressed')).toBe('true');
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.cash).not.toHaveBeenCalled();
    expect(onPaid).not.toHaveBeenCalled();
  });

  it('não confirma dinheiro quando o servidor rejeita e não transforma erro em pago', async () => {
    mocks.cash.mockRejectedValue(new Error('Recebimento indisponível.'));
    await render();
    await act(async () => button('Confirmar dinheiro recebido').click());
    expect(mocks.cash).toHaveBeenCalledExactlyOnceWith(91);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Pagamento confirmado.');
    expect(onPaid).not.toHaveBeenCalled();
  });

  it('aguarda a resposta de recebimento do backend e bloqueia cliques repetidos', async () => {
    let complete: (() => void) | undefined;
    mocks.cash.mockImplementation(() => new Promise<void>((resolve) => { complete = resolve; }));
    await render();
    await act(async () => button('Confirmar dinheiro recebido').click());
    expect(button('Confirmando...').disabled).toBe(true);
    expect(onPaid).not.toHaveBeenCalled();
    expect(button('Pix no balcão').disabled).toBe(true);
    await act(async () => { complete?.(); });
    expect(onPaid).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Pagamento confirmado.');
    expect(mocks.cash).toHaveBeenCalledTimes(1);
  });

  it('mantém Pix pendente até o servidor confirmar o provedor', async () => {
    mocks.start.mockResolvedValue({ payment: { orderId: 91, method: 'PIX', provider: 'MERCADO_PAGO', status: 'PROCESSING', amount: 35.5 } });
    mocks.reconcile.mockResolvedValue({ paid: false, payment: null });
    await render('PIX');
    await act(async () => button('Gerar Pix no balcão').click());
    expect(mocks.start).toHaveBeenCalledExactlyOnceWith(91, 'PIX', undefined);
    expect(container.textContent).toContain('Aguardando confirmação do Pix.');
    expect(onPaid).not.toHaveBeenCalled();
    await act(async () => button('Atualizar pagamento').click());
    expect(onPaid).not.toHaveBeenCalled();
    mocks.reconcile.mockResolvedValue({ paid: true, payment: null });
    await act(async () => button('Atualizar pagamento').click());
    expect(onPaid).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Pagamento confirmado.');
  });

  it('não envia cobrança para maquininha inexistente', async () => {
    await render('CARTAO');
    expect(button('Enviar para maquininha').disabled).toBe(true);
    expect(container.textContent).toContain('Nenhuma maquininha ativa em modo PDV');
    expect(mocks.start).not.toHaveBeenCalled();
  });
});
