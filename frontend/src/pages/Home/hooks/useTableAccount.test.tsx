import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tableAccountService from '../../../Services/tableAccountService';
import { connectTableSessionSocket } from '../../../Services/socketService';
import type { TableAccountSnapshot, TablePaymentIntent } from '../domain/tableAccount';
import { useTableAccount } from './useTableAccount';

vi.mock('../../../Services/tableAccountService', () => ({
  default: {
    getCurrent: vi.fn(),
    createPayment: vi.fn(),
    cancelPayment: vi.fn(),
    reconcilePayment: vi.fn(),
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
      allowPix: true,
      allowCard: true,
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function paymentFor(sessionPublicId: string): TablePaymentIntent {
  return {
    publicId: `payment-${sessionPublicId}`,
    sessionPublicId,
    payerParticipantPublicId: `participant-${sessionPublicId}`,
    selectionMode: 'MY_ITEMS',
    method: 'PIX',
    status: 'PROCESSING',
    billItemPublicIds: [],
    subtotalCents: 1_000,
    serviceFeeCents: 0,
    totalCents: 1_000,
    provider: 'FAKE_TABLE',
    externalId: null,
    checkoutUrl: null,
    paymentCode: null,
    expiresAt: '2026-09-26T15:00:00.000Z',
    createdAt: '2026-09-26T14:50:00.000Z',
    updatedAt: '2026-09-26T14:50:00.000Z',
  };
}

type Account = ReturnType<typeof useTableAccount>;
let currentAccount: Account;
function AccountProbe({
  sessionPublicId = 'session-a',
  sessionToken = 'token-a',
}: {
  sessionPublicId?: string;
  sessionToken?: string;
}) {
  const account = useTableAccount({
    enabled: true,
    sessionPublicId,
    sessionToken,
    notify: realtimeNotify,
  });
  useEffect(() => {
    currentAccount = account;
  });
  return <output>{account.snapshot?.summary.sessionPublicId || 'sem-conta'}</output>;
}

type AccountUpdated = (payload?: {
  paymentPublicId?: string;
  paymentStatus?: string;
}) => Promise<void>;

function mockSocket() {
  let handler!: AccountUpdated;
  vi.mocked(connectTableSessionSocket).mockReturnValue({
    on: vi.fn((_event: string, callback: AccountUpdated) => {
      handler = callback;
    }),
    off: vi.fn(),
  } as never);
  return () => handler;
}

describe('useTableAccount isolamento entre sessões', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    realtimeNotify.mockClear();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
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

  it('pausa os ticks em aba oculta e atualiza ao voltar sem sobrepor o polling', async () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.mocked(tableAccountService.getCurrent).mockResolvedValue(snapshotFor('session-a'));
    await act(async () => root.render(<AccountProbe />));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(tableAccountService.getCurrent).toHaveBeenCalledTimes(1);

    hidden.mockReturnValue(true);
    await act(async () => vi.advanceTimersByTimeAsync(45_000));
    expect(tableAccountService.getCurrent).toHaveBeenCalledTimes(1);

    const pending = deferred<TableAccountSnapshot>();
    vi.mocked(tableAccountService.getCurrent).mockReturnValueOnce(pending.promise);
    hidden.mockReturnValue(false);
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(tableAccountService.getCurrent).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(snapshotFor('session-a')));
  });

  it('agrupa eventos durante leitura e busca novamente para não perder confirmação posterior', async () => {
    vi.useFakeTimers();
    const socketHandler = mockSocket();
    const pending = deferred<TableAccountSnapshot>();
    const initial = snapshotFor('session-a');
    const paid = snapshotFor('session-a');
    paid.payments = [{ ...paymentFor('session-a'), status: 'PAID' }];
    vi.mocked(tableAccountService.getCurrent)
      .mockResolvedValueOnce(initial)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(paid);
    await act(async () => root.render(<AccountProbe />));
    await act(async () => vi.advanceTimersByTimeAsync(0));

    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = socketHandler()();
      second = socketHandler()({ paymentPublicId: 'payment-session-a', paymentStatus: 'PAID' });
    });
    expect(tableAccountService.getCurrent).toHaveBeenCalledTimes(2);
    await act(async () => {
      pending.resolve(initial);
      await Promise.all([first, second]);
    });
    expect(tableAccountService.getCurrent).toHaveBeenCalledTimes(3);
    expect(currentAccount.snapshot?.payments[0]?.status).toBe('PAID');
    expect(realtimeNotify).toHaveBeenCalledTimes(1);
  });

  it('refresh explícito depois de mutação não reutiliza snapshot anterior à cobrança', async () => {
    vi.useFakeTimers();
    const initial = deferred<TableAccountSnapshot>();
    const updated = snapshotFor('session-a');
    updated.summary.processingCents = 1_000;
    vi.mocked(tableAccountService.getCurrent)
      .mockReturnValueOnce(initial.promise)
      .mockResolvedValue(updated);
    vi.mocked(tableAccountService.createPayment).mockResolvedValue({
      payment: paymentFor('session-a'),
      idempotentReplay: false,
    });
    await act(async () => root.render(<AccountProbe />));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    await act(async () => {
      const result = await currentAccount.createPayment({
        selectionMode: 'MY_ITEMS',
        method: 'PIX',
      });
      expect(result?.payment.publicId).toBe('payment-session-a');
    });
    expect(tableAccountService.getCurrent).toHaveBeenCalledTimes(2);
    await act(async () => initial.resolve(snapshotFor('session-a')));
    expect(currentAccount.snapshot?.summary.processingCents).toBe(1_000);
  });

  it.each(['create', 'cancel', 'reconcile'] as const)(
    'descarta sucesso e erro de %s ao trocar sessão, sem refresh ou aviso da conta anterior',
    async (operation) => {
      vi.useFakeTimers();
      vi.mocked(tableAccountService.getCurrent).mockImplementation(async (id) => snapshotFor(id));
      for (const rejects of [false, true]) {
        const pending = deferred<never>();
        const service =
          operation === 'create'
            ? tableAccountService.createPayment
            : operation === 'cancel'
              ? tableAccountService.cancelPayment
              : tableAccountService.reconcilePayment;
        vi.mocked(service).mockReturnValueOnce(pending.promise);
        await act(async () => root.render(<AccountProbe />));
        await act(async () => vi.advanceTimersByTimeAsync(0));
        let result!: Promise<unknown>;
        await act(async () => {
          result =
            operation === 'create'
              ? currentAccount.createPayment({ selectionMode: 'MY_ITEMS', method: 'PIX' })
              : operation === 'cancel'
                ? currentAccount.cancelPayment('payment-session-a')
                : currentAccount.reconcilePayment('payment-session-a');
        });
        await act(async () => root.render(<AccountProbe sessionPublicId="session-b" />));
        await act(async () => vi.advanceTimersByTimeAsync(0));
        const reads = vi.mocked(tableAccountService.getCurrent).mock.calls.length;
        expect(currentAccount.actionLoading).toBe(false);
        await act(async () => {
          if (rejects) pending.reject(new Error('falha antiga'));
          else pending.resolve({ payment: paymentFor('session-a') } as never);
          expect(await result).toBe(operation === 'cancel' ? false : null);
        });
        expect(tableAccountService.getCurrent).toHaveBeenCalledTimes(reads);
        expect(currentAccount.snapshot?.summary.sessionPublicId).toBe('session-b');
        expect(realtimeNotify).not.toHaveBeenCalled();
      }
    },
  );

  it('troca de token na mesma sessão oculta snapshot e invalida confirmação do socket antigo', async () => {
    vi.useFakeTimers();
    const socketHandler = mockSocket();
    const oldRead = deferred<TableAccountSnapshot>();
    const newRead = deferred<TableAccountSnapshot>();
    const paid = snapshotFor('session-a');
    paid.payments = [{ ...paymentFor('session-a'), status: 'PAID' }];
    vi.mocked(tableAccountService.getCurrent)
      .mockResolvedValueOnce(snapshotFor('session-a'))
      .mockReturnValueOnce(oldRead.promise)
      .mockReturnValueOnce(newRead.promise);
    await act(async () => root.render(<AccountProbe />));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    let event!: Promise<void>;
    await act(async () => {
      event = socketHandler()({ paymentPublicId: 'payment-session-a', paymentStatus: 'PAID' });
    });
    await act(async () => root.render(<AccountProbe sessionToken="token-other-participant" />));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(currentAccount.snapshot).toBeNull();
    await act(async () => {
      oldRead.resolve(paid);
      await event;
    });
    expect(currentAccount.snapshot).toBeNull();
    expect(realtimeNotify).not.toHaveBeenCalled();
    await act(async () =>
      newRead.resolve({
        ...snapshotFor('session-a'),
        currentParticipantPublicId: 'other-participant',
      }),
    );
    expect(currentAccount.snapshot?.currentParticipantPublicId).toBe('other-participant');
  });

  it('descarta resultado da cobrança se leitura canônica trocar participante da mesma sessão', async () => {
    vi.useFakeTimers();
    const payment = deferred<Awaited<ReturnType<typeof tableAccountService.createPayment>>>();
    vi.mocked(tableAccountService.getCurrent).mockResolvedValue(snapshotFor('session-a'));
    vi.mocked(tableAccountService.createPayment).mockReturnValue(payment.promise);
    await act(async () => root.render(<AccountProbe />));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    let result!: ReturnType<Account['createPayment']>;
    await act(async () => {
      result = currentAccount.createPayment({ selectionMode: 'MY_ITEMS', method: 'PIX' });
    });
    vi.mocked(tableAccountService.getCurrent).mockResolvedValue({
      ...snapshotFor('session-a'),
      currentParticipantPublicId: 'other-participant',
    });
    await act(async () => {
      await currentAccount.refresh();
    });
    await act(async () => {
      payment.resolve({ payment: paymentFor('session-a'), idempotentReplay: false });
      expect(await result).toBeNull();
    });
    expect(realtimeNotify).not.toHaveBeenCalled();
    expect(currentAccount.actionLoading).toBe(false);
  });

  it('conclusão de ação antiga não libera bloqueio de pagamento da nova sessão', async () => {
    vi.useFakeTimers();
    type Result = Awaited<ReturnType<typeof tableAccountService.createPayment>>;
    const first = deferred<Result>();
    const second = deferred<Result>();
    vi.mocked(tableAccountService.getCurrent).mockImplementation(async (id) => snapshotFor(id));
    vi.mocked(tableAccountService.createPayment)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    await act(async () => root.render(<AccountProbe />));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    let firstResult!: ReturnType<Account['createPayment']>;
    let secondResult!: ReturnType<Account['createPayment']>;
    const draft = { selectionMode: 'MY_ITEMS', method: 'PIX' } as const;
    await act(async () => {
      firstResult = currentAccount.createPayment(draft);
    });
    await act(async () => root.render(<AccountProbe sessionPublicId="session-b" />));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    await act(async () => {
      secondResult = currentAccount.createPayment(draft);
    });
    await act(async () => {
      first.resolve({ payment: paymentFor('session-a'), idempotentReplay: false });
      expect(await firstResult).toBeNull();
    });
    expect(currentAccount.actionLoading).toBe(true);
    await act(async () => {
      expect(await currentAccount.createPayment(draft)).toBeNull();
    });
    expect(tableAccountService.createPayment).toHaveBeenCalledTimes(2);
    await act(async () => {
      second.resolve({ payment: paymentFor('session-b'), idempotentReplay: false });
      expect((await secondResult)?.payment.sessionPublicId).toBe('session-b');
    });
    expect(currentAccount.actionLoading).toBe(false);
  });
});
