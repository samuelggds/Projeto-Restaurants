import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const CHANNELS = [
  ['acceptsDelivery', 'Delivery', 'Entregas no endereço do cliente.'],
  ['acceptsPickup', 'Retirada no balcão', 'Cliente retira o pedido no restaurante.'],
] as const;

const DELIVERY_RULES = [
  [
    'minimumOrder',
    'Pedido mínimo (R$)',
    'Valor mínimo dos produtos para concluir um pedido de delivery.',
  ],
  ['deliveryFee', 'Taxa padrão (R$)', 'Valor acrescentado aos pedidos de delivery.'],
  [
    'freeShippingMinimum',
    'Frete grátis acima de (R$)',
    'Use zero para não oferecer frete grátis automaticamente.',
  ],
] as const;

export function DeliverySettings({ settings, update }: Props) {
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Canais de atendimento</h2>
        <S.ToggleRows>
          {CHANNELS.map(([key, title, description]) => (
            <div className="toggle-row" key={key}>
              <div>
                <b>{title}</b>
                <span>{description}</span>
              </div>
              <input
                type="checkbox"
                aria-label={title}
                checked={settings[key]}
                onChange={(event) => update(key, event.target.checked)}
              />
            </div>
          ))}
        </S.ToggleRows>
      </S.Card>
      <S.Card>
        <h2>Regras de entrega</h2>
        <S.FormGrid>
          {DELIVERY_RULES.map(([key, label, description]) => (
            <S.Field key={key}>
              {label}
              <input
                type="number"
                min="0"
                step="0.01"
                aria-label={label}
                value={settings[key]}
                disabled={!settings.acceptsDelivery}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  update(key, Number.isFinite(value) ? Math.max(0, value) : 0);
                }}
              />
              <small>{description}</small>
            </S.Field>
          ))}
        </S.FormGrid>
        {!settings.acceptsDelivery && (
          <p>Ative o canal Delivery para configurar as regras de entrega.</p>
        )}
      </S.Card>
    </S.SettingSection>
  );
}
