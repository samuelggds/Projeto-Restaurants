import { Palette, SearchCheck, Sparkles, Type } from 'lucide-react';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

export function AppearanceSettings({ settings, update }: Props) {
  const seoProgress = Number(Boolean(settings.seoTitle.trim())) + Number(Boolean(settings.seoDescription.trim()));

  return (
    <S.SettingSection>
      <S.SettingsHero>
        <div className="settings-hero-copy">
          <span className="settings-hero-icon" aria-hidden="true">
            <Palette />
          </span>
          <div>
            <span className="settings-eyebrow">IDENTIDADE DIGITAL</span>
            <h2>Deixe a loja reconhecível em cada ponto de contato</h2>
            <p>
              Ajuste cor, tipografia e informações para buscadores sem sair do padrão visual do
              restaurante.
            </p>
          </div>
        </div>
        <span className="settings-hero-badge">
          <SearchCheck /> {seoProgress}/2 itens de SEO preenchidos
        </span>
      </S.SettingsHero>

      <S.Card>
        <S.SettingsCardHeading>
          <div className="settings-card-copy">
            <h2>Aparência da loja</h2>
            <p>Escolha a base visual aplicada às páginas públicas do restaurante.</p>
          </div>
          <span className="settings-card-icon" aria-hidden="true">
            <Type />
          </span>
        </S.SettingsCardHeading>

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
            <small>Usada em ações, destaques e elementos de identidade do restaurante.</small>
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
            <small>Mantenha uma fonte simples e legível para cardápio e checkout.</small>
          </S.Field>
        </S.FormGrid>
      </S.Card>

      <S.Card>
        <S.SettingsCardHeading>
          <div className="settings-card-copy">
            <h2>SEO da loja</h2>
            <p>Controle como o restaurante pode aparecer nos resultados de busca.</p>
          </div>
          <span className="settings-card-icon" aria-hidden="true">
            <Sparkles />
          </span>
        </S.SettingsCardHeading>

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
