import styled from 'styled-components';
import { Sparkles } from 'lucide-react';
import type { AiCreditBalance } from '../../../Services/aiGuideService';

function usd(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.max(0, value));
}

export function AiCreditCard({ balance }: { balance: AiCreditBalance | null }) {
  const remaining = balance?.remainingUsd ?? 5;
  const used = balance?.usedUsd ?? 0;
  const percentRemaining = balance
    ? Math.max(0, Math.min(100, 100 - balance.usedPercent))
    : 100;
  const exhausted = balance?.exhausted === true;

  return (
    <Card data-tour="ai-credits" $exhausted={exhausted}>
      <div className="topline">
        <span className="icon">
          <Sparkles />
        </span>
        <span>
          <b>Créditos OpenAI</b>
          <small>Saldo mensal</small>
        </span>
      </div>
      <strong>{usd(remaining)}</strong>
      <span className="available">{exhausted ? 'Saldo esgotado' : 'disponíveis para usar com IA'}</span>
      <div className="bar" aria-label={`${percentRemaining.toFixed(0)}% dos créditos disponíveis`}>
        <i style={{ width: `${percentRemaining}%` }} />
      </div>
      <footer>
        <span>{usd(used)} usados neste mês</span>
        <span>Limite {usd(balance?.monthlyLimitUsd ?? 5)}</span>
      </footer>
      <p>
        {exhausted
          ? 'Os recursos de IA ficam disponíveis novamente na renovação mensal.'
          : 'Seu limite volta para US$ 5,00 a cada mês. Só o que você usar consome créditos.'}
      </p>
    </Card>
  );
}

const Card = styled.aside<{ $exhausted: boolean }>`
  margin: 0 0 8px;
  padding: 13px;
  border: 1px solid ${({ $exhausted }) =>
    $exhausted ? 'rgba(239, 68, 68, 0.32)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 13px;
  color: #fff;
  background:
    radial-gradient(circle at 88% -10%, rgba(255, 255, 255, 0.13), transparent 38%),
    linear-gradient(150deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);

  .topline {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .topline .icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    color: #17191a;
    background: #fff;
  }
  .topline svg {
    width: 15px;
  }
  .topline > span:last-child {
    display: grid;
    gap: 1px;
  }
  .topline b {
    font-size: 11px;
    letter-spacing: 0.01em;
  }
  .topline small {
    color: #918983;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
  }
  > strong {
    display: block;
    margin-top: 12px;
    font-family: 'Sora', sans-serif;
    font-size: 22px;
    line-height: 1;
    letter-spacing: -0.035em;
  }
  .available {
    display: block;
    margin-top: 4px;
    color: ${({ $exhausted }) => ($exhausted ? '#fca5a5' : '#aaa19b')};
    font-size: 9px;
  }
  .bar {
    height: 5px;
    margin: 11px 0 7px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.09);
  }
  .bar i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: ${({ $exhausted }) => ($exhausted ? '#ef4444' : '#fff')};
    transition: width 260ms ease;
  }
  footer {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: #aaa19b;
    font-size: 8px;
    font-weight: 700;
  }
  p {
    margin: 9px 0 0;
    color: #817a75;
    font-size: 8px;
    line-height: 1.45;
  }
`;
