import { adminMockSettings } from "../data";
import * as S from "../Admin.styles";

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const AUTOMATIC_MESSAGES: [string, string, boolean][] = [
  ["Confirmação de pedido", "Enviar resumo ao confirmar.", true],
  ["Pedido saiu para entrega", "Avisar o cliente automaticamente.", true],
];

export function WhatsAppSettings({ settings, update }: Props) {
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Conexão com WhatsApp</h2>
        <S.FormGrid>
          <S.Field>Número comercial<input value={settings.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} /></S.Field>
          <S.Field>Nome exibido<input defaultValue="Atendimento Sabor & Casa" /></S.Field>
          <S.Field $full>Mensagem inicial<textarea defaultValue="Olá! Como podemos ajudar?" /></S.Field>
        </S.FormGrid>
      </S.Card>
      <S.Card>
        <h2>Mensagens automáticas</h2>
        <S.ToggleRows>
          {AUTOMATIC_MESSAGES.map(([title, description, checked]) => (
            <div className="toggle-row" key={title}>
              <div><b>{title}</b><span>{description}</span></div>
              <input type="checkbox" defaultChecked={checked} />
            </div>
          ))}
        </S.ToggleRows>
      </S.Card>
    </S.SettingSection>
  );
}
