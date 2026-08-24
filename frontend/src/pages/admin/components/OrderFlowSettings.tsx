import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';
import { validateOrderFlowSettings } from '../domain/orderFlowSettingsValidation';

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
  const errors = validateOrderFlowSettings(settings);
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
                aria-label={title}
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
              aria-label="Tempo médio em minutos"
              aria-invalid={Boolean(errors.deliveryTime)}
              min="1"
              max="240"
              step="1"
              type="number"
              value={settings.deliveryTime}
              onChange={(event) =>
                update(
                  'deliveryTime',
                  Math.min(240, Math.max(1, Math.round(Number(event.target.value) || 1))),
                )
              }
            />
            {errors.deliveryTime && <small>{errors.deliveryTime}</small>}
          </S.Field>
          <S.Field>
            Limite de pedidos simultâneos
            <input
              aria-label="Limite de pedidos simultâneos"
              aria-invalid={Boolean(errors.maxConcurrentOrders)}
              min="1"
              max="500"
              step="1"
              type="number"
              value={settings.maxConcurrentOrders}
              onChange={(event) =>
                update(
                  'maxConcurrentOrders',
                  Math.min(500, Math.max(1, Math.round(Number(event.target.value) || 1))),
                )
              }
            />
            {errors.maxConcurrentOrders && <small>{errors.maxConcurrentOrders}</small>}
          </S.Field>
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}
