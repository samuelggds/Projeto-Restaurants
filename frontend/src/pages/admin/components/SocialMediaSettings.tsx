import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

export function SocialMediaSettings({ settings, update }: Props) {
  return (
    <S.Card>
      <h2>Redes sociais</h2>
      <p>Links exibidos na Home e no contato.</p>
      <S.FormGrid>
        <S.Field>
          Instagram
          <input
            value={settings.instagram}
            onChange={(event) => update('instagram', event.target.value)}
          />
        </S.Field>
        <S.Field>
          Facebook
          <input
            value={settings.facebook}
            onChange={(event) => update('facebook', event.target.value)}
          />
        </S.Field>
        <S.Field>
          TikTok
          <input placeholder="@seurestaurante" />
        </S.Field>
        <S.Field>
          YouTube
          <input placeholder="URL do canal" />
        </S.Field>
      </S.FormGrid>
    </S.Card>
  );
}
