import styled from 'styled-components';
import type { AiCreditBalance } from '../../../Services/aiGuideService';
import { ChatGptLogo } from '../../../components/ChatGptLogo';

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
        <span className="icon" aria-hidden="true">
          <ChatGptLogo />
        </span>
        <span className="title-copy">
          <b>Créditos OpenAI</b>
          <small>Saldo mensal</small>
        </span>
      </div>

      <div className="balance-row">
        <strong>{usd(remaining)}</strong>
        <span className="available">
          {exhausted ? 'Saldo esgotado' : 'disponíveis para usar com IA'}
        </span>
      </div>

      <div className="bar" aria-label={`${percentRemaining.toFixed(0)}% dos créditos disponíveis`}>
        <i style={{ width: `${percentRemaining}%` }} />
      </div>

      <footer>
        <span>{usd(used)} usados neste mês</span>
        <span>Limite {usd(balance?.monthlyLimitUsd ?? 5)}</span>
      </footer>

      <p>
        {exhausted
          ? 'Os recursos de IA voltam a ficar disponíveis na renovação mensal.'
          : 'O saldo renova mensalmente. Apenas o uso efetivo consome créditos.'}
      </p>
    </Card>
  );
}

const Card = styled.aside<{ $exhausted: boolean }>`
  margin: 2px 4px 10px;
  padding: 10px 8px 12px;
  border: 0;
  border-radius: 0;
  color: #fff;
  background: transparent;
  box-shadow: none;

  .topline {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .topline .icon {
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
    display: grid;
    place-items: center;
    color: ${({ $exhausted }) => ($exhausted ? '#fca5a5' : '#f4efeb')};
    background: transparent;
  }

  .topline svg {
    width: 18px;
    height: 18px;
  }

  .title-copy {
    min-width: 0;
    display: grid;
    gap: 1px;
  }

  .topline b {
    color: #f7f2ee;
    font-size: 11px;
    font-weight: 760;
    letter-spacing: 0.01em;
  }

  .topline small {
    color: #8f8781;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .balance-row {
    margin-top: 10px;
    display: grid;
    gap: 3px;
  }

  .balance-row > strong {
    font-family: 'Sora', sans-serif;
    font-size: 21px;
    line-height: 1;
    letter-spacing: -0.035em;
  }

  .available {
    color: ${({ $exhausted }) => ($exhausted ? '#fca5a5' : '#a9a19b')};
    font-size: 9px;
    line-height: 1.35;
  }

  .bar {
    height: 4px;
    margin: 10px 0 7px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
  }

  .bar i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: ${({ $exhausted }) => ($exhausted ? '#ef4444' : '#f5f1ed')};
    transition: width 260ms ease;
  }

  footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    color: #9b938d;
    font-size: 8px;
    font-weight: 700;
    line-height: 1.35;
  }

  p {
    margin: 8px 0 0;
    color: #776f6a;
    font-size: 8px;
    line-height: 1.45;
  }

  @media (max-width: 820px) {
    margin-inline: 0;
  }
`;
