import type { ReactNode } from 'react';
import {
  BadgeDollarSign,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ListChecks,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import type {
  EmployeeCompensationProrationMode,
  EmployeeEarningDirection,
  EmployeeSettlementPayment,
  EmployeeSettlementPaymentMethod,
} from '../../../Services/employeePaymentsService';
import type { EmployeeCompensationModel } from './EmployeeCompensationSettings.model';
import {
  activePaidCents,
  baseModelLabel,
  earningTypeLabel,
  monthLabel,
  money,
  nextPolicyDate,
  paymentMethodLabel,
  roleLabel,
  settlementStatusMeta,
  shortDateTime,
  variableModelLabel,
  type ManualAdjustmentType,
} from './EmployeeCompensationSettings.shared';

function DialogFrame({
  title,
  kicker,
  Icon,
  wide,
  busy,
  onClose,
  children,
  footer,
}: {
  title: string;
  kicker: string;
  Icon: LucideIcon;
  wide?: boolean;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        aria-labelledby="employee-compensation-dialog-title"
        aria-modal="true"
        className={`dialog ${wide ? 'wide' : ''}`}
        role="dialog"
      >
        <header className="dialog-header">
          <span className="dialog-icon">
            <Icon aria-hidden="true" />
          </span>
          <div>
            <span className="section-kicker">{kicker}</span>
            <h3 id="employee-compensation-dialog-title">{title}</h3>
          </div>
          <button
            aria-label="Fechar"
            className="icon-button"
            disabled={busy}
            onClick={onClose}
            title="Fechar"
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
        {footer ? <footer className="dialog-actions">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function EmployeeCompensationDialogs({ model }: { model: EmployeeCompensationModel }) {
  const {
    activeStaff,
    adjustmentDraft,
    busy,
    confirmSettlement,
    currentPolicies,
    detail,
    detailActivePayments,
    detailLoading,
    generateSettlement,
    modal,
    openPayment,
    paymentDraft,
    policyDraft,
    reason,
    referenceMonth,
    requestReason,
    saveAdjustment,
    savePayment,
    savePolicy,
    saveWorkEntry,
    setAdjustmentDraft,
    setModal,
    setPaymentDraft,
    setPolicyDraft,
    setReason,
    setWorkDraft,
    submitReason,
    workDraft,
  } = model;

  return (
    <>
      {modal?.kind === 'policy' ? (
        <DialogFrame
          Icon={ShieldCheck}
          busy={Boolean(busy)}
          footer={
            <>
              <button
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() => setModal(null)}
                type="button"
              >
                Voltar
              </button>
              <button
                className="primary-button"
                disabled={Boolean(busy)}
                onClick={() => void savePolicy()}
                type="button"
              >
                {busy ? <RefreshCw className="spin" /> : <Check />} Criar versão
              </button>
            </>
          }
          kicker={
            currentPolicies.has(modal.employee.numericId)
              ? `Nova versão · ${modal.employee.name}`
              : `Primeira regra · ${modal.employee.name}`
          }
          onClose={() => setModal(null)}
          title="Política de remuneração"
          wide
        >
          <div className="dialog-body policy-form">
            <fieldset>
              <legend>Modelo base</legend>
              <div className="model-options three">
                {(['NONE', 'FIXED_MONTHLY', 'HOURLY'] as const).map((baseModel) => (
                  <button
                    aria-checked={policyDraft.baseModel === baseModel}
                    className={policyDraft.baseModel === baseModel ? 'selected' : ''}
                    key={baseModel}
                    onClick={() =>
                      setPolicyDraft((current) => ({
                        ...current,
                        baseModel,
                        prorationMode:
                          baseModel === 'FIXED_MONTHLY' ? current.prorationMode : 'NONE',
                      }))
                    }
                    role="radio"
                    type="button"
                  >
                    <span>
                      {baseModel === 'NONE' ? (
                        <XCircle />
                      ) : baseModel === 'FIXED_MONTHLY' ? (
                        <CalendarDays />
                      ) : (
                        <Clock3 />
                      )}
                    </span>
                    <b>{baseModelLabel[baseModel]}</b>
                  </button>
                ))}
              </div>
            </fieldset>
            {policyDraft.baseModel !== 'NONE' ? (
              <div className="form-grid two-columns">
                <label className="field">
                  <span>
                    {policyDraft.baseModel === 'FIXED_MONTHLY' ? 'Valor mensal' : 'Valor por hora'}
                  </span>
                  <span className="money-input">
                    <b>R$</b>
                    <input
                      aria-label={
                        policyDraft.baseModel === 'FIXED_MONTHLY'
                          ? 'Valor mensal'
                          : 'Valor por hora'
                      }
                      inputMode="decimal"
                      onChange={(event) =>
                        setPolicyDraft((current) => ({ ...current, baseValue: event.target.value }))
                      }
                      placeholder="0,00"
                      value={policyDraft.baseValue}
                    />
                  </span>
                </label>
                {policyDraft.baseModel === 'FIXED_MONTHLY' ? (
                  <label className="field">
                    <span>Prorrateio</span>
                    <select
                      aria-label="Prorrateio mensal"
                      onChange={(event) =>
                        setPolicyDraft((current) => ({
                          ...current,
                          prorationMode: event.target.value as EmployeeCompensationProrationMode,
                        }))
                      }
                      value={policyDraft.prorationMode}
                    >
                      <option value="NONE">Valor mensal integral</option>
                      <option value="CALENDAR_DAYS">Dias corridos ativos</option>
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}
            <fieldset>
              <legend>Comissão de mesa</legend>
              {modal.employee.role === 'WAITER' ? (
                <div className="model-options variable">
                  {(
                    [
                      'NONE',
                      'SERVICE_FEE_PERCENTAGE',
                      'FIXED_PER_TABLE',
                      'TABLE_SALES_PERCENTAGE',
                    ] as const
                  ).map((variableModel) => (
                    <button
                      aria-checked={policyDraft.variableModel === variableModel}
                      className={policyDraft.variableModel === variableModel ? 'selected' : ''}
                      key={variableModel}
                      onClick={() =>
                        setPolicyDraft((current) => ({
                          ...current,
                          variableModel,
                          variableValue: variableModel === 'NONE' ? '' : current.variableValue,
                        }))
                      }
                      role="radio"
                      type="button"
                    >
                      <b>{variableModelLabel[variableModel]}</b>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rule-lock">
                  <ShieldCheck />
                  <span>
                    <b>Sem comissão automática</b>
                    <small>Disponível apenas para funcionário com função Garçom.</small>
                  </span>
                </div>
              )}
            </fieldset>
            {modal.employee.role === 'WAITER' && policyDraft.variableModel !== 'NONE' ? (
              <label className="field compact-field">
                <span>
                  {policyDraft.variableModel === 'FIXED_PER_TABLE'
                    ? 'Valor por mesa'
                    : 'Percentual'}
                </span>
                <span className="money-input">
                  <b>{policyDraft.variableModel === 'FIXED_PER_TABLE' ? 'R$' : '%'}</b>
                  <input
                    aria-label={
                      policyDraft.variableModel === 'FIXED_PER_TABLE'
                        ? 'Valor por mesa'
                        : 'Percentual da comissão'
                    }
                    inputMode="decimal"
                    onChange={(event) =>
                      setPolicyDraft((current) => ({
                        ...current,
                        variableValue: event.target.value,
                      }))
                    }
                    placeholder="0,00"
                    value={policyDraft.variableValue}
                  />
                </span>
              </label>
            ) : null}
            <label className="field compact-field">
              <span>Início da vigência</span>
              <input
                aria-label="Início da vigência"
                min={
                  currentPolicies.has(modal.employee.numericId)
                    ? nextPolicyDate(currentPolicies.get(modal.employee.numericId))
                    : undefined
                }
                onChange={(event) =>
                  setPolicyDraft((current) => ({ ...current, effectiveFrom: event.target.value }))
                }
                type="date"
                value={policyDraft.effectiveFrom}
              />
            </label>
          </div>
        </DialogFrame>
      ) : null}

      {modal?.kind === 'work' ? (
        <DialogFrame
          Icon={Clock3}
          busy={Boolean(busy)}
          footer={
            <>
              <button
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() => setModal(null)}
                type="button"
              >
                Voltar
              </button>
              <button
                className="primary-button"
                disabled={Boolean(busy)}
                onClick={() => void saveWorkEntry()}
                type="button"
              >
                {busy ? <RefreshCw className="spin" /> : <Plus />} Salvar rascunho
              </button>
            </>
          }
          kicker="Horas trabalhadas"
          onClose={() => setModal(null)}
          title="Novo lançamento de horas"
        >
          <div className="dialog-body form-grid two-columns">
            <label className="field full-width">
              <span>Funcionário</span>
              <select
                aria-label="Funcionário das horas"
                onChange={(event) =>
                  setWorkDraft((current) => ({ ...current, employeeId: event.target.value }))
                }
                value={workDraft.employeeId}
              >
                {activeStaff.map((employee) => (
                  <option key={employee.id} value={employee.numericId}>
                    {employee.name} · {roleLabel(employee.role)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field full-width">
              <span>Data trabalhada</span>
              <input
                aria-label="Data trabalhada"
                onChange={(event) =>
                  setWorkDraft((current) => ({ ...current, workDate: event.target.value }))
                }
                type="date"
                value={workDraft.workDate}
              />
            </label>
            <label className="field">
              <span>Horas</span>
              <input
                aria-label="Horas trabalhadas"
                max="24"
                min="0"
                onChange={(event) =>
                  setWorkDraft((current) => ({ ...current, hours: event.target.value }))
                }
                type="number"
                value={workDraft.hours}
              />
            </label>
            <label className="field">
              <span>Minutos</span>
              <input
                aria-label="Minutos trabalhados"
                max="59"
                min="0"
                onChange={(event) =>
                  setWorkDraft((current) => ({ ...current, minutes: event.target.value }))
                }
                type="number"
                value={workDraft.minutes}
              />
            </label>
          </div>
        </DialogFrame>
      ) : null}

      {modal?.kind === 'adjustment' ? (
        <DialogFrame
          Icon={BadgeDollarSign}
          busy={Boolean(busy)}
          footer={
            <>
              <button
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() => setModal(null)}
                type="button"
              >
                Voltar
              </button>
              <button
                className="primary-button"
                disabled={Boolean(busy)}
                onClick={() => void saveAdjustment()}
                type="button"
              >
                {busy ? <RefreshCw className="spin" /> : <Plus />} Incluir no ledger
              </button>
            </>
          }
          kicker="Ajuste manual"
          onClose={() => setModal(null)}
          title="Novo crédito ou débito"
        >
          <div className="dialog-body form-grid two-columns">
            <label className="field full-width">
              <span>Funcionário</span>
              <select
                aria-label="Funcionário do lançamento"
                onChange={(event) =>
                  setAdjustmentDraft((current) => ({ ...current, employeeId: event.target.value }))
                }
                value={adjustmentDraft.employeeId}
              >
                {activeStaff.map((employee) => (
                  <option key={employee.id} value={employee.numericId}>
                    {employee.name} · {roleLabel(employee.role)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                aria-label="Tipo do lançamento"
                onChange={(event) => {
                  const type = event.target.value as ManualAdjustmentType;
                  setAdjustmentDraft((current) => ({
                    ...current,
                    type,
                    direction:
                      type === 'BONUS'
                        ? 'CREDIT'
                        : type === 'CORRECTION'
                          ? current.direction
                          : 'DEBIT',
                  }));
                }}
                value={adjustmentDraft.type}
              >
                <option value="BONUS">Bônus · crédito</option>
                <option value="DEDUCTION">Desconto · débito</option>
                <option value="ADVANCE">Adiantamento · débito</option>
                <option value="CORRECTION">Correção</option>
              </select>
            </label>
            <label className="field">
              <span>Valor</span>
              <span className="money-input">
                <b>R$</b>
                <input
                  aria-label="Valor do lançamento"
                  inputMode="decimal"
                  onChange={(event) =>
                    setAdjustmentDraft((current) => ({ ...current, amount: event.target.value }))
                  }
                  placeholder="0,00"
                  value={adjustmentDraft.amount}
                />
              </span>
            </label>
            {adjustmentDraft.type === 'CORRECTION' ? (
              <label className="field">
                <span>Direção</span>
                <select
                  aria-label="Direção da correção"
                  onChange={(event) =>
                    setAdjustmentDraft((current) => ({
                      ...current,
                      direction: event.target.value as EmployeeEarningDirection,
                    }))
                  }
                  value={adjustmentDraft.direction}
                >
                  <option value="CREDIT">Crédito</option>
                  <option value="DEBIT">Débito</option>
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>Data</span>
              <input
                aria-label="Data do lançamento"
                onChange={(event) =>
                  setAdjustmentDraft((current) => ({ ...current, occurredAt: event.target.value }))
                }
                type="date"
                value={adjustmentDraft.occurredAt}
              />
            </label>
            <label className="field full-width">
              <span>Motivo</span>
              <textarea
                aria-label="Motivo do lançamento"
                maxLength={500}
                onChange={(event) =>
                  setAdjustmentDraft((current) => ({ ...current, reason: event.target.value }))
                }
                rows={3}
                value={adjustmentDraft.reason}
              />
            </label>
          </div>
        </DialogFrame>
      ) : null}

      {modal?.kind === 'payment' ? (
        <DialogFrame
          Icon={Banknote}
          busy={Boolean(busy)}
          footer={
            <>
              <button
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() => setModal(null)}
                type="button"
              >
                Voltar
              </button>
              <button
                className="primary-button"
                disabled={Boolean(busy)}
                onClick={() => void savePayment()}
                type="button"
              >
                {busy ? <RefreshCw className="spin" /> : <Check />} Registrar pagamento
              </button>
            </>
          }
          kicker={`${modal.settlement.employee.name} · ${monthLabel(referenceMonth)}`}
          onClose={() => setModal(null)}
          title="Pagamento do acerto"
        >
          <div className="dialog-body">
            <div className="payment-balance">
              <span>
                <small>Total do acerto</small>
                <b>{money(modal.settlement.totalDueCents)}</b>
              </span>
              <span>
                <small>Saldo restante</small>
                <b>
                  {money(
                    Math.max(0, modal.settlement.totalDueCents - activePaidCents(modal.settlement)),
                  )}
                </b>
              </span>
            </div>
            <div className="form-grid two-columns">
              <label className="field">
                <span>Valor pago</span>
                <span className="money-input">
                  <b>R$</b>
                  <input
                    aria-label="Valor pago"
                    inputMode="decimal"
                    onChange={(event) =>
                      setPaymentDraft((current) => ({ ...current, amount: event.target.value }))
                    }
                    value={paymentDraft.amount}
                  />
                </span>
              </label>
              <label className="field">
                <span>Forma de pagamento</span>
                <select
                  aria-label="Forma de pagamento"
                  onChange={(event) =>
                    setPaymentDraft((current) => ({
                      ...current,
                      method: event.target.value as EmployeeSettlementPaymentMethod,
                    }))
                  }
                  value={paymentDraft.method}
                >
                  {Object.entries(paymentMethodLabel).map(([method, label]) => (
                    <option key={method} value={method}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field full-width">
                <span>
                  Referência <small>opcional</small>
                </span>
                <input
                  aria-label="Referência do pagamento"
                  maxLength={191}
                  onChange={(event) =>
                    setPaymentDraft((current) => ({ ...current, reference: event.target.value }))
                  }
                  value={paymentDraft.reference}
                />
              </label>
              <label className="field full-width">
                <span>
                  Observação <small>opcional</small>
                </span>
                <textarea
                  aria-label="Observação do pagamento"
                  maxLength={500}
                  onChange={(event) =>
                    setPaymentDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                  value={paymentDraft.notes}
                />
              </label>
            </div>
          </div>
        </DialogFrame>
      ) : null}

      {modal?.kind === 'reason' ? (
        <DialogFrame
          Icon={modal.action === 'reverse-payment' ? RotateCcw : XCircle}
          busy={Boolean(busy)}
          footer={
            <>
              <button
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() => setModal(null)}
                type="button"
              >
                Voltar
              </button>
              <button
                className="danger-button"
                disabled={Boolean(busy)}
                onClick={() => void submitReason()}
                type="button"
              >
                {busy ? (
                  <RefreshCw className="spin" />
                ) : modal.action === 'reverse-payment' ? (
                  <RotateCcw />
                ) : (
                  <XCircle />
                )}{' '}
                Confirmar
              </button>
            </>
          }
          kicker="Auditoria obrigatória"
          onClose={() => setModal(null)}
          title={
            modal.action === 'reverse-payment'
              ? 'Reverter pagamento'
              : modal.action === 'cancel-work'
                ? 'Cancelar lançamento de horas'
                : 'Cancelar acerto'
          }
        >
          <div className="dialog-body">
            <div className="subject-line">
              <UserRound />
              <span>
                <small>Registro</small>
                <b>{modal.subject}</b>
              </span>
            </div>
            <label className="field">
              <span>Motivo</span>
              <textarea
                aria-label="Motivo da operação"
                autoFocus
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                value={reason}
              />
            </label>
          </div>
        </DialogFrame>
      ) : null}

      {modal?.kind === 'settlement' && detail ? (
        <DialogFrame
          Icon={ReceiptText}
          busy={Boolean(busy)}
          footer={
            <>
              {detail.status === 'DRAFT' ? (
                <button
                  className="primary-button"
                  disabled={Boolean(busy)}
                  onClick={() => void confirmSettlement(detail)}
                  type="button"
                >
                  <CheckCircle2 /> Confirmar acerto
                </button>
              ) : null}
              {detail.status === 'CANCELED' ? (
                <button
                  className="primary-button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void generateSettlement({
                      numericId: detail.employeeId,
                      name: detail.employee.name,
                    })
                  }
                  type="button"
                >
                  <RotateCcw /> Gerar novamente
                </button>
              ) : null}
              {['DRAFT', 'CONFIRMED'].includes(detail.status) && !detailActivePayments.length ? (
                <button
                  className="danger-button subtle"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    requestReason('cancel-settlement', detail.publicId, detail.employee.name)
                  }
                  type="button"
                >
                  <XCircle /> Cancelar acerto
                </button>
              ) : null}
              {['CONFIRMED', 'PARTIALLY_PAID'].includes(detail.status) &&
              detail.totalDueCents > activePaidCents(detail) ? (
                <button
                  className="primary-button"
                  disabled={Boolean(busy)}
                  onClick={() => openPayment(detail)}
                  type="button"
                >
                  <Banknote /> Registrar pagamento
                </button>
              ) : null}
              <button className="secondary-button" onClick={() => setModal(null)} type="button">
                Voltar
              </button>
            </>
          }
          kicker={`${detail.employee.name} · ${String(detail.periodMonth).padStart(2, '0')}/${detail.periodYear}`}
          onClose={() => setModal(null)}
          title="Composição do acerto"
          wide
        >
          <div className="dialog-body settlement-detail">
            {detailLoading ? (
              <div className="inline-loading" role="status">
                <RefreshCw className="spin" /> Carregando composição...
              </div>
            ) : (
              <>
                <div className="settlement-totals">
                  <span>
                    <small>Créditos</small>
                    <b>{money(detail.grossCreditsCents)}</b>
                  </span>
                  <span>
                    <small>Débitos</small>
                    <b>{money(detail.grossDebitsCents)}</b>
                  </span>
                  <span>
                    <small>Total devido</small>
                    <b>{money(detail.totalDueCents)}</b>
                  </span>
                  <span>
                    <small>Situação</small>
                    <em className={`status-pill ${settlementStatusMeta[detail.status].tone}`}>
                      {settlementStatusMeta[detail.status].label}
                    </em>
                  </span>
                </div>
                <div className="detail-columns">
                  <section>
                    <header>
                      <ListChecks />
                      <div>
                        <b>Lançamentos</b>
                        <small>
                          {detail.items?.filter((item) => item.active).length || 0} itens no acerto
                        </small>
                      </div>
                    </header>
                    <div className="detail-list">
                      {detail.items
                        ?.filter((item) => item.active)
                        .map((item) => (
                          <span key={item.publicId}>
                            <i className={item.directionSnapshot.toLocaleLowerCase('pt-BR')}>
                              {item.directionSnapshot === 'CREDIT' ? '+' : '−'}
                            </i>
                            <span>
                              <b>{earningTypeLabel[item.typeSnapshot]}</b>
                              <small>
                                {item.earning
                                  ? shortDateTime(item.earning.occurredAt)
                                  : 'Snapshot confirmado'}
                              </small>
                            </span>
                            <strong>{money(item.amountCentsSnapshot)}</strong>
                          </span>
                        ))}
                      {!detail.items?.some((item) => item.active) ? (
                        <p className="empty-line">Sem lançamentos vinculados.</p>
                      ) : null}
                    </div>
                  </section>
                  <section>
                    <header>
                      <Banknote />
                      <div>
                        <b>Pagamentos</b>
                        <small>{detail.payments.length} registros</small>
                      </div>
                    </header>
                    <div className="detail-list payments">
                      {detail.payments.map((payment: EmployeeSettlementPayment) => (
                        <span
                          className={payment.status === 'REVERSED' ? 'reversed' : ''}
                          key={payment.publicId}
                        >
                          <i className="method">
                            {payment.method === 'BANK_TRANSFER' ? 'TR' : payment.method.slice(0, 2)}
                          </i>
                          <span>
                            <b>{paymentMethodLabel[payment.method]}</b>
                            <small>
                              {shortDateTime(payment.registeredAt)}
                              {payment.reference ? ` · ${payment.reference}` : ''}
                            </small>
                          </span>
                          <strong>{money(payment.amountCents)}</strong>
                          {payment.status === 'ACTIVE' ? (
                            <button
                              aria-label={`Reverter pagamento de ${detail.employee.name}`}
                              className="icon-button danger"
                              onClick={() =>
                                requestReason(
                                  'reverse-payment',
                                  payment.publicId,
                                  detail.employee.name,
                                )
                              }
                              title="Reverter pagamento"
                              type="button"
                            >
                              <RotateCcw />
                            </button>
                          ) : (
                            <em>Revertido</em>
                          )}
                        </span>
                      ))}
                      {!detail.payments.length ? (
                        <p className="empty-line">Nenhum pagamento registrado.</p>
                      ) : null}
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        </DialogFrame>
      ) : null}
    </>
  );
}
