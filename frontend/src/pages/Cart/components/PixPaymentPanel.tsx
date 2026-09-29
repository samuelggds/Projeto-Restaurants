import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Search,
  ShoppingBag,
  UserRound,
  XCircle,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import styled from 'styled-components';
import type { PixPaymentData, PixPaymentStatus } from '../../Home/hooks/useCheckoutPayments';

type OrderItemSummary = {
  name: string;
  quantity: number;
  total: number;
};

type Props = {
  pixPaymentData: PixPaymentData;
  paymentStatus: PixPaymentStatus;
  paymentError: string | null;
  primaryColor?: string;
  restaurantName?: string;
  restaurantLogoUrl?: string;
  restaurantOpen?: boolean;
  deliveryTime?: string | null;
  deliveryAddress?: string | null;
  orderPublicId?: string | null;
  orderItems?: OrderItemSummary[];
  orderSubtotal?: number | null;
  deliveryFee?: number | null;
  cartCount?: number;
  formatCurrency: (value: number) => string;
  onCopyPixKey: () => void | Promise<void>;
  onVerify: () => void | Promise<unknown>;
  onBackToCart?: () => void;
  onTrackOrder?: () => void;
};

const failureStatuses: PixPaymentStatus[] = ['FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED'];

function countdown(seconds: number | null) {
  if (seconds === null) return null;
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}

