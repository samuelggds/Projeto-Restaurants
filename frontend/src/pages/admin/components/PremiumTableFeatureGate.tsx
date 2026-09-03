import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, LockKeyhole, RefreshCw, Sparkles } from 'lucide-react';
import styled from 'styled-components';
import tablesService from '../../../Services/tablesService';

const Shell = styled.section`
  border: 1px solid #eadbcf;
  border-radius: 24px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 18px 45px rgba(72, 47, 29, 0.08);
`;

const Hero = styled.div`
  padding: clamp(28px, 5vw, 52px);
  color: #fff;
  background:
    radial-gradient(circle at 88% 16%, rgba(255, 188, 120, 0.32), transparent 28%),
    linear-gradient(135deg, #1f2937, #243b49 58%, #6b3d2b);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    width: fit-content;
    padding: 7px 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    color: #ffd5ac;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  h2 {
    margin: 14px 0 10px;
    font-size: clamp(26px, 4vw, 38px);
    line-height: 1.08;
  }

  p {
    max-width: 720px;
    margin: 0;
    color: #e3e8ec;
    line-height: 1.65;
  }

  .icon {
    width: 88px;
    height: 88px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 26px;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.08);
  }

  .icon svg {
    width: 38px;
    height: 38px;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    .icon { display: none; }
  }
`;

const Body = styled.div`
  padding: clamp(22px, 4vw, 36px);
  display: grid;
  gap: 22px;

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 12px 14px;
    border: 1px solid #eee5dd;
    border-radius: 14px;
    background: #fffaf6;
    color: #433b35;
    font-size: 13px;
    font-weight: 650;
  }

  li svg {
    width: 18px;
    height: 18px;
    color: #b45309;
    flex: 0 0 auto;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-top: 4px;
  }

  .actions span {
    color: #746b64;
    font-size: 12px;
    line-height: 1.5;
  }

  a,
  button {
    min-height: 46px;
    border: 0;
    border-radius: 12px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #b45309;
    color: white;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
  }

  @media (max-width: 700px) {
    ul { grid-template-columns: 1fr; }
    .actions { align-items: stretch; flex-direction: column; }
    a, button { width: 100%; }
  }
`;

const Status = styled.div`
  min-height: 220px;
  border: 1px solid #eadbcf;
  border-radius: 20px;
  background: #fff;
  display: grid;
  place-items: center;
  padding: 28px;
  text-align: center;
  color: #625b55;

  div {
    display: grid;
    justify-items: center;
    gap: 12px;
  }

  svg {
    width: 28px;
    height: 28px;
  }

  .spin { animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

type PremiumAccessState = 'loading' | 'allowed' | 'blocked' | 'error';

type RequestError = {
  response?: {
    status?: number;
    data?: {
      code?: string;
    };
  };
};

function isPremiumTablePlanRequired(error: unknown) {
  const requestError = error as RequestError;
  return (
    requestError.response?.status === 403 &&
    requestError.response?.data?.code === 'PREMIUM_TABLE_PLAN_REQUIRED'
  );
}

export function PremiumTableFeatureGate({ children }: { children: ReactNode }) {
  const [accessState, setAccessState] = useState<PremiumAccessState>('loading');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    tablesService
      .listTables()
      .then(() => {
        if (active) setAccessState('allowed');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAccessState(isPremiumTablePlanRequired(error) ? 'blocked' : 'error');
      });

    return () => {
      active = false;
    };
  }, [revision]);

  const retry = () => {
    setAccessState('loading');
    setRevision((current) => current + 1);
  };

  if (accessState === 'loading') {
    return (
      <Status role="status">
        <div>
          <RefreshCw className="spin" />
          <b>Verificando os recursos do seu plano...</b>
        </div>
      </Status>
    );
  }

  if (accessState === 'error') {
    return (
      <Status role="alert">
        <div>
          <LockKeyhole />
          <b>Não foi possível verificar os recursos do plano do restaurante agora.</b>
          <button type="button" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      </Status>
    );
  }

  if (accessState === 'allowed') return <>{children}</>;

  return (
    <Shell aria-label="Recurso exclusivo do plano Premium">
      <Hero>
        <div>
          <span className="badge">
            <Sparkles size={14} /> RECURSO PREMIUM
          </span>
          <h2>Sistema de mesas disponível no Premium</h2>
          <p>
            Seu plano Básico continua com o sistema de delivery. Para usar o atendimento presencial
            por mesa, QR Code e conta compartilhada, faça o upgrade para o Premium.
          </p>
        </div>
        <span className="icon" aria-hidden="true">
          <LockKeyhole />
        </span>
      </Hero>
      <Body>
        <ul>
          <li><CheckCircle2 /> Mesas e QR Codes seguros</li>
          <li><CheckCircle2 /> Cardápio digital na mesa</li>
          <li><CheckCircle2 /> Pedidos e chamados do salão</li>
          <li><CheckCircle2 /> Conta, divisão e pagamento da mesa</li>
        </ul>
        <div className="actions">
          <span>O delivery permanece disponível normalmente no plano Básico.</span>
          <a href="/billing">Conhecer o plano Premium</a>
        </div>
      </Body>
    </Shell>
  );
}
