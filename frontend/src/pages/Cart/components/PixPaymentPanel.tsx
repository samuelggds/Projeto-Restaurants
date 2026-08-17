import { Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';

type PixPaymentData = {
  orderId: number | null;
  total: number;
  paymentId?: string;
  provider: string;
  pixCode: string;
  qrCodeBase64: string | null;
  requiresStatusCheck?: boolean;
  paid?: boolean;
};

type Props = {
  pixPaymentData: PixPaymentData;
  formatCurrency: (value: number) => string;
  onCopyPixKey: () => void;
  onBackToCart?: () => void;
};

const Wrap = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #f8fafc;
`;

const Card = styled.div`
  width: min(520px, 100%);
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: clamp(24px, 4vw, 40px);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
  text-align: center;
`;

const Title = styled.h2`
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
`;

const Subtitle = styled.p`
  color: #64748b;
  font-size: 14px;
  margin: 0 0 24px;
`;

const Amount = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 24px;
`;

const QrWrap = styled.div`
  display: grid;
  place-items: center;
  margin: 0 auto 20px;
  width: min(240px, 80vw);
  height: min(240px, 80vw);
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const CodeBox = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  font-family: monospace;
  font-size: 11px;
  color: #475569;
  word-break: break-all;
  text-align: left;
  margin-bottom: 12px;
  max-height: 80px;
  overflow-y: auto;
`;

const CopyBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: filter 0.18s;
  margin-bottom: 12px;

  &:hover {
    filter: brightness(1.06);
  }
`;

const WaitMsg = styled.p`
  font-size: 12px;
  color: #64748b;
  margin: 0;
`;

const BackButton = styled.button`
  margin-top: 18px;
  border: 0;
  background: transparent;
  color: #475569;
  font-weight: 700;
  cursor: pointer;
`;

const OrderId = styled.p`
  font-size: 12px;
  color: #94a3b8;
  margin: 8px 0 0;
`;

export default function PixPaymentPanel({
  pixPaymentData,
  formatCurrency,
  onCopyPixKey,
  onBackToCart,
}: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopyPixKey();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Wrap>
      <Card>
        <Title>Pagamento via Pix</Title>
        <Subtitle>Escaneie o QR Code ou copie o código para pagar</Subtitle>

        <Amount>{formatCurrency(pixPaymentData.total)}</Amount>

        {pixPaymentData.qrCodeBase64 && (
          <QrWrap>
            <img src={`data:image/png;base64,${pixPaymentData.qrCodeBase64}`} alt="QR Code Pix" />
          </QrWrap>
        )}

        {pixPaymentData.pixCode && (
          <>
            <CodeBox>{pixPaymentData.pixCode}</CodeBox>
            <CopyBtn type="button" onClick={handleCopy}>
              {copied ? (
                <>
                  <CheckCircle size={18} /> Código copiado!
                </>
              ) : (
                <>
                  <Copy size={18} /> Copiar código Pix
                </>
              )}
            </CopyBtn>
          </>
        )}

        <WaitMsg>
          {pixPaymentData.paid
            ? 'Pagamento confirmado! Seu pedido já foi enviado ao restaurante.'
            : `Aguardando confirmação automática via ${pixPaymentData.provider}…`}
        </WaitMsg>

        {pixPaymentData.orderId && <OrderId>Pedido #{pixPaymentData.orderId}</OrderId>}
        {onBackToCart && (
          <BackButton type="button" onClick={onBackToCart}>
            Voltar para o cardápio
          </BackButton>
        )}
      </Card>
    </Wrap>
  );
}
