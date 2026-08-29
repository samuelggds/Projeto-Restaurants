import { ChangeEvent, RefObject, useRef } from 'react';
import { ImagePlus, LoaderCircle, Sparkles, Upload } from 'lucide-react';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';
import { createRestaurantMonogram } from '../../../utils/restaurantMonogram';
import { validateBrandSettings } from '../domain/brandSettingsValidation';
import { PromotionBannerSettings } from './PromotionBannerSettings';

type Settings = typeof adminMockSettings;

type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  logoInput: RefObject<HTMLInputElement | null>;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onCoverChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onEnhanceCover: () => void | Promise<void>;
  isEnhancingCover: boolean;
  onBannerImageChange: (
    localId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>;
  onEnhanceBanner: (localId: string) => void | Promise<void>;
  enhancingBannerLocalId: string | null;
};

export function BrandSettings({
  settings,
  update,
  logoInput,
  onLogoChange,
  onCoverChange,
  onEnhanceCover,
  isEnhancingCover,
  onBannerImageChange,
  onEnhanceBanner,
  enhancingBannerLocalId,
}: Props) {
  const errors = validateBrandSettings(settings);
  const coverInput = useRef<HTMLInputElement>(null);

  return (
    <S.Stack>
      <S.Card>
        <S.LogoCard>
          <div className="copy">
            <h2>Logotipo do restaurante</h2>
            <p>Esse logotipo será exibido no site, cardápio digital e materiais de comunicação.</p>
          </div>
          <div className="logo">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" />
            ) : (
              createRestaurantMonogram(settings.restaurantName)
            )}
          </div>
          <div className="upload">
            <input
              hidden
              ref={logoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Selecionar logotipo do restaurante"
              onChange={onLogoChange}
            />
            <button type="button" onClick={() => logoInput.current?.click()}>
              <Upload />
              Trocar imagem da marca
            </button>
            <small>
              Recomendado: 1600 × 1200 px ou maior,
              <br />
              JPG, PNG ou WebP, máximo 5 MB.
            </small>
          </div>
        </S.LogoCard>
      </S.Card>
      <S.Card>
        <S.LogoCard>
          <div className="copy">
            <h2>Imagem de capa do acesso</h2>
            <p>
              Composição quadrada preparada para preencher a metade das telas de acesso sem ampliar
              demais a marca.
            </p>
          </div>
          <div className="logo">
            {settings.coverImageUrl ? (
              <img src={settings.coverImageUrl} alt="Capa do acesso" />
            ) : (
              <ImagePlus />
            )}
          </div>
          <div className="upload">
            <input
              hidden
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Selecionar imagem de capa"
              onChange={onCoverChange}
            />
            <button type="button" onClick={() => coverInput.current?.click()}>
              <Upload />
              Trocar imagem de capa
            </button>
            <button
              type="button"
              disabled={!settings.coverImageUrl || isEnhancingCover}
              onClick={onEnhanceCover}
            >
              {isEnhancingCover ? <LoaderCircle className="spin" /> : <Sparkles />}{' '}
              {isEnhancingCover ? 'Melhorando...' : 'Melhorar com IA'}
            </button>
            <small>A IA reconstrói detalhes e prepara a capa em alta definição.</small>
          </div>
        </S.LogoCard>
      </S.Card>
      <S.Card>
        <h2>Identidade da marca</h2>
        <S.FormGrid>
          <S.Field $full>
            Nome do restaurante
            <S.IdentityNameInput
              aria-label="Nome do restaurante"
              aria-invalid={Boolean(errors.restaurantName)}
              maxLength={120}
              value={settings.restaurantName}
              onChange={(event) => update('restaurantName', event.target.value)}
            />
            {errors.restaurantName && <small>{errors.restaurantName}</small>}
          </S.Field>
          <S.Field>
            Cor principal
            <S.Color>
              <input
                type="color"
                aria-label="Seletor da cor principal"
                value={settings.primaryColor}
                onChange={(event) => update('primaryColor', event.target.value)}
              />
              <input
                aria-label="Código da cor principal da marca"
                aria-invalid={Boolean(errors.primaryColor)}
                maxLength={7}
                value={settings.primaryColor}
                onChange={(event) => update('primaryColor', event.target.value)}
              />
            </S.Color>
            {errors.primaryColor && <small>{errors.primaryColor}</small>}
          </S.Field>
          <S.Field>
            Descrição do restaurante
            <textarea
              aria-label="Descrição do restaurante"
              aria-invalid={Boolean(errors.description)}
              maxLength={500}
              value={settings.description}
              onChange={(event) => update('description', event.target.value)}
            />
            <small>{settings.description.length}/500 caracteres</small>
            {errors.description && <small>{errors.description}</small>}
          </S.Field>
        </S.FormGrid>
      </S.Card>
      <S.Card>
        <h2>Banner da home</h2>
        <p>
          Monte um carrossel de promoções com imagem, título e descrição. A ordem definida aqui será
          respeitada na Home e cada banner poderá ser ocultado sem ser excluído.
        </p>
        {errors.promotionalBanners && <small>{errors.promotionalBanners}</small>}
        <PromotionBannerSettings
          banners={settings.promotionalBanners}
          onChange={(banners) => update('promotionalBanners', banners)}
          onImageChange={onBannerImageChange}
          onEnhance={onEnhanceBanner}
          enhancingLocalId={enhancingBannerLocalId}
        />
      </S.Card>
    </S.Stack>
  );
}
