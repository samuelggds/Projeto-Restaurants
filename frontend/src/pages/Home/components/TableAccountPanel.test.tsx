import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  previewIndividualTablePayment,
  type TableAccountSnapshot,
  type TablePaymentIntent,
} from '../domain/tableAccount';
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
    consumedCents: 8_000,
    serviceFeeCents: 0,
    grossPaidCents: 3_000,
    refundedCents: 0,
    netPaidCents: 3_000,
    reservedCents: 0,
    processingCents: 0,
    remainingCents: 5_000,
    overpaidCents: 0,
    participantsCount: 2,
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
    {
      publicId: 'participant-2',
      displayName: 'Matheus',
      authenticated: false,
      status: 'ACTIVE',
      joinedAt: '',
      leftAt: null,
    },
  ],
  participantAccounts: [
    {
      publicId: 'participant-1',
      displayName: 'Samuel',
      status: 'ACTIVE',
      consumedCents: 5_000,
      paidCents: 0,
      reservedCents: 0,
      processingCents: 0,
      remainingCents: 5_000,
    },
    {
      publicId: 'participant-2',
      displayName: 'Matheus',
      status: 'ACTIVE',
      consumedCents: 3_000,
      paidCents: 3_000,
      reservedCents: 0,
      processingCents: 0,
      remainingCents: 0,
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
  onOpenCardPayment: () => undefined,
  onOpenPayment: () => undefined,
  onClose: () => undefined,
};

describe('TableAccountPanel', () => {
  it('mostra conta geral da mesa e mantém o pagamento restrito à conta individual', () => {
    const markup = renderToStaticMarkup(<TableAccountPanel {...baseProps} />);

    expect(markup).toContain('Conta da Mesa');
    expect(markup).toContain('Conta geral');
    expect(markup).toContain('Samuel');
    expect(markup).toContain('Matheus');
    expect(markup).toContain('Sua conta');
    expect(markup).toContain('Pizza personalizada');
    expect(markup).toContain('Total da mesa');
    expect(markup).toContain('Falta pagar');
    expect(markup).toContain('Pagar com PIX');
    expect(markup).toContain('Cartão indisponível');
    expect(markup).toContain('Pagar com dinheiro');
    expect(markup).toContain('Etapas da sua comanda');
    expect(markup).not.toContain('Escolher itens');
    expect(markup).not.toContain('Outro valor');
    expect(markup).not.toContain('Pagar restante');
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

    expect(onRemoveOrder).toHaveBeenCalledWith('123e4567-e89b-42d3-a456-426614174001');

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

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
  vi.restoreAllMocks();
});
async function mount(overrides: Partial<React.ComponentProps<typeof TableAccountPanel>> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  cleanups.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  await act(async () => root.render(<TableAccountPanel {...baseProps} {...overrides} />));
  const button = (text: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find((entry) =>
      entry.textContent?.includes(text),
    )!;
  return { container, root, button };
}
const payment: TablePaymentIntent = {
  publicId: 'payment-1',
  sessionPublicId: 'session-1',
  payerParticipantPublicId: 'participant-1',
  selectionMode: 'MY_ITEMS',
  method: 'PIX',
  status: 'PROCESSING',
  billItemPublicIds: ['item-1'],
  subtotalCents: 5000,
  serviceFeeCents: 0,
  totalCents: 5000,
  provider: 'test',
  externalId: 'external-1',
  checkoutUrl: null,
  paymentCode: 'test-pix-code',
  expiresAt: '2099-01-01T00:00:00Z',
  createdAt: '',
  updatedAt: '',
};

describe('comanda guiada e pagamento seguro', () => {
  it('inclui taxa obrigatória antes de iniciar Pix, com arredondamento idêntico ao backend', () => {
    const withFee = {
      ...snapshot,
      capabilities: {
        ...snapshot.capabilities,
        serviceFeeMode: 'MANDATORY' as const,
        serviceFeeBasisPoints: 1000,
      },
    };
    const markup = renderToStaticMarkup(<TableAccountPanel {...baseProps} snapshot={withFee} />);
    expect(markup).toContain('Taxa de serviço neste pagamento');
    expect(markup).toContain('Pagar com PIX');
    expect(markup).toContain('R$ 55,00');
    expect(
      previewIndividualTablePayment({
        ...withFee,
        items: [{ ...snapshot.items[0], availableCents: 1005 }],
      }).serviceFeeCents,
    ).toBe(101);
  });

  it('não inclui taxa opcional sem escolha nem consumo de outro participante', () => {
    const current = {
      ...snapshot,
      capabilities: {
        ...snapshot.capabilities,
        serviceFeeMode: 'OPTIONAL' as const,
        serviceFeeBasisPoints: 1000,
      },
      items: [
        ...snapshot.items,
        {
          ...snapshot.items[0],
          publicId: 'other',
          orderedByParticipantPublicId: 'other',
          productName: 'Item alheio',
        },
      ],
    };
    expect(previewIndividualTablePayment(current).totalCents).toBe(5000);
    expect(
      renderToStaticMarkup(<TableAccountPanel {...baseProps} snapshot={current} />),
    ).not.toContain('Item alheio');
  });

  it('explica reserva sem gerar uma segunda cobrança e respeita métodos presenciais', () => {
    const current = {
      ...snapshot,
      items: [{ ...snapshot.items[0], reservedCents: 5000, availableCents: 0 }],
      capabilities: { ...snapshot.capabilities, allowCash: false, allowCardMachine: false },
    };
    const markup = renderToStaticMarkup(<TableAccountPanel {...baseProps} snapshot={current} />);
    expect(markup).toContain('Há um pagamento em andamento');
    expect(markup).not.toContain('Pagar com PIX');
    expect(markup).not.toContain('PIX indisponível');
    expect(markup).not.toContain('maquininha');
  });

  it('renderiza os ícones de PIX, cartão e dinheiro nos métodos da conta', () => {
    const markup = renderToStaticMarkup(<TableAccountPanel {...baseProps} />);

    expect(markup).toContain('data-payment-method-icon="pix"');
    expect(markup).toContain('data-payment-method-icon="card"');
    expect(markup).toContain('data-payment-method-icon="cash"');
  });

  it('mantém PIX e cartão visíveis como indisponíveis quando o backend não libera', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        {...baseProps}
        snapshot={{
          ...snapshot,
          capabilities: {
            ...snapshot.capabilities,
            allowPix: false,
            allowCard: false,
            allowCardMachine: false,
          },
        }}
      />,
    );
    expect(markup).toContain('PIX indisponível');
    expect(markup).toContain('Cartão indisponível');
    expect(markup).toContain('Pagar com dinheiro');
    expect(markup).not.toContain('maquininha');
  });

  it('mostra quitação e não cria pagamento quando não há saldo', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        {...baseProps}
        snapshot={{
          ...snapshot,
          summary: {
            ...snapshot.summary,
            grossPaidCents: 8_000,
            netPaidCents: 8_000,
            remainingCents: 0,
          },
          participantAccounts: snapshot.participantAccounts?.map((participant) =>
            participant.publicId === 'participant-1'
              ? {
                  ...participant,
                  paidCents: 5_000,
                  remainingCents: 0,
                }
              : participant,
          ),
          items: [
            { ...snapshot.items[0], financialStatus: 'PAID', availableCents: 0, paidCents: 5000 },
          ],
        }}
      />,
    );
    expect(markup).toContain('Tudo pago!');
    expect(markup).not.toContain('Pagar com PIX');
  });

  it('separa rascunhos da comanda sem iniciar cobrança ao revisá-los', async () => {
    const onReviewDraft = vi.fn();
    const onCreatePayment = vi.fn(async () => null);
    const { container, button } = await mount({
      draftCount: 2,
      draftTotal: 34.5,
      onReviewDraft,
      onCreatePayment,
    });
    expect(container.textContent).toContain('2 itens para enviar');
    expect(container.textContent).toContain('não está na comanda');
    await act(async () => button('Revisar e enviar').click());
    expect(onReviewDraft).toHaveBeenCalledOnce();
    expect(onCreatePayment).not.toHaveBeenCalled();
  });

  it('mantém rascunho bloqueado após conta solicitada sem bloquear o pagamento', async () => {
    const { button } = await mount({
      draftCount: 1,
      onReviewDraft: vi.fn(),
      orderingBlocked: true,
    });
    expect(button('Revisar e enviar').disabled).toBe(true);
    expect(button('Pagar com PIX').disabled).toBe(false);
  });

  it('entrega o PIX criado para a tela dedicada sem renderizar QR Code no painel antigo', async () => {
    const onCreatePayment = vi.fn(async () => ({ payment, idempotentReplay: false }));
    const onOpenPayment = vi.fn();
    const { container, button } = await mount({ onCreatePayment, onOpenPayment });

    await act(async () => {
      button('Pagar com PIX').click();
      await Promise.resolve();
    });

    expect(onCreatePayment).toHaveBeenCalledWith({
      selectionMode: 'MY_ITEMS',
      method: 'PIX',
      includeOptionalServiceFee: false,
    });
    expect(onOpenPayment).toHaveBeenCalledWith(payment);
    expect(container.querySelector('[aria-label="QR Code Pix"]')).toBeNull();
  });

  it('não dispara PIX nem cartão enquanto o backend marcar os métodos como indisponíveis', async () => {
    const onCreatePayment = vi.fn(async () => null);
    const onOpenCardPayment = vi.fn();
    const { button } = await mount({
      onCreatePayment,
      onOpenCardPayment,
      snapshot: {
        ...snapshot,
        capabilities: {
          ...snapshot.capabilities,
          allowPix: false,
          allowCard: false,
        },
      },
    });

    expect(button('PIX indisponível').disabled).toBe(true);
    expect(button('Cartão indisponível').disabled).toBe(true);
    expect(onCreatePayment).not.toHaveBeenCalled();
    expect(onOpenCardPayment).not.toHaveBeenCalled();
  });

  it('abre o formulário dedicado de cartão quando o backend libera cartão', async () => {
    const onOpenCardPayment = vi.fn();
    const { button } = await mount({
      onOpenCardPayment,
      snapshot: {
        ...snapshot,
        capabilities: {
          ...snapshot.capabilities,
          allowCard: true,
        },
      },
    });

    await act(async () => button('Pagar com cartão').click());
    expect(onOpenCardPayment).toHaveBeenCalledOnce();
  });

  it('entrega a solicitação em dinheiro para a tela dedicada de espera', async () => {
    const cashPayment: TablePaymentIntent = {
      ...payment,
      publicId: 'payment-cash',
      method: 'CASH',
      status: 'RESERVED',
      provider: null,
      externalId: null,
      paymentCode: null,
    };
    const onCreatePayment = vi.fn(async () => ({
      payment: cashPayment,
      idempotentReplay: false,
    }));
    const onOpenPayment = vi.fn();
    const { container, button } = await mount({ onCreatePayment, onOpenPayment });

    await act(async () => {
      button('Pagar com dinheiro').click();
      await Promise.resolve();
    });

    expect(onCreatePayment).toHaveBeenCalledWith({
      selectionMode: 'MY_ITEMS',
      method: 'CASH',
      includeOptionalServiceFee: false,
    });
    expect(onOpenPayment).toHaveBeenCalledWith(cashPayment);
    expect(container.textContent).not.toContain('Aguardando confirmação do administrador');
  });

  it('pagamento PIX existente reabre a tela dedicada pelo pagamento canônico da API', async () => {
    const paidPayment = { ...payment, status: 'PAID' as const };
    const onOpenPayment = vi.fn();
    const { button } = await mount({
      onOpenPayment,
      snapshot: {
        ...snapshot,
        activePayment: paidPayment,
        payments: [paidPayment],
      },
    });

    await act(async () => button('Pagar com PIX').click());
    expect(onOpenPayment).toHaveBeenCalledWith(paidPayment);
  });

  it('pagamento em dinheiro existente mostra o botão correto e abre a tela dedicada', async () => {
    const cashPaid: TablePaymentIntent = {
      ...payment,
      publicId: 'cash-paid',
      method: 'CASH',
      status: 'PAID',
      provider: null,
      externalId: null,
      paymentCode: null,
    };
    const onOpenPayment = vi.fn();
    const { button } = await mount({
      onOpenPayment,
      snapshot: {
        ...snapshot,
        activePayment: cashPaid,
        payments: [cashPaid],
      },
    });

    await act(async () => button('Pagar com dinheiro').click());
    expect(onOpenPayment).toHaveBeenCalledWith(cashPaid);
  });

  it('duplo clique na remoção não envia duas requisições', async () => {
    let finish!: (value: boolean) => void;
    const onRemoveOrder = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const { container, button } = await mount({ onRemoveOrder });
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label^="Remover "]')!.click(),
    );
    await act(async () => {
      button('Remover').click();
      button('Remover').click();
    });
    expect(onRemoveOrder).toHaveBeenCalledOnce();
    await act(async () => finish(true));
  });

  it('contém foco no diálogo e não o rouba a cada atualização', async () => {
    const { container, root, button } = await mount();
    const close = container.querySelector<HTMLButtonElement>('[aria-label="Fechar comanda"]')!;
    await act(async () => {
      close.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(document.activeElement).toBe(button('Pagar com dinheiro'));
    await act(async () =>
      root.render(<TableAccountPanel {...baseProps} onClose={() => undefined} />),
    );
    expect(document.activeElement).toBe(button('Pagar com PIX'));
  });
});
