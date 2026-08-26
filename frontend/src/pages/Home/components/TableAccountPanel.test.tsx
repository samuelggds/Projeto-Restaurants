import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TableAccountSnapshot } from '../domain/tableAccount';
import { TableAccountPanel } from './TableAccountPanel';

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
  it('mostra saldo, autoria dos itens e todas as formas de divisão autorizadas', () => {
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
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('Conta da mesa 4');
    expect(markup).toContain('R$ 30,00');
    expect(markup).toContain('Pizza personalizada');
    expect(markup).toContain('Samuel • você');
    expect(markup).toContain('Dividir igualmente');
    expect(markup).toContain('Pagar com o garçom');
    expect(markup).toContain('taxa de serviço de 10%');
    expect(markup).toContain('Confirmação automática em tempo real');
    expect(markup).toContain('Cada celular ou navegador recebe uma identificação segura');
    expect(markup).not.toContain('Acesso encerrado');
  });
});
