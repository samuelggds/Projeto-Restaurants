import { ArrowLeft, CheckCircle2, Search, ShoppingBag, UserRound, XCircle } from 'lucide-react';
import { PaymentCardVisual } from '../../Profile/components/PaymentCardVisual';
import { useEffect, useRef, type CSSProperties } from 'react';
import styled from 'styled-components';
import {
  paymentBottomBarReveal,
  paymentContentReveal,
  paymentPulse,
  paymentReducedMotion,
  paymentScreenFade,
  paymentStatusPop,
  paymentSurfaceRise,
} from '../../../components/payment/paymentMotion';
import type {
  CardPaymentReturnDetails,
  CardPaymentReturnStatus,
} from '../hooks/useCardPaymentReturn';

type Props = {
  status: CardPaymentReturnStatus;
  error: string | null;
  providerReturnStatus: string;
  primaryColor?: string;
  restaurantName?: string;
  restaurantLogoUrl?: string;
  restaurantOpen?: boolean;
  deliveryTime?: string;
  details?: CardPaymentReturnDetails | null;
  amount?: string;
  onVerify: () => void | Promise<unknown>;
  onClose: () => void;
  onTrackOrder?: () => void;
};

const terminalFailures: CardPaymentReturnStatus[] = ['FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED'];

function isTrustedMercadoPagoOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      (hostname === 'mercadopago.com' ||
        hostname.endsWith('.mercadopago.com') ||
        hostname === 'mercadopago.com.br' ||
        hostname.endsWith('.mercadopago.com.br'))
    );
  } catch {
    return false;
  }
}

function getTerminalPaymentCopy(
  status: CardPaymentReturnStatus,
  error: string | null,
  cardTypeLabel: string,
) {
  if (status === 'FAILED') {
    return {
      title: 'Pagamento recusado',
      badge: 'Pagamento recusado',
      summary: `${cardTypeLabel} recusado`,
      description:
        error ||
        'Não foi possível aprovar este pagamento. Verifique os dados do cartão ou tente outra forma de pagamento.',
      bottom: 'O pagamento foi recusado e nenhuma cobrança foi confirmada.',
    };
  }

  if (status === 'CANCELED') {
    return {
      title: 'Pagamento cancelado',
      badge: 'Pagamento cancelado',
      summary: 'Pagamento cancelado',
      description: error || 'Este pagamento foi cancelado antes da confirmação.',
      bottom: 'O pagamento foi cancelado.',
    };
  }

  if (status === 'EXPIRED') {
    return {
      title: 'Pagamento expirado',
      badge: 'Pagamento expirado',
      summary: 'Pagamento expirado',
      description:
        error || 'O prazo desta tentativa de pagamento terminou. Inicie uma nova tentativa para continuar.',
      bottom: 'O prazo do pagamento expirou.',
    };
  }

  if (status === 'REFUNDED') {
    return {
      title: 'Pagamento estornado',
      badge: 'Pagamento estornado',
      summary: 'Pagamento estornado',
      description:
        error ||
        'O estorno deste pagamento foi registrado. O prazo do crédito depende da instituição financeira.',
      bottom: 'O pagamento foi estornado.',
    };
  }

  return null;
}

