import type { HomeBrand } from '../types';
import * as S from '../FigmaDeliveryExperience.styles';

export function RestaurantCover({ brand }: { brand: HomeBrand }) {
  if (!brand.coverUrl) return null;

  return (
    <S.RestaurantCover aria-label={`Capa de ${brand.name}`}>
      <img
        src={brand.coverUrl}
        alt={`Capa do restaurante ${brand.name}`}
        loading="eager"
        decoding="async"
      />
      <span className="cover-logo">
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt="" decoding="async" />
        ) : (
          brand.monogram || brand.name.slice(0, 1)
        )}
      </span>
    </S.RestaurantCover>
  );
}
