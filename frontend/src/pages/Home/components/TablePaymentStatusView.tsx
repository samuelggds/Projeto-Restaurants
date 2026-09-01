import { useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  RefreshCw,
  RotateCcw,
  TimerOff,
  Users,
  XCircle,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import {
  formatTableMoney,
  type TablePaymentIntent,
  type TablePaymentStatus,
} from '../domain/tableAccount';
import { Submit } from './TableAccountPanel.styles';
import * as S from './TablePaymentStatusView.styles';

type Props = {
  payment: TablePaymentIntent;
  status: TablePaymentStatus;
  actionLoading: boolean;
  onVerify: () => Promise<TablePaymentIntent | null>;
  onCancel: () => Promise<boolean>;
  onStartOver: () => void;
  onClose: () => void;
};

const terminalCopy: Record<
  Exclude<TablePaymentStatus, 'RESERVED' | 'PROCESSING'>,
  { title: string; description: string }
> = {
  PAID: {
    title: 'Pagamento confirmado',
    description: 'O backend confirmou o recebimento e o valor já foi abatido da conta.',
  },
  FAILED: {
    title: 'Pagamento não aprovado',
    description: 'A cobrança não foi concluída e o valor voltou a ficar disponível.',
  },
  EXPIRED: {
    title: 'Tempo para pagar encerrado',
    description: 'A reserva expirou e o valor voltou a ficar disponível na conta.',
  },
  CANCELED: {
    title: 'Pagamento cancelado',
    description: 'A reserva foi cancelada e nenhum valor foi confirmado como pago.',
  },
  REFUNDED: {
    title: 'Pagamento estornado',
    description: 'O estorno foi registrado e aparece no histórico desta conta.',
  },
};

function StatusIcon({ status, manual }: { status: TablePaymentStatus; manual: boolean }) {
  if (status === 'PAID') return <CheckCircle2 size={31} />;
  if (status === 'FAILED') return <XCircle size={31} />;
  if (status === 'EXPIRED') return <TimerOff size={31} />;
  if (status === 'CANCELED') return <Ban size={31} />;
  if (status === 'REFUNDED') return <RotateCcw size={31} />;
  return manual ? <Users size={31} /> : <Clock3 size={31} />;
}

export function TablePaymentStatusView({
  payment,
  status,
  actionLoading,
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

  const title = pending
    ? manual
      ? 'Aguardando o garçom'
      : payment.method === 'PIX'
        ? 'Pague com Pix'
        : 'Finalize o pagamento com cartão'
    : terminalCopy[status].title;
  const description = pending
    ? manual
      ? payment.method === 'CASH'
        ? 'Entregue o dinheiro à equipe. A conta só muda para paga depois da confirmação no painel do garçom.'
        : 'A equipe fará a cobrança na maquininha. A conta só muda para paga depois da confirmação no painel do garçom.'
      : payment.method === 'PIX'
        ? 'Use o QR Code ou copie o código. Depois, aguarde a confirmação do banco.'
        : 'Conclua no checkout seguro e volte para verificar a aprovação do provedor.'
    : terminalCopy[status].description;

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
        'Ainda aguardando a confirmação do provedor. Tente novamente em instantes.',
      );
    }
  };

  return (
    <S.PaymentStage data-status={status} aria-live="polite">
      <S.PaymentStatusIcon data-status={status}>
        <StatusIcon status={status} manual={manual} />
      </S.PaymentStatusIcon>
      <h3>{title}</h3>
      <p>{description}</p>
      <strong className="payment-total">{formatTableMoney(payment.totalCents)}</strong>
      <span className="status-chip">
        {status === 'RESERVED'
          ? 'Reservado'
          : status === 'PROCESSING'
            ? 'Em confirmação'
            : terminalCopy[status].title}
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
        <S.CheckoutLink href={checkoutUrl}>
          <CreditCard size={17} />
          Continuar no checkout seguro
        </S.CheckoutLink>
      )}

      {verificationMessage && <S.VerificationMessage>{verificationMessage}</S.VerificationMessage>}

      {pending && !manual && (
        <S.SecondaryAction type="button" disabled={actionLoading} onClick={() => void verify()}>
          <RefreshCw size={17} />
          {actionLoading ? 'Consultando provedor...' : 'Verificar pagamento'}
        </S.SecondaryAction>
      )}
      {pending && (
        <S.TextAction type="button" disabled={actionLoading} onClick={() => void onCancel()}>
          Cancelar esta reserva
        </S.TextAction>
      )}
      {status === 'PAID' && (
        <Submit type="button" onClick={onClose}>
          Concluir <Check size={17} />
        </Submit>
      )}
      {['FAILED', 'EXPIRED', 'CANCELED'].includes(status) && (
        <Submit type="button" onClick={onStartOver}>
          Fazer nova tentativa <RefreshCw size={17} />
        </Submit>
      )}
      {status === 'REFUNDED' && (
        <S.SecondaryAction type="button" onClick={onStartOver}>
          Voltar à conta
        </S.SecondaryAction>
      )}
    </S.PaymentStage>
  );
}
