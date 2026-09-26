import { useEffect, useMemo, useRef, useState } from 'react';
import { QrCode, ReceiptText, RefreshCw, X } from 'lucide-react';
import {
  formatTableMoney,
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
    onClose,
  } = props;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    orderPublicId: string;
    productName: string;
  } | null>(null);
  const [payment, setPayment] = useState<TablePaymentIntent | null>(null);

  const items = useMemo(
    () => snapshot?.items.filter((item) => item.orderStatus !== 'CANCELED') || [],
    [snapshot],
  );

  const ownActivePayment =
    snapshot?.activePayment &&
    snapshot.activePayment.payerParticipantPublicId === snapshot.currentParticipantPublicId
      ? snapshot.activePayment
      : null;
  const visiblePayment = payment ?? ownActivePayment;

  const orderItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      counts.set(item.orderPublicId, (counts.get(item.orderPublicId) || 0) + 1);
    });
    return counts;
  }, [items]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [onClose]);

  const startPixPayment = async () => {
    if (!snapshot || actionLoading) return;
    const result = await onCreatePayment({
      selectionMode: 'MY_ITEMS',
      method: 'PIX',
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
    if (!removeTarget || !onRemoveOrder) return;
    const removed = await onRemoveOrder(removeTarget.orderPublicId);
    if (removed) setRemoveTarget(null);
  };

  return (
    <S.Backdrop
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <S.Panel role="dialog" aria-modal="true" aria-labelledby="table-account-title">
        <S.Header>
          <span className="icon">
            <ReceiptText size={23} />
          </span>
          <div>
            <h2 id="table-account-title">Sua comanda • Mesa {String(tableNumber)}</h2>
            <p>Seus pedidos aparecem aqui automaticamente em tempo real.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fechar comanda"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </S.Header>

        <S.Scroll>
          {error ? (
            <S.Alert $error>
              <span>{error}</span>
              <button type="button" onClick={onRefresh}>Tentar novamente</button>
            </S.Alert>
          ) : null}

          {loading && !snapshot ? (
            <S.Loading>Carregando sua comanda...</S.Loading>
          ) : snapshot ? (
            <>
              {removeTarget ? (
                <S.Alert $error>
                  <span>
                    Remover <b>{removeTarget.productName}</b> da sua comanda? Esta ação cancela
                    este pedido antes do preparo.
                  </span>
                  <span>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setRemoveTarget(null)}
                    >
                      Manter
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void confirmRemoval()}
                    >
                      Remover
                    </button>
                  </span>
                </S.Alert>
              ) : null}

              <S.ReceiptPreview aria-label="Sua comanda em tempo real">
                <header>
                  <span>
                    <small>GastroNexa • sua comanda</small>
                    <strong>Mesa {String(tableNumber).padStart(2, '0')}</strong>
                  </span>
                  <em>{items.length} {items.length === 1 ? 'item' : 'itens'}</em>
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
                                disabled={actionLoading}
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
                    <small>Consumido</small>
                    <b>{formatTableMoney(snapshot.summary.consumedCents)}</b>
                  </span>
                  <span>
                    <small>Pago</small>
                    <b>{formatTableMoney(snapshot.summary.netPaidCents)}</b>
                  </span>
                  <span className="remaining">
                    <small>Falta pagar</small>
                    <b>{formatTableMoney(snapshot.summary.remainingCents)}</b>
                  </span>
                </S.ReceiptTotals>

                <footer>
                  <RefreshCw size={13} />
                  Atualiza automaticamente quando você faz ou cancela um pedido.
                </footer>
              </S.ReceiptPreview>

              {visiblePayment ? (
                <TablePaymentStatusView
                  payment={visiblePayment}
                  status={visiblePayment.status}
                  actionLoading={actionLoading}
                  onVerify={verifyPayment}
                  onCancel={cancelPayment}
                  onStartOver={() => setPayment(null)}
                  onClose={() => setPayment(null)}
                />
              ) : items.length > 0 &&
                snapshot.summary.remainingCents > 0 &&
                snapshot.capabilities.allowOnlinePayment &&
                snapshot.capabilities.allowPix ? (
                <S.PaymentActions aria-label="Pagamento da sua comanda">
                  <S.PayButton
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void startPixPayment()}
                  >
                    <QrCode size={18} />
                    {actionLoading
                      ? 'Gerando Pix...'
                      : `Pagar ${formatTableMoney(snapshot.summary.remainingCents)} com Pix`}
                  </S.PayButton>
                  <small>
                    Prefere cartão? Chame o garçom e pague presencialmente na maquininha.
                  </small>
                </S.PaymentActions>
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
      </S.Panel>
    </S.Backdrop>
  );
}

export function TableAccountPanel(props: Props) {
  if (!props.open) return null;
  const sessionKey = props.snapshot?.summary.sessionPublicId || 'loading';
  return <TableAccountPanelContent key={sessionKey} {...props} />;
}
