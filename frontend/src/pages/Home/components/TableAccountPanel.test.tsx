import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TableAccountSnapshot } from '../domain/tableAccount';
import { TableAccountPanel } from './TableAccountPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const snapshot: TableAccountSnapshot = {
  contractVersion: 1,
  currentParticipantPublicId: 'participant-1',
  capabilities: {
    enabled: true,
    allowCash: true,
    allowCardMachine: true,
    allowOnlinePayment: true,
    allowSplit: true,
    serviceFeeMode: 'OPTIONAL',
    serviceFeeBasisPoints: 1_000,
    reservationTimeoutMinutes: 10,
  },
  summary: {
    sessionPublicId: 'session-1',
    tableNumber: 4,
    status: 'OPEN',
    consumedCents: 5_000,
    serviceFeeCents: 0,
    grossPaidCents: 2_000,
    refundedCents: 0,
    netPaidCents: 2_000,
    reservedCents: 0,
    processingCents: 0,
    remainingCents: 3_000,
    overpaidCents: 0,
    participantsCount: 2,
  },
  participants: [
    {
      publicId: 'participant-1',
      displayName: 'Samuel',
      status: 'ACTIVE',
      joinedAt: '',
      leftAt: null,
    },
    {
      publicId: 'participant-2',
      displayName: 'Convidado',
      status: 'ACTIVE',
      joinedAt: '',
      leftAt: null,
    },
    {
      publicId: 'participant-old',
      displayName: 'Acesso encerrado',
      status: 'LEFT',
      joinedAt: '',
      leftAt: '',
    },
  ],
  activePayment: null,
  items: [
    {
      publicId: 'item-1',
      orderPublicId: 'order-1',
      productName: 'Pizza personalizada',
      unitIndex: 1,
      unitPriceCents: 5_000,
      paidCents: 2_000,
      reservedCents: 0,
      processingCents: 0,
      availableCents: 3_000,
      financialStatus: 'UNPAID',
      orderStatus: 'PREPARING',
      orderedByParticipantPublicId: 'participant-1',
      orderedByDisplayName: 'Samuel',
    },
  ],
  payments: [],
};

