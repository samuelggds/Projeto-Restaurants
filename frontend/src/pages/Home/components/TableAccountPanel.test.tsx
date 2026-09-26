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
    allowPix: true,
    allowCard: true,
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
      authenticated: true,
      status: 'ACTIVE',
      joinedAt: '',
      leftAt: null,
    },
    {
      publicId: 'participant-2',
      displayName: 'Convidado',
      authenticated: false,
      status: 'ACTIVE',
      joinedAt: '',
      leftAt: null,
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

const baseProps = {
  open: true,
  tableNumber: 4,
  snapshot,
  loading: false,
  actionLoading: false,
  error: '',
  onRefresh: () => undefined,
  onCancelPayment: async () => true,
  onReconcilePayment: async () => null,
  onClose: () => undefined,
};

describe('TableAccountPanel', () => {
  it('abre como prévia de comanda em tempo real', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel {...baseProps} onCreatePayment={async () => null} />,
    );

    expect(markup).toContain('Prévia da comanda');
    expect(markup).toContain('GastroNexa • consumo em tempo real');
    expect(markup).toContain('Pizza personalizada');
    expect(markup).toContain('Samuel');
    expect(markup).toContain('R$ 50,00');
    expect(markup).toContain('R$ 20,00');
    expect(markup).toContain('R$ 30,00');
    expect(markup).toContain('Meu consumo');
    expect(markup).toContain('Escolher itens');
    expect(markup).toContain('Outro valor');
    expect(markup).toContain('Pagar restante');
    expect(markup).not.toContain('Dinheiro');
    expect(markup).not.toContain('Maquininha');
    expect(markup).not.toContain('Dividir igualmente');
  });

  it('avisa quando Pix e cartão online não estão configurados', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        {...baseProps}
        snapshot={{
          ...snapshot,
          capabilities: { ...snapshot.capabilities, allowOnlinePayment: false },
        }}
        onCreatePayment={async () => null}
      />,
    );

    expect(markup).toContain('Pagamento online indisponível neste restaurante');
    expect(markup).toContain('Pix e cartão online ainda não estão habilitados');
    expect(markup).not.toContain('formas presenciais');
  });

  it('permite pagar um valor parcial livre por Pix', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCreatePayment = vi.fn(async () => ({
      idempotentReplay: false,
      payment: {
        publicId: 'payment-custom',
        sessionPublicId: 'session-1',
        payerParticipantPublicId: 'participant-1',
        selectionMode: 'CUSTOM_AMOUNT' as const,
        method: 'PIX' as const,
        status: 'PROCESSING' as const,
        billItemPublicIds: ['item-1'],
        subtotalCents: 1_250,
        serviceFeeCents: 0,
        totalCents: 1_250,
        provider: 'MERCADO_PAGO',
        externalId: 'mp-1',
        checkoutUrl: null,
        paymentCode: '000201CUSTOMPIX',
        expiresAt: '2026-09-26T16:30:00.000Z',
        createdAt: '2026-09-26T16:20:00.000Z',
        updatedAt: '2026-09-26T16:20:00.000Z',
      },
    }));

    await act(async () => {
      root.render(<TableAccountPanel {...baseProps} onCreatePayment={onCreatePayment} />);
    });

    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Outro valor'))
        ?.click();
    });

    const amount = container.querySelector<HTMLInputElement>('#table-custom-payment');
    await act(async () => {
      if (amount) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )?.set;
        setter?.call(amount, '12,50');
        amount.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    expect(amount?.value).toBe('12,50');

    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Continuar')
        ?.click();
    });

    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Gerar Pix'))
        ?.click();
      await Promise.resolve();
    });

    expect(onCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        selectionMode: 'CUSTOM_AMOUNT',
        method: 'PIX',
        customAmountCents: 1_250,
      }),
    );

    await act(async () => root.unmount());
    container.remove();
  });

  it('retoma um Pix em processamento sem gerar outra cobrança', () => {
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
      provider: 'MERCADO_PAGO',
      externalId: 'mp-1',
      checkoutUrl: null,
      paymentCode: '000201FAKE-PIX',
      expiresAt: '2026-09-26T16:30:00.000Z',
      createdAt: '2026-09-26T16:20:00.000Z',
      updatedAt: '2026-09-26T16:20:00.000Z',
    };
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        {...baseProps}
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
        onCreatePayment={async () => null}
        onReconcilePayment={async () => processingPayment}
      />,
    );

    expect(markup).toContain('3 de 3');
    expect(markup).toContain('Pague com Pix');
    expect(markup).toContain('000201FAKE-PIX');
    expect(markup).not.toContain('O que você quer pagar?');
  });

  it('mostra comanda quitada quando o saldo chega a zero', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        {...baseProps}
        snapshot={{
          ...snapshot,
          summary: {
            ...snapshot.summary,
            grossPaidCents: 5_000,
            netPaidCents: 5_000,
            remainingCents: 0,
          },
        }}
        onCreatePayment={async () => null}
      />,
    );

    expect(markup).toContain('Comanda quitada');
    expect(markup).toContain('Todo o consumo registrado nesta mesa já foi pago');
  });
});
