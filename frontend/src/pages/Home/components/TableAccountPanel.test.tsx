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
    allowCard: false,
    allowSplit: false,
    serviceFeeMode: 'DISABLED',
    serviceFeeBasisPoints: 0,
    reservationTimeoutMinutes: 10,
  },
  summary: {
    sessionPublicId: 'session-1',
    tableNumber: 4,
    status: 'OPEN',
    consumedCents: 5_000,
    serviceFeeCents: 0,
    grossPaidCents: 0,
    refundedCents: 0,
    netPaidCents: 0,
    reservedCents: 0,
    processingCents: 0,
    remainingCents: 5_000,
    overpaidCents: 0,
    participantsCount: 1,
  },
  participants: [
    {
      publicId: 'participant-1',
      displayName: 'Samuel',
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
      orderPublicId: '123e4567-e89b-42d3-a456-426614174001',
      productName: 'Pizza personalizada',
      unitIndex: 1,
      unitPriceCents: 5_000,
      paidCents: 0,
      reservedCents: 0,
      processingCents: 0,
      availableCents: 5_000,
      financialStatus: 'UNPAID',
      orderStatus: 'PENDING',
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
  onCreatePayment: async () => null,
  onCancelPayment: async () => true,
  onReconcilePayment: async () => null,
  onClose: () => undefined,
};

describe('TableAccountPanel', () => {
  it('mostra somente a comanda individual sem seletor antigo de pagamento', () => {
    const markup = renderToStaticMarkup(<TableAccountPanel {...baseProps} />);

    expect(markup).toContain('Sua comanda');
    expect(markup).toContain('Pizza personalizada');
    expect(markup).toContain('Seu consumo');
    expect(markup).toContain('R$ 50,00');
    expect(markup).not.toContain('Escolher itens');
    expect(markup).not.toContain('Outro valor');
    expect(markup).not.toContain('Pagar restante');
    expect(markup).not.toContain('Em confirmação');
  });

  it('permite remover um pedido pendente, não pago e de item único', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onRemoveOrder = vi.fn(async () => true);

    await act(async () => {
      root.render(<TableAccountPanel {...baseProps} onRemoveOrder={onRemoveOrder} />);
    });

    const remove = container.querySelector<HTMLButtonElement>(
      '[aria-label="Remover Pizza personalizada da comanda"]',
    );
    expect(remove).not.toBeNull();

    await act(async () => remove?.click());
    expect(container.textContent).toContain('Remover Pizza personalizada da sua comanda?');

    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Remover')
        ?.click();
      await Promise.resolve();
    });

    expect(onRemoveOrder).toHaveBeenCalledWith(
      '123e4567-e89b-42d3-a456-426614174001',
    );

    await act(async () => root.unmount());
    container.remove();
  });

  it('não oferece remoção quando o pedido já está em preparo', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        {...baseProps}
        snapshot={{
          ...snapshot,
          items: snapshot.items.map((item) => ({ ...item, orderStatus: 'PREPARING' })),
        }}
        onRemoveOrder={async () => true}
      />,
    );

    expect(markup).not.toContain('Remover Pizza personalizada da comanda');
    expect(markup).toContain('Em preparo');
  });
});
