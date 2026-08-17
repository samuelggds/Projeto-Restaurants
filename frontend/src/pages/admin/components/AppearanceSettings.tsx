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
            Fonte
            <select defaultValue="Inter">
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
            <input defaultValue={`${settings.restaurantName} — Delivery`} />
          </S.Field>
          <S.Field $full>
            Descrição para buscadores
            <textarea defaultValue={settings.description} />
          </S.Field>
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}
