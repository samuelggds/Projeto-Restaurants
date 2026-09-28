import { ArrowLeft, CheckCircle2, CreditCard, Search, ShoppingBag, UserRound, XCircle } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import styled from 'styled-components';
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

export function CardPaymentReturnPanel({
  status,
  error,
  primaryColor = '#e85a2b',
  restaurantName = 'Restaurante',
  restaurantLogoUrl,
  restaurantOpen = true,
  deliveryTime,
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
  const total = amount || (
    typeof details?.totalAmount === 'number'
      ? details.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : ''
  );
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!paid && !failed) return;
    resultHeadingRef.current?.focus();
  }, [failed, paid]);

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
    >
      <DesktopHeader>
        <div className="brand">
          <span className="logo">
            {restaurantLogoUrl ? <img src={restaurantLogoUrl} alt="" /> : restaurantName.slice(0, 1)}
          </span>
          <span>
            <b>{restaurantName}</b>
            <small><i className={restaurantOpen ? 'open' : ''} />{restaurantOpen ? 'Aberto agora' : 'Fechado agora'}{deliveryTime ? ' · ' + deliveryTime : ''}</small>
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
                {failed ? 'Pagamento cancelado' : 'Pagamento Aprovado!'}
              </h1>
              <p>
                {failed
                  ? error || 'O pagamento com cartão não foi concluído.'
                  : 'Seu pedido foi recebido e está sendo preparado'}
              </p>
            </DesktopStatus>
          ) : null}

          <MobileTitle>Pagamento com Cartão</MobileTitle>

          <MobileCardMock className={failed ? 'failed' : ''}>
            <div><CreditCard aria-hidden="true" /><b>CARTÃO</b></div>
            <strong>•••• •••• ••••</strong>
            <small>Cartão de Crédito</small>
          </MobileCardMock>

          <MobileTransition>
            <div className="processing"><Dots><i /><i /><i /></Dots><span>{checking ? 'Processando pagamento...' : pending ? 'Aguardando confirmação...' : paid ? 'Processando pagamento...' : 'Pagamento finalizado'}</span></div>
            {(paid || failed) ? (
              <div className={failed ? 'badge failed' : 'badge'}>
                {failed ? <XCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                <b>{failed ? 'Pagamento cancelado' : 'Pagamento aprovado!'}</b>
              </div>
            ) : null}
          </MobileTransition>

          <DesktopCardPlate className={failed ? 'failed' : ''}>
            <span className="mini-card">{failed ? '!' : 'CARD'}</span>
            <span>
              <b>
                {failed
                  ? 'Pagamento com cartão cancelado'
                  : paid
                    ? 'Cartão de crédito aprovado'
                    : 'Pagamento com cartão'}
              </b>
              <small>
                {failed
                  ? error || 'Transação não autorizada'
                  : paid
                    ? 'Transação autorizada com sucesso'
                    : checking
                      ? 'Processando pagamento...'
                      : status === 'ERROR'
                        ? error || 'Não foi possível verificar o pagamento agora.'
                        : 'Aguardando confirmação do pagamento.'}
              </small>
            </span>
          </DesktopCardPlate>

          {(paid || failed) ? <Divider /> : null}

          {(paid || failed) ? (
            <DesktopInfo>
              <div><span>Valor Total</span><strong>{total || '—'}</strong></div>
              <div><span>Método de Pagamento</span><strong>Cartão de Crédito</strong></div>
            </DesktopInfo>
          ) : null}

          {paid && printedAt ? <KitchenNote>✓ Impresso na cozinha às {printedAt}</KitchenNote> : null}

          <MobileInstructions className={failed ? 'failed' : ''}>
            {failed
              ? error || 'O pagamento não foi efetuado. Você pode voltar e tentar novamente.'
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
        <p>{paid ? 'Seu pedido será preparado assim que o pagamento for confirmado.' : failed ? 'O pagamento não foi efetuado.' : 'Aguarde a confirmação do pagamento.'}</p>
        <button type="button" onClick={paid ? (onTrackOrder || onClose) : failed ? onClose : () => void onVerify()}>
          {paid ? 'Continuar para Rastreamento' : failed ? 'Voltar ao Pagamento' : checking ? 'Verificando...' : 'Verificar Pagamento'}
        </button>
      </MobileBottom>

      <DesktopFooter>
        <div className="top">
          <section><div className="footer-brand"><span>G</span><b>GastroNexa</b></div><p>Sua experiência gourmet completa, direto do conforto de sua casa. O melhor do {restaurantName} entregue rápido.</p></section>
          <section><b>Nossos Links</b><span>Cardápio</span><span>Cupons Ativos</span><span>Perguntas Frequentes</span></section>
          <section><b>Suporte</b><span>Falar no Chat</span><span>Central de Ajuda</span><span>Termos de Serviço</span></section>
          <section><b>Sua Loja Segura</b><p>GastroNexa é multi-tenant. Cada restaurante é operado diretamente por seu administrador autorizado.</p></section>
        </div>
        <div className="bottom"><span>© {new Date().getFullYear()} GastroNexa & {restaurantName}. Todos os direitos reservados.</span><span>Privacidade · Cookies</span></div>
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
  height: 80px; padding: 0 max(40px, calc((100vw - 1120px) / 2)); display: flex; align-items: center; justify-content: space-between; gap: 28px; border-bottom: 1px solid #efece6; background: #fff;
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 40px; height: 40px; display: grid; place-items: center; overflow: hidden; border-radius: 12px; background: var(--card-primary); color: #fff; font-weight: 800; }
  .logo img { width: 100%; height: 100%; object-fit: cover; }
  .brand > span:last-child { display: grid; gap: 2px; }
  .brand b { font-size: 18px; }
  .brand small { display: flex; align-items: center; gap: 6px; color: #72706b; font-size: 12px; }
  .brand small i { width: 8px; height: 8px; border-radius: 50%; background: #b4b0ab; }
  .brand small i.open { background: #41a267; }
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
    height: 48px; padding: 12px 20px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; border-bottom: 1px solid #efece6; background: #fff;
    button { padding: 0; display: flex; align-items: center; gap: 7px; border: 0; background: transparent; color: #72706b; font: inherit; font-size: 14px; cursor: pointer; }
    button svg { width: 20px; }
    strong { font-size: 18px; }
  }
`;

const Content = styled.section`
  min-height: 683px; padding: 60px 24px 100px; display: grid; place-items: start center;
  @media (max-width: 760px) { min-height: 0; padding: 20px 20px 190px; display: block; }
`;

const Card = styled.section`
  width: 520px; padding: 40px; display: grid; justify-items: center; gap: 24px; border: 1px solid #efece6; border-radius: 24px; background: #fff; box-shadow: 0 8px 12px rgba(16,24,39,.03);
  &.failed { border-color: #efc6c1; }
  @media (max-width: 760px) { width: 100%; padding: 24px; gap: 16px; border-radius: 20px; box-shadow: none; }
`;

const DesktopStatus = styled.div`
  display: grid; justify-items: center; gap: 8px; text-align: center;
  .icon { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 50%; background: #edf7ef; color: #268c43; }
  .icon.failed { background: #fff0ee; color: #c54436; }
  .icon svg { width: 28px; }
  h1 { margin: 0; font-size: 24px; }
  p { margin: 0; color: #72706b; font-size: 14px; }
  @media (max-width: 760px) { display: none; }
`;

const MobileTitle = styled.h1`
  display: none;
  @media (max-width: 760px) { display: block; margin: 0; font-size: 16px; }
`;

const MobileCardMock = styled.div`
  display: none;
  @media (max-width: 760px) {
    width: 200px; height: 120px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; border-radius: 12px; background: var(--card-primary); color: #fff;
    &.failed { background: #c54436; }
    div { display: flex; align-items: center; justify-content: space-between; }
    svg { width: 22px; }
    b { font-size: 13px; }
    strong { font-size: 14px; }
    small { color: rgba(255,255,255,.7); font-size: 9px; text-transform: uppercase; }
  }
`;

const Dots = styled.span`
  display: flex; gap: 4px;
  i { width: 6px; height: 6px; border-radius: 50%; background: var(--card-primary); }
  i:nth-child(2) { opacity: .65; }
  i:nth-child(3) { opacity: .35; }
`;

const MobileTransition = styled.div`
  display: none;
  @media (max-width: 760px) {
    display: grid; justify-items: center; gap: 12px;
    .processing { display: flex; align-items: center; gap: 8px; color: #72706b; font-size: 13px; }
    .badge { padding: 8px 16px; display: flex; align-items: center; gap: 8px; border-radius: 999px; background: #edf7ef; color: #268c43; font-size: 14px; }
    .badge.failed { background: #fff0ee; color: #c54436; }
    .badge svg { width: 16px; }
  }
`;

const DesktopCardPlate = styled.div`
  width: 100%; padding: 20px; display: flex; align-items: center; gap: 16px; border: 1px solid #efece6; border-radius: 16px; background: #fafaf8;
  .mini-card { width: 48px; height: 32px; display: grid; place-items: center; border-radius: 6px; background: var(--card-primary); color: #fff; font-size: 9px; font-weight: 800; }
  > span:last-child { display: grid; gap: 2px; }
  b { font-size: 14px; }
  small { color: #72706b; font-size: 12px; }
  &.failed .mini-card { background: #c54436; }
  @media (max-width: 760px) { display: none; }
`;

const Divider = styled.div`
  width: 100%; height: 1px; background: #efece6;
`;

const DesktopInfo = styled.div`
  width: 100%; display: flex; justify-content: space-between; gap: 20px;
  div { display: grid; gap: 4px; }
  div:last-child { text-align: right; }
  span { color: #72706b; font-size: 13px; }
  strong { font-size: 15px; }
  div:first-child strong { font-size: 20px; }
  @media (max-width: 760px) { display: none; }
`;

const KitchenNote = styled.div`
  width: 100%; padding: 12px 16px; border-radius: 8px; background: #edf7ef; color: #268c43; font-size: 14px; font-weight: 600; text-align: center;
  @media (max-width: 760px) { display: none; }
`;

const MobileInstructions = styled.div`
  display: none;
  @media (max-width: 760px) {
    width: 100%; padding: 16px; display: block; border: 1px solid #efece6; border-radius: 16px; color: #72706b; font-size: 13px; line-height: 1.4;
    &.failed { border-color: #efc6c1; color: #a23f34; background: #fff7f6; }
  }
`;

const DesktopActions = styled.div`
  display: flex; gap: 10px;
  button { min-height: 46px; padding: 0 24px; border: 0; border-radius: 12px; background: var(--card-primary); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
  button.secondary { border: 1px solid #efece6; background: #fff; color: #72706b; }
  button:disabled { opacity: .5; }
  @media (max-width: 760px) { display: none; }
`;

const MobileBottom = styled.section`
  display: none;
  @media (max-width: 760px) {
    position: fixed; z-index: 3; left: 0; right: 0; bottom: 0; padding: 16px 24px 24px; display: grid; gap: 16px; border-top: 1px solid #efece6; background: #fff;
    div { display: grid; gap: 2px; }
    span { color: #72706b; font-size: 13px; }
    strong { color: var(--card-primary); font-size: 22px; }
    p { margin: 0; color: #72706b; font-size: 12px; text-align: center; }
    button { width: 100%; min-height: 46px; border: 0; border-radius: 12px; background: var(--card-primary); color: #fff; font: inherit; font-size: 15px; font-weight: 700; }
  }
`;

const DesktopFooter = styled.footer`
  padding: 64px max(40px, calc((100vw - 1120px) / 2)); display: grid; gap: 48px; background: #1f1e1a; color: #72706b;
  .top { display: grid; grid-template-columns: 320px 1fr 1fr 280px; gap: 48px; }
  section { display: grid; align-content: start; gap: 16px; font-size: 14px; }
  section p { margin: 0; line-height: 22px; }
  section b { color: #fff; }
  .footer-brand { display: flex; align-items: center; gap: 12px; color: #fff; font-size: 20px; }
  .footer-brand span { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px; background: var(--card-primary); color: #fff; font-weight: 800; }
  .bottom { padding-top: 24px; display: flex; justify-content: space-between; border-top: 1px solid #35332f; font-size: 13px; }
  @media (max-width: 980px) { padding-inline: 40px; .top { grid-template-columns: 1.2fr 1fr 1fr; } .top section:last-child { display: none; } }
  @media (max-width: 760px) { display: none; }
`;
