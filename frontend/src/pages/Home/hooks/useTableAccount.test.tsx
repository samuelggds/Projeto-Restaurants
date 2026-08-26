import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tableAccountService from '../../../Services/tableAccountService';
import type { TableAccountSnapshot } from '../domain/tableAccount';
import { useTableAccount } from './useTableAccount';

vi.mock('../../../Services/tableAccountService', () => ({
  default: {
    getCurrent: vi.fn(),
    createPayment: vi.fn(),
    cancelPayment: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function snapshotFor(sessionPublicId: string): TableAccountSnapshot {
  return {
    contractVersion: 1,
    currentParticipantPublicId: `participant-${sessionPublicId}`,
    capabilities: {
      enabled: true,
      allowCash: false,
      allowCardMachine: false,
      allowOnlinePayment: true,
      allowSplit: true,
      serviceFeeMode: 'DISABLED',
      serviceFeeBasisPoints: 0,
      reservationTimeoutMinutes: 10,
    },
    summary: {
      sessionPublicId,
      tableNumber: 1,
      status: 'OPEN',
      consumedCents: 0,
      serviceFeeCents: 0,
      grossPaidCents: 0,
      refundedCents: 0,
      netPaidCents: 0,
      reservedCents: 0,
      processingCents: 0,
      remainingCents: 0,
      overpaidCents: 0,
      participantsCount: 1,
    },
    participants: [],
    items: [],
    payments: [],
  };
}

function Probe({ enabled, sessionPublicId }: { enabled: boolean; sessionPublicId?: string }) {
  const account = useTableAccount({ enabled, sessionPublicId, notify: vi.fn() });
  return <output>{account.snapshot?.summary.sessionPublicId || 'sem-conta'}</output>;
}

const paymentNotify = vi.fn();

function PaymentProbe() {
  const account = useTableAccount({
    enabled: true,
    sessionPublicId: 'session-a',
    notify: paymentNotify,
  });
  return (
    <button
      type="button"
      onClick={() => void account.createPayment({ selectionMode: 'FULL_ACCOUNT', method: 'PIX' })}
    >
      pagar
    </button>
  );
}

describe('useTableAccount isolamento entre sessões', () => {
  let container: HTMLDivElement;
  let root: Root;

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

  it('descarta resposta atrasada e oculta a conta assim que a sessão muda ou termina', async () => {
    let resolveFirst: ((value: TableAccountSnapshot) => void) | undefined;
    vi.mocked(tableAccountService.getCurrent).mockImplementation((sessionPublicId) => {
      if (sessionPublicId === 'session-a') {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(snapshotFor(sessionPublicId));
    });

    await act(async () => root.render(<Probe enabled sessionPublicId="session-a" />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));

    await act(async () => root.render(<Probe enabled sessionPublicId="session-b" />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
    expect(container.textContent).toBe('session-b');

    await act(async () => resolveFirst?.(snapshotFor('session-a')));
    expect(container.textContent).toBe('session-b');

    await act(async () => root.render(<Probe enabled={false} />));
    expect(container.textContent).toBe('sem-conta');
  });

  it('reutiliza a chave idempotente ao repetir após falha incerta do servidor', async () => {
    vi.mocked(tableAccountService.getCurrent).mockResolvedValue(snapshotFor('session-a'));
    vi.mocked(tableAccountService.createPayment)
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce({
        idempotentReplay: true,
        payment: {
          publicId: 'payment-1',
          sessionPublicId: 'session-a',
          payerParticipantPublicId: 'participant-session-a',
          selectionMode: 'FULL_ACCOUNT',
          method: 'PIX',
          status: 'RESERVED',
          billItemPublicIds: [],
          subtotalCents: 1_000,
          serviceFeeCents: 0,
          totalCents: 1_000,
          provider: 'FAKE',
          externalId: null,
          checkoutUrl: null,
          expiresAt: '2026-08-26T15:00:00.000Z',
          createdAt: '2026-08-26T14:50:00.000Z',
          updatedAt: '2026-08-26T14:50:00.000Z',
        },
      });

    await act(async () => root.render(<PaymentProbe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
    const button = container.querySelector('button');
    expect(button).not.toBeNull();

    await act(async () => {
      button?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    await act(async () => {
      button?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 5));
    });

    expect(tableAccountService.createPayment).toHaveBeenCalledTimes(2);
    const firstKey = vi.mocked(tableAccountService.createPayment).mock.calls[0]?.[2];
    const secondKey = vi.mocked(tableAccountService.createPayment).mock.calls[1]?.[2];
    expect(firstKey).toBeTruthy();
    expect(secondKey).toBe(firstKey);
  });
});
