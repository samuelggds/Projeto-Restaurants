import type {
  RestaurantSettings,
  SocialSettings,
} from "../types/settings.types";
import * as S from "../styles/settings.styles";
import { Field, FormInput } from "./FormControls";

const SOCIAL_FIELDS: Array<{
  key: keyof SocialSettings;
  label: string;
  icon: string;
  placeholder: string;
}> = [
  {
    key: "instagram",
    label: "Instagram",
    icon: "◎",
    placeholder: "@seurestaurante",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: "f",
    placeholder: "facebook.com/...",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "◉",
    placeholder: "(00) 00000-0000",
  },
  { key: "tiktok", label: "TikTok", icon: "♪", placeholder: "@seurestaurante" },
  {
    key: "youtube",
    label: "YouTube",
    icon: "▶",
    placeholder: "youtube.com/@...",
  },
];

type Props = {
  settings: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
};

export function ContactSettings({ settings, onChange }: Props) {
  function updateSocial(key: keyof SocialSettings, value: string) {
    onChange({ social: { ...settings.social, [key]: value } });
  }

  return (
    <S.Panel>
      <header>
        <span>Presença digital</span>
        <h2>Contato e redes sociais</h2>
        <p>Preencha somente os canais que deseja exibir publicamente.</p>
      </header>
      <S.Card>
        <S.Grid>
          {SOCIAL_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <S.SocialInputWrap>
                <span aria-hidden="true">{field.icon}</span>
                <FormInput
                  value={settings.social[field.key]}
                  placeholder={field.placeholder}
                  onChange={(e) => updateSocial(field.key, e.target.value)}
                />
              </S.SocialInputWrap>
            </Field>
          ))}
        </S.Grid>
      </S.Card>
    </S.Panel>
  );
}
