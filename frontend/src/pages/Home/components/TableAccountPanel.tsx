import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  currentParticipantAccount,
  formatTableMoney,
  previewIndividualTablePayment,
  type CreateTablePaymentResult,
  type TableAccountSnapshot,
  type TablePaymentDraft,
  type TablePaymentIntent,
} from '../domain/tableAccount';
import { TablePaymentStatusView } from './TablePaymentStatusView';
import * as S from './TableAccountPanel.styles';

type Props = {
  open: boolean;
  tableNumber: string | number;
  snapshot: TableAccountSnapshot | null;
  loading: boolean;
  actionLoading: boolean;
  error: string;
  onRefresh: () => void;
  onCreatePayment: (draft: TablePaymentDraft) => Promise<CreateTablePaymentResult | null>;
  onCancelPayment: (paymentPublicId: string) => Promise<boolean>;
  onReconcilePayment: (paymentPublicId: string) => Promise<TablePaymentIntent | null>;
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
    onCancelPayment,
    onReconcilePayment,
    onRemoveOrder,
    draftCount = 0,
    draftTotal = 0,
    onReviewDraft,
    orderingBlocked = false,
    onClose,
  } = props;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const paymentStageRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const removalInFlightRef = useRef(false);
  const [removing, setRemoving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    orderPublicId: string;
    productName: string;
  } | null>(null);
  const [payment, setPayment] = useState<TablePaymentIntent | null>(null);
  const [reviewingPayment, setReviewingPayment] = useState(false);

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
  const canPay = Boolean(
    snapshot?.capabilities.enabled &&
    snapshot.summary.status !== 'CLOSED' &&
    (snapshot.capabilities.allowPix || snapshot.capabilities.allowCash) &&
    preview &&
    preview.totalCents > 0 &&
    !preview.blocked,
  );

  const ownActivePayment =
    snapshot?.activePayment &&
    snapshot.activePayment.payerParticipantPublicId === snapshot.currentParticipantPublicId
      ? snapshot.activePayment
      : null;
  const paymentBase = payment ?? ownActivePayment;
  const canonicalPayment = paymentBase
    ? snapshot?.payments.find((entry) => entry.publicId === paymentBase.publicId)
    : null;
  const visiblePayment = paymentBase
    ? { ...paymentBase, status: canonicalPayment?.status || paymentBase.status }
    : null;
  const showPayment = Boolean(visiblePayment && !reviewingPayment);
  const currentStep = !showPayment
    ? 1
    : ['RESERVED', 'PROCESSING'].includes(visiblePayment!.status)
      ? 2
      : 3;

  useEffect(() => {
    if (!visiblePayment?.publicId || !showPayment) return;
    paymentStageRef.current?.scrollIntoView?.({ block: 'start' });
    paymentStageRef.current?.focus({ preventScroll: true });
  }, [visiblePayment?.publicId, showPayment]);

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
    if (result?.payment) setPayment(result.payment);
  };

  const verifyPayment = async () => {
    if (!visiblePayment) return null;
    const updated = await onReconcilePayment(visiblePayment.publicId);
    if (updated) setPayment(updated);
    return updated;
  };

  const cancelPayment = async () => {
    if (!visiblePayment) return false;
    const canceled = await onCancelPayment(visiblePayment.publicId);
    if (canceled) setPayment(null);
    return canceled;
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
              {!showPayment ? (
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
                  {canPay || visiblePayment ? (
                    <S.Guide>
                      <ShieldCheck size={22} aria-hidden="true" />
                      <div>
                        <b>Você paga somente o seu consumo</b>
                        <p>PIX confirma automaticamente. Dinheiro só vira pago após a confirmação do administrador.</p>
                      </div>
                    </S.Guide>
                  ) : null}
                </>
              ) : null}

              {showPayment && visiblePayment ? (
                <div
                  ref={paymentStageRef}
                  tabIndex={-1}
                  role="region"
                  aria-label="Pagamento da comanda"
                >
                  <S.DetailsToggle type="button" onClick={() => setReviewingPayment(true)}>
                    <ArrowLeft size={16} aria-hidden="true" /> Rever meus pedidos
                  </S.DetailsToggle>
                  <TablePaymentStatusView
                    payment={visiblePayment}
                    status={visiblePayment.status}
                    actionLoading={actionLoading}
                    onVerify={verifyPayment}
                    onCancel={cancelPayment}
                    onStartOver={() => setPayment(null)}
                    onClose={onClose}
                  />
                </div>
              ) : !canPay && !visiblePayment && items.length > 0 ? (
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
        {snapshot && !showPayment ? (
          <S.PaymentActions aria-label="Pagamento da sua comanda">
            {visiblePayment ? (
              <S.PayButton type="button" onClick={() => setReviewingPayment(false)}>
                Voltar ao pagamento <ArrowRight size={18} aria-hidden="true" />
              </S.PayButton>
            ) : canPay && preview ? (
              <>
                {snapshot.capabilities.allowPix ? (
                  <S.PayButton
                    type="button"
                    disabled={busy || loading || Boolean(error)}
                    onClick={() => void startPayment('PIX')}
                  >
                    {actionLoading
                      ? 'Gerando pagamento...'
                      : `Pagar minha conta com Pix · ${formatTableMoney(preview.totalCents)}`}
                    <ArrowRight size={18} aria-hidden="true" />
                  </S.PayButton>
                ) : null}
                {snapshot.capabilities.allowCash ? (
                  <S.PayButton
                    type="button"
                    disabled={busy || loading || Boolean(error)}
                    onClick={() => void startPayment('CASH')}
                  >
                    Pagar minha conta em dinheiro · {formatTableMoney(preview.totalCents)}
                    <ArrowRight size={18} aria-hidden="true" />
                  </S.PayButton>
                ) : null}
                <small>Você nunca paga o consumo de outro participante por esta tela.</small>
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
