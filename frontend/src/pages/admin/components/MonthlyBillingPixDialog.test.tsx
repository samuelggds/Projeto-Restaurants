import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BillingOverview, Invoice } from '../../../Services/monthlyBillingService';
import { MonthlyBillingPixDialog, type MonthlyBillingPix } from './MonthlyBillingPixDialog';

const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  generate: vi.fn(),
  confirmed: vi.fn(),
  close: vi.fn(),
  clipboard: vi.fn(),
}));
vi.mock('../../../Services/monthlyBillingService', () => ({
  default: { getOverview: mocks.overview },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const invoice: Invoice = {
  id: 91,
  month: 9,
  year: 2026,
  monthlyFee: 149.9,
  total: 149.9,
  systemFees: 0,
  status: 'PENDENTE',
  dueDate: '2026-09-12T12:00:00.000Z',
};
const pix: MonthlyBillingPix = {
  invoice,
  qrCode: 'PIX FICTICIO APENAS PARA TESTE',
  expiresAt: '2026-09-12T12:30:00.000Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

describe('prazo e confirmação no diálogo Pix da mensalidade', () => {
  let host: HTMLDivElement;
  let root: Root;
  let mounted: boolean;
  let originalClipboard: PropertyDescriptor | undefined;

  const render = async (payment = pix) => {
    await act(async () =>
      root.render(
        <MonthlyBillingPixDialog
          pix={payment}
          generating={false}
          onClose={mocks.close}
          onGenerate={mocks.generate}
          onConfirmed={mocks.confirmed}
        />,
      ),
    );
  };
  const button = (text: string) =>
    [...host.querySelectorAll('button')].find((element) => element.textContent?.includes(text));
  const qr = () => host.querySelector('[aria-label="QR Code Pix da mensalidade"]');
  const expectHiddenCode = () => {
    expect(qr()).toBeNull();
    expect(host.querySelector('textarea')).toBeNull();
    expect(button('Copiar código Pix')).toBeUndefined();
    expect(button('Gerar novo Pix')).toBeDefined();
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T12:00:00.000Z'));
    mocks.overview.mockResolvedValue({ invoices: [invoice] });
    mocks.clipboard.mockResolvedValue(undefined);
    originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mocks.clipboard },
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    mounted = true;
  });

  afterEach(() => {
    if (mounted) act(() => root.unmount());
    host.remove();
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('informa o prazo real e copia o código válido da fatura', async () => {
    await render();
    expect(host.querySelector('[role="timer"]')?.textContent).toBe('30:00');
    expect(host.textContent).toContain('Ao zerar, o código será ocultado');
    expect(host.textContent).toContain('não altera o vencimento');
    expect(qr()?.querySelector('svg')).not.toBeNull();
    await act(async () => button('Copiar código Pix')!.click());
    expect(mocks.clipboard).toHaveBeenCalledWith(pix.qrCode);
    expect(button('Código copiado')).toBeDefined();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('ao zerar retira o QR e a cópia, renovando somente após a ação do administrador', async () => {
    await render({ ...pix, expiresAt: '2026-09-12T12:00:01.000Z' });
    expect(host.querySelector('[role="timer"]')?.textContent).toBe('00:01');
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expectHiddenCode();
    expect(host.textContent).toContain('Este código Pix expirou');
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.clipboard).not.toHaveBeenCalled();
    await act(async () => button('Gerar novo Pix')!.click());
    expect(mocks.generate).toHaveBeenCalledOnce();
  });

  it.each(['focus', 'pageshow'])(
    'oculta o Pix ao retornar por %s, mesmo sem executar timers',
    async (eventName) => {
      await render();
      vi.setSystemTime(new Date('2026-09-12T12:31:00.000Z'));
      await act(async () => window.dispatchEvent(new Event(eventName)));
      expectHiddenCode();
      expect(mocks.clipboard).not.toHaveBeenCalled();
      expect(mocks.generate).not.toHaveBeenCalled();
    },
  );

  it('reavalia a validade quando uma aba suspensa volta a ficar visível', async () => {
    await render();
    vi.setSystemTime(new Date('2026-09-12T12:31:00.000Z'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expectHiddenCode();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('não copia após a expiração mesmo se o botão ainda estiver desenhado antes do próximo tick', async () => {
    await render();
    vi.setSystemTime(new Date('2026-09-12T12:30:00.000Z'));
    expect(button('Copiar código Pix')).toBeDefined();
    await act(async () => button('Copiar código Pix')!.click());
    expect(mocks.clipboard).not.toHaveBeenCalled();
    expectHiddenCode();
  });

  it.each([undefined, null, 'data-invalida'])(
    'não oferece código sem uma expiração válida (%s)',
    async (expiresAt) => {
      await render({ ...pix, expiresAt });
      expectHiddenCode();
      expect(host.textContent).toContain('A validade deste Pix não pôde ser confirmada');
      expect(mocks.generate).not.toHaveBeenCalled();
    },
  );

  it('reabrir o diálogo conserva a expiração original sem reiniciar os 30 minutos', async () => {
    await render();
    await act(async () => root.render(null));
    vi.setSystemTime(new Date('2026-09-12T12:20:00.000Z'));
    await render();
    expect(host.querySelector('[role="timer"]')?.textContent).toBe('10:00');
    await act(async () => root.render(null));
    vi.setSystemTime(new Date('2026-09-12T12:31:00.000Z'));
    await render();
    expectHiddenCode();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('ignora uma consulta de pagamento que termina depois de fechar o diálogo', async () => {
    const pending = deferred<BillingOverview>();
    mocks.overview.mockReturnValue(pending.promise);
    await render();
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(mocks.overview).toHaveBeenCalledOnce();
    act(() => root.unmount());
    mounted = false;
    await act(async () => pending.resolve({ invoices: [{ ...invoice, status: 'PAGO' }] }));
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    expect(mocks.confirmed).not.toHaveBeenCalled();
    expect(mocks.overview).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('continua consultando o pagamento depois da expiração e avisa ao confirmar a mesma fatura', async () => {
    await render({ ...pix, expiresAt: '2026-09-12T12:00:01.000Z' });
    mocks.overview.mockResolvedValue({ invoices: [{ ...invoice, status: 'PAGO' }] });
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expectHiddenCode();
    expect(mocks.confirmed).toHaveBeenCalledOnce();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('não confirma outra fatura nem sobrepõe consultas lentas', async () => {
    const pending = deferred<BillingOverview>();
    mocks.overview.mockReturnValue(pending.promise);
    await render();
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    expect(mocks.overview).toHaveBeenCalledOnce();
    await act(async () => pending.resolve({ invoices: [{ ...invoice, id: 92, status: 'PAGO' }] }));
    expect(mocks.confirmed).not.toHaveBeenCalled();
  });
});
