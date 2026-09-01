import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import styled from 'styled-components';
import type { CardPaymentReturnStatus } from '../hooks/useCardPaymentReturn';

type Props = {
  status: CardPaymentReturnStatus;
  error: string | null;
  providerReturnStatus: string;
  primaryColor?: string;
  onVerify: () => void | Promise<unknown>;
  onClose: () => void;
};

const copy: Record<CardPaymentReturnStatus, { title: string; description: string }> = {
  VERIFYING: {
    title: 'Verificando pagamento',
    description:
      'Estamos consultando o pedido no backend. O retorno do checkout ainda não confirma o pagamento.',
  },
  PENDING: {
    title: 'Pagamento ainda pendente',
    description:
      'O backend ainda não registrou a aprovação do cartão. Você pode verificar novamente em instantes.',
  },
  PAID: {
    title: 'Pagamento confirmado',
    description: 'O backend confirmou a aprovação do cartão e liberou o pedido ao restaurante.',
  },
  CANCELED: {
    title: 'Pedido cancelado',
    description: 'O backend informa que este pedido foi cancelado e não está aguardando pagamento.',
  },
  ERROR: {
    title: 'Não foi possível verificar',
    description: 'Nenhum pagamento foi confirmado nesta tela. Tente consultar o pedido novamente.',
  },
};

const Page = styled.main<{ $primary: string }>`
  --card-primary: ${({ $primary }) => $primary};
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 20px;
  background-color: #f1f4f2;
  background-image:
    linear-gradient(rgba(31, 61, 52, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 61, 52, 0.035) 1px, transparent 1px);
  background-size: 24px 24px;

  @media (max-width: 540px) {
    place-items: stretch;
    padding: 0;
  }
`;

const Panel = styled.section`
  width: min(520px, 100%);
  overflow: hidden;
  border: 1px solid #dce3de;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(27, 43, 35, 0.13);

  @media (max-width: 540px) {
    width: 100%;
    min-height: 100dvh;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 22px;
  border-bottom: 1px solid #e6eae7;

  > span {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: color-mix(in srgb, var(--card-primary) 11%, white);
    color: var(--card-primary);
  }

  small,
  h1 {
    display: block;
    margin: 0;
  }

  small {
    color: #7b837d;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }

  h1 {
    margin-top: 3px;
    color: #202923;
    font-size: 20px;
    line-height: 1.2;
  }

  @media (max-width: 480px) {
    padding: 17px 16px;

    h1 {
      font-size: 18px;
    }
  }
`;

const Body = styled.div`
  display: grid;
  gap: 14px;
  padding: 22px;

  @media (max-width: 480px) {
    padding: 18px 16px;
  }
`;

const StatusPanel = styled.div`
  display: grid;
  justify-items: center;
  padding: 22px 16px;
  text-align: center;

  > span {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  &[data-status='PAID'] > span {
    background: #e8f7ec;
    color: #27713e;
  }

  &[data-status='CANCELED'] > span,
  &[data-status='ERROR'] > span {
    background: #fff0ed;
    color: #a34237;
  }

  &[data-status='VERIFYING'] > span {
    background: #eaf5f9;
    color: #276379;
  }

  &[data-status='PENDING'] > span {
    background: #fff6df;
    color: #80601b;
  }

  h2 {
    margin: 13px 0 0;
    color: #212a24;
    font-size: 18px;
  }

  p {
    max-width: 390px;
    margin: 7px 0 0;
    color: #68726b;
    font-size: 12px;
    line-height: 1.5;
  }
`;

const ReturnContext = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid #e6dfcf;
  border-radius: 8px;
  background: #faf7ef;
  color: #6c6250;
  font-size: 10px;
  line-height: 1.45;

  svg {
    flex: 0 0 auto;
    color: var(--card-primary);
  }
`;

const ErrorText = styled.p`
  margin: -4px 0 0;
  color: #943f35;
  font-size: 11px;
  line-height: 1.45;
  text-align: center;
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;

  button {
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 13px;
    border: 1px solid #d7ded8;
    border-radius: 8px;
    background: #fff;
    color: #36413a;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
  }

  button.primary {
    border-color: var(--card-primary);
    background: var(--card-primary);
    color: #fff;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

function StatusIcon({ status }: { status: CardPaymentReturnStatus }) {
  if (status === 'PAID') return <CheckCircle2 size={31} />;
  if (status === 'CANCELED') return <XCircle size={31} />;
  if (status === 'ERROR') return <AlertTriangle size={31} />;
  if (status === 'VERIFYING') return <RefreshCw size={31} />;
  return <Clock3 size={31} />;
}

function returnContext(status: string) {
  if (status === 'cancel') {
    return 'Você voltou após fechar o checkout. Isso não cancela nem confirma o pedido por si só.';
  }
  if (status === 'pending') {
    return 'O provedor indicou processamento. A aprovação ainda precisa aparecer no backend.';
  }
  return 'O provedor redirecionou você de volta. Esse retorno não é usado como confirmação financeira.';
}

export function CardPaymentReturnPanel({
  status,
  error,
  providerReturnStatus,
  primaryColor = '#bd4b1d',
  onVerify,
  onClose,
}: Props) {
  const terminal = status === 'PAID' || status === 'CANCELED';
  const content = copy[status];

  return (
    <Page $primary={primaryColor}>
      <Panel>
        <Header>
          <span>
            <CreditCard size={21} />
          </span>
          <div>
            <small>Retorno do cartão</small>
            <h1>Status do seu pedido</h1>
          </div>
        </Header>
        <Body>
          <StatusPanel data-status={status} role="status" aria-live="polite">
            <span>
              <StatusIcon status={status} />
            </span>
            <h2>{content.title}</h2>
            <p>{content.description}</p>
          </StatusPanel>

          {status === 'ERROR' && error && <ErrorText role="alert">{error}</ErrorText>}

          {!terminal && (
            <ReturnContext>
              <ShieldCheck size={17} />
              <span>{returnContext(providerReturnStatus)}</span>
            </ReturnContext>
          )}

          <Actions>
            {!terminal && (
              <button
                className="primary"
                type="button"
                disabled={status === 'VERIFYING'}
                onClick={() => void onVerify()}
              >
                <RefreshCw size={17} />
                {status === 'VERIFYING' ? 'Verificando...' : 'Verificar pagamento'}
              </button>
            )}
            <button
              className={status === 'PAID' ? 'primary' : undefined}
              type="button"
              onClick={onClose}
            >
              {status === 'PAID' ? <Check size={17} /> : <Clock3 size={17} />}
              Voltar ao cardápio
            </button>
          </Actions>
        </Body>
      </Panel>
    </Page>
  );
}
