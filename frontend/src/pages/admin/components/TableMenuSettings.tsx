import { adminMockSettings } from "../data";
import * as S from "../Admin.styles";

type Props = {
  settings: typeof adminMockSettings;
};

export function TableMenuSettings({ settings }: Props) {
  const options: [string, string, boolean][] = [
    ["Pedidos por QR Code", "Cliente escaneia, informa o código e envia o pedido.", settings.tableOrderingEnabled],
    ["Chamar garçom", "Permite solicitar atendimento pelo cardápio.", true],
    ["Pedir a conta", "Permite solicitar o fechamento da mesa.", true],
  ];

  return (
    <S.SettingSection>
      <S.Card>
        <h2>Cardápio digital de mesa</h2>
        <S.ToggleRows>
          {options.map(([title, description, checked]) => (
            <div className="toggle-row" key={title}>
              <div><b>{title}</b><span>{description}</span></div>
              <input type="checkbox" defaultChecked={checked} />
            </div>
          ))}
        </S.ToggleRows>
      </S.Card>
      <S.QrPanel>
        <div><b>Código temporário — Mesa 12</b><br /><span>O garçom informa os quatro dígitos ao cliente.</span></div>
        <strong className="code">4827</strong>
        <button>Gerar novo código</button>
      </S.QrPanel>
    </S.SettingSection>
  );
}
