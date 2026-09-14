import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BillingRestrictedAdmin from './BillingRestrictedAdmin';

const mocks = vi.hoisted(() => ({
  recovery: vi.fn(),
  logout: vi.fn(),
  load: vi.fn(),
  generate: vi.fn(),
  verify: vi.fn(),
}));
vi.mock('../../../contexts/authContext', () => ({
  useAuth: () => ({ user: { role: 'ADMIN', restaurantId: 7 }, logout: mocks.logout }),
}));
vi.mock('./useBillingRecovery', () => ({ useBillingRecovery: mocks.recovery }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const invoice = {
  id: 91,
  month: 8,
  year: 2026,
  monthlyFee: 249.9,
  total: 249.9,
  systemFees: 0,
  status: 'ATRASADO',
  dueDate: '2026-08-10T12:00:00Z',
};
const pix = {
  invoiceId: 91,
  qrCode: 'PIX FICTICIO DE TESTE',
  qrCodeBase64: 'iVBORw0KGgo=',
  expiresAt: '2026-09-12T12:00:10Z',
};
describe('pagamento no painel restrito', () => {
  let host: HTMLDivElement;
  let root: Root;
  let state: Record<string, unknown>;
  const render = async () => {
    await act(async () => root.render(<BillingRestrictedAdmin />));
  };
  const button = (text: string) =>
    [...host.querySelectorAll('button')].find((element) => element.textContent?.includes(text))!;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
    state = {
      invoices: [invoice],
      invoice,
      planName: 'Premium',
      loading: false,
      loadError: null,
      pix: null,
      generatingPix: false,
      checking: false,
      feedback: null,
      load: mocks.load,
      generatePix: mocks.generate,
      verifyRelease: mocks.verify,
    };
    mocks.recovery.mockImplementation(() => state);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exibe a fatura sem gerar cobrança automaticamente e permite sair', async () => {
    await render();
    expect(host.textContent).toContain('249,90');
    expect(mocks.generate).not.toHaveBeenCalled();
    await act(async () => button('Gerar Pix').click());
    expect(mocks.generate).toHaveBeenCalledOnce();
    await act(async () => button('Sair da conta').click());
    expect(mocks.logout).toHaveBeenCalledOnce();
  });
  it('expõe o código completo para cópia manual quando clipboard falha', async () => {
    const write = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: write },
    });
    state.pix = pix;
    await render();
    await act(async () => button('Copiar código').click());
    expect(write).toHaveBeenCalledWith(pix.qrCode);
    expect(host.querySelector('details')?.open).toBe(true);
    expect(host.querySelector('textarea')?.value).toBe(pix.qrCode);
    expect(host.textContent).toContain('Selecione e copie');
  });
  it('não reutiliza aviso de cópia quando o código da fatura muda', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    state.pix = pix;
    await render();
    await act(async () => button('Copiar código').click());
    expect(button('Código copiado')).toBeTruthy();
    state.pix = { ...pix, invoiceId: 92, qrCode: 'OUTRA FATURA' };
    await render();
    expect(button('Código copiado')).toBeUndefined();
    expect(button('Copiar código')).toBeTruthy();
  });
  it('retira código expirado e oferece geração de outro na mesma fatura', async () => {
    state.pix = pix;
    await render();
    expect(host.querySelector('[aria-label="QR Code Pix da fatura"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(11_000));
    expect(host.querySelector('[aria-label="QR Code Pix da fatura"]')).toBeNull();
    expect(button('Copiar código')).toBeUndefined();
    await act(async () => button('Gerar novo Pix').click());
    expect(mocks.generate).toHaveBeenCalledOnce();
  });
  it('mostra a contagem regressiva real e explica o que acontece ao terminar o prazo', async () => {
    state.pix = pix;
    await render();
    expect(host.querySelector('[role="timer"]')?.textContent).toBe('00:10');
    expect(host.textContent).toContain('Ao zerar, o código será ocultado');
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    expect(host.querySelector('[role="timer"]')?.textContent).toBe('00:06');
    expect(host.querySelector('[aria-label="QR Code Pix da fatura"]')).not.toBeNull();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('oculta o código vencido ao voltar à aba sem aguardar o próximo tick', async () => {
    state.pix = pix;
    await render();
    vi.setSystemTime(new Date('2026-09-12T12:01:00Z'));
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(host.querySelector('[aria-label="QR Code Pix da fatura"]')).toBeNull();
    expect(host.querySelector('textarea')).toBeNull();
    expect(button('Copiar código')).toBeUndefined();
    expect(button('Gerar novo Pix')).toBeDefined();
    expect(host.textContent).toContain('Este código Pix expirou');
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('mantém o resultado da verificação visível sem fatura pendente', async () => {
    state.invoice = null;
    state.feedback = { tone: 'info', message: 'Aguardando a liberação do restaurante.' };
    await render();
    expect(host.textContent).toContain('Aguardando a liberação');
    await act(async () => button('Verificar pagamento').click());
    expect(mocks.verify).toHaveBeenCalledOnce();
  });
  it('permite recarregar a fatura quando a consulta falha', async () => {
    state.loadError = 'Tente consultar novamente.';
    await render();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Tente consultar');
    await act(async () => button('Recarregar fatura').click());
    expect(mocks.load).toHaveBeenCalledOnce();
  });
});
