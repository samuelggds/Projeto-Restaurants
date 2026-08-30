import visaLogo from '../../../assets/card-brands/visa.svg';
import mastercardLogo from '../../../assets/card-brands/mastercard.svg';
import eloLogo from '../../../assets/card-brands/elo.svg';
import amexLogo from '../../../assets/card-brands/amex.svg';
import hipercardLogo from '../../../assets/card-brands/hipercard.svg';
import dinersLogo from '../../../assets/card-brands/diners.svg';
import discoverLogo from '../../../assets/card-brands/discover.svg';
import jcbLogo from '../../../assets/card-brands/jcb.svg';
import defaultCardLogo from '../../../assets/card-brands/default-card.svg';
import { getCardBrandDetails, type CardBrandId } from '../domain/cardBrand';

const brandLogos: Record<CardBrandId, string> = {
  visa: visaLogo,
  mastercard: mastercardLogo,
  elo: eloLogo,
  amex: amexLogo,
  hipercard: hipercardLogo,
  diners: dinersLogo,
  discover: discoverLogo,
  jcb: jcbLogo,
  card: defaultCardLogo,
};

export function CardBrandLogo({ brand, className }: { brand: string; className?: string }) {
  const details = getCardBrandDetails(brand);
  if (details.id === 'card') return null;

  return (
    <img
      className={className}
      src={brandLogos[details.id]}
      alt={details.label}
      data-card-brand={details.id}
      draggable={false}
    />
  );
}
