import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Bike,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MapPin,
  Milestone,
  Plus,
  ReceiptText,
  RefreshCw,
  Route,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
} from 'lucide-react';

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

const policyModels = [
  {
    value: 'FIXED_PER_DELIVERY' as const,
    label: 'Valor fixo',
    description: 'Mesmo ganho em todas as entregas',
    icon: Banknote,
  },
  {
    value: 'DISTANCE_RANGES' as const,
    label: 'Por distância',
    description: 'Valores definidos por faixas',
    icon: Milestone,
  },
  {
    value: 'BASE_PLUS_DISTANCE' as const,
    label: 'Base + quilômetro',
    description: 'Valor inicial com adicional variável',
    icon: Route,
  },
];

const settlementStatus: Record<
  CourierSettlement['status'],
  { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' }
> = {
  AWAITING_COURIER_CONFIRMATION: { label: 'Aguardando confirmação', tone: 'warning' },
  CONFIRMED: { label: 'Confirmado', tone: 'success' },
  DISPUTED: { label: 'Em contestação', tone: 'danger' },
  CANCELED: { label: 'Cancelado', tone: 'neutral' },
};

function shortDate(value: string | null) {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PolicyEditor({
  policy,
  onChange,
  idPrefix,
}: {
  policy: CompensationPolicy;
  onChange: (value: CompensationPolicy) => void;
  idPrefix: string;
}) {
  const number = (key: keyof CompensationPolicy, value: string) =>
    onChange({ ...policy, [key]: Math.max(0, Number(value || 0)) });
  return (
    <div className="policy-editor">
      <fieldset className="model-fieldset">
        <legend>Como calcular cada entrega</legend>
        <div className="model-selector" role="radiogroup" aria-label="Modelo de pagamento">
          {policyModels.map((model) => {
            const ModelIcon = model.icon;
            const selected = policy.model === model.value;
            return (
              <button
                aria-checked={selected}
                className={selected ? 'selected' : ''}
                key={model.value}
                onClick={() => onChange({ ...policy, model: model.value })}
                role="radio"
                type="button"
              >
                <ModelIcon aria-hidden="true" />
                <span>
                  <b>{model.label}</b>
                  <small>{model.description}</small>
                </span>
                <i aria-hidden="true">{selected && <CheckCircle2 />}</i>
              </button>
            );
          })}
        </div>
        <p className="field-help">
          O ganho do entregador é independente da taxa cobrada do cliente.
        </p>
      </fieldset>
      <div className="policy-values">
        {policy.model === 'FIXED_PER_DELIVERY' ? (
          <div className="field">
            <label htmlFor={`${idPrefix}-fixed-amount`}>Valor por entrega</label>
            <div className="money-input">
              <span>R$</span>
              <input
                id={`${idPrefix}-fixed-amount`}
                type="number"
                min="0"
                step="0.01"
                value={policy.fixedAmount}
                onChange={(event) => number('fixedAmount', event.target.value)}
              />
            </div>
          </div>
        ) : null}
        {policy.model === 'BASE_PLUS_DISTANCE' ? (
          <>
            <div className="field">
              <label htmlFor={`${idPrefix}-base-amount`}>Valor base</label>
              <div className="money-input">
                <span>R$</span>
                <input
                  id={`${idPrefix}-base-amount`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={policy.baseAmount}
                  onChange={(event) => number('baseAmount', event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${idPrefix}-included-distance`}>Distância incluída</label>
              <input
                id={`${idPrefix}-included-distance`}
                type="number"
                min="0"
                step="100"
                value={policy.includedDistanceMeters}
                onChange={(event) => number('includedDistanceMeters', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`${idPrefix}-extra-per-km`}>Adicional por km</label>
              <div className="money-input">
                <span>R$</span>
                <input
                  id={`${idPrefix}-extra-per-km`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={policy.extraPerKmAmount}
                  onChange={(event) => number('extraPerKmAmount', event.target.value)}
                />
              </div>
            </div>
          </>
        ) : null}
        {policy.model === 'DISTANCE_RANGES' ? (
          <div className="range-editor">
            <div className="range-heading">
              <span>Faixas de distância</span>
              <small>{policy.ranges.length} configurada(s)</small>
            </div>
            {policy.ranges.map((range, index) => (
              <div className="range" key={`${range.maxDistanceMeters}-${index}`}>
                <b className="range-number">{index + 1}</b>
                <div className="field">
                  <label htmlFor={`${idPrefix}-range-distance-${index}`}>Até (metros)</label>
                  <input
                    id={`${idPrefix}-range-distance-${index}`}
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
                  <label htmlFor={`${idPrefix}-range-amount-${index}`}>Valor</label>
                  <div className="money-input">
                    <span>R$</span>
                    <input
                      id={`${idPrefix}-range-amount-${index}`}
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
  const activeCouriers = configuration?.couriers.filter((courier) => courier.active) || [];
  const openSettlements = settlements.filter((entry) =>
    ['AWAITING_COURIER_CONFIRMATION', 'DISPUTED'].includes(entry.status),
  );
  const selectedBalance = totals.gross - totals.cash;
  const allCourierOrdersSelected =
    courierOrders.length > 0 && courierOrders.every((order) => selected.includes(order.id));

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
    <S.Root aria-busy={busy}>
      <header className="page-header">
        <div className="page-title">
          <span className="eyebrow">
            <Bike aria-hidden="true" /> Operação de entregas
          </span>
          <h2>Ganhos e acertos</h2>
          <p>Defina os ganhos da equipe e confira os valores antes de fechar cada acerto.</p>
        </div>
        <button
          aria-label="Atualizar pagamentos dos motoqueiros"
          className="refresh-button"
          disabled={busy}
          onClick={() => void load()}
          title="Atualizar dados"
          type="button"
        >
          <RefreshCw aria-hidden="true" />
        </button>
      </header>

      <section className="overview-strip" aria-label="Resumo dos pagamentos dos motoqueiros">
        <div>
          <span className="metric-icon couriers">
            <UsersRound aria-hidden="true" />
          </span>
          <span>
            <b>{activeCouriers.length}</b>
            <small>Motoqueiros ativos</small>
          </span>
        </div>
        <div>
          <span className="metric-icon deliveries">
            <ReceiptText aria-hidden="true" />
          </span>
          <span>
            <b>{pending.length}</b>
            <small>Entregas para acertar</small>
          </span>
        </div>
        <div>
          <span className="metric-icon settlements">
            <Clock3 aria-hidden="true" />
          </span>
          <span>
            <b>{openSettlements.length}</b>
            <small>Acertos em aberto</small>
          </span>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Pagamento dos motoqueiros">
        <button
          aria-controls="courier-rules-panel"
          aria-selected={tab === 'rules'}
          className={tab === 'rules' ? 'active' : ''}
          id="courier-rules-tab"
          onClick={() => {
            setTab('rules');
            setFeedback(null);
          }}
          role="tab"
          type="button"
        >
          <WalletCards aria-hidden="true" />
          <span>Regras de pagamento</span>
        </button>
        <button
          aria-controls="courier-settlements-panel"
          aria-selected={tab === 'settlements'}
          className={tab === 'settlements' ? 'active' : ''}
          id="courier-settlements-tab"
          onClick={() => {
            setTab('settlements');
            setFeedback(null);
          }}
          role="tab"
          type="button"
        >
          <CircleDollarSign aria-hidden="true" />
          <span>Acertos e conferência</span>
          {pending.length > 0 && <b>{pending.length}</b>}
        </button>
      </div>
      {feedback ? (
        <div role="status" className={`notice ${feedback.tone}`}>
          {feedback.text}
        </div>
      ) : null}
      {tab === 'rules' ? (
        <div
          aria-labelledby="courier-rules-tab"
          className="rules-layout"
          id="courier-rules-panel"
          role="tabpanel"
        >
          <section className="panel default-rule-panel">
            <header className="panel-header">
              <span className="panel-icon">
                <WalletCards aria-hidden="true" />
              </span>
              <div>
                <span className="section-kicker">Regra principal</span>
                <h3>Pagamento padrão</h3>
                <p>Aplicado automaticamente quando o motoqueiro não possui uma regra exclusiva.</p>
              </div>
              <span className="rule-badge">Padrão</span>
            </header>
            <div className="timezone-field field">
              <label htmlFor="courier-report-timezone">Fuso horário dos relatórios</label>
              <div>
                <Clock3 aria-hidden="true" />
                <input
                  id="courier-report-timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                />
              </div>
            </div>
            <PolicyEditor idPrefix="default-policy" policy={policy} onChange={setPolicy} />
            <footer className="panel-actions">
              <span>Alterações afetam novas entregas.</span>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void saveDefault()}
                type="button"
              >
                <CheckCircle2 aria-hidden="true" />
                Salvar regra padrão
              </button>
            </footer>
          </section>

          <section className="panel override-panel">
            <header className="panel-header compact">
              <span className="panel-icon">
                <UserRound aria-hidden="true" />
              </span>
              <div>
                <span className="section-kicker">Ajuste individual</span>
                <h3>Regra por motoqueiro</h3>
                <p>Use somente quando alguém tiver uma combinação diferente.</p>
              </div>
            </header>
            <div className="courier-selector field">
              <label htmlFor="override-courier">Motoqueiro</label>
              <select
                id="override-courier"
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
            {courierId ? (
              <>
                <div className={`rule-state ${selectedCourier?.override ? 'custom' : 'inherited'}`}>
                  {selectedCourier?.override ? <CheckCircle2 /> : <AlertCircle />}
                  <span>
                    <b>
                      {selectedCourier?.override
                        ? 'Regra exclusiva ativa'
                        : 'Usando a regra padrão'}
                    </b>
                    <small>
                      {selectedCourier?.override
                        ? 'As entregas deste motoqueiro usam os valores abaixo.'
                        : 'Salve para criar uma exceção individual.'}
                    </small>
                  </span>
                </div>
                <PolicyEditor idPrefix="override-policy" policy={override} onChange={setOverride} />
                <footer className="panel-actions override-actions">
                  {selectedCourier?.override ? (
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={async () => {
                        if (!courierId) return;
                        await courierCompensationService.removeCourierOverride(courierId);
                        await load();
                      }}
                      type="button"
                    >
                      Usar regra padrão
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void saveOverride()}
                    type="button"
                  >
                    <CheckCircle2 aria-hidden="true" />
                    Salvar regra exclusiva
                  </button>
                </footer>
              </>
            ) : (
              <div className="empty-state compact">
                <UserRound aria-hidden="true" />
                <b>Selecione um motoqueiro</b>
                <span>A regra padrão continuará valendo até uma exceção ser criada.</span>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div
          aria-labelledby="courier-settlements-tab"
          className="settlements-workspace"
          id="courier-settlements-panel"
          role="tabpanel"
        >
          <div className="settlement-layout">
            <section className="panel deliveries-panel">
              <header className="panel-header compact">
                <span className="panel-icon">
                  <ReceiptText aria-hidden="true" />
                </span>
                <div>
                  <span className="section-kicker">Entregas concluídas</span>
                  <h3>Selecione o que será acertado</h3>
                  <p>Valores em dinheiro recebidos na entrega serão descontados do saldo.</p>
                </div>
              </header>
              <div className="settlement-courier field">
                <label htmlFor="settlement-courier">Motoqueiro</label>
                <select
                  id="settlement-courier"
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
              {courierOrders.length > 0 && (
                <div className="orders-toolbar">
                  <span>{courierOrders.length} entrega(s) disponível(is)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(
                        allCourierOrdersSelected ? [] : courierOrders.map((order) => order.id),
                      )
                    }
                  >
                    {allCourierOrdersSelected ? 'Limpar seleção' : 'Selecionar todas'}
                  </button>
                </div>
              )}
              <div className="orders" aria-label="Entregas disponíveis para acerto">
                {courierOrders.map((order) => {
                  const checked = selected.includes(order.id);
                  return (
                    <label className={`order ${checked ? 'selected' : ''}`} key={order.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(order.id)
                              ? current.filter((id) => id !== order.id)
                              : [...current, order.id],
                          )
                        }
                      />
                      <i className="order-check" aria-hidden="true">
                        {checked && <CheckCircle2 />}
                      </i>
                      <span className="order-copy">
                        <b>Pedido #{order.id}</b>
                        <small>
                          <MapPin /> {order.district || order.city || 'Entrega concluída'}
                        </small>
                        <small>
                          <Clock3 /> {shortDate(order.deliveredAt)}
                        </small>
                      </span>
                      <span className="order-values">
                        <small>Ganho</small>
                        <strong>{money(order.courierEarning)}</strong>
                        {order.cashCollectedAmount > 0 && (
                          <em>- {money(order.cashCollectedAmount)} em dinheiro</em>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              {courierId && !courierOrders.length ? (
                <div className="empty-state">
                  <CheckCircle2 aria-hidden="true" />
                  <b>Nenhuma entrega pendente</b>
                  <span>Este motoqueiro está com os acertos em dia.</span>
                </div>
              ) : null}
            </section>

            <aside className="panel settlement-checkout">
              <header>
                <div>
                  <span className="section-kicker">Resumo do acerto</span>
                  <h3>
                    {selected.length
                      ? `${selected.length} entrega(s)`
                      : 'Nenhuma entrega selecionada'}
                  </h3>
                </div>
                <CircleDollarSign aria-hidden="true" />
              </header>
              <div className="financial-summary">
                <div>
                  <span>Ganhos do motoqueiro</span>
                  <strong>{money(totals.gross)}</strong>
                </div>
                <div>
                  <span>Dinheiro recebido</span>
                  <strong className="negative">- {money(totals.cash)}</strong>
                </div>
                <div className="balance">
                  <span>Saldo final</span>
                  <strong>{money(selectedBalance)}</strong>
                </div>
              </div>
              {selected.length > 0 && (
                <div className={`balance-direction ${selectedBalance < 0 ? 'return' : 'pay'}`}>
                  {selectedBalance < 0 ? <WalletCards /> : <Banknote />}
                  <span>
                    <b>
                      {selectedBalance < 0
                        ? 'Motoqueiro devolve ao restaurante'
                        : 'Restaurante paga ao motoqueiro'}
                    </b>
                    <small>{money(Math.abs(selectedBalance))}</small>
                  </span>
                </div>
              )}
              <div className="settlement-fields">
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
                  <span className="field-help">Forma usada para registrar esta conferência.</span>
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
              <button
                className="primary"
                disabled={busy || !selected.length}
                onClick={() => void createSettlement()}
                type="button"
              >
                <CircleDollarSign size={16} /> Declarar acerto
              </button>
              <p className="confirmation-note">
                <AlertCircle /> O motoqueiro precisará confirmar este valor.
              </p>
            </aside>
          </div>

          <section className="panel history-panel">
            <header className="history-header">
              <div>
                <span className="section-kicker">Conferência dos dois lados</span>
                <h3>Histórico de acertos</h3>
              </div>
              <span>{settlements.length} registro(s)</span>
            </header>
            <div className="settlements">
              {settlements.map((entry) => {
                const status = settlementStatus[entry.status];
                return (
                  <article className="settlement" key={entry.publicId}>
                    <div className="settlement-courier">
                      <span className="avatar">
                        <UserRound />
                      </span>
                      <span>
                        <b>{entry.courier.name}</b>
                        <small>{shortDate(entry.createdAt)}</small>
                      </span>
                    </div>
                    <div className="settlement-total">
                      <small>{entry.items.length} entrega(s)</small>
                      <strong>{money(entry.netAmount)}</strong>
                    </div>
                    <span className={`status ${status.tone}`}>{status.label}</span>
                    {['AWAITING_COURIER_CONFIRMATION', 'DISPUTED'].includes(entry.status) ? (
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
                        type="button"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </article>
                );
              })}
              {!settlements.length ? (
                <div className="empty-state compact">
                  <ReceiptText aria-hidden="true" />
                  <b>Nenhum acerto registrado</b>
                  <span>Os acertos declarados aparecerão aqui.</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </S.Root>
  );
}
