import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import type { PixPaymentData, PixPaymentStatus } from '../../Home/hooks/useCheckoutPayments';

type Props = {
  pixPaymentData: PixPaymentData;
  paymentStatus: PixPaymentStatus;
  paymentError: string | null;
  primaryColor?: string;
  formatCurrency: (value: number) => string;
  onCopyPixKey: () => void | Promise<void>;
  onVerify: () => void | Promise<unknown>;
  onBackToCart?: () => void;
};

type StatusTone = 'waiting' | 'checking' | 'pending' | 'success' | 'error';

const statusCopy: Record<
  PixPaymentStatus,
  { title: string; description: string; tone: StatusTone }
> = {
  WAITING: {
    title: 'Aguardando pagamento',
    description: 'Conclua o Pix no aplicativo do seu banco e verifique o pagamento.',
    tone: 'waiting',
  },
  VERIFYING: {
    title: 'Verificando com o provedor',
    description: 'Estamos consultando o pagamento. Isso não confirma o recebimento ainda.',
    tone: 'checking',
  },
  PENDING: {
    title: 'Pagamento ainda pendente',
    description: 'O backend consultou o provedor, mas o recebimento ainda não foi confirmado.',
    tone: 'pending',
  },
  PAID: {
    title: 'Pagamento confirmado',
    description: 'O backend confirmou o recebimento e o pedido foi liberado ao restaurante.',
    tone: 'success',
  },
  ERROR: {
    title: 'Não foi possível confirmar',
    description: 'O pedido continua sem confirmação. Aguarde um instante e verifique novamente.',
    tone: 'error',
  },
};

const Wrap = styled.main<{ $primary: string }>`
  --pix-primary: ${({ $primary }) => $primary};
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 20px;
  background-color: #f2f4f0;
  background-image:
    linear-gradient(rgba(37, 57, 48, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37, 57, 48, 0.035) 1px, transparent 1px);
  background-size: 24px 24px;

  @media (max-width: 560px) {
    place-items: stretch;
    padding: 0;
  }
`;

const Card = styled.section`
  width: min(560px, 100%);
  overflow: hidden;
  border: 1px solid #dfe4dd;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(25, 38, 31, 0.12);

  @media (max-width: 560px) {
    width: 100%;
    min-height: 100dvh;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
`;

