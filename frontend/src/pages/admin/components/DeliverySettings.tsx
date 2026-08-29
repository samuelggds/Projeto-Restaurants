import styled from 'styled-components';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Settings = typeof adminMockSettings;
type DeliveryFeeRange = Settings['deliveryFeeRanges'][number];

type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const CHANNELS = [
  ['acceptsDelivery', 'Delivery', 'Entregas no endereço do cliente.'],
  ['acceptsPickup', 'Retirada no balcão', 'Cliente retira o pedido no restaurante.'],
] as const;

const BASE_DELIVERY_RULES = [
  [
    'minimumOrder',
    'Pedido mínimo (R$)',
    'Valor mínimo dos produtos para concluir um pedido de delivery.',
  ],
  [
    'freeShippingMinimum',
    'Frete grátis acima de (R$)',
    'Use zero para não oferecer frete grátis automaticamente.',
  ],
] as const;

const FeeModeSection = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 22px;

  > b {
    font-size: 13px;
    color: #302b27;
  }

  > small {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }
`;

const FeeModeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const FeeModeButton = styled.button<{ $active: boolean }>`
  min-height: 78px;
  display: grid;
  gap: 5px;
  padding: 15px 16px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--a)' : 'var(--border)')};
  border-radius: 12px;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--a) 8%, white)' : '#fff'};
  color: #302b27;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;

  &:hover:not(:disabled) {
    border-color: var(--a);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  strong {
    font-size: 13px;
  }

  span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
  }
`;

const DistancePanel = styled.div`
  display: grid;
  gap: 14px;
  margin-top: 16px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fcfaf7;

  .distance-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .distance-heading div {
    display: grid;
    gap: 4px;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    color: #302b27;
  }

  .distance-heading small,
  .distance-help {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }

  .distance-help {
    margin: 0;
  }
`;

const RangeList = styled.div`
  display: grid;
  gap: 9px;
`;

const RangeRow = styled.div`
  display: grid;
  grid-template-columns: minmax(120px, 0.8fr) minmax(140px, 0.8fr) auto auto;
  align-items: end;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e7e0d8;
  border-radius: 11px;
  background: #fff;

  .range-field {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .range-field span {
    color: #5e5751;
    font-size: 10px;
    font-weight: 800;
  }

  input[type='number'] {
    width: 100%;
    height: 42px;
    min-width: 0;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    background: #fff;
    padding: 0 11px;
    outline: 0;
  }

  input[type='number']:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 10%, transparent);
  }

  input:disabled {
    background: #f1efec;
    color: #99918a;
    cursor: not-allowed;
  }

  @media (max-width: 690px) {
    grid-template-columns: 1fr 1fr;

    .active-control,
    .remove-range {
      align-self: center;
    }
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`;

const ActiveControl = styled.label`
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #5e5751;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;

  input {
    width: 17px;
    height: 17px;
    accent-color: var(--a);
  }
`;

const RemoveRangeButton = styled.button`
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #f0d1cd;
  border-radius: 9px;
  background: #fff;
  color: #b42318;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #fff5f4;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AddRangeButton = styled.button`
  min-height: 42px;
  justify-self: start;
  padding: 0 15px;
  border: 1px solid var(--a);
  border-radius: 9px;
  background: #fff;
  color: var(--a);
  font-weight: 800;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--a) 7%, white);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeliveryAreaSummary = styled.div`
  padding: 11px 13px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--a) 7%, white);
  color: #534c46;
  font-size: 11px;
  line-height: 1.5;

  b {
    color: #302b27;
  }
`;

function getNumericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function DeliverySettings({ settings, update }: Props) {
  const deliveryEnabled = settings.acceptsDelivery;
  const distanceMode = settings.deliveryFeeMode === 'DISTANCE';
  const activeRanges = settings.deliveryFeeRanges.filter((range) => range.active);
  const maximumDeliveryDistance = activeRanges.reduce(
    (highest, range) => Math.max(highest, Number(range.maxDistanceKm) || 0),
    0,
  );

  function updateRange(index: number, changes: Partial<DeliveryFeeRange>) {
    update(
      'deliveryFeeRanges',
      settings.deliveryFeeRanges.map((range, rangeIndex) =>
        rangeIndex === index ? { ...range, ...changes } : range,
      ),
    );
  }

  function addRange() {
    const currentMaximum = settings.deliveryFeeRanges.reduce(
      (highest, range) => Math.max(highest, Number(range.maxDistanceKm) || 0),
      0,
    );
    const nextMaximum = currentMaximum > 0 ? currentMaximum + 3 : 2;

    update('deliveryFeeRanges', [
      ...settings.deliveryFeeRanges,
      {
        maxDistanceKm: Number(nextMaximum.toFixed(2)),
        fee: 0,
        active: true,
      },
    ]);
  }

  function removeRange(index: number) {
    update(
      'deliveryFeeRanges',
      settings.deliveryFeeRanges.filter((_, rangeIndex) => rangeIndex !== index),
    );
  }

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
          {BASE_DELIVERY_RULES.map(([key, label, description]) => (
            <S.Field key={key}>
              {label}
              <input
                type="number"
                min="0"
                step="0.01"
                aria-label={label}
                value={settings[key]}
                disabled={!deliveryEnabled}
                onChange={(event) => update(key, getNumericValue(event.target.value))}
              />
              <small>{description}</small>
            </S.Field>
          ))}
        </S.FormGrid>

        <FeeModeSection>
          <b>Forma de calcular a taxa</b>
          <small>
            Escolha uma taxa única para todos os endereços ou defina valores diferentes conforme a
            distância da rota.
          </small>

          <FeeModeGrid>
            <FeeModeButton
              type="button"
              $active={!distanceMode}
              aria-pressed={!distanceMode}
              disabled={!deliveryEnabled}
              onClick={() => update('deliveryFeeMode', 'FIXED')}
            >
              <strong>Taxa fixa</strong>
              <span>O mesmo valor de entrega é cobrado para todos os endereços atendidos.</span>
            </FeeModeButton>

            <FeeModeButton
              type="button"
              $active={distanceMode}
              aria-pressed={distanceMode}
              disabled={!deliveryEnabled}
              onClick={() => update('deliveryFeeMode', 'DISTANCE')}
            >
              <strong>Taxa por distância</strong>
              <span>O valor é escolhido pela distância real da rota até o endereço do cliente.</span>
            </FeeModeButton>
          </FeeModeGrid>
        </FeeModeSection>

        {!distanceMode ? (
          <S.FormGrid>
            <S.Field>
              Taxa padrão (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                aria-label="Taxa padrão (R$)"
                value={settings.deliveryFee}
                disabled={!deliveryEnabled}
                onChange={(event) => update('deliveryFee', getNumericValue(event.target.value))}
              />
              <small>Valor acrescentado aos pedidos de delivery.</small>
            </S.Field>
          </S.FormGrid>
        ) : (
          <DistancePanel>
            <div className="distance-heading">
              <div>
                <h3>Taxas por distância</h3>
                <small>Informe até quantos quilômetros cada preço será aplicado.</small>
              </div>
            </div>

            {settings.deliveryFeeRanges.length > 0 ? (
              <RangeList>
                {settings.deliveryFeeRanges.map((range, index) => (
                  <RangeRow key={range.id ?? `new-delivery-range-${index}`}>
                    <label className="range-field">
                      <span>Até (km)</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        aria-label={`Distância máxima da faixa ${index + 1}`}
                        value={range.maxDistanceKm}
                        disabled={!deliveryEnabled}
                        onChange={(event) =>
                          updateRange(index, {
                            maxDistanceKm: getNumericValue(event.target.value),
                          })
                        }
                      />
                    </label>

                    <label className="range-field">
                      <span>Taxa (R$)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`Taxa da faixa ${index + 1}`}
                        value={range.fee}
                        disabled={!deliveryEnabled}
                        onChange={(event) =>
                          updateRange(index, {
                            fee: getNumericValue(event.target.value),
                          })
                        }
                      />
                    </label>

                    <ActiveControl className="active-control">
                      <input
                        type="checkbox"
                        aria-label={`Faixa ${index + 1} ativa`}
                        checked={range.active}
                        disabled={!deliveryEnabled}
                        onChange={(event) => updateRange(index, { active: event.target.checked })}
                      />
                      Ativa
                    </ActiveControl>

                    <RemoveRangeButton
                      className="remove-range"
                      type="button"
                      aria-label={`Remover faixa ${index + 1}`}
                      disabled={!deliveryEnabled}
                      onClick={() => removeRange(index)}
                    >
                      Remover
                    </RemoveRangeButton>
                  </RangeRow>
                ))}
              </RangeList>
            ) : (
              <p className="distance-help">
                Nenhuma faixa cadastrada. Adicione pelo menos uma faixa para usar a taxa por
                distância.
              </p>
            )}

            <AddRangeButton
              type="button"
              aria-label="Adicionar faixa de entrega"
              disabled={!deliveryEnabled}
              onClick={addRange}
            >
              + Adicionar faixa
            </AddRangeButton>

            {maximumDeliveryDistance > 0 && (
              <DeliveryAreaSummary>
                <b>Área máxima configurada: até {maximumDeliveryDistance} km.</b> Endereços cuja
                rota ultrapassar a maior faixa ativa serão considerados fora da área de entrega.
              </DeliveryAreaSummary>
            )}

            <p className="distance-help">
              Exemplo: se houver faixas até 2 km por R$ 5 e até 5 km por R$ 8, uma rota de 4 km
              utilizará a taxa de R$ 8.
            </p>
          </DistancePanel>
        )}

        {!deliveryEnabled && (
          <p>Ative o canal Delivery para configurar as regras de entrega.</p>
        )}
      </S.Card>
    </S.SettingSection>
  );
}
