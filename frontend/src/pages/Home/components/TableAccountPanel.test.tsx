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
    expect(markup).toContain('Consumido');
    expect(markup).toContain('Pago');
    expect(markup).toContain('Falta pagar');
    expect(markup).toContain('Continuar com Pix · R$ 50,00');
    expect(markup).toContain('Etapas da sua comanda');
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
    expect(markup).toContain('Continuar com Pix · R$ 55,00');
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
    expect(markup).not.toContain('Continuar com Pix');
    expect(markup).not.toContain('maquininha');
  });

  it('mostra orientação quando Pix está desativado em vez de desaparecer sem explicação', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        {...baseProps}
        snapshot={{
          ...snapshot,
          capabilities: { ...snapshot.capabilities, allowPix: false, allowCardMachine: false },
        }}
      />,
    );
    expect(markup).toContain('O Pix não está disponível');
    expect(markup).toContain('pagamento em dinheiro');
    expect(markup).not.toContain('maquininha');
  });

  it('mostra quitação e não cria pagamento quando não há saldo', () => {
    const markup = renderToStaticMarkup(
      <TableAccountPanel
        {...baseProps}
        snapshot={{
          ...snapshot,
          summary: { ...snapshot.summary, remainingCents: 0, netPaidCents: 5000 },
          items: [
            { ...snapshot.items[0], financialStatus: 'PAID', availableCents: 0, paidCents: 5000 },
          ],
        }}
      />,
    );
    expect(markup).toContain('Tudo pago!');
    expect(markup).not.toContain('Continuar com Pix');
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
    expect(button('Continuar com Pix').disabled).toBe(false);
  });

  it('avança para Pix e permite rever sem criar outra reserva', async () => {
    const onCreatePayment = vi.fn(async () => ({ payment, idempotentReplay: false }));
    const { container, button } = await mount({ onCreatePayment });
    await act(async () => button('Continuar com Pix').click());
    expect(onCreatePayment).toHaveBeenCalledWith({
      selectionMode: 'MY_ITEMS',
      method: 'PIX',
      includeOptionalServiceFee: false,
    });
    expect(container.querySelector('[aria-current="step"]')?.textContent).toContain('Pagar');
    expect(container.querySelector('[aria-label="QR Code Pix"]')).not.toBeNull();
    await act(async () => button('Rever meus pedidos').click());
    expect(container.querySelector('[aria-current="step"]')?.textContent).toContain('Conferir');
    await act(async () => button('Voltar ao pagamento').click());
    expect(onCreatePayment).toHaveBeenCalledOnce();
  });

  it('concluir pagamento confirmado fecha a comanda e volta ao cardápio', async () => {
    const onClose = vi.fn();
    const { button } = await mount({
      onClose,
      snapshot: { ...snapshot, activePayment: { ...payment, status: 'PAID' } },
    });
    await act(async () => button('Concluir').click());
    expect(onClose).toHaveBeenCalledOnce();
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
    expect(document.activeElement).toBe(button('Continuar com Pix'));
    await act(async () =>
      root.render(<TableAccountPanel {...baseProps} onClose={() => undefined} />),
    );
    expect(document.activeElement).toBe(button('Continuar com Pix'));
  });
});
