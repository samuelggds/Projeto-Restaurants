import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  currentParticipantAccount,
  formatTableMoney,
  previewIndividualTablePayment,
  tablePaymentMethodLabel,
  type CreateTablePaymentResult,
  type TableAccountSnapshot,
  type TablePaymentDraft,
  type TablePaymentIntent,
} from '../domain/tableAccount';
import * as S from './TableAccountPanel.styles';

function PixIcon() {
  return (
    <span className="payment-method-icon pix" aria-hidden="true" data-payment-method-icon="pix">
      <svg viewBox="0 0 24 24" focusable="false">
        <path
          fill="currentColor"
          d="M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156"
        />
      </svg>
    </span>
  );
}

type Props = {
  open: boolean;
  tableNumber: string | number;
  snapshot: TableAccountSnapshot | null;
  loading: boolean;
  actionLoading: boolean;
  error: string;
  onRefresh: () => void;
  onCreatePayment: (draft: TablePaymentDraft) => Promise<CreateTablePaymentResult | null>;
  onOpenCardPayment: () => void;
  onOpenPayment: (payment: TablePaymentIntent) => void;
  onRemoveOrder?: (orderPublicId: string) => Promise<boolean>;
  draftCount?: number;
  draftTotal?: number;
  onReviewDraft?: () => void;
  orderingBlocked?: boolean;
  onClose: () => void;
};

