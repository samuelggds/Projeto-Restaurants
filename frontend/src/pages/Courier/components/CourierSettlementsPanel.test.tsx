import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  confirm: vi.fn(),
  dispute: vi.fn(),
  confirmDialog: vi.fn(),
}));

vi.mock('../../../Services/courierCompensationService', () => ({
  default: {
    listCourierSettlements: mocks.list,
    confirmSettlement: mocks.confirm,
    disputeSettlement: mocks.dispute,
  },
}));

vi.mock('../../../components/AppDialog/context', () => ({
  useAppDialog: () => ({ confirmDialog: mocks.confirmDialog }),
}));

import CourierSettlementsPanel from './CourierSettlementsPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const settlement = {
  publicId: '11111111-1111-4111-8111-111111111111',
  status: 'AWAITING_COURIER_CONFIRMATION' as const,
  grossCourierEarnings: 100,
  cashCollectedAmount: 40,
  netAmount: 60,
  direction: 'RESTAURANT_PAYS_COURIER' as const,
  createdAt: '2026-09-01T12:00:00.000Z',
  courier: { id: 31, name: 'João', email: 'joao@example.com' },
  items: [{ orderId: 91 }, { orderId: 92 }],
};

async function flush() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 1));
  });
}

function click(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!button) throw new Error(`Botão não encontrado: ${text}`);
  button.click();
}

describe('CourierSettlementsPanel', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([settlement]);
    mocks.confirm.mockResolvedValue({ ...settlement, status: 'CONFIRMED' });
    mocks.dispute.mockResolvedValue({ ...settlement, status: 'DISPUTED' });
    mocks.confirmDialog.mockResolvedValue(true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('mostra pagamento aguardando e exige confirmação antes de confirmar recebimento', async () => {
    await act(async () => root.render(<CourierSettlementsPanel />));
    await flush();

    expect(container.textContent).toContain('AGUARDANDO SUA CONFIRMAÇÃO');
    expect(container.textContent?.replaceAll('\u00a0', ' ')).toContain('R$ 60,00');

    await act(async () => click(container, 'Confirmar'));
    await flush();

    expect(mocks.confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ confirmLabel: 'Confirmar recebimento' }),
    );
    expect(mocks.confirm).toHaveBeenCalledWith(settlement.publicId);
  });

  it('permite informar não recebimento com motivo validado', async () => {
    await act(async () => root.render(<CourierSettlementsPanel />));
    await flush();

    await act(async () => click(container, 'Informar divergência'));
    const textarea = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Motivo da divergência"]',
    );
    expect(textarea).toBeTruthy();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(textarea, 'Pagamento não entrou na conta');
      textarea?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => click(container, 'Enviar divergência'));
    await flush();

    expect(mocks.dispute).toHaveBeenCalledWith(
      settlement.publicId,
      'Pagamento não entrou na conta',
    );
  });
});