export default function PixPaymentPanel({
  pixPaymentData,
  paymentStatus,
  paymentError,
  primaryColor = '#e85a2b',
  restaurantName = 'Restaurante',
  restaurantLogoUrl,
  restaurantOpen = true,
  deliveryTime,
  deliveryAddress,
  orderPublicId,
  orderItems = [],
  deliveryFee,
  cartCount = 0,
  formatCurrency,
  onCopyPixKey,
  onVerify,
  onBackToCart,
  onTrackOrder,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const copyTimeoutRef = useRef<number | null>(null);
  const expiresAtMs = pixPaymentData.expiresAt ? Date.parse(pixPaymentData.expiresAt) : Number.NaN;
  const remaining = Number.isFinite(expiresAtMs)
    ? Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000))
    : null;

  const status = useMemo<PixPaymentStatus>(() => {
    if (pixPaymentData.paid === true) return 'PAID';
    if (remaining === 0 && !failureStatuses.includes(paymentStatus)) return 'EXPIRED';
    return paymentStatus;
  }, [paymentStatus, pixPaymentData.paid, remaining]);

  const confirmed = status === 'PAID';
  const failed = failureStatuses.includes(status);
  const timeLeft = countdown(remaining);

  useEffect(() => {
    if (!Number.isFinite(expiresAtMs) || confirmed || failed) return undefined;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [confirmed, expiresAtMs, failed]);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    },
    [],
  );

  const copyPix = async () => {
    try {
      await onCopyPixKey();
      setCopied(true);
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const failureTitle =
    status === 'REFUNDED' ? 'Pagamento PIX estornado' : 'Pagamento PIX não efetuado';
  const failureMessage =
    paymentError ||
    (status === 'EXPIRED'
      ? 'O prazo deste PIX terminou. Gere uma nova cobrança para concluir o pedido.'
      : status === 'CANCELED'
        ? 'Este pagamento foi cancelado e o pedido não foi confirmado.'
        : status === 'REFUNDED'
          ? 'O pagamento foi estornado. Consulte o pedido para acompanhar os próximos passos.'
          : 'O pagamento não foi aprovado. Você pode tentar novamente.');

  const cssVars = { '--pix-primary': primaryColor } as CSSProperties;

  return (
    <Page style={cssVars} data-status={status} data-payment-method="pix">
      <DesktopHeader>
        <button className="brand" type="button" onClick={onBackToCart}>
          <span className="brand-logo">
            {restaurantLogoUrl ? <img src={restaurantLogoUrl} alt="" /> : restaurantName.slice(0, 1)}
          </span>
          <span className="brand-copy">
            <b>{restaurantName}</b>
            <small>
              <i className={restaurantOpen ? 'open' : ''} />
              {restaurantOpen ? 'Aberto agora' : 'Fechado agora'}
            </small>
          </span>
        </button>
        <div className="search"><Search aria-hidden="true" /> Buscar no cardápio de {restaurantName}...</div>
        <div className="desktop-actions">
          <span><UserRound aria-hidden="true" /> Olá, Entrar</span>
          <span className="cart"><ShoppingBag aria-hidden="true" /> Meu Carrinho <i>{cartCount}</i></span>
        </div>
      </DesktopHeader>

      {!confirmed && !failed ? (
        <>
          <MobilePixHeader>
            <button type="button" onClick={onBackToCart}><ArrowLeft aria-hidden="true" /> Pagamento</button>
            <strong>Pagamento PIX</strong>
            <span />
          </MobilePixHeader>

          <WaitingContent>
            <PixCard>
              <div className="desktop-title">
                <span className="pix-mark">×</span>
                <h1>Pagamento PIX</h1>
                <p>Aponte a câmera do celular para o QR Code abaixo</p>
              </div>
              <div className="mobile-title">Escaneie o código para pagar</div>

              <QrBox aria-label="QR Code PIX">
                {pixPaymentData.qrCodeBase64 ? (
                  <img src={'data:image/png;base64,' + pixPaymentData.qrCodeBase64} alt="QR Code PIX" />
                ) : (
                  <QRCode value={pixPaymentData.pixCode} size={160} level="M" />
                )}
              </QrBox>

              {timeLeft ? <MobileCountdown><i /> {timeLeft} restantes</MobileCountdown> : null}

              <CopySection>
                <b>Pix Copia e Cola</b>
                <div>
                  <code>{pixPaymentData.pixCode}</code>
                  <button type="button" aria-label="Copiar código Pix" onClick={() => void copyPix()}>
                    {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </CopySection>

              <MobileInstructions>
                Abra o app do seu banco, escolha a opção de pagar via PIX, escaneie o QR Code acima ou copie e cole o código.
              </MobileInstructions>

              <DesktopPaymentInfo>
                <div><span>Valor Total</span><strong>{formatCurrency(pixPaymentData.total)}</strong></div>
                <div><span>Expira em</span><strong>{timeLeft || '—'}</strong></div>
              </DesktopPaymentInfo>

              <WaitingStatus role="status" aria-live="polite">
                <Dots><i /><i /><i /></Dots>
                <b>{status === 'VERIFYING' ? 'Verificando pagamento...' : 'Aguardando confirmação do pagamento...'}</b>
              </WaitingStatus>

              <DesktopContinue type="button" aria-label="Verificar pagamento" disabled={status === 'VERIFYING'} onClick={() => void onVerify()}>
                {status === 'VERIFYING' ? 'Verificando...' : 'Continuar'}
              </DesktopContinue>
            </PixCard>
          </WaitingContent>

          <MobileTotal>
            <span>Total a pagar</span>
            <strong>{formatCurrency(pixPaymentData.total)}</strong>
            <small>Ao confirmar o pagamento, seu pedido será enviado automaticamente.</small>
          </MobileTotal>
        </>
      ) : (
        <ResultContent>
          <ResultCard className={failed ? 'failure' : ''}>
            <ResultIcon className={failed ? 'failure' : ''} role="status">
              {failed ? <XCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
            </ResultIcon>

            <ResultHeading>
              <h1>{failed ? failureTitle : 'Pagamento PIX Confirmado!'}</h1>
              <p>{failed ? failureMessage : 'Seu pagamento via PIX foi recebido e seu pedido está sendo preparado'}</p>
            </ResultHeading>

            {!failed ? (
              <>
                <DesktopSuccessDetails>
                  <div><span>Número do Pedido</span><strong>{orderPublicId ? '#' + orderPublicId : pixPaymentData.orderId ? '#' + pixPaymentData.orderId : '—'}</strong></div>
                  <div><span>Tempo Estimado</span><strong>{deliveryTime || 'A confirmar'}</strong></div>
                  <div><span>Endereço de Entrega</span><strong>{deliveryAddress || 'Consulte o acompanhamento do pedido'}</strong></div>
                </DesktopSuccessDetails>

                <MobileSuccessDetails>
                  {deliveryTime ? <div className="eta"><span>Previsão de entrega</span><strong>{deliveryTime}</strong></div> : null}
                  <div className="prep"><Dots><i /><i /><i /></Dots><b>O restaurante já está preparando seu pedido</b></div>
                </MobileSuccessDetails>

                {orderItems.length > 0 ? (
                  <MobileOrderSummary>
                    <h2>Resumo do Pedido</h2>
                    {orderItems.map((item, index) => (
                      <div key={item.name + '-' + index}>
                        <span>{item.quantity}x {item.name}</span>
                        <strong>{formatCurrency(item.total)}</strong>
                      </div>
                    ))}
                    {typeof deliveryFee === 'number' ? (
                      <div className="muted"><span>Taxa de entrega</span><strong>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}</strong></div>
                    ) : null}
                    <div className="summary-total"><span>Total</span><strong>{formatCurrency(pixPaymentData.total)}</strong></div>
                  </MobileOrderSummary>
                ) : null}
              </>
            ) : null}

            <ResultActions>
              {failed ? (
                <>
                  <button type="button" onClick={() => void onVerify()}>Verificar novamente</button>
                  {onBackToCart ? <button className="secondary" type="button" onClick={onBackToCart}>Voltar ao pagamento</button> : null}
                </>
              ) : (
                <button type="button" onClick={onTrackOrder || onBackToCart}>
                  <span className="desktop-label">Acompanhar Entrega</span>
                  <span className="mobile-label">Acompanhar Pedido</span>
                </button>
              )}
            </ResultActions>
          </ResultCard>
        </ResultContent>
      )}

      <DesktopFooter>
        <div className="footer-main">
          <section><div className="footer-brand"><span>G</span><b>GastroNexa</b></div><p>Sua experiência gourmet completa, direto do conforto de sua casa. O melhor do {restaurantName} entregue rápido.</p></section>
          <section><b>Nossos Links</b><span>Cardápio</span><span>Cupons Ativos</span><span>Perguntas Frequentes</span></section>
          <section><b>Suporte</b><span>Falar no Chat</span><span>Central de Ajuda</span><span>Termos de Serviço</span></section>
          <section><b>Sua Loja Segura</b><p>GastroNexa é multi-tenant. Cada restaurante é operado diretamente por seu administrador autorizado.</p></section>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} GastroNexa & {restaurantName}. Todos os direitos reservados.</span><span>Privacidade · Cookies</span></div>
      </DesktopFooter>
    </Page>
  );
}

const Page = styled.main`
  min-height: 100dvh;
  background: #fdfcf9;
  color: #1f1e1a;
`;

const DesktopHeader = styled.header`
  height: 80px;
  padding: 0 max(40px, calc((100vw - 1120px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  border-bottom: 1px solid #efece6;
  background: #fff;

  .brand { padding: 0; display: flex; align-items: center; gap: 12px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
  .brand-logo { width: 40px; height: 40px; display: grid; place-items: center; overflow: hidden; border-radius: 12px; background: var(--pix-primary); color: #fff; font-size: 20px; font-weight: 800; }
  .brand-logo img { width: 100%; height: 100%; object-fit: cover; }
  .brand-copy { display: grid; gap: 2px; }
  .brand-copy b { font-size: 18px; }
  .brand-copy small { display: flex; align-items: center; gap: 6px; color: #72706b; font-size: 12px; }
  .brand-copy i { width: 8px; height: 8px; border-radius: 50%; background: #b4b0ab; }
  .brand-copy i.open { background: #41a267; }
  .search { width: min(380px, 34vw); padding: 10px 16px; display: flex; align-items: center; gap: 10px; overflow: hidden; border: 1px solid #efece6; border-radius: 999px; background: #fafaf8; color: #72706b; font-size: 13px; white-space: nowrap; text-overflow: ellipsis; }
  .search svg { width: 16px; flex: 0 0 auto; }
  .desktop-actions { display: flex; align-items: center; gap: 20px; font-size: 13px; font-weight: 600; }
  .desktop-actions > span { display: flex; align-items: center; gap: 7px; }
  .desktop-actions svg { width: 18px; }
  .cart { padding: 10px 14px; border-radius: 999px; background: var(--pix-primary); color: #fff; }
  .cart i { min-width: 18px; height: 18px; padding: 0 5px; display: grid; place-items: center; border-radius: 10px; background: #1f1e1a; font-size: 10px; font-style: normal; }

  @media (max-width: 760px) { display: none; }
`;

const MobilePixHeader = styled.header`
  display: none;
  @media (max-width: 760px) {
    height: 46px;
    padding: 12px 20px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    background: #fff;
    button { padding: 0; display: flex; align-items: center; gap: 7px; border: 0; background: transparent; color: #72706b; font: inherit; font-size: 14px; cursor: pointer; }
    button svg { width: 20px; }
    strong { font-size: 18px; }
  }
`;

const WaitingContent = styled.section`
  min-height: 894px;
  padding: 60px 24px 100px;
  display: grid;
  place-items: start center;
  @media (max-width: 760px) { min-height: 0; padding: 20px 20px 130px; display: block; }
`;

const PixCard = styled.section`
  width: 520px;
  padding: 40px;
  display: grid;
  justify-items: center;
  gap: 24px;
  border: 1px solid #efece6;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 8px 12px rgba(16,24,39,.03);

  .desktop-title { display: grid; justify-items: center; gap: 8px; text-align: center; }
  .desktop-title h1 { margin: 0; font-size: 24px; }
  .desktop-title p { margin: 0; color: #72706b; font-size: 14px; }
  .pix-mark { width: 44px; height: 44px; display: grid; place-items: center; border: 2px solid var(--pix-primary); border-radius: 50%; color: var(--pix-primary); font-size: 26px; font-weight: 300; }
  .mobile-title { display: none; }

  @media (max-width: 760px) {
    width: 100%;
    padding: 24px;
    gap: 16px;
    border-radius: 20px;
    box-shadow: none;
    .desktop-title { display: none; }
    .mobile-title { display: block; font-size: 16px; font-weight: 700; }
  }
`;

const QrBox = styled.div`
  width: 200px; height: 200px; padding: 20px; display: grid; place-items: center; border: 1px solid #efece6; border-radius: 16px; background: #fafaf8;
  img, svg { width: 100%; height: 100%; object-fit: contain; }
  @media (max-width: 760px) { width: 180px; height: 180px; padding: 10px; border-width: 2px; background: #fff; border-radius: 12px; }
`;

const MobileCountdown = styled.div`
  display: none;
  @media (max-width: 760px) {
    display: flex; align-items: center; gap: 8px; color: var(--pix-primary); font-size: 14px; font-weight: 600;
    i { width: 8px; height: 8px; border-radius: 50%; background: var(--pix-primary); }
  }
`;

const CopySection = styled.section`
  width: 100%; display: grid; gap: 8px; text-align: center;
  > b { color: #72706b; font-size: 13px; text-transform: uppercase; }
  > div { padding: 12px; display: flex; align-items: center; gap: 12px; border: 1px solid #efece6; border-radius: 8px; background: #fafaf8; }
  code { flex: 1; overflow: hidden; color: #1f1e1a; font-family: inherit; font-size: 12px; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
  button { padding: 6px 10px; display: inline-flex; align-items: center; gap: 5px; border: 0; border-radius: 6px; background: #fdf2ec; color: var(--pix-primary); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
  button svg { width: 14px; }
  @media (max-width: 760px) {
    text-align: left;
    > b { font-size: 14px; font-weight: 600; text-transform: none; }
    > div { border-radius: 12px; background: #fff; }
  }
`;

const MobileInstructions = styled.p`
  display: none;
  @media (max-width: 760px) {
    width: 100%; margin: 0; padding: 16px; display: block; border: 1px solid #efece6; border-radius: 16px; color: #72706b; font-size: 13px; line-height: 1.4;
  }
`;

const DesktopPaymentInfo = styled.div`
  width: 100%; padding-top: 14px; display: flex; justify-content: space-between; border-top: 1px solid #efece6;
  div { display: grid; gap: 2px; }
  div:last-child { text-align: right; }
  span { color: #72706b; font-size: 11px; }
  strong { font-size: 16px; }
  div:last-child strong { color: var(--pix-primary); }
  @media (max-width: 760px) { display: none; }
`;

const Dots = styled.span`
  display: flex; align-items: center; gap: 4px;
  i { width: 6px; height: 6px; border-radius: 50%; background: var(--pix-primary); animation: pixPulse 1s infinite; }
  i:nth-child(2) { animation-delay: .16s; }
  i:nth-child(3) { animation-delay: .32s; }
  @keyframes pixPulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
`;

const WaitingStatus = styled.div`
  width: 100%; padding: 11px; display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 8px; background: #fdf2ec; color: var(--pix-primary);
  b { font-size: 12px; }
  @media (max-width: 760px) { background: transparent; color: #1f1e1a; b { font-size: 14px; } }
`;

const DesktopContinue = styled.button`
  min-width: 120px; min-height: 42px; padding: 0 20px; border: 1px solid #d9dde1; border-radius: 10px; background: #fff; color: #1f1e1a; font: inherit; font-weight: 600; cursor: pointer; box-shadow: 0 4px 10px rgba(16,24,39,.06);
  @media (max-width: 760px) { display: none; }
`;

const MobileTotal = styled.section`
  display: none;
  @media (max-width: 760px) {
    position: fixed; z-index: 3; left: 0; right: 0; bottom: 0; padding: 14px 24px 24px; display: grid; gap: 2px; border-top: 1px solid #efece6; background: #fff;
    span { color: #72706b; font-size: 13px; }
    strong { color: var(--pix-primary); font-size: 20px; }
    small { color: #72706b; font-size: 12px; text-align: center; }
  }
`;

const ResultContent = styled.section`
  min-height: 625px; padding: 60px 24px 100px; display: grid; place-items: start center;
  @media (max-width: 760px) { min-height: 100dvh; padding: 62px 20px 32px; display: block; }
`;

const ResultCard = styled.section`
  width: 580px; padding: 48px; display: grid; justify-items: center; gap: 28px; border: 1px solid #efece6; border-radius: 24px; background: #fff; box-shadow: 0 12px 16px rgba(16,24,39,.02);
  &.failure { border-color: #efc6c1; }
  @media (max-width: 760px) { width: 100%; padding: 0; gap: 20px; border: 0; background: transparent; box-shadow: none; }
`;

const ResultIcon = styled.div`
  width: 64px; height: 64px; display: grid; place-items: center; border-radius: 50%; background: #eaf7ee; color: #268c43;
  svg { width: 32px; height: 32px; }
  &.failure { background: #fff0ee; color: #c54436; }
`;

const ResultHeading = styled.div`
  display: grid; justify-items: center; gap: 8px; text-align: center;
  h1 { margin: 0; font-size: 28px; }
  p { margin: 0; max-width: 520px; color: #72706b; font-size: 15px; }
  @media (max-width: 760px) { h1 { font-size: 24px; } p { max-width: 300px; font-size: 14px; } }
`;

const DesktopSuccessDetails = styled.section`
  width: 100%; padding: 20px; display: grid; gap: 12px; border: 1px solid #efece6; border-radius: 16px; background: #fafaf8;
  div { display: flex; justify-content: space-between; gap: 16px; font-size: 13px; }
  span { color: #72706b; }
  strong { max-width: 280px; overflow: hidden; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
  div:nth-child(2) strong { color: var(--pix-primary); }
  @media (max-width: 760px) { display: none; }
`;

const MobileSuccessDetails = styled.section`
  display: none;
  @media (max-width: 760px) {
    width: 100%; display: grid; border: 1px solid #efece6; border-radius: 16px; background: #fff; overflow: hidden;
    > div { padding: 14px; }
    .eta { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #efece6; }
    .eta span { color: #72706b; font-size: 13px; }
    .eta strong { color: var(--pix-primary); font-size: 14px; }
    .prep { display: flex; align-items: center; gap: 10px; font-size: 12px; }
  }
`;

const MobileOrderSummary = styled.section`
  display: none;
  @media (max-width: 760px) {
    width: 100%; padding: 16px; display: grid; gap: 10px; border: 1px solid #efece6; border-radius: 16px; background: #fff;
    h2 { margin: 0 0 4px; font-size: 14px; }
    div { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
    .muted { color: #72706b; }
    .summary-total { padding-top: 9px; border-top: 1px solid #efece6; font-weight: 700; }
    .summary-total strong { color: var(--pix-primary); font-size: 16px; }
  }
`;

const ResultActions = styled.div`
  display: flex; gap: 10px;
  button { min-height: 46px; padding: 0 24px; border: 0; border-radius: 12px; background: linear-gradient(90deg,#ff6a3d,#ff3d1f); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
  button.secondary { border: 1px solid #efece6; background: #fff; color: #72706b; }
  .mobile-label { display: none; }
  @media (max-width: 760px) {
    width: 100%; padding-top: 12px; display: grid;
    button { width: 100%; }
    .desktop-label { display: none; }
    .mobile-label { display: inline; }
  }
`;

const DesktopFooter = styled.footer`
  padding: 64px max(40px, calc((100vw - 1120px) / 2)); display: grid; gap: 48px; background: #1f1e1a; color: #72706b;
  .footer-main { display: grid; grid-template-columns: 320px 1fr 1fr 280px; gap: 48px; }
  section { display: grid; align-content: start; gap: 16px; font-size: 14px; }
  section p { margin: 0; line-height: 22px; }
  section b { color: #fff; }
  .footer-brand { display: flex; align-items: center; gap: 12px; color: #fff; font-size: 20px; }
  .footer-brand span { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px; background: var(--pix-primary); color: #fff; font-weight: 800; }
  .footer-bottom { padding-top: 24px; display: flex; justify-content: space-between; border-top: 1px solid #35332f; font-size: 13px; }
  @media (max-width: 980px) { padding-inline: 40px; .footer-main { grid-template-columns: 1.2fr 1fr 1fr; } .footer-main section:last-child { display: none; } }
  @media (max-width: 760px) { display: none; }
`;
