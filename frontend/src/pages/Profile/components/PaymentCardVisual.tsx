import { CreditCard } from 'lucide-react';
import styled from 'styled-components';
import { getCardBrandDetails } from '../domain/cardBrand';
import { CardBrandLogo } from './CardBrandLogo';

export function PaymentCardVisual({
  brand,
  numberLabel,
  holderName,
  expiryLabel,
  compact = false,
}: {
  brand: string;
  numberLabel: string;
  holderName: string;
  expiryLabel: string;
  compact?: boolean;
}) {
  const details = getCardBrandDetails(brand);

  return (
    <PaymentCardPreview $brand={details.id} $compact={compact} data-testid="payment-card-visual">
      <svg className="card-waves" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
        <path d="M18 48 C72 8, 118 88, 202 48" />
        <path d="M18 92 C72 52, 118 132, 202 92" />
        <path d="M18 136 C72 96, 118 176, 202 136" />
      </svg>
      <header>
        <span className="card-tech" aria-hidden="true">
          <span className="payment-chip" />
          <svg className="contactless-icon" viewBox="0 0 16 16">
            <path d="M5.2 5.5c1.7 1.3 1.7 3.7 0 5" />
            <path d="M7.4 3.7c3 2.3 3 6.3 0 8.6" />
            <path d="M9.7 2c4.1 3.3 4.1 8.7 0 12" />
          </svg>
        </span>
        {details.id === 'card' ? (
          <CreditCard className="card-generic-icon" aria-hidden="true" />
        ) : (
          <CardBrandLogo className="card-brand-logo" brand={details.id} />
        )}
      </header>
      <strong>{numberLabel}</strong>
      <footer>
        <span>
          <small>Nome no Cartão</small>
          <b>{holderName || 'TITULAR DO CARTÃO'}</b>
        </span>
        <span>
          <small>Validade</small>
          <b>{expiryLabel}</b>
        </span>
      </footer>
    </PaymentCardPreview>
  );
}


const PaymentCardPreview = styled.div<{ $brand?: string; $compact?: boolean }>`
  width: ({ $compact }) => ($compact ? '320px' : '536px');
  min-height: ({ $compact }) => ($compact ? '174px' : '220px');
  box-sizing: border-box;
  padding: ({ $compact }) => ($compact ? '22px' : '32px');
  border: 0;
  border-radius: 20px;
  background: linear-gradient(135deg, #2e2d2a 0%, #12110f 100%);
  color: #fff;
  box-shadow: 0 12px 24px rgba(31, 30, 26, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;

  .card-waves {
    position: absolute;
    top: -20px;
    right: -40px;
    width: 220px;
    height: 220px;
    opacity: 0.22;
    pointer-events: none;
  }

  .card-waves path {
    fill: none;
    stroke: rgba(255, 255, 255, 0.96);
    stroke-width: 1.7;
    vector-effect: non-scaling-stroke;
  }

  header,
  footer {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .card-tech {
    width: 60px;
    height: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .payment-chip {
    width: 32px;
    height: 24px;
    flex: 0 0 32px;
    border-radius: 4px;
    background: #e1c694;
  }

  .contactless-icon {
    width: 17px;
    height: 17px;
    color: #fff;
    stroke: #fff;
    fill: none;
    stroke-width: 1.9;
  }

  .card-generic-icon {
    width: 32px;
    height: 22px;
    stroke-width: 1.35;
    color: #fff;
  }

  .card-brand-logo {
    display: block;
    width: auto;
    max-width: 82px;
    max-height: 29px;
    object-fit: contain;
  }

  > strong {
    position: relative;
    z-index: 1;
    margin-top: 36px;
    margin-bottom: 30px;
    color: #fff;
    font-size: 19px;
    line-height: 24px;
    font-weight: 800;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  footer {
    min-height: 30px;
    align-items: flex-end;
  }

  footer span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  footer span:first-child {
    width: 147px;
    flex: 0 0 147px;
  }

  footer span:last-child {
    min-width: 51px;
    text-align: right;
  }

  footer small {
    color: #a8a59e;
    font-size: 8px;
    line-height: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  footer b {
    overflow: hidden;
    color: #fff;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    width: 100%;
    min-height: ({ $compact }) => ($compact ? '168px' : '190px');
  }
`;
