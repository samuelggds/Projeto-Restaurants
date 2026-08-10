import { adminMockSettings } from "../data";
import * as S from "../Admin.styles";

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const FLOW_OPTIONS: [string, string, boolean][] = [
  ["Aceitar automaticamente", "Novos pedidos entram direto na fila de preparo.", false],
  ["Login para rastreamento", "Cliente deve entrar na conta para acompanhar o pedido.", true],
  ["Notificação sonora", "Tocar alerta sempre que um pedido chegar.", true],
];

export function OrderFlowSettings({ settings, update }: Props) {
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Fluxo dos pedidos</h2>
        <S.ToggleRows>
          {FLOW_OPTIONS.map(([title, description, checked]) => (
            <div className="toggle-row" key={title}>
              <div><b>{title}</b><span>{description}</span></div>
              <input type="checkbox" defaultChecked={checked} />
            </div>
          ))}
        </S.ToggleRows>
      </S.Card>
      <S.Card>
        <h2>Prazos de preparo</h2>
        <S.FormGrid>
          <S.Field>Tempo médio em minutos<input type="number" value={settings.deliveryTime} onChange={(event) => update("deliveryTime", Number(event.target.value))} /></S.Field>
          <S.Field>Limite de pedidos simultâneos<input type="number" defaultValue="20" /></S.Field>
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}
