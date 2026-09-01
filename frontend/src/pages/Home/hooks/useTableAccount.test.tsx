import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tableAccountService from '../../../Services/tableAccountService';
import { connectTableSessionSocket } from '../../../Services/socketService';
import type { TableAccountSnapshot } from '../domain/tableAccount';
import { useTableAccount } from './useTableAccount';

vi.mock('../../../Services/tableAccountService', () => ({
  default: {
    getCurrent: vi.fn(),
    createPayment: vi.fn(),
    cancelPayment: vi.fn(),
  },
}));

vi.mock('../../../Services/socketService', () => ({
  connectTableSessionSocket: vi.fn(),
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
    activePayment: null,
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

const realtimeNotify = vi.fn();

function RealtimeProbe() {
  const account = useTableAccount({
    enabled: true,
    sessionPublicId: 'session-a',
    sessionToken: 'token-session-a',
    notify: realtimeNotify,
  });
  return <output>{account.snapshot?.payments[0]?.status || 'sem-pagamento'}</output>;
}

describe('useTableAccount isolamento entre sessões', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    realtimeNotify.mockClear();
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
          provider: 'FAKE_TABLE',
          externalId: null,
          checkoutUrl: null,
          paymentCode: null,
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

  it('atualiza pelo socket e avisa uma única vez quando o próprio pagamento é confirmado', async () => {
    let accountUpdated:
      | ((payload?: { paymentPublicId?: string; paymentStatus?: string }) => Promise<void>)
      | undefined;
    const socket = {
      on: vi.fn((event: string, handler: typeof accountUpdated) => {
        if (event === 'table-account:updated') accountUpdated = handler;
      }),
      off: vi.fn(),
    };
    vi.mocked(connectTableSessionSocket).mockReturnValue(socket as never);

    const processing = snapshotFor('session-a');
    processing.summary.processingCents = 1_000;
    processing.summary.remainingCents = 1_000;
    processing.payments = [
      {
        publicId: 'payment-1',
        payerParticipantPublicId: processing.currentParticipantPublicId,
        selectionMode: 'FULL_ACCOUNT',
        status: 'PROCESSING',
        totalCents: 1_000,
        createdAt: '2026-08-26T14:50:00.000Z',
      },
    ];
    const paid = structuredClone(processing);
    paid.summary.processingCents = 0;
    paid.summary.remainingCents = 0;
    paid.summary.netPaidCents = 1_000;
    paid.payments[0].status = 'PAID';
    vi.mocked(tableAccountService.getCurrent)
      .mockResolvedValueOnce(processing)
      .mockResolvedValue(paid);

    await act(async () => root.render(<RealtimeProbe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
    expect(container.textContent).toBe('PROCESSING');
    expect(accountUpdated).toBeTypeOf('function');

    await act(async () => {
      await accountUpdated?.({ paymentPublicId: 'payment-1', paymentStatus: 'PAID' });
    });

    expect(container.textContent).toBe('PAID');
    expect(realtimeNotify).toHaveBeenCalledWith(
      'success',
      'Seu pagamento foi confirmado',
      expect.stringContaining('abatido automaticamente'),
    );

    await act(async () => {
      await accountUpdated?.({ paymentPublicId: 'payment-1', paymentStatus: 'PAID' });
    });
    expect(realtimeNotify).toHaveBeenCalledTimes(1);
  });

  it('não anuncia pagamento confirmado até a leitura canônica do backend confirmar o status', async () => {
    let accountUpdated:
      | ((payload?: { paymentPublicId?: string; paymentStatus?: string }) => Promise<void>)
      | undefined;
    const socket = {
      on: vi.fn((event: string, handler: typeof accountUpdated) => {
        if (event === 'table-account:updated') accountUpdated = handler;
      }),
      off: vi.fn(),
    };
    vi.mocked(connectTableSessionSocket).mockReturnValue(socket as never);

    const processing = snapshotFor('session-a');
    processing.payments = [
      {
        publicId: 'payment-2',
        payerParticipantPublicId: processing.currentParticipantPublicId,
        selectionMode: 'FULL_ACCOUNT',
        status: 'PROCESSING',
        totalCents: 1_000,
        createdAt: '2026-08-26T14:50:00.000Z',
      },
    ];
    const paid = structuredClone(processing);
    paid.payments[0].status = 'PAID';

    vi.mocked(tableAccountService.getCurrent)
      .mockResolvedValueOnce(processing)
      .mockRejectedValueOnce(new Error('rede indisponível'))
      .mockResolvedValue(paid);

    await act(async () => root.render(<RealtimeProbe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));

    await act(async () => {
      await accountUpdated?.({ paymentPublicId: 'payment-2', paymentStatus: 'PAID' });
    });
    expect(realtimeNotify).not.toHaveBeenCalled();

    await act(async () => {
      await accountUpdated?.({ paymentPublicId: 'payment-2', paymentStatus: 'PAID' });
    });
    expect(realtimeNotify).toHaveBeenCalledTimes(1);
    expect(realtimeNotify).toHaveBeenCalledWith(
      'success',
      'Seu pagamento foi confirmado',
      expect.any(String),
    );
  });
});
