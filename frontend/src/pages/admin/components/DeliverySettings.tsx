import { adminMockSettings } from "../data";
import * as S from "../Admin.styles";

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const CHANNELS: [string, string, boolean][] = [
  ["Delivery", "Entregas no endereço do cliente.", true],
  ["Retirada no balcão", "Cliente retira o pedido no restaurante.", true],
];

export function DeliverySettings({ settings, update }: Props) {
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Canais de atendimento</h2>
        <S.ToggleRows>
          {CHANNELS.map(([title, description, checked]) => (
            <div className="toggle-row" key={title}>
              <div><b>{title}</b><span>{description}</span></div>
              <input type="checkbox" defaultChecked={checked} />
            </div>
          ))}
        </S.ToggleRows>
      </S.Card>
      <S.Card>
        <h2>Regras de entrega</h2>
        <S.FormGrid>
          <S.Field>Pedido mínimo (R$)<input type="number" value={settings.minimumOrder} onChange={(event) => update("minimumOrder", Number(event.target.value))} /></S.Field>
          <S.Field>Taxa padrão (R$)<input type="number" defaultValue="6" /></S.Field>
          <S.Field>Raio máximo (km)<input type="number" defaultValue="8" /></S.Field>
          <S.Field>Frete grátis acima de (R$)<input type="number" defaultValue="60" /></S.Field>
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}
