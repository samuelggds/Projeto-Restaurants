import {
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  ReceiptText,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAppDialog } from '../../../components/AppDialog/context';
import type { RestaurantTable, WaiterTableAccountSnapshot } from '../types';
import { useWaiterWorkspace } from '../useWaiterWorkspace';
import { brl } from './Shared';
import * as S from './WaiterTableAccountDialog.styles';

const paymentMethodLabel = {
  PIX: 'Pix online',
  CARD: 'Cartão online',
  CASH: 'Dinheiro',
  CARD_MACHINE: 'Cartão na maquininha',
} as const;

const paymentStatusLabel = {
  RESERVED: 'Aguardando recebimento',
  PROCESSING: 'Processando',
  PAID: 'Pago',
  FAILED: 'Falhou',
  EXPIRED: 'Expirou',
  CANCELED: 'Cancelado',
  REFUNDED: 'Estornado',
} as const;

function getErrorMessage(error: unknown, fallback: string) {
  const typed = error as { response?: { data?: { error?: string } }; message?: string };
  return typed.response?.data?.error || typed.message || fallback;
}

function isManualPayment(payment: WaiterTableAccountSnapshot['paymentIntents'][number]) {
  return payment.method === 'CASH' || payment.method === 'CARD_MACHINE';
}

function canConfirmManualPayment(payment: WaiterTableAccountSnapshot['paymentIntents'][number]) {
  return isManualPayment(payment) && ['RESERVED', 'PROCESSING'].includes(payment.status);
}

