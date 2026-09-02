import {
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileClock,
  HandCoins,
  History,
  MinusCircle,
  PencilLine,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react';

import type {
  EmployeeEarningDirection,
  EmployeeSettlementStatus,
  EmployeeWorkEntryStatus,
} from '../../../Services/employeePaymentsService';
import { EmployeeCompensationDialogs } from './EmployeeCompensationSettings.dialogs';
import { useEmployeeCompensationModel } from './EmployeeCompensationSettings.model';
import {
  activePaidCents,
  baseModelLabel,
  currentMonth,
  duration,
  earningTypeLabel,
  initials,
  money,
  monthLabel,
  policyBase,
  policyVariable,
  roleLabel,
  settlementStatusMeta,
  shortDate,
  shortDateTime,
  sourceLabel,
  variableModelLabel,
  workStatusMeta,
  type EmployeeCompensationSettingsProps,
} from './EmployeeCompensationSettings.shared';
import * as S from './EmployeeCompensationSettings.styles';

export function EmployeeCompensationSettings(props: EmployeeCompensationSettingsProps) {
  const model = useEmployeeCompensationModel(props);
  const {
    activeStaff,
    approveWork,
    busy,
    closePolicy,
    confirmSettlement,
    currentPolicies,
    expandedEmployeeId,
    feedback,
    generateSettlement,
    ledgerDirection,
    load,
    loadError,
    loading,
    monthEarnings,
    monthSettlements,
    monthWorkEntries,
    onOpenEmployees,
    openAdjustment,
    openPayment,
    openPolicy,
    openSettlement,
    openSettlements,
    openWork,
    paidThisMonth,
    policies,
    referenceMonth,
    requestReason,
    search,
    setExpandedEmployeeId,
    setFeedback,
    setLedgerDirection,
    setLoading,
    setReferenceMonth,
    setSearch,
    setSettlementStatus,
    setShowInactive,
    settlementByEmployee,
    settlementRows,
    settlementStatus,
    setWorkStatus,
    showInactive,
    switchView,
    unsettledCredits,
    unsettledDebits,
    view,
    visibleEarnings,
    visibleStaff,
    visibleWorkEntries,
    workStatus,
  } = model;

  if (loading) {
    return (
      <S.Root aria-busy="true">
        <div className="loading-state" role="status">
          <RefreshCw aria-hidden="true" />
          <b>Carregando remuneração da equipe...</b>
        </div>
      </S.Root>
    );
  }

  if (loadError) {
    return (
      <S.Root>
        <div className="error-state" role="alert">
          <XCircle aria-hidden="true" />
          <h2>Não foi possível abrir a remuneração</h2>
          <p>{loadError}</p>
          <button
            className="primary-button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      </S.Root>
    );
  }

  return (
    <S.Root aria-busy={Boolean(busy)}>
      <header className="page-header">
        <div className="page-title">
          <span className="eyebrow">
            <HandCoins aria-hidden="true" /> Financeiro interno
          </span>
          <h2>Remuneração da equipe</h2>
          <p>Regras, lançamentos e pagamentos dos funcionários.</p>
        </div>
        <div className="header-controls">
          <label className="month-control">
            <CalendarDays aria-hidden="true" />
            <span>
              <small>Competência</small>
              <input
                aria-label="Competência dos acertos"
                onChange={(event) => setReferenceMonth(event.target.value || currentMonth())}
                type="month"
                value={referenceMonth}
              />
            </span>
          </label>
          <button
            aria-label="Atualizar remuneração"
            className="icon-button refresh-button"
            disabled={Boolean(busy)}
            onClick={() => void load(true)}
            title="Atualizar"
            type="button"
          >
            <RefreshCw aria-hidden="true" />
          </button>
        </div>
      </header>

      <section aria-label="Resumo da remuneração" className="overview-strip">
        <div>
          <span className="metric-icon people">
            <UsersRound />
          </span>
          <span>
            <b>{activeStaff.length}</b>
            <small>Funcionários ativos</small>
          </span>
        </div>
        <div>
          <span className="metric-icon policies">
            <ShieldCheck />
          </span>
          <span>
            <b>
              {activeStaff.filter((employee) => currentPolicies.has(employee.numericId)).length}
            </b>
            <small>Com regra vigente</small>
          </span>
        </div>
        <div>
          <span className="metric-icon ledger">
            <WalletCards />
          </span>
          <span>
            <b>{money(unsettledCredits - unsettledDebits)}</b>
            <small>Saldo ainda não acertado</small>
          </span>
        </div>
        <div>
          <span className="metric-icon settlements">
            <CircleDollarSign />
          </span>
          <span>
            <b>{openSettlements.length}</b>
            <small>{money(paidThisMonth)} pago na competência</small>
          </span>
        </div>
      </section>

      <div aria-label="Áreas da remuneração" className="tabs" role="tablist">
        {(
          [
            ['policies', ShieldCheck, 'Políticas'],
            ['hours', Clock3, 'Horas'],
            ['settlements', CircleDollarSign, 'Acertos'],
            ['ledger', History, 'Ledger'],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            aria-selected={view === key}
            className={view === key ? 'active' : ''}
            key={key}
            onClick={() => switchView(key)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
            {key === 'settlements' && openSettlements.length ? (
              <b>{openSettlements.length}</b>
            ) : null}
          </button>
        ))}
      </div>

      {feedback ? (
        <div
          className={`notice ${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          <span>{feedback.text}</span>
          <button aria-label="Fechar aviso" onClick={() => setFeedback(null)} type="button">
            <X />
          </button>
        </div>
      ) : null}

      {view === 'policies' ? (
        <section aria-labelledby="policies-title" className="panel">
          <header className="panel-heading">
            <div>
              <span className="section-kicker">Regras vigentes</span>
              <h3 id="policies-title">Políticas por funcionário</h3>
              <p>{monthLabel(referenceMonth)}</p>
            </div>
            <button className="secondary-button" onClick={onOpenEmployees} type="button">
              <UserRound /> Gerenciar funcionários
            </button>
          </header>
          <div className="toolbar">
            <label className="search-field">
              <Search />
              <input
                aria-label="Pesquisar funcionário"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, e-mail ou função"
                value={search}
              />
            </label>
            <label className="check-control">
              <input
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
                type="checkbox"
              />{' '}
              Mostrar inativos
            </label>
          </div>
          {visibleStaff.length ? (
            <div className="data-list policy-list">
              <div aria-hidden="true" className="list-head policy-grid">
                <span>Funcionário</span>
                <span>Valor-base</span>
                <span>Comissão</span>
                <span>Vigência</span>
                <span>Ações</span>
              </div>
              {visibleStaff.map((employee) => {
                const current = currentPolicies.get(employee.numericId);
                const history = policies.filter(
                  (policy) => policy.employeeId === employee.numericId,
                );
                const expanded = expandedEmployeeId === employee.numericId;
                return (
                  <article
                    className={`list-row policy-row ${employee.active ? '' : 'inactive'}`}
                    key={employee.id}
                  >
                    <div className="person">
                      <span className="avatar">{initials(employee.name)}</span>
                      <span>
                        <b>{employee.name}</b>
                        <small>
                          {roleLabel(employee.role)} · {employee.email}
                        </small>
                      </span>
                    </div>
                    <div className="cell">
                      <small>
                        {current ? baseModelLabel[current.baseModel] : 'Não configurado'}
                      </small>
                      <b>{policyBase(current)}</b>
                      {current?.baseModel === 'FIXED_MONTHLY' ? (
                        <span>
                          {current.prorationMode === 'CALENDAR_DAYS'
                            ? 'Por dias corridos'
                            : 'Valor integral'}
                        </span>
                      ) : null}
                    </div>
                    <div className="cell">
                      <small>
                        {current
                          ? variableModelLabel[current.variableModel]
                          : employee.role === 'WAITER'
                            ? 'Não configurado'
                            : 'Não aplicável'}
                      </small>
                      <b>
                        {employee.role === 'WAITER'
                          ? policyVariable(current)
                          : 'Sem comissão de mesa'}
                      </b>
                    </div>
                    <div className="cell">
                      <span className={`status-pill ${current ? 'success' : 'neutral'}`}>
                        {current ? `Versão ${current.version}` : 'Sem regra'}
                      </span>
                      <small>{current ? `Desde ${shortDate(current.effectiveFrom)}` : '—'}</small>
                    </div>
                    <div className="row-actions">
                      {history.length ? (
                        <button
                          aria-label={`Ver histórico de regras de ${employee.name}`}
                          className="icon-button"
                          onClick={() =>
                            setExpandedEmployeeId(expanded ? null : employee.numericId)
                          }
                          title="Histórico de versões"
                          type="button"
                        >
                          {expanded ? <ChevronDown /> : <ChevronRight />}
                        </button>
                      ) : null}
                      {current && new Date(current.effectiveFrom) < new Date() ? (
                        <button
                          aria-label={`Encerrar regra de ${employee.name}`}
                          className="icon-button danger"
                          disabled={Boolean(busy)}
                          onClick={() => void closePolicy(current, employee.name)}
                          title="Encerrar regra"
                          type="button"
                        >
                          <MinusCircle />
                        </button>
                      ) : null}
                      <button
                        className="primary-button"
                        disabled={!employee.active || Boolean(busy)}
                        onClick={() => openPolicy(employee)}
                        type="button"
                      >
                        <PencilLine /> {current ? 'Nova versão' : 'Configurar'}
                      </button>
                    </div>
                    {expanded ? (
                      <div className="version-history">
                        {history.map((policy) => (
                          <span key={policy.publicId}>
                            <b>v{policy.version}</b>
                            <small>
                              {policyBase(policy)} · {policyVariable(policy)}
                            </small>
                            <em>
                              {policy.active
                                ? 'Vigente'
                                : `${shortDate(policy.effectiveFrom)} a ${shortDate(policy.effectiveUntil)}`}
                            </em>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <UserRound />
              <h4>Nenhum funcionário encontrado</h4>
              <p>Revise a busca ou o filtro de inativos.</p>
            </div>
          )}
        </section>
      ) : null}

      {view === 'hours' ? (
        <section aria-labelledby="hours-title" className="panel">
          <header className="panel-heading">
            <div>
              <span className="section-kicker">Controle operacional</span>
              <h3 id="hours-title">Horas trabalhadas</h3>
              <p>
                {monthLabel(referenceMonth)} ·{' '}
                {duration(
                  monthWorkEntries
                    .filter((entry) => entry.status === 'APPROVED')
                    .reduce((total, entry) => total + entry.minutesWorked, 0),
                )}{' '}
                aprovadas
              </p>
            </div>
            <button
              className="primary-button"
              disabled={!activeStaff.length}
              onClick={() => openWork()}
              type="button"
            >
              <Plus /> Lançar horas
            </button>
          </header>
          <div className="toolbar">
            <label className="search-field">
              <Search />
              <input
                aria-label="Pesquisar horas por funcionário"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar funcionário"
                value={search}
              />
            </label>
            <select
              aria-label="Filtrar situação das horas"
              onChange={(event) =>
                setWorkStatus(event.target.value as EmployeeWorkEntryStatus | '')
              }
              value={workStatus}
            >
              <option value="">Todas as situações</option>
              <option value="DRAFT">Rascunho</option>
              <option value="APPROVED">Aprovado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>
          {visibleWorkEntries.length ? (
            <div className="data-list hours-list">
              <div aria-hidden="true" className="list-head hours-grid">
                <span>Funcionário</span>
                <span>Data</span>
                <span>Duração</span>
                <span>Situação</span>
                <span>Ações</span>
              </div>
              {visibleWorkEntries.map((entry) => (
                <article className="list-row hours-row" key={entry.publicId}>
                  <div className="person">
                    <span className="avatar small">{initials(entry.employee.name)}</span>
                    <span>
                      <b>{entry.employee.name}</b>
                      <small>{entry.employee.active ? 'Ativo' : 'Inativo'}</small>
                    </span>
                  </div>
                  <div className="cell">
                    <b>{shortDate(entry.workDate)}</b>
                    <small>Dia trabalhado</small>
                  </div>
                  <div className="cell">
                    <b>{duration(entry.minutesWorked)}</b>
                    <small>{entry.minutesWorked} minutos</small>
                  </div>
                  <div className="cell">
                    <span className={`status-pill ${workStatusMeta[entry.status].tone}`}>
                      {workStatusMeta[entry.status].label}
                    </span>
                    {entry.cancelReason ? (
                      <small title={entry.cancelReason}>{entry.cancelReason}</small>
                    ) : null}
                  </div>
                  <div className="row-actions">
                    {entry.status === 'DRAFT' ? (
                      <button
                        aria-label={`Aprovar horas de ${entry.employee.name}`}
                        className="icon-button success"
                        disabled={Boolean(busy)}
                        onClick={() => void approveWork(entry)}
                        title="Aprovar horas"
                        type="button"
                      >
                        <Check />
                      </button>
                    ) : null}
                    {entry.status !== 'CANCELED' ? (
                      <button
                        aria-label={`Cancelar horas de ${entry.employee.name}`}
                        className="icon-button danger"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          requestReason('cancel-work', entry.publicId, entry.employee.name)
                        }
                        title="Cancelar lançamento"
                        type="button"
                      >
                        <XCircle />
                      </button>
                    ) : (
                      <span className="no-action">—</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FileClock />
              <h4>Sem horas nesta competência</h4>
              <p>Os novos lançamentos aparecem aqui.</p>
              <button className="secondary-button" onClick={() => openWork()} type="button">
                Lançar horas
              </button>
            </div>
          )}
        </section>
      ) : null}

      {view === 'settlements' ? (
        <section aria-labelledby="settlements-title" className="panel">
          <header className="panel-heading">
            <div>
              <span className="section-kicker">Fechamento mensal</span>
              <h3 id="settlements-title">Acertos e pagamentos</h3>
              <p>
                {monthLabel(referenceMonth)} ·{' '}
                {money(
                  monthSettlements.reduce(
                    (total, settlement) => total + settlement.totalDueCents,
                    0,
                  ),
                )}{' '}
                apurado
              </p>
            </div>
          </header>
          <div className="toolbar">
            <label className="search-field">
              <Search />
              <input
                aria-label="Pesquisar acerto por funcionário"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar funcionário"
                value={search}
              />
            </label>
            <select
              aria-label="Filtrar situação do acerto"
              onChange={(event) =>
                setSettlementStatus(event.target.value as EmployeeSettlementStatus | 'MISSING' | '')
              }
              value={settlementStatus}
            >
              <option value="">Todas as situações</option>
              <option value="MISSING">Não gerado</option>
              {Object.entries(settlementStatusMeta).map(([status, meta]) => (
                <option key={status} value={status}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          {settlementRows.length ? (
            <div className="data-list settlement-list">
              <div aria-hidden="true" className="list-head settlement-grid">
                <span>Funcionário</span>
                <span>Créditos e débitos</span>
                <span>Total</span>
                <span>Pagamento</span>
                <span>Ações</span>
              </div>
              {settlementRows.map((employee) => {
                const settlement = settlementByEmployee.get(employee.numericId);
                const paid = settlement ? activePaidCents(settlement) : 0;
                const remaining = settlement ? Math.max(0, settlement.totalDueCents - paid) : 0;
                return (
                  <article className="list-row settlement-row" key={employee.id}>
                    <div className="person">
                      <span className="avatar">{initials(employee.name)}</span>
                      <span>
                        <b>{employee.name}</b>
                        <small>{roleLabel(employee.role)}</small>
                      </span>
                    </div>
                    <div className="cell">
                      <b>{settlement ? money(settlement.grossCreditsCents) : '—'}</b>
                      <small>
                        {settlement
                          ? `${money(settlement.grossDebitsCents)} em débitos`
                          : 'Competência não gerada'}
                      </small>
                    </div>
                    <div className="cell">
                      <b>{settlement ? money(settlement.totalDueCents) : '—'}</b>
                      {settlement ? (
                        <span
                          className={`status-pill ${settlementStatusMeta[settlement.status].tone}`}
                        >
                          {settlementStatusMeta[settlement.status].label}
                        </span>
                      ) : (
                        <span className="status-pill neutral">Não gerado</span>
                      )}
                    </div>
                    <div className="cell">
                      <b>{settlement ? money(paid) : '—'}</b>
                      <small>{settlement ? `${money(remaining)} restante` : '—'}</small>
                    </div>
                    <div className="row-actions">
                      {!settlement ? (
                        <button
                          className="primary-button"
                          disabled={Boolean(busy)}
                          onClick={() => void generateSettlement(employee)}
                          type="button"
                        >
                          <Plus /> Gerar
                        </button>
                      ) : (
                        <>
                          <button
                            aria-label={`Ver acerto de ${employee.name}`}
                            className="icon-button"
                            onClick={() => void openSettlement(settlement)}
                            title="Ver composição"
                            type="button"
                          >
                            <ReceiptText />
                          </button>
                          {settlement.status === 'DRAFT' ? (
                            <button
                              className="primary-button"
                              disabled={Boolean(busy)}
                              onClick={() => void confirmSettlement(settlement)}
                              type="button"
                            >
                              <CheckCircle2 /> Confirmar
                            </button>
                          ) : null}
                          {settlement.status === 'CANCELED' ? (
                            <button
                              className="primary-button"
                              disabled={Boolean(busy)}
                              onClick={() => void generateSettlement(employee)}
                              type="button"
                            >
                              <RotateCcw /> Gerar novamente
                            </button>
                          ) : null}
                          {['CONFIRMED', 'PARTIALLY_PAID'].includes(settlement.status) &&
                          remaining > 0 ? (
                            <button
                              className="primary-button"
                              disabled={Boolean(busy)}
                              onClick={() => openPayment(settlement)}
                              type="button"
                            >
                              <Banknote /> Pagar
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <CircleDollarSign />
              <h4>Nenhum acerto encontrado</h4>
              <p>Revise os filtros desta competência.</p>
            </div>
          )}
        </section>
      ) : null}

      {view === 'ledger' ? (
        <section aria-labelledby="ledger-title" className="panel">
          <header className="panel-heading">
            <div>
              <span className="section-kicker">Histórico imutável</span>
              <h3 id="ledger-title">Ledger de créditos e débitos</h3>
              <p>
                {monthLabel(referenceMonth)} · {monthEarnings.length} lançamentos
              </p>
            </div>
            <button
              className="primary-button"
              disabled={!activeStaff.length}
              onClick={() => openAdjustment()}
              type="button"
            >
              <Plus /> Novo lançamento
            </button>
          </header>
          <div className="ledger-summary">
            <span>
              <small>Créditos</small>
              <b>
                {money(
                  monthEarnings
                    .filter((entry) => entry.direction === 'CREDIT')
                    .reduce((total, entry) => total + entry.amountCents, 0),
                )}
              </b>
            </span>
            <span>
              <small>Débitos</small>
              <b>
                {money(
                  monthEarnings
                    .filter((entry) => entry.direction === 'DEBIT')
                    .reduce((total, entry) => total + entry.amountCents, 0),
                )}
              </b>
            </span>
            <span>
              <small>Não acertado</small>
              <b>{money(unsettledCredits - unsettledDebits)}</b>
            </span>
          </div>
          <div className="toolbar">
            <label className="search-field">
              <Search />
              <input
                aria-label="Pesquisar no ledger"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Funcionário ou lançamento"
                value={search}
              />
            </label>
            <select
              aria-label="Filtrar direção do ledger"
              onChange={(event) =>
                setLedgerDirection(event.target.value as EmployeeEarningDirection | '')
              }
              value={ledgerDirection}
            >
              <option value="">Créditos e débitos</option>
              <option value="CREDIT">Somente créditos</option>
              <option value="DEBIT">Somente débitos</option>
            </select>
          </div>
          {visibleEarnings.length ? (
            <div className="data-list ledger-list">
              <div aria-hidden="true" className="list-head ledger-grid">
                <span>Funcionário</span>
                <span>Lançamento</span>
                <span>Origem</span>
                <span>Estado</span>
                <span>Valor</span>
              </div>
              {visibleEarnings.map((earning) => (
                <article className="list-row ledger-row" key={earning.publicId}>
                  <div className="person">
                    <span className="avatar small">{initials(earning.employee.name)}</span>
                    <span>
                      <b>{earning.employee.name}</b>
                      <small>{shortDateTime(earning.occurredAt)}</small>
                    </span>
                  </div>
                  <div className="cell">
                    <b>{earningTypeLabel[earning.type]}</b>
                    <small>
                      {earning.policyVersion
                        ? `Política v${earning.policyVersion}`
                        : 'Sem política vinculada'}
                    </small>
                  </div>
                  <div className="cell">
                    <b>{sourceLabel[earning.sourceType] || earning.sourceType}</b>
                    <small>{earning.sourcePublicId || 'Registro interno'}</small>
                  </div>
                  <div className="cell">
                    <span className={`status-pill ${earning.settledAt ? 'success' : 'warning'}`}>
                      {earning.settledAt ? 'Acertado' : 'Em aberto'}
                    </span>
                  </div>
                  <div className={`ledger-amount ${earning.direction.toLocaleLowerCase('pt-BR')}`}>
                    <small>{earning.direction === 'CREDIT' ? 'Crédito' : 'Débito'}</small>
                    <b>
                      {earning.direction === 'CREDIT' ? '+' : '−'} {money(earning.amountCents)}
                    </b>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <History />
              <h4>Sem lançamentos nesta competência</h4>
              <p>Créditos, débitos e comissões aparecerão aqui.</p>
            </div>
          )}
        </section>
      ) : null}

      <EmployeeCompensationDialogs model={model} />
    </S.Root>
  );
}
