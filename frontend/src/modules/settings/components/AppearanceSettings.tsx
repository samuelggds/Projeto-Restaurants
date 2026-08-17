import type { RestaurantSettings } from '../types/settings.types';
import * as S from '../styles/settings.styles';
import { Field, FormInput } from './FormControls';

type Props = {
  settings: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
};

export function AppearanceSettings({ settings, onChange }: Props) {
  return (
    <S.Panel>
      <header>
        <span>Identidade visual</span>
        <h2>Aparência da sua marca</h2>
        <p>Personalize a Home sem alterar a estrutura do cardápio.</p>
      </header>
      <S.Card>
        <S.BrandPreview>
          <S.BrandLogo $color={settings.primaryColor}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Prévia do logo" />
            ) : (
              (settings.restaurantName || 'R').slice(0, 1)
            )}
          </S.BrandLogo>
          <S.BrandInfo>
            <strong>{settings.restaurantName || 'Seu restaurante'}</strong>
            <span>{settings.slogan || 'Seu slogan aparecerá aqui'}</span>
          </S.BrandInfo>
        </S.BrandPreview>
        <S.Grid>
          <Field label="URL do logo" hint="No backend, conecte ao upload de imagens.">
            <FormInput
              value={settings.logoUrl}
              placeholder="https://..."
              onChange={(e) => onChange({ logoUrl: e.target.value })}
            />
          </Field>
          <Field label="Imagem de capa">
            <FormInput
              value={settings.coverImageUrl}
              placeholder="https://..."
              onChange={(e) => onChange({ coverImageUrl: e.target.value })}
            />
          </Field>
          <Field label="Cor principal da marca">
            <S.ColorField>
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
              />
              <FormInput
                value={settings.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
              />
            </S.ColorField>
          </Field>
        </S.Grid>
      </S.Card>
    </S.Panel>
  );
}