function formatConfirmation(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WaiterTableAccountDialog({
  table,
  onClose,
}: {
  table: RestaurantTable;
  onClose: () => void;
}) {
  const { confirmDialog } = useAppDialog();
  const { onRefresh, tableAccountRefreshKey, tableAccountClient } = useWaiterWorkspace();
  const [snapshot, setSnapshot] = useState<WaiterTableAccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPaymentId, setBusyPaymentId] = useState('');
  const [error, setError] = useState('');
  const sessionPublicId = table.sessionPublicId || '';

  const loadSnapshot = useCallback(async () => {
    if (!sessionPublicId) {
      setLoading(false);
      setError('A conta desta mesa ainda não foi identificada. Atualize os dados do salão.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = (await tableAccountClient.getAdminSnapshot(
        sessionPublicId,
      )) as WaiterTableAccountSnapshot;
      setSnapshot(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Não foi possível carregar a conta desta mesa.'));
    } finally {
      setLoading(false);
    }
  }, [sessionPublicId, tableAccountClient]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadSnapshot();
    });
    return () => {
      active = false;
    };
  }, [loadSnapshot, tableAccountRefreshKey]);

  const confirmManual = async (payment: WaiterTableAccountSnapshot['paymentIntents'][number]) => {
    const method = payment.method === 'CASH' ? 'dinheiro' : 'maquininha';
    const confirmed = await confirmDialog({
      title: 'Confirmar pagamento recebido?',
      description: `Mesa ${String(table.number).padStart(2, '0')} • ${brl(payment.totalCents / 100)} em ${method}. Confirme somente depois de receber o valor do cliente.`,
      confirmLabel: 'Confirmar recebimento',
      cancelLabel: 'Voltar e conferir',
    });
    if (!confirmed) return;

    setBusyPaymentId(payment.publicId);
    setError('');
    try {
      await tableAccountClient.confirmManualPayment(payment.publicId);
      await loadSnapshot();
      await onRefresh?.();
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, 'Não foi possível confirmar o recebimento deste pagamento.'),
      );
    } finally {
      setBusyPaymentId('');
    }
  };

  return (
    <S.PaymentBackdrop role="presentation" onClick={onClose}>
      <S.PaymentDialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="waiter-table-account-title"
        onClick={(event) => event.stopPropagation()}
      >
        <S.PaymentHeader>
          <span className="icon" aria-hidden="true">
            <ReceiptText />
          </span>
          <span>
            <small>COMANDA EM TEMPO REAL</small>
            <h2 id="waiter-table-account-title">
              Comanda • Mesa {String(table.number).padStart(2, '0')}
            </h2>
            <p>Acompanhe consumo, pagamentos online e saldo restante em tempo real.</p>
          </span>
          <button type="button" aria-label="Fechar comanda da mesa" onClick={onClose}>
            <X />
          </button>
        </S.PaymentHeader>

        <S.PaymentDialogBody>
          <S.AccountGuidance role="note">
            <Info />
            <div>
              <b>Prévia da comanda</b>
              <p>
                Pedidos e pagamentos online aparecem automaticamente. Pix e cartão só entram como pagos depois da confirmação do provedor.
              </p>
            </div>
          </S.AccountGuidance>

          {loading && !snapshot ? (
            <S.AccountLoading role="status">
              <RefreshCw /> Carregando comanda...
            </S.AccountLoading>
          ) : snapshot ? (
            <>
              <S.AccountSummary aria-label="Resumo financeiro da mesa">
                <span>
                  <small>Consumido</small>
                  <b>{brl(snapshot.summary.consumedCents / 100)}</b>
                </span>
                <span className="paid">
                  <small>Pago online</small>
                  <b>{brl(snapshot.summary.netPaidCents / 100)}</b>
                </span>
                <span className="remaining">
                  <small>Saldo restante</small>
                  <b>{brl(snapshot.summary.remainingCents / 100)}</b>
                </span>
              </S.AccountSummary>
              {snapshot.summary.remainingCents === 0 && snapshot.summary.consumedCents > 0 && (
                <S.ProcessingNotice>
                  <CheckCircle2 />
                  Comanda quitada. Todo o consumo registrado nesta mesa já foi pago.
                </S.ProcessingNotice>
              )}

              <S.AccountPayments>
                <header>
                  <div>
                    <h3>Consumo da mesa</h3>
                    <p>Itens lançados na comanda e quem realizou cada pedido.</p>
                  </div>
                </header>
                {snapshot.items.map((item) => (
                  <S.PaymentRow key={item.publicId} $status={item.financialStatus === 'PAID' ? 'PAID' : item.processingCents > 0 || item.reservedCents > 0 ? 'PROCESSING' : 'RESERVED'}>
                    <span className="method-icon" aria-hidden="true"><ReceiptText /></span>
                    <span className="payment-info">
                      <b>{item.productName}</b>
                      <small>{item.orderedByDisplayName}</small>
                    </span>
                    <span className="payment-value">
                      <b>{brl(item.unitPriceCents / 100)}</b>
                      <em>{item.financialStatus === 'PAID' ? 'Pago' : item.processingCents > 0 || item.reservedCents > 0 ? 'Em pagamento' : 'Pendente'}</em>
                    </span>
                  </S.PaymentRow>
                ))}
                {!snapshot.items.length && <S.AccountEmpty>Nenhum item lançado nesta mesa.</S.AccountEmpty>}
              </S.AccountPayments>

              <S.AccountPayments>
                <header>
                  <div>
                    <h3>Participantes</h3>
                    <p>Identificação de clientes cadastrados e visitantes.</p>
                  </div>
                </header>
                {snapshot.participants.filter((participant) => participant.status === 'ACTIVE').map((participant) => (
                  <S.PaymentRow key={participant.publicId} $status="PAID">
                    <span className="method-icon" aria-hidden="true"><CheckCircle2 /></span>
                    <span className="payment-info">
                      <b>{participant.displayName || 'Cliente da mesa'}</b>
                      <small>{participant.authenticated ? 'Cliente cadastrado' : 'Visitante'}</small>
                    </span>
                  </S.PaymentRow>
                ))}
              </S.AccountPayments>
              {snapshot.summary.processingCents > 0 && (
                <S.ProcessingNotice>
                  <Clock3 />
                  {brl(snapshot.summary.processingCents / 100)} está reservado ou sendo processado.
                  Aguarde a confirmação antes de fechar a mesa.
                </S.ProcessingNotice>
              )}

              <S.AccountPayments>
                <header>
                  <div>
                    <h3>Pagamentos online</h3>
                    <p>Confirmações do Pix e cartão aparecem automaticamente.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Atualizar comanda da mesa"
                    onClick={() => void loadSnapshot()}
                    disabled={loading}
                  >
                    <RefreshCw />
                  </button>
                </header>
                {snapshot.paymentIntents.map((payment) => {
                  const manual = isManualPayment(payment);
                  const confirmable = canConfirmManualPayment(payment);
                  return (
                    <S.PaymentRow key={payment.publicId} $status={payment.status}>
                      <span className="method-icon" aria-hidden="true">
                        {manual ? <Banknote /> : <CreditCard />}
                      </span>
                      <span className="payment-info">
                        <b>{paymentMethodLabel[payment.method]}</b>
                        <small>
                          {payment.status === 'PAID'
                            ? payment.manualConfirmedByName
                              ? `Recebimento confirmado por ${payment.manualConfirmedByName}${
                                  formatConfirmation(payment.manualConfirmedAt)
                                    ? ` em ${formatConfirmation(payment.manualConfirmedAt)}`
                                    : ''
                                }`
                              : 'Confirmação automática recebida'
                            : confirmable
                              ? 'Confira o recebimento presencial antes de confirmar'
                              : payment.status === 'PROCESSING'
                                ? 'Aguardando confirmação automática do provedor'
                                : paymentStatusLabel[payment.status]}
                        </small>
                      </span>
                      <span className="payment-value">
                        <b>{brl(payment.totalCents / 100)}</b>
                        <em>{paymentStatusLabel[payment.status]}</em>
                      </span>
                      {confirmable && (
                        <S.ConfirmReceivedButton
                          type="button"
                          disabled={busyPaymentId === payment.publicId}
                          onClick={() => void confirmManual(payment)}
                        >
                          <CheckCircle2 />
                          {busyPaymentId === payment.publicId
                            ? 'Confirmando...'
                            : 'Confirmar valor recebido'}
                        </S.ConfirmReceivedButton>
                      )}
                    </S.PaymentRow>
                  );
                })}
                {!snapshot.paymentIntents.length && (
                  <S.AccountEmpty>Nenhum pagamento foi iniciado nesta mesa.</S.AccountEmpty>
                )}
              </S.AccountPayments>
            </>
          ) : null}
          {error && <S.Error role="alert">{error}</S.Error>}
        </S.PaymentDialogBody>
      </S.PaymentDialog>
    </S.PaymentBackdrop>
  );
}
