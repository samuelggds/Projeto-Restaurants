import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Invoice } from '../../../Services/monthlyBillingService';
import { useBillingRecovery } from './useBillingRecovery';

const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  subscription: vi.fn(),
  plans: vi.fn(),
  pix: vi.fn(),
  availability: vi.fn(),
  clearBlock: vi.fn(),
}));

vi.mock('../../../Services/monthlyBillingService', () => ({
  default: {
    getOverview: mocks.overview,
    getSubscription: mocks.subscription,
    getPlans: mocks.plans,
    generatePix: mocks.pix,
  },
}));
vi.mock('../../../Services/api', () => ({ default: { get: mocks.availability } }));
vi.mock('../../../Services/systemBlock', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../Services/systemBlock')>()),
  clearSystemBlockState: mocks.clearBlock,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const makeInvoice = (patch: Partial<Invoice> = {}): Invoice => ({
  id: 71,
  month: 8,
  year: 2026,
  monthlyFee: 149.9,
  systemFees: 0,
  total: 149.9,
  status: 'ATRASADO',
  dueDate: '2026-08-01T12:00:00.000Z',
  ...patch,
});
const pixPayload = {
  pixQrCode: '000201-DEMONSTRACAO-FICTICIA',
  pixQrCodeBase64: 'iVBORw0KGgo=',
  pixExpiresAt: '2026-10-01T12:00:00.000Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

describe('recuperação da assinatura bloqueada', () => {
  let host: HTMLDivElement;
  let root: Root;
  let result: ReturnType<typeof useBillingRecovery>;
  let mounted: boolean;
  function Harness({ restaurantId = 12 }: { restaurantId?: number }) {
    result = useBillingRecovery(restaurantId);
    return null;
  }
  const mount = async (restaurantId = 12) => {
    await act(async () => root.render(<Harness restaurantId={restaurantId} />));
    await act(async () => vi.advanceTimersByTimeAsync(0));
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T12:00:00.000Z'));
    mocks.overview.mockResolvedValue({ invoices: [makeInvoice()] });
    mocks.subscription.mockResolvedValue({ plan: 'BASICO' });
    mocks.plans.mockResolvedValue([{ plan: 'BASICO', name: 'Básico' }]);
    mocks.availability.mockResolvedValue({ data: { available: false } });
    mocks.pix.mockResolvedValue(pixPayload);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    mounted = true;
  });

  afterEach(() => {
    if (mounted) act(() => root.unmount());
    host.remove();
    vi.useRealTimers();
  });

  it('mostra a fatura mesmo se plano e assinatura falharem, sem gerar Pix ao abrir', async () => {
    mocks.subscription.mockRejectedValue(new Error('subscription unavailable'));
    mocks.plans.mockRejectedValue(new Error('plans unavailable'));
    await mount();
    expect(result.invoice?.id).toBe(71);
    expect(result.loading).toBe(false);
    expect(result.loadError).toBeNull();
    expect(result.planName).toBe('Plano atual');
    expect(mocks.pix).not.toHaveBeenCalled();
    expect(mocks.clearBlock).not.toHaveBeenCalled();
  });

  it('permite preparar o pagamento enquanto informações opcionais ainda carregam', async () => {
    mocks.plans.mockReturnValue(new Promise(() => {}));
    await mount();
    expect(result.loading).toBe(false);
    await act(async () => result.generatePix());
    expect(mocks.pix).toHaveBeenCalledWith(71);
    expect(result.pix?.invoiceId).toBe(71);
  });

  it('reutiliza Pix válido e descarta o código quando outra fatura passa a bloquear', async () => {
    mocks.overview.mockResolvedValue({ invoices: [makeInvoice(pixPayload)] });
    await mount();
    expect(result.pix).toMatchObject({ invoiceId: 71, qrCode: pixPayload.pixQrCode });
    mocks.overview.mockResolvedValue({ invoices: [makeInvoice({ id: 72 })] });
    await act(async () => result.verifyRelease());
    expect(result.invoice?.id).toBe(72);
    expect(result.pix).toBeNull();
    expect(mocks.pix).not.toHaveBeenCalled();
  });

  it.each([
    { ...pixPayload, pixQrCode: '' },
    { ...pixPayload, pixQrCodeBase64: '<svg>invalid</svg>' },
    { ...pixPayload, pixExpiresAt: 'invalid-date' },
    { ...pixPayload, pixExpiresAt: '2026-08-01T00:00:00.000Z' },
  ])('não oferece Pix incompleto, inválido ou expirado (%j)', async (payload) => {
    mocks.overview.mockResolvedValue({ invoices: [makeInvoice(payload)] });
    mocks.pix.mockResolvedValue(payload);
    await mount();
    expect(result.pix).toBeNull();
    await act(async () => result.generatePix());
    expect(result.pix).toBeNull();
    expect(result.feedback?.tone).toBe('error');
    expect(result.generatingPix).toBe(false);
    expect(mocks.clearBlock).not.toHaveBeenCalled();
  });

  it('não libera ao sumir a fatura; aguarda confirmação canônica do restaurante', async () => {
    await mount();
    mocks.overview.mockResolvedValue({ invoices: [makeInvoice({ status: 'PAGO' })] });
    await act(async () => result.verifyRelease());
    expect(result.invoice).toBeNull();
    expect(result.feedback).toMatchObject({ tone: 'info' });
    expect(result.feedback?.message).toContain('aguardando a liberação');
    expect(mocks.clearBlock).not.toHaveBeenCalled();
    mocks.availability.mockResolvedValue({ data: { available: true } });
    await act(async () => result.verifyRelease());
    expect(mocks.availability).toHaveBeenLastCalledWith('/restaurants/12/availability', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    expect(mocks.clearBlock).toHaveBeenCalledTimes(1);
    expect(result.feedback?.tone).toBe('success');
  });

  it('consulta disponibilidade mesmo na carga inicial sem dívida e mantém o bloqueio em falhas', async () => {
    mocks.overview.mockResolvedValue({ invoices: [] });
    mocks.availability.mockRejectedValue(new Error('network unavailable'));
    await mount();
    expect(mocks.availability).toHaveBeenCalledTimes(1);
    expect(mocks.clearBlock).not.toHaveBeenCalled();
    expect(result.loadError).toContain('Tente novamente');
    mocks.availability.mockResolvedValue({ data: { available: true } });
    await act(async () => result.load());
    expect(mocks.clearBlock).toHaveBeenCalledTimes(1);
    expect(result.loadError).toBeNull();
  });

  it('serializa duplo clique e não sobrepõe verificação durante a geração', async () => {
    const pendingPix = deferred<typeof pixPayload>();
    mocks.pix.mockReturnValue(pendingPix.promise);
    await mount();
    let generation!: Promise<void>;
    await act(async () => {
      generation = result.generatePix();
      void result.generatePix();
      void result.verifyRelease();
    });
    expect(mocks.pix).toHaveBeenCalledTimes(1);
    expect(result.generatingPix).toBe(true);
    expect(mocks.overview).toHaveBeenCalledTimes(1);
    await act(async () => {
      pendingPix.resolve(pixPayload);
      await generation;
    });
    expect(result.generatingPix).toBe(false);
    expect(result.pix?.invoiceId).toBe(71);
    expect(result.invoice?.status).toBe('ATRASADO');
  });

  it('verifica a cada 12 segundos, sem concorrência, e cancela o temporizador ao desmontar', async () => {
    mocks.overview.mockResolvedValue({ invoices: [makeInvoice(pixPayload)] });
    await mount();
    const pendingAvailability = deferred<{ data: { available: boolean } }>();
    mocks.availability.mockReturnValue(pendingAvailability.promise);
    await act(async () => vi.advanceTimersByTimeAsync(12_000));
    expect(mocks.availability).toHaveBeenCalledTimes(1);
    expect(result.checking).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(24_000));
    expect(mocks.availability).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    mounted = false;
    await act(async () => pendingAvailability.resolve({ data: { available: true } }));
    await vi.advanceTimersByTimeAsync(24_000);
    expect(mocks.clearBlock).not.toHaveBeenCalled();
    expect(mocks.availability).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('não reaproveita Pix nem respostas pendentes de outro restaurante', async () => {
    await mount();
    const pendingPix = deferred<typeof pixPayload>();
    mocks.pix.mockReturnValue(pendingPix.promise);
    let generation!: Promise<void>;
    await act(async () => {
      generation = result.generatePix();
    });
    mocks.overview.mockResolvedValue({ invoices: [makeInvoice({ id: 83 })] });
    await mount(13);
    await act(async () => {
      pendingPix.resolve(pixPayload);
      await generation;
    });
    expect(result.invoice?.id).toBe(83);
    expect(result.pix).toBeNull();
    expect(result.generatingPix).toBe(false);
    expect(mocks.clearBlock).not.toHaveBeenCalled();
  });

  it('permite recuperar uma falha de carga sem mostrar o erro técnico', async () => {
    mocks.overview.mockRejectedValueOnce(new Error('prisma secret detail'));
    await mount();
    expect(result.loadError).toContain('Tente novamente');
    expect(result.loadError).not.toContain('prisma');
    await act(async () => result.load());
    expect(result.loadError).toBeNull();
    expect(result.invoice?.id).toBe(71);
  });
});