function TableAccountPanelContent(props: Props) {
  const {
    tableNumber,
    snapshot,
    loading,
    actionLoading,
    error,
    onRefresh,
    onCreatePayment,
    onOpenCardPayment,
    onOpenPayment,
    onRemoveOrder,
    draftCount = 0,
    draftTotal = 0,
    onReviewDraft,
    orderingBlocked = false,
    onClose,
  } = props;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const removalInFlightRef = useRef(false);
  const [removing, setRemoving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    orderPublicId: string;
    productName: string;
  } | null>(null);

  const items = useMemo(
    () =>
      snapshot?.items.filter(
        (item) =>
          item.orderStatus !== 'CANCELED' &&
          item.orderedByParticipantPublicId === snapshot.currentParticipantPublicId,
      ) || [],
    [snapshot],
  );
  const preview = useMemo(
    () => (snapshot ? previewIndividualTablePayment(snapshot) : null),
    [snapshot],
  );
  const busy = actionLoading || removing;
  const participant = snapshot?.participants.find(
    (entry) => entry.publicId === snapshot.currentParticipantPublicId,
  );
  const ownAccount = currentParticipantAccount(snapshot);
  const hasPayableBalance = Boolean(
    snapshot?.capabilities.enabled &&
    snapshot.summary.status !== 'CLOSED' &&
    preview &&
    preview.totalCents > 0 &&
    !preview.blocked,
  );
  const canPay = Boolean(
    hasPayableBalance &&
    snapshot &&
    (snapshot.capabilities.allowPix ||
      snapshot.capabilities.allowCard ||
      snapshot.capabilities.allowCash),
  );

  const ownActivePayment =
    snapshot?.activePayment &&
    snapshot.activePayment.payerParticipantPublicId === snapshot.currentParticipantPublicId
      ? snapshot.activePayment
      : null;
  const canonicalPayment = ownActivePayment
    ? snapshot?.payments.find((entry) => entry.publicId === ownActivePayment.publicId)
    : null;
  const visiblePayment = ownActivePayment
    ? { ...ownActivePayment, status: canonicalPayment?.status || ownActivePayment.status }
    : null;
  const currentStep = visiblePayment
    ? ['RESERVED', 'PROCESSING'].includes(visiblePayment.status)
      ? 2
      : 3
    : 1;

  const orderItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      counts.set(item.orderPublicId, (counts.get(item.orderPublicId) || 0) + 1);
    });
    return counts;
  }, [items]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
        ) || [],
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || !panelRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !panelRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, []);

  const startPayment = async (method: 'PIX' | 'CASH') => {
    if (!snapshot || busy || !canPay) return;
    const result = await onCreatePayment({
      selectionMode: 'MY_ITEMS',
      method,
      includeOptionalServiceFee: false,
    });
    if (result?.payment) onOpenPayment(result.payment);
  };

  const confirmRemoval = async () => {
    if (!removeTarget || !onRemoveOrder || removalInFlightRef.current || actionLoading) return;
    removalInFlightRef.current = true;
    setRemoving(true);
    try {
      const removed = await onRemoveOrder(removeTarget.orderPublicId);
      if (removed) setRemoveTarget(null);
    } finally {
      removalInFlightRef.current = false;
      setRemoving(false);
    }
  };

  return (
    <S.Backdrop
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <S.Panel ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="table-account-title">
        <S.Header>
          <span className="icon">
            <ReceiptText size={23} />
          </span>
          <div>
            <h2 id="table-account-title">Conta da Mesa {String(tableNumber)}</h2>
            <p>Veja o total da mesa e pague somente o seu consumo.</p>
          </div>
          <button ref={closeButtonRef} type="button" aria-label="Fechar comanda" onClick={onClose}>
            <X size={18} />
          </button>
        </S.Header>

        <S.Steps aria-label="Etapas da sua comanda">
          {['Conferir', 'Pagar', 'Confirmar'].map((label, index) => (
            <li
              key={label}
              aria-current={currentStep === index + 1 ? 'step' : undefined}
              data-complete={currentStep > index + 1}
            >
              <span>{index + 1}</span> {label}
            </li>
          ))}
        </S.Steps>

        <S.Scroll>
          {error ? (
            <S.Alert $error>
              <span>{error}</span>
              <button type="button" onClick={onRefresh}>
                Tentar novamente
              </button>
            </S.Alert>
          ) : null}

          {loading && !snapshot ? (
            <S.Loading>Carregando sua comanda...</S.Loading>
          ) : snapshot ? (
            <>
              <>
                  <S.Introduction>
                    <small>
                      CONTA DA MESA
                      {participant?.displayName ? ` · ${participant.displayName}` : ''}
                    </small>
                    <h3>
                      {snapshot.participantAccounts?.length ? 'Consumo separado por cliente' : 'A conta começa aqui'}
                    </h3>
                    <p>
                      {snapshot.participantAccounts?.length
                        ? 'Todos veem o total da mesa, mas cada cliente paga somente a própria parte.'
                        : 'Os pedidos aparecerão aqui automaticamente.'}
                    </p>
                  </S.Introduction>
                  {orderingBlocked ? (
                    <S.Alert $info role="status">
                      Novos pedidos estão bloqueados para este atendimento. Você ainda pode conferir
                      e pagar sua comanda. Fale com o garçom se precisar de ajuda.
                    </S.Alert>
                  ) : null}
                  {draftCount > 0 && onReviewDraft ? (
                    <S.Draft>
                      <div>
                        <strong>
                          {draftCount} {draftCount === 1 ? 'item para enviar' : 'itens para enviar'}{' '}
                          · {formatTableMoney(Math.round(draftTotal * 100))}
                        </strong>
                        <p>Ainda não enviados à cozinha. Este valor não está na comanda abaixo.</p>
                      </div>
                      <button type="button" onClick={onReviewDraft} disabled={orderingBlocked}>
                        Revisar e enviar <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    </S.Draft>
                  ) : null}
                  {removeTarget ? (
                    <S.Alert $error>
                      <span>
                        Remover <b>{removeTarget.productName}</b> da sua comanda? Esta ação cancela
                        este pedido antes do preparo.
                      </span>
                      <span>
                        <button type="button" disabled={busy} onClick={() => setRemoveTarget(null)}>
                          Manter
                        </button>
                        <button type="button" disabled={busy} onClick={() => void confirmRemoval()}>
                          {removing ? 'Removendo...' : 'Remover'}
                        </button>
                      </span>
                    </S.Alert>
                  ) : null}

                  <S.ReceiptPreview aria-label="Conta geral da mesa">
                    <header>
                      <span><strong>Conta geral</strong></span>
                      <em>{snapshot.participantAccounts?.filter((entry) => entry.status === 'ACTIVE').length || 0} clientes</em>
                    </header>
                    <S.ReceiptRows>
                      {snapshot.participantAccounts?.length ? (
                        snapshot.participantAccounts.map((entry) => (
                          <article key={entry.publicId}>
                            <span>
                              <b>{entry.displayName || 'Cliente da mesa'}</b>
                              <small>
                                {entry.remainingCents === 0 && entry.consumedCents > 0
                                  ? 'Pago'
                                  : entry.processingCents > 0 || entry.reservedCents > 0
                                    ? 'Pagamento em andamento'
                                    : 'Pendente'}
                              </small>
                            </span>
                            <span className="receipt-item-actions">
                              <strong>{formatTableMoney(entry.consumedCents)}</strong>
                            </span>
                          </article>
                        ))
                      ) : (
                        <p>Nenhum consumo registrado nesta mesa.</p>
                      )}
                    </S.ReceiptRows>
                    <S.ReceiptTotals>
                      <span>
                        <small>Total da mesa</small>
                        <b>{formatTableMoney(snapshot.summary.consumedCents)}</b>
                      </span>
                      <span>
                        <small>Você pagou</small>
                        <b>{formatTableMoney(ownAccount?.paidCents || 0)}</b>
                      </span>
                      <span className="remaining">
                        <small>Falta pagar</small>
                        <b>{formatTableMoney(snapshot.summary.remainingCents)}</b>
                      </span>
                    </S.ReceiptTotals>
                  </S.ReceiptPreview>

                  <S.ReceiptPreview aria-label="Sua conta individual">
                    <header>
                      <span>
                        <strong>Sua conta</strong>
                      </span>
                      <em>
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </em>
                    </header>

                    <S.ReceiptRows>
                      {items.length ? (
                        items.map((item) => {
                          const singleItemOrder = orderItemCounts.get(item.orderPublicId) === 1;
                          const removable =
                            Boolean(onRemoveOrder) &&
                            singleItemOrder &&
                            item.orderStatus === 'PENDING' &&
                            item.financialStatus === 'UNPAID' &&
                            item.paidCents === 0 &&
                            item.reservedCents === 0 &&
                            item.processingCents === 0 &&
                            item.availableCents === item.unitPriceCents;

                          return (
                            <article key={item.publicId}>
                              <span>
                                <b>1x {item.productName}</b>
                                <small>
                                  {item.financialStatus === 'PAID'
                                    ? 'Pago'
                                    : item.orderStatus === 'PENDING'
                                      ? 'Pedido recebido'
                                      : item.orderStatus === 'PREPARING'
                                        ? 'Em preparo'
                                        : item.orderStatus === 'READY'
                                          ? 'Pronto'
                                          : item.orderStatus === 'DELIVERED'
                                            ? 'Entregue · Ainda não pago'
                                            : 'Na sua comanda'}
                                </small>
                              </span>
                              <span className="receipt-item-actions">
                                <strong>{formatTableMoney(item.unitPriceCents)}</strong>
                                {removable ? (
                                  <button
                                    type="button"
                                    className="remove-item"
                                    aria-label={`Remover ${item.productName} da comanda`}
                                    title="Remover da comanda"
                                    disabled={busy}
                                    onClick={() =>
                                      setRemoveTarget({
                                        orderPublicId: item.orderPublicId,
                                        productName: item.productName,
                                      })
                                    }
                                  >
                                    <X size={16} />
                                  </button>
                                ) : null}
                              </span>
                            </article>
                          );
                        })
                      ) : (
                        <p>Você ainda não possui itens nesta comanda.</p>
                      )}
                    </S.ReceiptRows>

                    <S.ReceiptTotals>
                      <span>
                        <small>Seu consumo</small>
                        <b>{formatTableMoney(ownAccount?.consumedCents || 0)}</b>
                      </span>
                      <span>
                        <small>Pago</small>
                        <b>{formatTableMoney(ownAccount?.paidCents || 0)}</b>
                      </span>
                      {!visiblePayment && canPay && preview && preview.serviceFeeCents > 0 ? (
                        <span>
                          <small>Taxa de serviço neste pagamento</small>
                          <b>{formatTableMoney(preview.serviceFeeCents)}</b>
                        </span>
                      ) : null}
                      <span className="remaining">
                        <small>Falta pagar</small>
                        <b>
                          {formatTableMoney(
                            !visiblePayment && canPay && preview
                              ? preview.totalCents
                              : ownAccount?.remainingCents || 0,
                          )}
                        </b>
                      </span>
                    </S.ReceiptTotals>

                    <footer>
                      <RefreshCw size={13} />
                      Atualiza automaticamente quando você faz ou cancela um pedido.
                    </footer>
                  </S.ReceiptPreview>
                  {hasPayableBalance || visiblePayment ? (
                    <S.Guide>
                      <ShieldCheck size={22} aria-hidden="true" />
                      <div>
                        <b>Você paga somente o seu consumo</b>
                        <p>PIX e cartão online confirmam pelo provedor. Dinheiro só vira pago após a confirmação da equipe.</p>
                      </div>
                    </S.Guide>
                  ) : null}
              </>

              {!hasPayableBalance && !visiblePayment && items.length > 0 ? (
                <S.Alert $info={(ownAccount?.remainingCents || 0) > 0} role="status">
                  {(ownAccount?.remainingCents || 0) === 0 ? (
                    <span>
                      <CheckCircle2 size={18} aria-hidden="true" /> Tudo pago! Nenhum valor pendente
                      nesta comanda.
                    </span>
                  ) : preview?.blocked ? (
                    <span>
                      Há um pagamento em andamento para seus itens. Atualize a comanda para
                      acompanhar, sem gerar outra cobrança.
                    </span>
                  ) : (
                    <span>
                      Nenhuma forma de pagamento está disponível para sua conta agora. Fale com a equipe.
                    </span>
                  )}
                </S.Alert>
              ) : null}

              <S.DetailsToggle type="button" onClick={onRefresh} disabled={loading}>
                <RefreshCw size={15} />
                {loading ? 'Atualizando...' : 'Atualizar comanda'}
              </S.DetailsToggle>
            </>
          ) : (
            <S.Empty>Não foi possível carregar sua comanda.</S.Empty>
          )}
        </S.Scroll>
        {snapshot ? (
          <S.PaymentActions aria-label="Pagamento da sua comanda">
            {visiblePayment ? (
              <S.PayButton type="button" onClick={() => onOpenPayment(visiblePayment)}>
                {visiblePayment.method === 'PIX'
                  ? 'Pagar com PIX'
                  : visiblePayment.method === 'CASH'
                    ? 'Pagar com dinheiro'
                    : `Continuar com ${tablePaymentMethodLabel(visiblePayment.method)}`}
                <ArrowRight size={18} aria-hidden="true" />
              </S.PayButton>
            ) : hasPayableBalance && preview ? (
              <>
                <S.PayButton
                  className={!snapshot.capabilities.allowPix ? 'unavailable' : undefined}
                  type="button"
                  disabled={
                    busy ||
                    loading ||
                    Boolean(error) ||
                    !snapshot.capabilities.allowPix
                  }
                  onClick={() => void startPayment('PIX')}
                >
                  <PixIcon />
                  <span className="payment-method-label">
                    {snapshot.capabilities.allowPix
                      ? actionLoading
                        ? 'Gerando pagamento...'
                        : 'Pagar com PIX'
                      : 'PIX indisponível'}
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </S.PayButton>
                <S.PayButton
                  className={!snapshot.capabilities.allowCard ? 'unavailable' : undefined}
                  type="button"
                  disabled={
                    busy ||
                    loading ||
                    Boolean(error) ||
                    !snapshot.capabilities.allowCard
                  }
                  onClick={onOpenCardPayment}
                >
                  <span className="payment-method-icon" aria-hidden="true" data-payment-method-icon="card">
                    <CreditCard size={20} strokeWidth={2.1} />
                  </span>
                  <span className="payment-method-label">
                    {snapshot.capabilities.allowCard ? 'Pagar com cartão' : 'Cartão indisponível'}
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </S.PayButton>
                {snapshot.capabilities.allowCash ? (
                  <S.PayButton
                    type="button"
                    disabled={busy || loading || Boolean(error)}
                    onClick={() => void startPayment('CASH')}
                  >
                    <span className="payment-method-icon" aria-hidden="true" data-payment-method-icon="cash">
                      <Banknote size={20} strokeWidth={2.1} />
                    </span>
                    <span className="payment-method-label">Pagar com dinheiro</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </S.PayButton>
                ) : null}
                {!snapshot.capabilities.allowPix || !snapshot.capabilities.allowCard ? (
                  <small>
                    PIX e cartão são ativados automaticamente quando o restaurante configura
                    esses métodos no painel administrativo.
                  </small>
                ) : (
                  <small>Você nunca paga o consumo de outro participante por esta tela.</small>
                )}
              </>
            ) : (
              <S.PayButton type="button" onClick={onClose}>
                Voltar ao cardápio <ArrowRight size={18} aria-hidden="true" />
              </S.PayButton>
            )}
          </S.PaymentActions>
        ) : null}
      </S.Panel>
    </S.Backdrop>
  );
}

export function TableAccountPanel(props: Props) {
  if (!props.open) return null;
  const sessionKey = `${props.snapshot?.summary.sessionPublicId || 'loading'}:${props.snapshot?.currentParticipantPublicId || ''}`;
  return <TableAccountPanelContent key={sessionKey} {...props} />;
}
