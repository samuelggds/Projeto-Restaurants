import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bike, CircleDollarSign, Plus, RefreshCw, Trash2 } from 'lucide-react';

import courierCompensationService, {
  type CompensationPolicy,
  type CourierConfiguration,
  type CourierSettlement,
  type PendingCourierOrder,
} from '../../../Services/courierCompensationService';
import { useAppDialog } from '../../../components/AppDialog/context';
import * as S from './CourierCompensationSettings.styles';

const emptyPolicy: CompensationPolicy = {
  model: 'FIXED_PER_DELIVERY',
  fixedAmount: 0,
  baseAmount: 0,
  includedDistanceMeters: 0,
  extraPerKmAmount: 0,
  ranges: [{ maxDistanceMeters: 3000, amount: 0 }],
};

function money(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function message(error: unknown) {
  const typed = error as { message?: string; response?: { data?: { error?: string } } };
  return typed.response?.data?.error || typed.message || 'Não foi possível concluir a operação.';
}

function PolicyEditor({
  policy,
  onChange,
}: {
  policy: CompensationPolicy;
  onChange: (value: CompensationPolicy) => void;
}) {
  const number = (key: keyof CompensationPolicy, value: string) =>
    onChange({ ...policy, [key]: Math.max(0, Number(value || 0)) });
  return (
    <div className="grid">
      <div className="field full">
        <label htmlFor="courier-model">Como calcular cada entrega</label>
        <select
          id="courier-model"
          value={policy.model}
          onChange={(event) =>
            onChange({ ...policy, model: event.target.value as CompensationPolicy['model'] })
          }
        >
          <option value="FIXED_PER_DELIVERY">Valor fixo por entrega</option>
          <option value="DISTANCE_RANGES">Valor por faixa de distância</option>
          <option value="BASE_PLUS_DISTANCE">Valor base + adicional por quilômetro</option>
        </select>
        <span className="muted">
          Este valor é do motoqueiro e não altera a taxa de entrega cobrada do cliente.
        </span>
      </div>
      {policy.model === 'FIXED_PER_DELIVERY' ? (
        <div className="field">
          <label>Valor por entrega (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={policy.fixedAmount}
            onChange={(event) => number('fixedAmount', event.target.value)}
          />
        </div>
      ) : null}
      {policy.model === 'BASE_PLUS_DISTANCE' ? (
        <>
          <div className="field">
            <label>Valor base (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={policy.baseAmount}
              onChange={(event) => number('baseAmount', event.target.value)}
            />
          </div>
          <div className="field">
            <label>Distância incluída (metros)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={policy.includedDistanceMeters}
              onChange={(event) => number('includedDistanceMeters', event.target.value)}
            />
          </div>
          <div className="field">
            <label>Adicional por km (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={policy.extraPerKmAmount}
              onChange={(event) => number('extraPerKmAmount', event.target.value)}
            />
          </div>
        </>
      ) : null}
      {policy.model === 'DISTANCE_RANGES' ? (
        <div className="field full">
          <label>Faixas de distância</label>
          {policy.ranges.map((range, index) => (
            <div className="range" key={`${range.maxDistanceMeters}-${index}`}>
              <div className="field">
                <span className="muted">Até (metros)</span>
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={range.maxDistanceMeters}
                  onChange={(event) =>
                    onChange({
                      ...policy,
                      ranges: policy.ranges.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              maxDistanceMeters: Math.max(1, Number(event.target.value || 1)),
                            }
                          : item,
                      ),
                    })
                  }
                />
              </div>
              <div className="field">
                <span className="muted">Valor (R$)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={range.amount}
                  onChange={(event) =>
                    onChange({
                      ...policy,
                      ranges: policy.ranges.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, amount: Math.max(0, Number(event.target.value || 0)) }
                          : item,
                      ),
                    })
                  }
                />
              </div>
              <button
                className="secondary"
                type="button"
                aria-label={`Remover faixa ${index + 1}`}
                disabled={policy.ranges.length === 1}
                onClick={() =>
                  onChange({
                    ...policy,
                    ranges: policy.ranges.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            className="secondary"
            type="button"
            onClick={() =>
              onChange({
                ...policy,
                ranges: [
                  ...policy.ranges,
                  {
                    maxDistanceMeters: (policy.ranges.at(-1)?.maxDistanceMeters || 0) + 3000,
                    amount: 0,
                  },
                ],
              })
            }
          >
            <Plus size={15} /> Adicionar faixa
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function CourierCompensationSettings() {
  const { confirmDialog } = useAppDialog();
  const [tab, setTab] = useState<'rules' | 'settlements'>('rules');
  const [configuration, setConfiguration] = useState<CourierConfiguration | null>(null);
  const [policy, setPolicy] = useState<CompensationPolicy>(emptyPolicy);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [courierId, setCourierId] = useState(0);
  const [override, setOverride] = useState<CompensationPolicy>(emptyPolicy);
  const [pending, setPending] = useState<PendingCourierOrder[]>([]);
  const [settlements, setSettlements] = useState<CourierSettlement[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState<
    'PIX' | 'CASH' | 'BANK_TRANSFER' | 'OTHER'
  >('PIX');
  const [settlementNote, setSettlementNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [config, orders, history] = await Promise.all([
        courierCompensationService.getConfiguration(),
        courierCompensationService.listPendingOrders(),
        courierCompensationService.listAdminSettlements(),
      ]);
      setConfiguration(config);
      setPolicy(config.defaultPolicy);
      setTimezone(config.timezone);
      setPending(orders);
      setSettlements(history);
      setCourierId((currentCourierId) => {
        const nextCourierId = config.couriers.some((item) => item.id === currentCourierId)
          ? currentCourierId
          : config.couriers[0]?.id || 0;
        const courier = config.couriers.find((item) => item.id === nextCourierId);
        setOverride(courier?.override || config.defaultPolicy);
        return nextCourierId;
      });
    } catch (error) {
      setFeedback({ tone: 'error', text: message(error) });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedOrders = pending.filter((order) => selected.includes(order.id));
  const totals = useMemo(
    () => ({
      gross: selectedOrders.reduce((sum, order) => sum + order.courierEarning, 0),
      cash: selectedOrders.reduce((sum, order) => sum + order.cashCollectedAmount, 0),
    }),
    [selectedOrders],
  );
  const selectedCourier = configuration?.couriers.find((courier) => courier.id === courierId);
  const courierOrders = pending.filter((order) => order.assignedCourierId === courierId);

  async function saveDefault() {
    setBusy(true);
    setFeedback(null);
    try {
      await courierCompensationService.updateDefault(policy, timezone);
      setFeedback({ tone: 'success', text: 'Regra padrão salva com segurança.' });
      await load();
    } catch (error) {
      setFeedback({ tone: 'error', text: message(error) });
      setBusy(false);
    }
  }

  async function saveOverride() {
    if (!courierId) return;
    setBusy(true);
    setFeedback(null);
    try {
      await courierCompensationService.updateCourierOverride(courierId, override);
      setFeedback({
        tone: 'success',
        text: `Regra exclusiva de ${selectedCourier?.name || 'motoqueiro'} salva.`,
      });
      await load();
    } catch (error) {
      setFeedback({ tone: 'error', text: message(error) });
      setBusy(false);
    }
  }

  async function createSettlement() {
    if (!courierId || !selected.length) return;
    const confirmed = await confirmDialog({
      title: 'Declarar este acerto?',
      description:
        'O motoqueiro ainda precisará confirmar. Só depois as entregas serão marcadas como pagas.',
      confirmLabel: 'Declarar acerto',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await courierCompensationService.createSettlement({
        courierId,
        orderIds: selected,
        paymentMethod: settlementPaymentMethod,
        adminNote: settlementNote.trim() || undefined,
      });
      setSelected([]);
      setSettlementNote('');
      setFeedback({ tone: 'success', text: 'Acerto enviado para confirmação do motoqueiro.' });
      await load();
    } catch (error) {
      setFeedback({ tone: 'error', text: message(error) });
      setBusy(false);
    }
  }

  return (
    <S.Root>
      <div className="hero">
        <div>
          <h2>Pagamento dos motoqueiros</h2>
          <p>Configure o ganho de cada entrega e faça acertos com conferência dos dois lados.</p>
        </div>
        <span className="hero-icon">
          <Bike />
        </span>
      </div>
      <div className="tabs">
        <button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>
          Regras de ganho
        </button>
        <button
          className={tab === 'settlements' ? 'active' : ''}
          onClick={() => setTab('settlements')}
        >
          Acertos
        </button>
        <button className="secondary" onClick={() => void load()} disabled={busy}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>
      {feedback ? (
        <div role="status" className={`notice ${feedback.tone}`}>
          {feedback.text}
        </div>
      ) : null}
      {tab === 'rules' ? (
        <>
          <div className="card">
            <h3>Regra padrão do restaurante</h3>
            <p className="muted">Usada por todos os motoqueiros sem uma regra exclusiva.</p>
            <div className="field" style={{ margin: '14px 0' }}>
              <label>Fuso horário dos relatórios</label>
              <input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            </div>
            <PolicyEditor policy={policy} onChange={setPolicy} />
            <div className="actions">
              <button className="primary" disabled={busy} onClick={() => void saveDefault()}>
                Salvar regra padrão
              </button>
            </div>
          </div>
          <div className="card">
            <h3>Exceção por motoqueiro</h3>
            <p className="muted">
              Opcional. Se não houver exceção, a regra padrão acima será aplicada.
            </p>
            <div className="courier-bar">
              <div className="field">
                <label>Motoqueiro</label>
                <select
                  value={courierId}
                  onChange={(event) => {
                    const id = Number(event.target.value);
                    setCourierId(id);
                    const courier = configuration?.couriers.find((item) => item.id === id);
                    setOverride(courier?.override || configuration?.defaultPolicy || emptyPolicy);
                  }}
                >
                  <option value={0}>Selecione</option>
                  {configuration?.couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name}
                      {courier.active ? '' : ' (inativo)'}
                    </option>
                  ))}
                </select>
              </div>
              {selectedCourier?.override ? (
                <button
                  className="danger"
                  disabled={busy}
                  onClick={async () => {
                    if (!courierId) return;
                    await courierCompensationService.removeCourierOverride(courierId);
                    await load();
                  }}
                >
                  Usar regra padrão
                </button>
              ) : null}
            </div>
            {courierId ? (
              <>
                <PolicyEditor policy={override} onChange={setOverride} />
                <div className="actions">
                  <button className="primary" disabled={busy} onClick={() => void saveOverride()}>
                    Salvar regra exclusiva
                  </button>
                </div>
              </>
            ) : (
              <p className="muted">Selecione um motoqueiro para configurar uma exceção.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card">
            <h3>Novo acerto</h3>
            <p className="muted">
              Selecione apenas entregas concluídas. Dinheiro recebido do cliente é descontado
              automaticamente.
            </p>
            <div className="field" style={{ margin: '14px 0' }}>
              <label>Motoqueiro</label>
              <select
                value={courierId}
                onChange={(event) => {
                  setCourierId(Number(event.target.value));
                  setSelected([]);
                }}
              >
                <option value={0}>Selecione</option>
                {configuration?.couriers
                  .filter((courier) => courier.active)
                  .map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="orders">
              {courierOrders.map((order) => (
                <label className="order" key={order.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(order.id)}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(order.id)
                          ? current.filter((id) => id !== order.id)
                          : [...current, order.id],
                      )
                    }
                  />
                  <span>
                    <b>Pedido #{order.id}</b>
                    <small>{order.district || order.city || 'Entrega concluída'}</small>
                  </span>
                  <strong>{money(order.courierEarning)}</strong>
                </label>
              ))}
            </div>
            {courierId && !courierOrders.length ? (
              <p className="muted">Nenhuma entrega disponível para acerto.</p>
            ) : null}
            <div className="grid">
              <div className="field">
                <label htmlFor="settlement-payment-method">Como o acerto foi realizado</label>
                <select
                  id="settlement-payment-method"
                  value={settlementPaymentMethod}
                  onChange={(event) =>
                    setSettlementPaymentMethod(
                      event.target.value as typeof settlementPaymentMethod,
                    )
                  }
                >
                  <option value="PIX">PIX</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="BANK_TRANSFER">Transferência bancária</option>
                  <option value="OTHER">Outro</option>
                </select>
                <span className="muted">
                  Esta é a forma usada no acerto, não a regra que calcula cada entrega.
                </span>
              </div>
              <div className="field">
                <label htmlFor="settlement-note">Observação opcional</label>
                <input
                  id="settlement-note"
                  value={settlementNote}
                  maxLength={500}
                  onChange={(event) => setSettlementNote(event.target.value)}
                  placeholder="Ex.: PIX enviado para a chave cadastrada"
                />
              </div>
            </div>
            <div className="summary">
              <div>
                <span>Ganhos do motoqueiro</span>
                <strong>{money(totals.gross)}</strong>
              </div>
              <div>
                <span>Dinheiro recebido</span>
                <strong>- {money(totals.cash)}</strong>
              </div>
              <div>
                <span>Saldo do acerto</span>
                <strong>{money(totals.gross - totals.cash)}</strong>
              </div>
            </div>
            <div className="actions">
              <button
                className="primary"
                disabled={busy || !selected.length}
                onClick={() => void createSettlement()}
              >
                <CircleDollarSign size={16} /> Declarar acerto
              </button>
            </div>
          </div>
          <div className="card">
            <h3>Histórico de acertos</h3>
            <div className="settlements">
              {settlements.map((entry) => (
                <div className="settlement" key={entry.publicId}>
                  <div>
                    <b>{entry.courier.name}</b>
                    <span className="status">{entry.status.replaceAll('_', ' ')}</span>
                  </div>
                  <div>
                    <small className="muted">{entry.items.length} entrega(s)</small>
                    <strong>{money(entry.netAmount)}</strong>
                  </div>
                  {['AWAITING_COURIER_CONFIRMATION', 'DISPUTED'].includes(entry.status) ? (
                    <div className="actions">
                      <button
                        className="danger"
                        onClick={async () => {
                          const confirmed = await confirmDialog({
                            title: 'Cancelar este acerto?',
                            description:
                              'As entregas voltarão a ficar disponíveis para um novo acerto.',
                            confirmLabel: 'Cancelar acerto',
                            tone: 'danger',
                          });
                          if (confirmed) {
                            await courierCompensationService.cancelSettlement(entry.publicId);
                            await load();
                          }
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {!settlements.length ? (
                <p className="muted">Nenhum acerto criado até agora.</p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </S.Root>
  );
}
