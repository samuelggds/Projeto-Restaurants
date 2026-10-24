import { Clock3, MapPin, Star } from 'lucide-react';
import type { HomeData } from '../types';
import * as S from '../FigmaDeliveryExperience.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function StorefrontIntro({
  data,
  storefrontAvailability,
}: {
  data: HomeData;
  storefrontAvailability: { isOpen: boolean; label: string };
}) {
  return (
    <S.StorefrontIntro aria-label={`Informações de ${data.brand.name}`}>
      <div className="storefront-identity">
        <h1>{data.brand.name}</h1>
        <div className="storefront-meta">
          {Number(data.brand.ratingCount || 0) > 0 && data.brand.ratingAverage ? (
            <span className="storefront-rating">
              <Star size={15} aria-hidden="true" fill="currentColor" />
              <strong>{data.brand.ratingAverage.toFixed(1)}</strong>
              <small>
                ({Number(data.brand.ratingCount).toLocaleString('pt-BR')}{' '}
                {data.brand.ratingCount === 1 ? 'avaliação' : 'avaliações'})
              </small>
            </span>
          ) : null}
          {data.brand.category ? <span className="storefront-category">{data.brand.category}</span> : null}
          <span className="storefront-status">
            <i className={storefrontAvailability.isOpen ? 'open' : ''} />
            {storefrontAvailability.label}
          </span>
        </div>
      </div>

    </S.StorefrontIntro>
  );
}

export function LegacyHeroMetrics({
  data,
  deliveryTimeLabel,
}: {
  data: HomeData;
  deliveryTimeLabel: string;
}) {
  return (
    <S.HeroMetrics aria-label="Resumo do restaurante">
      {(deliveryTimeLabel || Number(data.deliveryFee || 0) > 0) ? (
        <div className="metric-card">
          <div
            className="delivery-metrics"
            data-single-metric={
              Number(Boolean(deliveryTimeLabel)) +
                Number(Number(data.deliveryFee || 0) > 0) ===
              1
            }
          >
            {deliveryTimeLabel ? (
              <span>
                <b>{deliveryTimeLabel}</b>
                <small>Tempo de entrega</small>
              </span>
            ) : null}
            {Number(data.deliveryFee || 0) > 0 ? (
              <span>
                <b>{money(Number(data.deliveryFee))}</b>
                <small>Taxa de entrega</small>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      {data.brand.address ? (
        <div className="hero-address">
          <MapPin aria-hidden="true" />
          <span>{data.brand.address}</span>
        </div>
      ) : null}
    </S.HeroMetrics>
  );
}
