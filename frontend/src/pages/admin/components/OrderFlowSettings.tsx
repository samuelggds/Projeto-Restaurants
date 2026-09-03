import { BellRing, Gauge, ShoppingBag, TimerReset } from 'lucide-react';
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
  const enabledAutomations = FLOW_OPTIONS.filter(([key]) => settings[key]).length;

  return (
    <S.SettingSection>
      <S.SettingsHero>
        <div className="settings-hero-copy">
          <span className="settings-hero-icon" aria-hidden="true">
            <ShoppingBag />
          </span>
          <div>
            <span className="settings-eyebrow">FLUXO OPERACIONAL</span>
            <h2>Defina como cada novo pedido entra na operação</h2>
            <p>
              Ajuste automações, alertas e capacidade para manter a cozinha previsível mesmo nos
              horários de maior movimento.
            </p>
          </div>
        </div>
        <span className="settings-hero-badge">
          <Gauge /> {enabledAutomations}/{FLOW_OPTIONS.length} automações ativas
        </span>
      </S.SettingsHero>

      <S.Card>
        <S.SettingsCardHeading>
          <div className="settings-card-copy">
            <h2>Fluxo dos pedidos</h2>
            <p>Escolha o que deve acontecer automaticamente quando um pedido chegar.</p>
          </div>
          <span className="settings-card-icon" aria-hidden="true">
            <BellRing />
          </span>
        </S.SettingsCardHeading>

        <S.SettingsToggleList>
          {FLOW_OPTIONS.map(([key, title, description]) => (
            <label className="toggle-row" key={key}>
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
            </label>
          ))}
        </S.SettingsToggleList>
      </S.Card>

      <S.Card>
        <S.SettingsCardHeading>
          <div className="settings-card-copy">
            <h2>Prazos e capacidade</h2>
            <p>Use limites realistas para evitar promessas que a operação não consegue cumprir.</p>
          </div>
          <span className="settings-card-icon" aria-hidden="true">
            <TimerReset />
          </span>
        </S.SettingsCardHeading>

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
            <small>Tempo usado como referência para informar o cliente.</small>
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
            <small>Protege a operação quando houver muitos pedidos ao mesmo tempo.</small>
            {errors.maxConcurrentOrders && <small>{errors.maxConcurrentOrders}</small>}
          </S.Field>
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}
