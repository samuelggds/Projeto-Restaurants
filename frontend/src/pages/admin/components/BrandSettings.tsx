import { ChangeEvent, RefObject, useRef } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { adminMockSettings } from "../data";
import * as S from "../Admin.styles";

type Settings = typeof adminMockSettings;
type BannerKey = "mainBannerUrl" | "promotion1Url" | "promotion2Url";

type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  logoInput: RefObject<HTMLInputElement | null>;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onBannerChange: (key: BannerKey, event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
};

export function BrandSettings({ settings, update, logoInput, onLogoChange, onBannerChange }: Props) {
  const mainBannerInput = useRef<HTMLInputElement>(null);
  const promotion1Input = useRef<HTMLInputElement>(null);
  const promotion2Input = useRef<HTMLInputElement>(null);
  const bannerPicker = (key: BannerKey, label: string, size: string, input: RefObject<HTMLInputElement | null>) => <>
    <input ref={input} hidden type="file" accept="image/*" onChange={(event) => onBannerChange(key, event)} />
    <button type="button" onClick={() => input.current?.click()}>{settings[key] ? <img src={String(settings[key])} alt={label} /> : <ImagePlus />}<b>{label}</b><span>{size}</span></button>
  </>;

  return <S.Stack>
    <S.Card><S.LogoCard>
      <div className="copy"><h2>Logotipo do restaurante</h2><p>Esse logotipo será exibido no site, cardápio digital e materiais de comunicação.</p></div>
      <div className="logo">{settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" /> : "S&C"}</div>
      <div className="upload"><input hidden ref={logoInput} type="file" accept="image/*" onChange={onLogoChange} /><button onClick={() => logoInput.current?.click()}><Upload />Trocar logotipo</button><small>Recomendado: 512 × 512 px,<br />máximo 5 MB.</small></div>
    </S.LogoCard></S.Card>
    <S.Card><h2>Identidade da marca</h2><S.FormGrid>
      <S.Field $full>Nome do restaurante<input value={settings.restaurantName} onChange={(event) => update("restaurantName", event.target.value)} /></S.Field>
      <S.Field>Cor principal<S.Color><input type="color" value={settings.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} /><input value={settings.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} /></S.Color></S.Field>
      <S.Field>Descrição do restaurante<textarea value={settings.description} onChange={(event) => update("description", event.target.value)} /></S.Field>
    </S.FormGrid></S.Card>
    <S.Card><h2>Banners da home</h2><p>Adicione banners para destacar promoções e novidades.</p><S.Banners>
      {bannerPicker("mainBannerUrl", "Banner principal", "1440 × 560 px", mainBannerInput)}
      {bannerPicker("promotion1Url", "Promoção 1", "600 × 400 px", promotion1Input)}
      {bannerPicker("promotion2Url", "Promoção 2", "600 × 400 px", promotion2Input)}
    </S.Banners></S.Card>
  </S.Stack>;
}
