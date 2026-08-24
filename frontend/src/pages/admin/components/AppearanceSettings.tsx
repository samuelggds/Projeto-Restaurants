import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

export function AppearanceSettings({ settings, update }: Props) {
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Aparência</h2>
        <S.FormGrid>
          <S.Field>
            Cor principal
            <S.Color>
              <input
                aria-label="Selecionar cor principal"
                type="color"
                value={settings.primaryColor}
                onChange={(event) => update('primaryColor', event.target.value)}
              />
              <input
                aria-label="Código da cor principal"
                value={settings.primaryColor}
                onChange={(event) => update('primaryColor', event.target.value)}
              />
            </S.Color>
          </S.Field>
          <S.Field>
            Fonte
            <select
              aria-label="Fonte da loja"
              value={settings.fontFamily}
              onChange={(event) => update('fontFamily', event.target.value)}
            >
              <option>Inter</option>
              <option>Manrope</option>
              <option>DM Sans</option>
            </select>
          </S.Field>
        </S.FormGrid>
      </S.Card>
      <S.Card>
        <h2>SEO da loja</h2>
        <S.FormGrid>
          <S.Field $full>
            Título da página
            <input
              aria-label="Título da página"
              value={settings.seoTitle}
              maxLength={70}
              placeholder={`${settings.restaurantName} — Delivery`}
              onChange={(event) => update('seoTitle', event.target.value)}
            />
            <small>{settings.seoTitle.length}/70 caracteres</small>
          </S.Field>
          <S.Field $full>
            Descrição para buscadores
            <textarea
              aria-label="Descrição para buscadores"
              value={settings.seoDescription}
              maxLength={160}
              placeholder={settings.description}
              onChange={(event) => update('seoDescription', event.target.value)}
            />
            <small>{settings.seoDescription.length}/160 caracteres</small>
          </S.Field>
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}
