import { createElement } from 'react';
import styled from 'styled-components';
import { resolveCategoryIcon } from '../../../config/categoryIconMap';
import {
  getAuthHeroCopy,
  getRestaurantCategoryLabel,
  getRestaurantCategoryPresentation,
  type AuthHeroMode,
} from '../../../config/restaurantCategory';
import type { LoginBranding } from '../domain/loginBranding';
import * as S from '../styles';

const BrandIcon = styled.span<{ $hasCover: boolean }>`
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${(props) =>
      props.$hasCover
        ? 'rgba(255, 255, 255, 0.28)'
        : `color-mix(in srgb, ${props.theme.primary} 24%, ${props.theme.border})`};
  border-radius: 12px;
  color: ${(props) => (props.$hasCover ? '#fff' : props.theme.primary)};
  background: ${(props) =>
    props.$hasCover
      ? 'rgba(20, 14, 10, 0.38)'
      : `color-mix(in srgb, ${props.theme.primary} 10%, ${props.theme.surface})`};
  box-shadow: ${(props) =>
    props.$hasCover ? '0 10px 28px rgba(0, 0, 0, 0.26)' : `0 9px 22px ${props.theme.shadow}`};
  backdrop-filter: blur(12px);

  svg {
    width: 25px;
    height: 25px;
    stroke-width: 2.2;
  }

  @media (max-width: 968px) {
    width: 38px;
    height: 38px;
    border-radius: 10px;

    svg {
      width: 21px;
      height: 21px;
    }
  }
`;

const Copy = styled.span`
  display: grid;
  gap: 0.22rem;

  strong {
    color: inherit;
    font-size: 1em;
    line-height: inherit;
    font-weight: 800;
  }

  span {
    color: inherit;
    opacity: 0.88;
    font-size: 0.92em;
    font-weight: 540;
  }
`;

type Props = {
  branding: LoginBranding;
  mode: AuthHeroMode;
  overrideText?: string | null;
  contextLabel?: string | null;
};

export function TenantBrandHero({ branding, mode, overrideText, contextLabel }: Props) {
  const presentation = getRestaurantCategoryPresentation(branding.category);
  const copy = getAuthHeroCopy(branding.category, mode);
  const categoryIcon = createElement(resolveCategoryIcon(presentation.iconLabel));
  const hasCover = Boolean(branding.logoUrl);
  const categoryLabel = getRestaurantCategoryLabel(presentation.category);
  const supportText = overrideText || copy.support;

  const coverImage = hasCover ? (
    <S.RestaurantLogo
      src={branding.logoUrl}
      alt=""
      aria-hidden="true"
      data-testid="login-cover-image"
      loading="eager"
      fetchPriority="high"
      decoding="async"
      draggable="false"
    />
  ) : null;

  if (mode === 'login') {
    return (
      <>
        {coverImage}
        <S.LoginHeroPanel data-testid="login-hero-content" data-category={presentation.category}>
          <S.LoginCategoryBadge>
            <S.LoginCategoryIcon aria-hidden="true" data-testid="login-category-icon">
              {categoryIcon}
            </S.LoginCategoryIcon>
            <S.LoginCategoryCopy>
              <small>{contextLabel ? 'Acesso personalizado' : 'Experiência para você'}</small>
              <strong>{contextLabel || categoryLabel}</strong>
            </S.LoginCategoryCopy>
          </S.LoginCategoryBadge>

          <S.LoginBrandTitle>{branding.name}</S.LoginBrandTitle>

          <S.LoginHeroCopy>
            <strong>{copy.headline}</strong>
            <span>{supportText}</span>
          </S.LoginHeroCopy>
        </S.LoginHeroPanel>
      </>
    );
  }

  return (
    <>
      {coverImage}

      <S.BrandTitle>
        <BrandIcon $hasCover={hasCover} aria-hidden="true">
          {categoryIcon}
        </BrandIcon>
        <span>{branding.name}</span>
      </S.BrandTitle>

      <S.BrandSubtitle>
        {overrideText ? (
          overrideText
        ) : (
          <Copy>
            <strong>{copy.headline}</strong>
            <span>{copy.support}</span>
          </Copy>
        )}
      </S.BrandSubtitle>
    </>
  );
}
