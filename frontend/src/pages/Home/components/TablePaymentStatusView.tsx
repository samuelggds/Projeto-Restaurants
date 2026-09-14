import { useEffect, useState } from 'react';
import { Check, Clock3, Copy, CreditCard, RefreshCw, Users } from 'lucide-react';
import QRCode from 'react-qr-code';
import { PaymentResultView } from '../../../components/payment/PaymentResultView';
import {
  formatTableMoney,
  type TablePaymentIntent,
  type TablePaymentStatus,
} from '../domain/tableAccount';
import * as S from './TablePaymentStatusView.styles';

type Props = {
  payment: TablePaymentIntent;
  status: TablePaymentStatus;
  actionLoading: boolean;
  restaurantCategory?: unknown;
  onVerify: () => Promise<TablePaymentIntent | null>;
  onCancel: () => Promise<boolean>;
  onStartOver: () => void;
  onClose: () => void;
};

const terminalDescriptions: Record<
  Exclude<TablePaymentStatus, 'RESERVED' | 'PROCESSING'>,
  string
> = {
  PAID: 'Tudo certo! Seu pagamento foi recebido e o valor já foi abatido da conta da mesa.',
  FAILED:
    'Não foi possível concluir este pagamento. Você pode tentar novamente ou escolher outra forma de pagar.',
  EXPIRED:
    'O prazo deste pagamento terminou. Você pode voltar à conta da mesa e iniciar uma nova tentativa.',
  CANCELED: 'Este pagamento foi cancelado. Você pode voltar à conta e escolher como deseja pagar.',
  REFUNDED:
    'O estorno foi registrado na conta da mesa. O prazo para receber o valor depende da sua instituição financeira.',
};

export function TablePaymentStatusView({
  payment,
  status,
  actionLoading,
  restaurantCategory,
  onVerify,
  onCancel,
  onStartOver,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const manual = payment.method === 'CASH' || payment.method === 'CARD_MACHINE';
  const pending = status === 'RESERVED' || status === 'PROCESSING';
  const checkoutUrl = /^https:\/\//i.test(payment.checkoutUrl || '')
    ? String(payment.checkoutUrl)
    : '';
  const awaitingCardDetails = pending && payment.method === 'CARD' && Boolean(checkoutUrl);

  const title = manual
    ? 'Aguardando o garçom'
    : payment.method === 'PIX'
      ? 'Pague com Pix'
      : awaitingCardDetails
        ? 'Informe os dados do cartão'
        : 'Confirmando pagamento com cartão';
  const description = manual
    ? payment.method === 'CASH'
      ? 'Entregue o dinheiro à equipe. Assim que o garçom confirmar o recebimento, o valor será abatido da sua conta.'
      : 'A equipe fará a cobrança na maquininha. Assim que o pagamento for confirmado, o valor será abatido da sua conta.'
    : payment.method === 'PIX'
      ? 'Use o QR Code ou copie o código para pagar no seu banco. A confirmação aparecerá aqui automaticamente.'
      : awaitingCardDetails
        ? 'Abra a página de pagamento e preencha os dados do cartão para continuar.'
        : 'Seu pagamento com cartão está sendo processado. A confirmação aparecerá aqui automaticamente.';

  const copyPaymentCode = async () => {
    if (!payment.paymentCode) return;
    try {
      await navigator.clipboard.writeText(payment.paymentCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_500);
    } catch {
      setCopied(false);
    }
  };

  const verify = async () => {
    setVerificationMessage('');
    const result = await onVerify();
    if (result && result.status !== 'PAID') {
      setVerificationMessage(
        'Ainda aguardando a confirmação do pagamento. A consulta continuará automaticamente.',
      );
    }
  };

  useEffect(() => {
    if (!pending || manual) return undefined;
    const intervalId = window.setInterval(() => {
      if (!document.hidden && !actionLoading) void onVerify();
    }, 5_000);
    return () => window.clearInterval(intervalId);
  }, [actionLoading, manual, onVerify, pending]);

  if (status !== 'RESERVED' && status !== 'PROCESSING') {
    const methodLabels = {
      PIX: 'Pix',
      CARD: 'Cartão',
      CASH: 'Dinheiro',
      CARD_MACHINE: 'Cartão na maquininha',
    };

    return (
      <PaymentResultView
        embedded
        status={status}
        method={methodLabels[payment.method]}
        restaurantCategory={restaurantCategory ?? 'RESTAURANTE'}
        orderLabel="Conta da mesa"
        amount={formatTableMoney(payment.totalCents)}
        description={terminalDescriptions[status]}
        onAutoReturn={manual ? undefined : onClose}
        primaryAction={
          status === 'PAID'
            ? { label: 'Concluir', onClick: onClose }
            : status === 'REFUNDED'
              ? { label: 'Voltar à conta', onClick: onStartOver }
              : { label: 'Fazer nova tentativa', onClick: onStartOver, disabled: actionLoading }
        }
        secondaryAction={
          status === 'PAID' || status === 'REFUNDED'
            ? undefined
            : { label: 'Fechar', onClick: onClose }
        }
      />
    );
  }

  return (
    <S.PaymentStage data-status={status} aria-live="polite">
      <S.PaymentStatusIcon data-status={status}>
        {manual ? <Users size={31} /> : <Clock3 size={31} />}
      </S.PaymentStatusIcon>
      <h3>{title}</h3>
      <p>{description}</p>
      <strong className="payment-total">{formatTableMoney(payment.totalCents)}</strong>
      <span className="status-chip">
        {status === 'RESERVED'
          ? 'Reservado'
          : awaitingCardDetails
            ? 'Aguardando dados do cartão'
            : 'Em confirmação'}
      </span>

      <S.AmountBreakdown aria-label="Composição do pagamento">
        <span>
          Itens <b>{formatTableMoney(payment.subtotalCents)}</b>
        </span>
        <span>
          Taxa de serviço <b>{formatTableMoney(payment.serviceFeeCents)}</b>
        </span>
        <span>
          Total <b>{formatTableMoney(payment.totalCents)}</b>
        </span>
      </S.AmountBreakdown>

      {pending && payment.method === 'PIX' && payment.paymentCode && (
        <S.PixArea>
          <div className="qr-code" aria-label="QR Code Pix">
            <QRCode value={payment.paymentCode} size={184} level="M" />
          </div>
          <S.PaymentCode>{payment.paymentCode}</S.PaymentCode>
          <S.SecondaryAction type="button" disabled={actionLoading} onClick={copyPaymentCode}>
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied ? 'Código copiado' : 'Copiar código Pix'}
          </S.SecondaryAction>
        </S.PixArea>
      )}

      {pending && payment.method === 'CARD' && checkoutUrl && (
        <S.CheckoutLink href={checkoutUrl} target="_blank" rel="noopener noreferrer">
          <CreditCard size={17} />
          Abrir checkout seguro do cartão
        </S.CheckoutLink>
      )}

      {verificationMessage && <S.VerificationMessage>{verificationMessage}</S.VerificationMessage>}

      {pending && !manual && (
        <S.SecondaryAction type="button" disabled={actionLoading} onClick={() => void verify()}>
          <RefreshCw size={17} />
          {actionLoading ? 'Verificando pagamento...' : 'Verificar pagamento agora'}
        </S.SecondaryAction>
      )}
      {pending && (
        <S.TextAction type="button" disabled={actionLoading} onClick={() => void onCancel()}>
          Cancelar esta reserva
        </S.TextAction>
      )}
    </S.PaymentStage>
  );
}
