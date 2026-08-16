import { ChangeEvent, RefObject, useRef } from 'react';
import { ImagePlus, LoaderCircle, Sparkles, Upload } from 'lucide-react';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';
import { createRestaurantMonogram } from '../../../utils/restaurantMonogram';

type Settings = typeof adminMockSettings;
type BannerKey = 'mainBannerUrl';

type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  logoInput: RefObject<HTMLInputElement | null>;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onCoverChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onEnhanceCover: () => void | Promise<void>;
  isEnhancingCover: boolean;
  onBannerChange: (key: BannerKey, event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
};

export function BrandSettings({
  settings,
  update,
  logoInput,
  onLogoChange,
  onCoverChange,
  onEnhanceCover,
  isEnhancingCover,
  onBannerChange,
}: Props) {
  const coverInput = useRef<HTMLInputElement>(null);
  const mainBannerInput = useRef<HTMLInputElement>(null);
  const bannerPicker = (
    key: BannerKey,
    label: string,
    size: string,
    input: RefObject<HTMLInputElement | null>,
  ) => (
    <>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/*"
        onChange={(event) => onBannerChange(key, event)}
      />
      <button type="button" onClick={() => input.current?.click()}>
        {settings[key] ? <img src={String(settings[key])} alt={label} /> : <ImagePlus />}
        <b>{label}</b>
        <span>{size}</span>
      </button>
    </>
  );

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
              onChange={onLogoChange}
            />
            <button onClick={() => logoInput.current?.click()}>
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
            <small>
              A IA reconstrói detalhes e prepara a capa em alta definição.
              <br />A utilização gera custo na conta da API.
            </small>
          </div>
        </S.LogoCard>
      </S.Card>
      <S.Card>
        <h2>Identidade da marca</h2>
        <S.FormGrid>
          <S.Field $full>
            Nome do restaurante
            <S.IdentityNameInput
              value={settings.restaurantName}
              onChange={(event) => update('restaurantName', event.target.value)}
            />
          </S.Field>
          <S.Field>
            Cor principal
            <S.Color>
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(event) => update('primaryColor', event.target.value)}
              />
              <input
                value={settings.primaryColor}
                onChange={(event) => update('primaryColor', event.target.value)}
              />
            </S.Color>
          </S.Field>
          <S.Field>
            Descrição do restaurante
            <textarea
              value={settings.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </S.Field>
        </S.FormGrid>
      </S.Card>
      <S.Card>
        <h2>Banner da home</h2>
        <p>Use uma imagem horizontal para destacar sua principal promoção.</p>
        <S.Banners>
          {bannerPicker('mainBannerUrl', 'Banner de promoção', '1440 × 560 px', mainBannerInput)}
        </S.Banners>
      </S.Card>
    </S.Stack>
  );
}
