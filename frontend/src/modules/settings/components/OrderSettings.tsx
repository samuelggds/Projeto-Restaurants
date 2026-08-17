import type { RestaurantSettings } from '../types/settings.types';
import * as S from '../styles/settings.styles';
import { Field, FormInput, Switch } from './FormControls';

type Props = {
  settings: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
};

export function OrderSettings({ settings, onChange }: Props) {
  return (
    <S.Panel>
      <header>
        <span>Operação comercial</span>
        <h2>Pedidos, entrega e pagamentos</h2>
        <p>Configure as opções disponibilizadas aos seus clientes.</p>
      </header>
      <S.Card $stack>
        <S.SwitchGroup>
          <Switch
            checked={settings.acceptsDelivery}
            label="Aceitar pedidos para entrega"
            description="Permite que clientes escolham entrega no endereço."
            onChange={(acceptsDelivery) => onChange({ acceptsDelivery })}
          />
          <Switch
            checked={settings.acceptsPickup}
            label="Aceitar retirada no local"
            description="Permite que o cliente retire o pedido no restaurante."
            onChange={(acceptsPickup) => onChange({ acceptsPickup })}
          />
        </S.SwitchGroup>
        <S.Grid $three>
          <Field label="Pedido mínimo (R$)">
            <FormInput
              type="number"
              min="0"
              value={settings.minimumOrder}
              onChange={(e) => onChange({ minimumOrder: Number(e.target.value) })}
            />
          </Field>
          <Field label="Taxa de entrega (R$)">
            <FormInput
              type="number"
              min="0"
              value={settings.deliveryFee}
              onChange={(e) => onChange({ deliveryFee: Number(e.target.value) })}
            />
          </Field>
          <Field label="Ganho do motoqueiro por entrega (R$)">
            <FormInput
              type="number"
              min="0"
              step="0.01"
              value={settings.courierFeePerDelivery}
              onChange={(e) => onChange({ courierFeePerDelivery: Number(e.target.value) })}
            />
          </Field>
          <Field label="Tempo médio de entrega">
            <FormInput
              value={settings.averageDeliveryTime}
              placeholder="Ex: 35–50 min"
              onChange={(e) => onChange({ averageDeliveryTime: e.target.value })}
            />
          </Field>
        </S.Grid>
        <S.SwitchGroup>
          <Switch
            checked={settings.acceptsPix}
            label="Pagamento via Pix"
            onChange={(acceptsPix) => onChange({ acceptsPix })}
          />
          <Switch
            checked={settings.acceptsCard}
            label="Pagamento com cartão"
            onChange={(acceptsCard) => onChange({ acceptsCard })}
          />
        </S.SwitchGroup>
      </S.Card>
    </S.Panel>
  );
}