const Header = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 22px 24px 17px;
  border-bottom: 1px solid #e6e9e4;

  small,
  h1 {
    margin: 0;
  }

  small {
    color: #788078;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }

  h1 {
    margin-top: 4px;
    color: #202923;
    font-size: 21px;
    line-height: 1.2;
  }

  strong {
    color: #202923;
    font-size: 20px;
  }

  @media (max-width: 480px) {
    padding: 18px 16px 15px;

    h1,
    strong {
      font-size: 18px;
    }
  }
`;

const Content = styled.div`
  display: grid;
  gap: 15px;
  padding: 20px 24px 24px;

  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const Status = styled.div<{ $tone: StatusTone }>`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  padding: 13px;
  border: 1px solid
    ${({ $tone }) =>
      $tone === 'success'
        ? '#abd9b6'
        : $tone === 'error'
          ? '#ebc1bb'
          : $tone === 'checking'
            ? '#bad3df'
            : '#ead6a8'};
  border-radius: 8px;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? '#eff9f1'
      : $tone === 'error'
        ? '#fff3f1'
        : $tone === 'checking'
          ? '#eff7fa'
          : '#fff8e8'};
  color: ${({ $tone }) =>
    $tone === 'success'
      ? '#216638'
      : $tone === 'error'
        ? '#973e34'
        : $tone === 'checking'
          ? '#285d73'
          : '#765719'};

  > svg {
    width: 42px;
    height: 42px;
    padding: 9px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.75);
  }

  b,
  small {
    display: block;
  }

  b {
    font-size: 13px;
  }

  small {
    margin-top: 3px;
    font-size: 11px;
    line-height: 1.4;
  }
`;

const PaymentArea = styled.div`
  display: grid;
  grid-template-columns: 196px minmax(0, 1fr);
  gap: 16px;
  align-items: center;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const QrWrap = styled.div`
  width: 196px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 10px;
  border: 1px solid #dfe4dd;
  border-radius: 8px;
  background: #fff;

  img,
  svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  @media (max-width: 520px) {
    width: min(216px, 68vw);
    margin: 0 auto;
  }
`;

const PixDetails = styled.div`
  min-width: 0;

  > b,
  > small {
    display: block;
  }

  > b {
    color: #28312b;
    font-size: 12px;
  }

  > small {
    margin-top: 4px;
    color: #768078;
    font-size: 10px;
    line-height: 1.4;
  }
`;

const CodeBox = styled.code`
  max-height: 72px;
  display: block;
  overflow: auto;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #e0e4df;
  border-radius: 7px;
  background: #f5f7f4;
  color: #4c5850;
  font-size: 10px;
  line-height: 1.45;
  overflow-wrap: anywhere;
`;

const Button = styled.button<{ $primary?: boolean }>`
  min-height: 45px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 13px;
  border: 1px solid ${({ $primary }) => ($primary ? 'var(--pix-primary)' : '#d8ded8')};
  border-radius: 8px;
  background: ${({ $primary }) => ($primary ? 'var(--pix-primary)' : '#fff')};
  color: ${({ $primary }) => ($primary ? '#fff' : '#354139')};
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
`;

const CopyButton = styled(Button)`
  width: 100%;
  margin-top: 9px;
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const SafetyNote = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 11px;
  border-radius: 8px;
  background: #f5f7f4;
  color: #626d65;
  font-size: 10px;
  line-height: 1.45;

  svg {
    flex: 0 0 auto;
    color: var(--pix-primary);
  }
`;

const ErrorDetail = styled.p`
  margin: -6px 0 0;
  color: #923f36;
  font-size: 11px;
  line-height: 1.4;
`;

function StatusIcon({ status }: { status: PixPaymentStatus }) {
  if (status === 'PAID') return <CheckCircle2 />;
  if (status === 'ERROR') return <AlertTriangle />;
  if (status === 'VERIFYING') return <RefreshCw />;
  return <Clock3 />;
}

export default function PixPaymentPanel({
  pixPaymentData,
  paymentStatus,
  paymentError,
  primaryColor = '#bd4b1d',
  formatCurrency,
  onCopyPixKey,
  onVerify,
  onBackToCart,
}: Props) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const resolvedStatus =
    paymentStatus === 'PAID' && pixPaymentData.paid !== true ? 'ERROR' : paymentStatus;
  const content = statusCopy[resolvedStatus];
  const confirmed = resolvedStatus === 'PAID';

  useEffect(
    () => () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      await onCopyPixKey();
      setCopied(true);
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Wrap $primary={primaryColor}>
      <Card>
        <Header>
          <div>
            <small>Pagamento via Pix</small>
            <h1>{confirmed ? 'Tudo certo com seu pedido' : 'Conclua seu pagamento'}</h1>
          </div>
          <strong>{formatCurrency(pixPaymentData.total)}</strong>
        </Header>

        <Content>
          <Status $tone={content.tone} role="status" aria-live="polite">
            <StatusIcon status={resolvedStatus} />
            <span>
              <b>{content.title}</b>
              <small>{content.description}</small>
            </span>
          </Status>

          {resolvedStatus === 'ERROR' && paymentError && (
            <ErrorDetail role="alert">{paymentError}</ErrorDetail>
          )}

          {!confirmed && (
            <>
              <PaymentArea>
                <QrWrap aria-label="QR Code Pix">
                  {pixPaymentData.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixPaymentData.qrCodeBase64}`}
                      alt="QR Code Pix"
                    />
                  ) : (
                    <QRCode value={pixPaymentData.pixCode} size={176} level="M" />
                  )}
                </QrWrap>
                <PixDetails>
                  <b>Pix copia e cola</b>
                  <small>
                    Abra o app do banco, escolha Pix e use o QR Code ou o código abaixo.
                  </small>
                  <CodeBox>{pixPaymentData.pixCode}</CodeBox>
                  <CopyButton type="button" onClick={() => void handleCopy()}>
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                    {copied ? 'Código copiado' : 'Copiar código Pix'}
                  </CopyButton>
                </PixDetails>
              </PaymentArea>

              <SafetyNote>
                <ShieldCheck size={16} />
                <span>
                  Clicar em pagar não significa pagamento confirmado. A liberação depende da
                  resposta canônica do backend.
                </span>
              </SafetyNote>
            </>
          )}

          <Actions>
            {!confirmed && (
              <Button
                $primary
                type="button"
                disabled={resolvedStatus === 'VERIFYING'}
                onClick={() => void onVerify()}
              >
                <RefreshCw size={17} />
                {resolvedStatus === 'VERIFYING' ? 'Verificando...' : 'Verificar pagamento'}
              </Button>
            )}
            {onBackToCart && (
              <Button $primary={confirmed} type="button" onClick={onBackToCart}>
                {confirmed ? <Check size={17} /> : <ArrowLeft size={17} />}
                {confirmed ? 'Voltar ao cardápio' : 'Continuar no cardápio'}
              </Button>
            )}
          </Actions>

          {pixPaymentData.orderId && <SafetyNote>Pedido #{pixPaymentData.orderId}</SafetyNote>}
        </Content>
      </Card>
    </Wrap>
  );
}
