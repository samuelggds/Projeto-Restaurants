import { Clock3, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import styled from 'styled-components';

type Props = {
  primaryColor: string;
  invalidQr?: boolean;
  invalidTitle?: string;
  invalidMessage?: string;
  tableLabel?: string | number;
  retrying?: boolean;
  onRetry?: () => void;
};

const Root = styled.div<{ $primary: string }>`
  --primary: ${({ $primary }) => $primary};
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(18px, 5vw, 48px);
  background:
    radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 30%),
    #fffdf9;
  color: #191816;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
`;

const Card = styled.main`
  width: min(520px, 100%);
  overflow: hidden;
  border: 1px solid #eadfd3;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 70px rgba(66, 42, 25, 0.12);
`;

const Hero = styled.section`
  display: grid;
  justify-items: center;
  padding: clamp(30px, 7vw, 52px) clamp(22px, 6vw, 46px) 26px;
  text-align: center;

  .icon {
    width: 66px;
    height: 66px;
    display: grid;
    place-items: center;
    margin-bottom: 18px;
    border-radius: 20px;
    background: color-mix(in srgb, var(--primary) 12%, white);
    color: var(--primary);
  }

  .icon svg {
    width: 30px;
    height: 30px;
  }

  h1 {
    margin: 0;
    font-size: clamp(24px, 6vw, 34px);
    line-height: 1.12;
  }

  p {
    max-width: 400px;
    margin: 12px 0 0;
    color: #6f6a63;
    font-size: 15px;
    line-height: 1.6;
  }
`;

const Eyebrow = styled.div`
  margin-bottom: 12px;
  padding: 7px 14px;
  border-radius: 999px;
  background: #fdeee7;
  color: var(--primary);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const Steps = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 clamp(18px, 5vw, 34px) 24px;

  div {
    min-width: 0;
    padding: 14px;
    border: 1px solid #eee4da;
    border-radius: 14px;
    background: #fffaf6;
  }

  svg {
    width: 18px;
    height: 18px;
    margin-bottom: 8px;
    color: var(--primary);
  }

  b,
  small {
    display: block;
  }

  b {
    margin-bottom: 4px;
    font-size: 13px;
  }

  small {
    color: #78716c;
    font-size: 11px;
    line-height: 1.45;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const Retry = styled.button`
  width: calc(100% - clamp(36px, 10vw, 68px));
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin: 0 auto clamp(22px, 5vw, 34px);
  border: 0;
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-weight: 800;

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  svg {
    width: 18px;
    height: 18px;
  }

  .spinning {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export function TableAccessGate({
  primaryColor,
  invalidQr = false,
  invalidTitle,
  invalidMessage,
  tableLabel,
  retrying = false,
  onRetry,
}: Props) {
  const title = invalidQr
    ? invalidTitle || 'Não foi possível abrir esta mesa'
    : invalidTitle || 'Mesa aguardando abertura';
  const message = invalidQr
    ? invalidMessage || 'Escaneie novamente o QR Code oficial fixado nesta mesa.'
    : invalidMessage ||
      'O garçom precisa abrir o atendimento desta mesa antes que novos pedidos sejam enviados.';

  return (
    <Root $primary={primaryColor}>
      <Card>
        <Hero>
          <div className="icon">{invalidQr ? <QrCode /> : <Clock3 />}</div>
          <Eyebrow>
            {tableLabel ? `Mesa ${String(tableLabel)}` : 'Acesso por QR Code'}
          </Eyebrow>
          <h1>{title}</h1>
          <p role={invalidQr ? 'alert' : 'status'}>{message}</p>
        </Hero>

        {!invalidQr && (
          <Steps aria-label="Como liberar o cardápio de mesa">
            <div>
              <ShieldCheck />
              <b>1. Aguarde o garçom</b>
              <small>Ele abre a mesa no painel de atendimento.</small>
            </div>
            <div>
              <QrCode />
              <b>2. Use este mesmo QR</b>
              <small>Depois da abertura, toque em verificar para entrar.</small>
            </div>
          </Steps>
        )}

        {onRetry && (
          <Retry type="button" disabled={retrying} onClick={onRetry}>
            <RefreshCw className={retrying ? 'spinning' : ''} />
            {retrying ? 'Verificando mesa...' : 'Verificar novamente'}
          </Retry>
        )}
      </Card>
    </Root>
  );
}
