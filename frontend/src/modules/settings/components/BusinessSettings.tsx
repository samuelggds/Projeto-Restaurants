import type { RestaurantSettings } from "../types/settings.types";
import * as S from "../styles/settings.styles";
import { Field, FormInput } from "./FormControls";

type Props = {
  settings: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
};

export function BusinessSettings({ settings, onChange }: Props) {
  return (
    <S.Panel>
      <header>
        <span>Informações principais</span>
        <h2>Dados do restaurante</h2>
        <p>Estas informações serão exibidas na Home e nos pedidos.</p>
      </header>
      <S.Card>
        <S.Grid>
          <Field
            label="Nome do restaurante"
            hint="Nome público exibido para os clientes."
          >
            <FormInput
              value={settings.restaurantName}
              onChange={(e) => onChange({ restaurantName: e.target.value })}
            />
          </Field>
          <Field label="Slogan">
            <FormInput
              value={settings.slogan}
              onChange={(e) => onChange({ slogan: e.target.value })}
            />
          </Field>
          <Field label="E-mail de contato">
            <FormInput
              type="email"
              value={settings.email}
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </Field>
          <Field label="Telefone">
            <FormInput
              value={settings.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </Field>
          <Field label="Endereço completo">
            <FormInput
              value={settings.address}
              onChange={(e) => onChange({ address: e.target.value })}
            />
          </Field>
        </S.Grid>
      </S.Card>
    </S.Panel>
  );
}
