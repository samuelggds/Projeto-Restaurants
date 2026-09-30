import { CreditCard } from 'lucide-react';
import * as S from '../Profile.styles';
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
    <S.PaymentCardPreview $brand={details.id} $compact={compact} data-testid="payment-card-visual">
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
    </S.PaymentCardPreview>
  );
}
