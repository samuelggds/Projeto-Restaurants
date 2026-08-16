import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const FLOW_OPTIONS = [
  [
    'autoAcceptOrders',
    'Aceitar automaticamente',
    'Novos pedidos confirmados entram direto na fila de preparo.',
  ],
  [
    'trackingRequiresLogin',
    'Login para rastreamento',
    'Cliente deve entrar na conta para acompanhar o pedido.',
  ],
  ['soundNotifications', 'Notificação sonora', 'Tocar alerta sempre que um pedido chegar.'],
] as const;

export function OrderFlowSettings({ settings, update }: Props) {
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Fluxo dos pedidos</h2>
        <S.ToggleRows>
          {FLOW_OPTIONS.map(([key, title, description]) => (
            <div className="toggle-row" key={key}>
              <div>
                <b>{title}</b>
                <span>{description}</span>
              </div>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(event) => update(key, event.target.checked)}
              />
            </div>
          ))}
        </S.ToggleRows>
      </S.Card>
      <S.Card>
        <h2>Prazos de preparo</h2>
        <S.FormGrid>
          <S.Field>
            Tempo médio em minutos
            <input
              min="1"
              max="240"
              type="number"
              value={settings.deliveryTime}
              onChange={(event) =>
                update('deliveryTime', Math.max(1, Number(event.target.value) || 1))
              }
            />
          </S.Field>
          <S.Field>
            Limite de pedidos simultâneos
            <input
              min="1"
              max="500"
              type="number"
              value={settings.maxConcurrentOrders}
              onChange={(event) =>
                update('maxConcurrentOrders', Math.max(1, Number(event.target.value) || 1))
              }
            />
          </S.Field>
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}
