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
import tableAccountService from '../../../Services/tableAccountService';
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
  const { onRefresh, tableAccountRefreshKey } = useWaiterWorkspace();
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
      const result = (await tableAccountService.getAdminSnapshot(
        sessionPublicId,
      )) as WaiterTableAccountSnapshot;
      setSnapshot(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Não foi possível carregar a conta desta mesa.'));
    } finally {
      setLoading(false);
    }
  }, [sessionPublicId]);

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
      await tableAccountService.confirmManualPayment(payment.publicId);
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
            <small>CONFERÊNCIA DO ATENDIMENTO</small>
            <h2 id="waiter-table-account-title">
              Conta da mesa {String(table.number).padStart(2, '0')}
            </h2>
            <p>Confira o que já foi pago e o que ainda depende de recebimento presencial.</p>
          </span>
          <button type="button" aria-label="Fechar conta da mesa" onClick={onClose}>
            <X />
          </button>
        </S.PaymentHeader>

        <S.PaymentDialogBody>
          <S.AccountGuidance role="note">
            <Info />
            <div>
              <b>Como a confirmação funciona</b>
              <p>
                <strong>Pix e cartão online</strong> são confirmados automaticamente pelo provedor.
                Em <strong>dinheiro ou maquininha</strong>, confirme abaixo somente depois de
                receber o valor do cliente.
              </p>
            </div>
          </S.AccountGuidance>

          {loading && !snapshot ? (
            <S.AccountLoading role="status">
              <RefreshCw /> Carregando conta da mesa...
            </S.AccountLoading>
          ) : snapshot ? (
            <>
              <S.AccountSummary aria-label="Resumo financeiro da mesa">
                <span>
                  <small>Total consumido</small>
                  <b>{brl(snapshot.summary.consumedCents / 100)}</b>
                </span>
                <span className="paid">
                  <small>Já confirmado</small>
                  <b>{brl(snapshot.summary.netPaidCents / 100)}</b>
                </span>
                <span className="remaining">
                  <small>Ainda falta pagar</small>
                  <b>{brl(snapshot.summary.remainingCents / 100)}</b>
                </span>
              </S.AccountSummary>
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
                    <h3>Pagamentos desta mesa</h3>
                    <p>Os pagamentos mais recentes aparecem primeiro.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Atualizar conta da mesa"
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