export function CardPaymentReturnPanel({
  status,
  error,
  primaryColor = '#e85a2b',
  restaurantName = 'Restaurante',
  restaurantLogoUrl,
  restaurantOpen = true,
  details,
  amount,
  onVerify,
  onClose,
  onTrackOrder,
}: Props) {
  const paid = status === 'PAID';
  const failed = terminalFailures.includes(status);
  const checking = status === 'VERIFYING';
  const pending = status === 'PENDING' || status === 'ERROR';
  const cardPaymentType = details?.cardPaymentType === 'debit' ? 'debit' : 'credit';
  const cardTypeLabel =
    cardPaymentType === 'debit' ? 'Cartão de Débito' : 'Cartão de Crédito';
  const terminalCopy = getTerminalPaymentCopy(status, error, cardTypeLabel);
  const cardBrand = details?.cardBrand || 'card';
  const cardLast4 = String(details?.cardLast4 || '').replace(/\D/g, '').slice(-4);
  const maskedCardNumber = cardLast4
    ? `•••• •••• •••• ${cardLast4}`
    : '•••• •••• •••• ••••';
  const total = amount || (
    typeof details?.totalAmount === 'number'
      ? details.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : ''
  );
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const challengeFrameRef = useRef<HTMLIFrameElement>(null);
  const challengeUrl = status === 'PENDING' ? String(details?.challengeUrl || '').trim() : '';

  useEffect(() => {
    if (!paid && !failed) return;
    resultHeadingRef.current?.focus();
  }, [failed, paid]);

  useEffect(() => {
    if (!challengeUrl) return undefined;

    const onMessage = (event: MessageEvent) => {
      const frameWindow = challengeFrameRef.current?.contentWindow;
      if (!frameWindow || event.source !== frameWindow) return;
      if (!isTrustedMercadoPagoOrigin(event.origin)) return;

      const message =
        typeof event.data === 'string'
          ? event.data
          : event.data && typeof event.data === 'object'
            ? String((event.data as { type?: unknown }).type || '')
            : '';
      if (message !== 'COMPLETE') return;

      void onVerify();
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [challengeUrl, onVerify]);

  const printedAt = details?.kitchenPrintedAt
    ? new Date(details.kitchenPrintedAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Page
      style={{ '--card-primary': primaryColor } as CSSProperties}
      data-status={status}
      data-payment-method="card"
      data-card-payment-type={cardPaymentType}
      data-card-brand={cardBrand}
    >
      <DesktopHeader>
        <div className="brand">
          <span className="logo">
            {restaurantLogoUrl ? <img src={restaurantLogoUrl} alt="" /> : restaurantName.slice(0, 1)}
          </span>
          <span>
            <b>{restaurantName}</b>
            <small><i className={restaurantOpen ? 'open' : ''} />{restaurantOpen ? 'Aberto agora' : 'Fechado agora'}</small>
          </span>
        </div>
        <div className="search"><Search aria-hidden="true" /> Buscar no cardápio de {restaurantName}...</div>
        <div className="actions">
          <span><UserRound aria-hidden="true" /> Olá, Entrar</span>
          <span className="cart"><ShoppingBag aria-hidden="true" /> Meu Carrinho</span>
        </div>
      </DesktopHeader>

      <MobileHeader>
        <button type="button" onClick={onClose}><ArrowLeft aria-hidden="true" /> Voltar</button>
        <strong>Pagamento</strong>
        <span />
      </MobileHeader>

      <Content>
        <Card className={failed ? 'failed' : ''}>
          {paid || failed ? (
            <DesktopStatus>
              <span className={failed ? 'icon failed' : 'icon'} role="status">
                {failed ? <XCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
              </span>
              <h1 ref={resultHeadingRef} tabIndex={-1}>
                {failed ? terminalCopy?.title : 'Pagamento Aprovado!'}
              </h1>
              <p>
                {failed
                  ? terminalCopy?.description
                  : 'Seu pedido foi recebido e está sendo preparado'}
              </p>
            </DesktopStatus>
          ) : null}

          <MobileTitle>Pagamento com {cardTypeLabel}</MobileTitle>

          {challengeUrl ? (
            <ChallengeSection>
              <div>
                <b>Confirme sua compra com o banco</b>
                <p>
                  O Mercado Pago solicitou uma autenticação de segurança antes de concluir este
                  pagamento.
                </p>
              </div>
              <iframe
                ref={challengeFrameRef}
                src={challengeUrl}
                title="Autenticação de segurança do cartão"
                allow="payment"
                referrerPolicy="no-referrer"
              />
              <small>
                Não feche esta tela até a autenticação terminar. O pedido só será liberado após a
                confirmação do Mercado Pago.
              </small>
            </ChallengeSection>
          ) : null}

          <CardVisualWrap>
            <PaymentCardVisual
              compact
              brand={cardBrand}
              numberLabel={maskedCardNumber}
              holderName=""
              expiryLabel="••/••"
            />
            <span>{cardTypeLabel}</span>
          </CardVisualWrap>

          <MobileTransition>
            <div className="processing"><Dots><i /><i /><i /></Dots><span>{checking ? 'Processando pagamento...' : pending ? 'Aguardando confirmação...' : paid ? 'Processando pagamento...' : 'Pagamento finalizado'}</span></div>
            {(paid || failed) ? (
              <div className={failed ? 'badge failed' : 'badge'}>
                {failed ? <XCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                <b>{failed ? terminalCopy?.badge : 'Pagamento aprovado!'}</b>
              </div>
            ) : null}
          </MobileTransition>

          <DesktopPaymentState className={failed ? 'failed' : ''}>
            <b>
              {failed
                ? terminalCopy?.summary
                : paid
                  ? `${cardTypeLabel} aprovado`
                  : `Pagamento com ${cardTypeLabel.toLowerCase()}`}
            </b>
            <small>
              {failed
                ? terminalCopy?.description
                : paid
                  ? 'Transação autorizada com sucesso'
                  : checking
                    ? 'Processando pagamento...'
                    : status === 'ERROR'
                      ? error || 'Não foi possível verificar o pagamento agora.'
                      : 'Aguardando confirmação do pagamento.'}
            </small>
          </DesktopPaymentState>

          {(paid || failed) ? <Divider /> : null}

          {(paid || failed) ? (
            <DesktopInfo>
              <div><span>Valor Total</span><strong>{total || '—'}</strong></div>
              <div><span>Método de Pagamento</span><strong>{cardTypeLabel}</strong></div>
            </DesktopInfo>
          ) : null}

          {paid && printedAt ? <KitchenNote>✓ Impresso na cozinha às {printedAt}</KitchenNote> : null}

          <MobileInstructions className={failed ? 'failed' : ''}>
            {failed
              ? terminalCopy?.description
              : paid
                ? 'Seu pagamento foi recebido com segurança. O restaurante já foi notificado e iniciará a preparação do seu pedido.'
                : 'Estamos aguardando a confirmação segura do provedor de pagamento.'}
          </MobileInstructions>

          <DesktopActions>
            {paid ? (
              <button type="button" onClick={onTrackOrder || onClose}>Acompanhar Entrega</button>
            ) : failed ? (
              <>
                <button type="button" onClick={onClose}>Voltar ao pagamento</button>
                <button className="secondary" type="button" onClick={() => void onVerify()}>Verificar novamente</button>
              </>
            ) : (
              <button type="button" disabled={checking} onClick={() => void onVerify()}>
                {checking ? 'Verificando...' : 'Verificar pagamento'}
              </button>
            )}
          </DesktopActions>
        </Card>
      </Content>

      <MobileBottom>
        <div><span>{paid ? 'Total pago' : 'Valor do pagamento'}</span><strong>{total || '—'}</strong></div>
        <p>{paid ? 'Seu pedido será preparado assim que o pagamento for confirmado.' : failed ? terminalCopy?.bottom : 'Aguarde a confirmação do pagamento.'}</p>
        <button type="button" onClick={paid ? (onTrackOrder || onClose) : failed ? onClose : () => void onVerify()}>
          {paid ? 'Continuar para Rastreamento' : failed ? 'Voltar ao Pagamento' : checking ? 'Verificando...' : 'Verificar Pagamento'}
        </button>
      </MobileBottom>

      <DesktopFooter>
        <div className="top">
          <section><div className="footer-brand"><span>{restaurantLogoUrl ? <img src={restaurantLogoUrl} alt="" /> : restaurantName.slice(0, 1).toUpperCase()}</span><b>{restaurantName}</b></div><p>Sua experiência gourmet completa, direto do conforto de sua casa. O melhor do {restaurantName} entregue rápido.</p></section>
          <section><b>Nossos Links</b><span>Cardápio</span><span>Cupons Ativos</span><span>Perguntas Frequentes</span></section>
          <section><b>Suporte</b><span>Falar no Chat</span><span>Central de Ajuda</span><a href="/termos/">Termos de Serviço</a></section>
          <section><b>Sua Loja Segura</b><p>GastroNexa é multi-tenant. Cada restaurante é operado diretamente por seu administrador autorizado.</p></section>
        </div>
        <div className="bottom"><span>© {new Date().getFullYear()} {restaurantName}. Todos os direitos reservados.</span><span className="legal-links"><a href="/privacidade/">Privacidade</a><span aria-hidden="true">·</span><a href="/cookies/">Cookies</a></span></div>
      </DesktopFooter>
    </Page>
  );
}

const Page = styled.main`
  width: 100%;
  min-width: 0;
  min-height: 100dvh;
  overflow-x: hidden;
  background: #fdfcf9;
  color: #1f1e1a;
  box-sizing: border-box;

  & *,
  & *::before,
  & *::after {
    box-sizing: border-box;
  }
  animation: ${paymentScreenFade} 220ms ease-out both;

  ${paymentReducedMotion}
`;

const DesktopHeader = styled.header`
  height: 80px; padding: 0 max(40px, calc((100vw - 1120px) / 2)); display: flex; align-items: center; justify-content: space-between; gap: 28px; border-bottom: 1px solid #efece6; background: #fff;
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 40px; height: 40px; display: grid; place-items: center; overflow: hidden; border-radius: 12px; background: var(--card-primary); color: #fff; font-weight: 800; }
  .logo img { width: 100%; height: 100%; object-fit: cover; }
  .brand > span:last-child { display: grid; gap: 2px; }
  .brand b { font-size: 18px; }
  .brand small { display: flex; align-items: center; gap: 6px; color: #72706b; font-size: 12px; }
  .brand small i { width: 8px; height: 8px; border-radius: 50%; background: #e5484d; }
  .brand small i.open { background: #33b864; }
  .search { width: min(380px, 34vw); padding: 10px 16px; display: flex; align-items: center; gap: 10px; border: 1px solid #efece6; border-radius: 999px; background: #fafaf8; color: #72706b; font-size: 13px; overflow: hidden; white-space: nowrap; }
  .search svg { width: 16px; }
  .actions { display: flex; align-items: center; gap: 20px; font-size: 13px; font-weight: 600; }
  .actions span { display: flex; align-items: center; gap: 7px; }
  .actions svg { width: 18px; }
  .cart { padding: 10px 14px; border-radius: 999px; background: var(--card-primary); color: #fff; }
  @media (max-width: 760px) { display: none; }
`;

const MobileHeader = styled.header`
  display: none;
  @media (max-width: 760px) {
    height: 48px; padding: 12px 20px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; border-bottom: 1px solid #efece6; background: #fff;
    button { min-width: 0; padding: 0; display: flex; align-items: center; gap: 7px; border: 0; background: transparent; color: #72706b; font: inherit; font-size: 14px; cursor: pointer; white-space: nowrap; }
    button svg { width: 20px; flex: 0 0 auto; }
    strong { min-width: 0; font-size: 18px; text-align: center; white-space: nowrap; }
  }
`;

const Content = styled.section`
  width: 100%; min-width: 0; min-height: 683px; padding: 60px 24px 100px; display: grid; place-items: start center;
  @media (max-width: 760px) { min-height: 0; padding: 20px 20px 190px; display: block; }
`;

const Card = styled.section`
  width: min(520px, 100%); min-width: 0; max-width: 100%; padding: 40px; display: grid; justify-items: center; gap: 24px; border: 1px solid #efece6; border-radius: 24px; background: #fff; box-shadow: 0 8px 12px rgba(16,24,39,.03);
  animation: ${paymentSurfaceRise} 360ms cubic-bezier(0.22, 0.8, 0.32, 1) both;

  ${paymentReducedMotion}
  &.failed { border-color: #efc6c1; }
  > * { min-width: 0; max-width: 100%; }
  @media (max-width: 760px) { width: 100%; padding: 24px; gap: 16px; border-radius: 20px; box-shadow: none; }
`;

const DesktopStatus = styled.div`
  display: grid; justify-items: center; gap: 8px; text-align: center;
  .icon { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 50%; background: #edf7ef; color: #268c43; }
  .icon.failed { background: #fff0ee; color: #c54436; }
  .icon svg { width: 28px; }
  .icon { animation: ${paymentStatusPop} 480ms cubic-bezier(0.2, 0.8, 0.3, 1) both; }

  ${paymentReducedMotion}
  h1 { margin: 0; font-size: 24px; }
  p { margin: 0; color: #72706b; font-size: 14px; }
  @media (max-width: 760px) { display: none; }
`;

const MobileTitle = styled.h1`
  display: none;
  @media (max-width: 760px) {
    display: block;
    max-width: 100%;
    margin: 0;
    font-size: 16px;
    text-align: center;
    overflow-wrap: anywhere;
    animation: ${paymentContentReveal} 300ms ease-out 70ms both;

    ${paymentReducedMotion}
  }
`;

const ChallengeSection = styled.section`
  width: min(420px, 100%);
  min-width: 0;
  display: grid;
  gap: 12px;
  text-align: center;

  > div {
    display: grid;
    gap: 6px;
  }

  b {
    font-size: 16px;
  }

  p,
  small {
    margin: 0;
    color: #72706b;
    font-size: 12px;
    line-height: 1.45;
  }

  iframe {
    width: 100%;
    min-height: 420px;
    border: 1px solid #efece6;
    border-radius: 14px;
    background: #fff;
  }

  @media (max-width: 760px) {
    iframe {
      min-height: 460px;
    }
  }
`;

const CardVisualWrap = styled.div`
  width: min(320px, 100%);
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 9px;
  animation: ${paymentSurfaceRise} 460ms cubic-bezier(0.2, 0.82, 0.28, 1) 110ms both;

  ${paymentReducedMotion}

  > div {
    width: 100%;
    max-width: 320px;
    margin: 0;
  }

  > span {
    color: #72706b;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .02em;
  }

  @media (min-width: 761px) {
    > div {
      box-shadow: 0 16px 34px rgba(31, 30, 26, .18);
    }

    > span {
      font-size: 12px;
    }
  }
`;

const Dots = styled.span`
  display: flex; gap: 4px;
  i { width: 6px; height: 6px; border-radius: 50%; background: var(--card-primary); animation: ${paymentPulse} 1s ease-in-out infinite; }
  i:nth-child(2) { animation-delay: 120ms; }
  i:nth-child(3) { animation-delay: 240ms; }

  ${paymentReducedMotion}
`;

const MobileTransition = styled.div`
  display: none;
  @media (max-width: 760px) {
    width: 100%; min-width: 0; display: grid; justify-items: center; gap: 12px;
    .processing { max-width: 100%; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; color: #72706b; font-size: 13px; text-align: center; overflow-wrap: anywhere; }
    .badge { max-width: 100%; padding: 8px 16px; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; border-radius: 999px; background: #edf7ef; color: #268c43; font-size: 14px; text-align: center; overflow-wrap: anywhere; }
    .badge.failed { background: #fff0ee; color: #c54436; }
    .badge svg { width: 16px; }
    .badge { animation: ${paymentContentReveal} 260ms ease-out both; }

    ${paymentReducedMotion}
  }
`;

const DesktopPaymentState = styled.div`
  width: 100%;
  min-width: 0;
  padding: 16px 18px;
  display: grid;
  justify-items: center;
  gap: 4px;
  border: 1px solid #efece6;
  border-radius: 14px;
  background: #fafaf8;
  text-align: center;
  animation: ${paymentContentReveal} 340ms ease-out 170ms both;

  ${paymentReducedMotion}

  b { font-size: 14px; }

  small {
    max-width: 100%;
    color: #72706b;
    font-size: 12px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  &.failed {
    border-color: #efc6c1;
    background: #fff8f7;
  }

  &.failed b,
  &.failed small {
    color: #a23f34;
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

const Divider = styled.div`
  width: 100%; height: 1px; background: #efece6;
`;

const DesktopInfo = styled.div`
  width: 100%; min-width: 0; display: flex; justify-content: space-between; gap: 20px;
  animation: ${paymentContentReveal} 340ms ease-out 230ms both;

  ${paymentReducedMotion}
  div { display: grid; gap: 4px; }
  div:last-child { text-align: right; }
  span { color: #72706b; font-size: 13px; }
  strong { min-width: 0; font-size: 15px; overflow-wrap: anywhere; }
  div:first-child strong { font-size: 20px; }
  @media (max-width: 760px) { display: none; }
`;

const KitchenNote = styled.div`
  width: 100%; min-width: 0; padding: 12px 16px; border-radius: 8px; background: #edf7ef; color: #268c43; font-size: 14px; font-weight: 600; text-align: center; overflow-wrap: anywhere;
  animation: ${paymentContentReveal} 340ms ease-out 290ms both;

  ${paymentReducedMotion}
  @media (max-width: 760px) { display: none; }
`;

const MobileInstructions = styled.div`
  display: none;
  animation: ${paymentContentReveal} 360ms ease-out 260ms both;

  ${paymentReducedMotion}
  @media (max-width: 760px) {
    width: 100%; min-width: 0; padding: 16px; display: block; border: 1px solid #efece6; border-radius: 16px; color: #72706b; font-size: 13px; line-height: 1.4; overflow-wrap: anywhere;
    &.failed { border-color: #efc6c1; color: #a23f34; background: #fff7f6; }
  }
`;

const DesktopActions = styled.div`
  width: 100%; min-width: 0; display: flex; justify-content: center; gap: 10px;
  animation: ${paymentContentReveal} 340ms ease-out 340ms both;

  ${paymentReducedMotion}

  button { max-width: 100%; min-height: 46px; padding: 0 24px; border: 0; border-radius: 12px; background: var(--card-primary); color: #fff; font: inherit; font-weight: 700; cursor: pointer; overflow-wrap: anywhere; transition: transform 160ms ease, box-shadow 180ms ease, filter 180ms ease; }
  button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(31,30,26,.12); filter: saturate(1.04); }
  button:active:not(:disabled) { transform: scale(.985); }
  button.secondary { border: 1px solid #efece6; background: #fff; color: #72706b; }
  button:disabled { opacity: .5; }
  @media (max-width: 760px) { display: none; }
`;

const MobileBottom = styled.section`
  display: none;
  @media (max-width: 760px) {
    position: fixed; z-index: 3; left: 0; right: 0; bottom: 0; width: 100%; min-width: 0; padding: 16px 24px calc(24px + env(safe-area-inset-bottom)); display: grid; gap: 16px; border-top: 1px solid #efece6; background: rgba(255,255,255,.98); box-shadow: 0 -10px 30px rgba(31,30,26,.06); backdrop-filter: blur(12px);
    animation: ${paymentBottomBarReveal} 420ms cubic-bezier(0.22, 0.8, 0.32, 1) 220ms both;

    ${paymentReducedMotion}
    div { display: grid; gap: 2px; }
    span { color: #72706b; font-size: 13px; }
    strong { color: var(--card-primary); font-size: 22px; }
    p { margin: 0; color: #72706b; font-size: 12px; text-align: center; }
    button { width: 100%; max-width: 100%; min-height: 46px; border: 0; border-radius: 12px; background: var(--card-primary); color: #fff; font: inherit; font-size: 15px; font-weight: 700; overflow-wrap: anywhere; transition: transform 160ms ease, filter 180ms ease; }
    button:active { transform: scale(.985); }
  }
`;

const DesktopFooter = styled.footer`
  min-height: 356px;
  box-sizing: border-box;
  padding: 64px max(40px, calc((100vw - 1120px) / 2)); display: grid; gap: 48px; background: #1f1e1a; color: #72706b;
  .top { display: grid; grid-template-columns: 320px 1fr 1fr 280px; gap: 48px; }
  section { display: grid; align-content: start; gap: 16px; font-size: 14px; }
  section a,
  .legal-links a {
    color: inherit;
    text-decoration: none;
  }
  section a:hover,
  section a:focus-visible,
  .legal-links a:hover,
  .legal-links a:focus-visible {
    color: #fff;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .legal-links {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  section p { margin: 0; line-height: 22px; }
  section b { color: #fff; }
  .footer-brand { display: flex; align-items: center; gap: 12px; color: #fff; font-size: 20px; }
  .footer-brand span { width: 32px; height: 32px; min-width: 32px; max-width: 32px; min-height: 32px; max-height: 32px; flex: 0 0 32px; display: grid; place-items: center; overflow: hidden; border-radius: 10px; background: var(--card-primary); color: #fff; font-weight: 800; }
  .footer-brand img { width: 32px; height: 32px; max-width: 32px; max-height: 32px; display: block; object-fit: cover; }
  .bottom { padding-top: 24px; display: flex; justify-content: space-between; border-top: 1px solid #35332f; font-size: 13px; }
  @media (max-width: 980px) { padding-inline: 40px; .top { grid-template-columns: 1.2fr 1fr 1fr; } .top section:last-child { display: none; } }
  @media (max-width: 760px) { display: none; }
`;
