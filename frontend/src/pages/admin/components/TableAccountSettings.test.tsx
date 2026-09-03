import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import tableAccountService from '../../../Services/tableAccountService';
import { adminMockSettings } from '../data';
import { TableAccountSettings } from './TableAccountSettings';

vi.mock('../../../Services/tableAccountService', () => ({
  default: {
    listAdminSessions: vi.fn(),
    getAdminSnapshot: vi.fn(),
    confirmManualPayment: vi.fn(),
    refundPayment: vi.fn(),
    forceCloseSession: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const session = {
  tableSessionId: 41,
  sessionPublicId: 'session-public-41',
  tableNumber: 1,
  openedAt: '2026-08-30T10:00:00.000Z',
  status: 'OPEN',
  openedByName: 'Garçom',
  itemsCount: 0,
  summary: {
    consumedCents: 0,
    grossPaidCents: 0,
    remainingCents: 0,
    participantsCount: 2,
  },
};

const accountDetail = {
  items: [],
  paymentIntents: [
    {
      publicId: 'payment-cash',
      method: 'CASH',
      status: 'RESERVED',
      totalCents: 5_000,
      serviceFeeCents: 0,
      payerParticipantPublicId: 'participant-1',
    },
    {
      publicId: 'payment-paid',
      method: 'PIX',
      status: 'PAID',
      totalCents: 3_000,
      serviceFeeCents: 0,
      payerParticipantPublicId: 'participant-2',
    },
  ],
};

describe('TableAccountSettings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
    vi.mocked(tableAccountService.listAdminSessions).mockResolvedValue({ sessions: [session] });
    vi.mocked(tableAccountService.getAdminSnapshot).mockResolvedValue(accountDetail);
    vi.mocked(tableAccountService.confirmManualPayment).mockResolvedValue({});
    vi.mocked(tableAccountService.refundPayment).mockResolvedValue({});
    vi.mocked(tableAccountService.forceCloseSession).mockResolvedValue({});
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function renderAndOpenPayments() {
    await act(async () => {
      root.render(
        <AppDialogProvider>
          <TableAccountSettings settings={adminMockSettings} update={vi.fn()} />
        </AppDialogProvider>,
      );
      await Promise.resolve();
    });

    const detailsButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Ver detalhes',
    );
    await act(async () => {
      detailsButton?.click();
      await Promise.resolve();
    });
  }

  it('solicita o motivo do fechamento em um diálogo interno do sistema', async () => {
    await act(async () => {
      root.render(
        <AppDialogProvider>
          <TableAccountSettings settings={adminMockSettings} update={vi.fn()} />
        </AppDialogProvider>,
      );
      await Promise.resolve();
    });

    const forceCloseButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Fechamento administrativo',
    );
    expect(forceCloseButton).toBeDefined();

    await act(async () => forceCloseButton?.click());

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Fechar a Mesa 1?');
    expect(dialog?.textContent).toContain('O motivo ficará registrado na auditoria.');
    expect(dialog?.textContent).toContain('Manter aberta');
    expect(dialog?.textContent).toContain('Fechar mesa');
  });

  it('confirma recebimento presencial somente após decisão explícita', async () => {
    await renderAndOpenPayments();

    const openConfirmation = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Confirmar recebimento',
    ) as HTMLButtonElement;
    await act(async () => openConfirmation.click());

    let dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Mesa 01');
    expect(dialog.textContent?.replace(/\u00a0/g, ' ')).toContain('R$ 50,00 em dinheiro');
    await act(async () => {
      (dialog.querySelector('.cancel') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    expect(tableAccountService.confirmManualPayment).not.toHaveBeenCalled();

    await act(async () => openConfirmation.click());
    dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    await act(async () => {
      (dialog.querySelector('.confirm') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    expect(tableAccountService.confirmManualPayment).toHaveBeenCalledOnce();
    expect(tableAccountService.confirmManualPayment).toHaveBeenCalledWith('payment-cash');
  });

  it('coleta um motivo auditável antes de registrar o estorno', async () => {
    await renderAndOpenPayments();

    const refundButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Estornar',
    ) as HTMLButtonElement;
    await act(async () => refundButton.click());

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Estornar pagamento da Mesa 01?');
    const input = dialog.querySelector('input') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
        input,
        'Cobrança duplicada',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      (dialog.querySelector('.danger') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    expect(tableAccountService.refundPayment).toHaveBeenCalledOnce();
    expect(tableAccountService.refundPayment).toHaveBeenCalledWith(
      'payment-paid',
      'Cobrança duplicada',
    );
  });
});