describe('TableAccountPanel', () => {
  it('abre somente a etapa de escolha do que pagar', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        open
        tableNumber={4}
        snapshot={snapshot}
        loading={false}
        actionLoading={false}
        error=""
        onRefresh={() => undefined}
        onCreatePayment={async () => null}
        onCancelPayment={async () => true}
        onReconcilePayment={async () => null}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('Conta da mesa 4');
    expect(markup).toContain('R$ 30,00');
    expect(markup).toContain('1 de 3');
    expect(markup).toContain('O que você quer pagar?');
    expect(markup).toContain('Meus itens');
    expect(markup).toContain('Escolher itens');
    expect(markup).toContain('Dividir igualmente');
    expect(markup).toContain('Conta completa');
    expect(markup).not.toContain('Pagar com o garçom');
    expect(markup).not.toContain('Como deseja pagar?');
    expect(markup).not.toContain('Pix online');
    expect(markup).not.toContain('Dinheiro');
    expect(markup).not.toContain('Acessos identificados nesta mesa');
    expect(markup).not.toContain('Itens lançados');
    expect(markup).not.toContain('Acesso encerrado');
  });

  it('avisa quando Pix e cartão online não estão configurados', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        open
        tableNumber={4}
        snapshot={{
          ...snapshot,
          capabilities: {
            ...snapshot.capabilities,
            allowOnlinePayment: false,
          },
        }}
        loading={false}
        actionLoading={false}
        error=""
        onRefresh={() => undefined}
        onCreatePayment={async () => null}
        onCancelPayment={async () => true}
        onReconcilePayment={async () => null}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('Pagamento online indisponível neste restaurante');
    expect(markup).toContain('Pix e cartão online ainda não estão habilitados');
    expect(markup).toContain('formas presenciais disponíveis');
  });

  it('limpa os itens escolhidos depois de criar uma reserva com sucesso', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCreatePayment = vi.fn(async () => ({
      idempotentReplay: false,
      payment: {
        publicId: 'payment-1',
        sessionPublicId: 'session-1',
        payerParticipantPublicId: 'participant-1',
        selectionMode: 'SELECTED_ITEMS' as const,
        method: 'PIX' as const,
        status: 'PROCESSING' as const,
        billItemPublicIds: ['item-1'],
        subtotalCents: 3_000,
        serviceFeeCents: 0,
        totalCents: 3_000,
        provider: 'FAKE_TABLE',
        externalId: 'fake-1',
        checkoutUrl: null,
        paymentCode: '000201FAKE-PIX',
        expiresAt: '2026-08-26T15:10:00.000Z',
        createdAt: '2026-08-26T15:00:00.000Z',
        updatedAt: '2026-08-26T15:00:00.000Z',
      },
    }));

    await act(async () => {
      root.render(
        <TableAccountPanel
          open
          tableNumber={4}
          snapshot={snapshot}
          loading={false}
          actionLoading={false}
          error=""
          onRefresh={() => undefined}
          onCreatePayment={onCreatePayment}
          onCancelPayment={async () => true}
          onReconcilePayment={async () => null}
          onClose={() => undefined}
        />,
      );
    });

    const chooseItems = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Escolher itens'),
    );
    await act(async () => chooseItems?.click());
    const checkbox = container.querySelector(
      'input[aria-label="Selecionar Pizza personalizada"]',
    ) as HTMLInputElement;
    await act(async () => checkbox.click());
    expect(checkbox.checked).toBe(true);

    const continueButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Continuar',
    );
    await act(async () => continueButton?.click());

    const submit = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Gerar pagamento Pix'),
    );
    await act(async () => {
      submit?.click();
      await Promise.resolve();
    });

    expect(onCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ billItemPublicIds: ['item-1'] }),
    );

    expect(container.textContent).toContain('3 de 3');
    expect(container.textContent).toContain('Pague com Pix');
    expect(container.textContent).not.toContain('Pagamento confirmado');

    await act(async () => root.unmount());
    container.remove();
  });

  it('solicita dinheiro para os itens escolhidos sem usar o modo legado de garçom', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCreatePayment = vi.fn(async () => ({
      idempotentReplay: false,
      payment: {
        publicId: 'payment-cash',
        sessionPublicId: 'session-1',
        payerParticipantPublicId: 'participant-1',
        selectionMode: 'SELECTED_ITEMS' as const,
        method: 'CASH' as const,
        status: 'RESERVED' as const,
        billItemPublicIds: ['item-1'],
        subtotalCents: 3_000,
        serviceFeeCents: 300,
        totalCents: 3_300,
        provider: null,
        externalId: null,
        checkoutUrl: null,
        paymentCode: null,
        expiresAt: '2026-08-26T15:10:00.000Z',
        createdAt: '2026-08-26T15:00:00.000Z',
        updatedAt: '2026-08-26T15:00:00.000Z',
      },
    }));

    await act(async () => {
      root.render(
        <TableAccountPanel
          open
          tableNumber={4}
          snapshot={snapshot}
          loading={false}
          actionLoading={false}
          error=""
          onRefresh={() => undefined}
          onCreatePayment={onCreatePayment}
          onCancelPayment={async () => true}
          onReconcilePayment={async () => null}
          onClose={() => undefined}
        />,
      );
    });

    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Escolher itens'))
        ?.click();
    });
    await act(async () => {
      container
        .querySelector<HTMLInputElement>('input[aria-label="Selecionar Pizza personalizada"]')
        ?.click();
    });
    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Continuar')
        ?.click();
    });

    expect(container.textContent).toContain('Pix online');
    expect(container.textContent).toContain('Dinheiro');
    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Dinheiro'))
        ?.click();
    });
    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Solicitar cobrança em dinheiro'))
        ?.click();
      await Promise.resolve();
    });

    expect(onCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        selectionMode: 'SELECTED_ITEMS',
        method: 'CASH',
        billItemPublicIds: ['item-1'],
      }),
    );
    expect(container.textContent).toContain('Aguardando o garçom');
    expect(container.textContent).not.toContain('Pagamento confirmado');

    await act(async () => root.unmount());
    container.remove();
  });

  it('retoma um Pix em processamento sem tratá-lo como pago', () => {
    const processingPayment = {
      publicId: 'payment-processing',
      sessionPublicId: 'session-1',
      payerParticipantPublicId: 'participant-1',
      selectionMode: 'MY_ITEMS' as const,
      method: 'PIX' as const,
      status: 'PROCESSING' as const,
      billItemPublicIds: ['item-1'],
      subtotalCents: 3_000,
      serviceFeeCents: 300,
      totalCents: 3_300,
      provider: 'FAKE_TABLE',
      externalId: 'fake-1',
      checkoutUrl: null,
      paymentCode: '000201FAKE-PIX',
      expiresAt: '2026-08-26T15:10:00.000Z',
      createdAt: '2026-08-26T15:00:00.000Z',
      updatedAt: '2026-08-26T15:00:00.000Z',
    };
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        open
        tableNumber={4}
        snapshot={{
          ...snapshot,
          activePayment: processingPayment,
          payments: [
            {
              publicId: processingPayment.publicId,
              payerParticipantPublicId: 'participant-1',
              selectionMode: 'MY_ITEMS',
              status: 'PROCESSING',
              totalCents: 3_300,
              createdAt: processingPayment.createdAt,
            },
          ],
        }}
        loading={false}
        actionLoading={false}
        error=""
        onRefresh={() => undefined}
        onCreatePayment={async () => null}
        onCancelPayment={async () => true}
        onReconcilePayment={async () => processingPayment}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('3 de 3');
    expect(markup).toContain('Pague com Pix');
    expect(markup).toContain('Verificar pagamento');
    expect(markup).toContain('000201FAKE-PIX');
    expect(markup).not.toContain('Pagamento confirmado');
  });
});
