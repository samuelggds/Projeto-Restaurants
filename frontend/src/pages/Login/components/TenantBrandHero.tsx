import { createElement } from 'react';
import { resolveCategoryIcon } from '../../../config/categoryIconMap';
import {
  getAuthHeroCopy,
  getRestaurantCategoryLabel,
  getRestaurantCategoryPresentation,
  type AuthHeroMode,
} from '../../../config/restaurantCategory';
import type { LoginBranding } from '../domain/loginBranding';
import * as S from '../styles';

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
  const visibleContextLabel = contextLabel === 'Painel administrativo' ? 'ADMIN' : contextLabel;

  return (
    <>
      {hasCover ? (
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
      ) : null}

      <S.LoginHeroPanel
        data-testid="login-hero-content"
        data-category={presentation.category}
        data-auth-hero-mode={mode}
      >
        <S.LoginCategoryBadge>
          <S.LoginCategoryIcon aria-hidden="true" data-testid="login-category-icon">
            {categoryIcon}
          </S.LoginCategoryIcon>
          <S.LoginCategoryCopy>
            <small>{visibleContextLabel ? 'Acesso personalizado' : 'Experiência para você'}</small>
            <strong>{visibleContextLabel || categoryLabel}</strong>
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
