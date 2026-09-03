import {
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  ReceiptText,
  Search,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import tableAccountService from '../../../Services/tableAccountService';
import { useAppDialog } from '../../../components/AppDialog/context';
import type { RestaurantTable, WaiterAccountSession, WaiterManualPayment } from '../types';
import { useWaiterWorkspace } from '../useWaiterWorkspace';
import { brl, Empty, MetricCards } from '../components/Shared';
import { WaiterTableAccountDialog } from '../components/WaiterTableAccountDialog';
import { WAITER_LIST_BATCH_SIZE, WaiterListControls } from '../components/WaiterListControls';
import * as S from '../Waiter.styles';
import * as P from './WaiterPayments.styles';

type PaymentFilter = 'ALL' | 'PENDING' | 'CLOSING' | 'BALANCE';

function getErrorMessage(error: unknown) {
  const typed = error as { response?: { data?: { error?: string } }; message?: string };
  return (
    typed.response?.data?.error || typed.message || 'Não foi possível confirmar este recebimento.'
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'horário não informado';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentMethodLabel(method: WaiterManualPayment['method']) {
  return method === 'CASH' ? 'Dinheiro' : 'Cartão na maquininha';
}

function accountAsTable(account: WaiterAccountSession, tables: RestaurantTable[]) {
  const table = tables.find(
    (item) =>
      item.sessionPublicId === account.sessionPublicId || item.number === account.tableNumber,
  );
  return table
    ? {
        ...table,
        sessionStatus: account.status,
        sessionId: table.sessionId || account.tableSessionId,
        sessionPublicId: table.sessionPublicId || account.sessionPublicId,
      }
    : {
        id: account.tableId,
        number: account.tableNumber,
        status: 'OCCUPIED' as const,
        sessionStatus: account.status,
        sessionId: account.tableSessionId,
        sessionPublicId: account.sessionPublicId,
        guests: account.summary.participantsCount,
        total: account.summary.consumedCents / 100,
      };
}

export function WaiterPaymentsPage() {
  const { accounts, tables, onRefresh } = useWaiterWorkspace();
  const { confirmDialog } = useAppDialog();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PaymentFilter>('ALL');
  const [visiblePayments, setVisiblePayments] = useState(WAITER_LIST_BATCH_SIZE);
  const [visibleAccounts, setVisibleAccounts] = useState(WAITER_LIST_BATCH_SIZE);
  const [busyPaymentId, setBusyPaymentId] = useState('');
  const [accountTable, setAccountTable] = useState<RestaurantTable | null>(null);
  const [error, setError] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');

  const filteredAccounts = useMemo(
    () =>
      accounts
        .filter((account) => {
          const matchesFilter =
            filter === 'ALL' ||
            (filter === 'PENDING' && account.pendingManualPayments.length > 0) ||
            (filter === 'CLOSING' && account.status === 'CLOSING_REQUESTED') ||
            (filter === 'BALANCE' && account.summary.remainingCents > 0);
          return (
            matchesFilter &&
            `mesa ${account.tableNumber} ${account.openedByName}`
              .toLocaleLowerCase('pt-BR')
              .includes(normalizedQuery)
          );
        })
        .sort((left, right) => {
          const priority = (account: WaiterAccountSession) =>
            account.pendingManualPayments.length * 2 +
            Number(account.status === 'CLOSING_REQUESTED');
          return priority(right) - priority(left) || left.tableNumber - right.tableNumber;
        }),
    [accounts, filter, normalizedQuery],
  );

  const pendingPayments = useMemo(
    () =>
      filteredAccounts
        .flatMap((account) =>
          account.pendingManualPayments.map((payment) => ({ account, payment })),
        )
        .sort(
          (left, right) =>
            new Date(left.payment.createdAt).getTime() -
            new Date(right.payment.createdAt).getTime(),
        ),
    [filteredAccounts],
  );

  const pendingTotalCents = accounts.reduce(
    (total, account) =>
      total + account.pendingManualPayments.reduce((sum, payment) => sum + payment.totalCents, 0),
    0,
  );
  const remainingTotalCents = accounts.reduce(
    (total, account) => total + account.summary.remainingCents,
    0,
  );

  const resetVisible = () => {
    setVisiblePayments(WAITER_LIST_BATCH_SIZE);
    setVisibleAccounts(WAITER_LIST_BATCH_SIZE);
  };

  const confirmPayment = async (account: WaiterAccountSession, payment: WaiterManualPayment) => {
    const accepted = await confirmDialog({
      title: 'Confirmar pagamento recebido?',
      description: `Mesa ${String(account.tableNumber).padStart(2, '0')} • ${brl(payment.totalCents / 100)} em ${paymentMethodLabel(payment.method).toLocaleLowerCase('pt-BR')}. Confirme somente depois de receber o valor do cliente.`,
      confirmLabel: 'Confirmar recebimento',
      cancelLabel: 'Voltar e conferir',
    });
    if (!accepted) return;

    setBusyPaymentId(payment.publicId);
    setError('');
    try {
      await tableAccountService.confirmManualPayment(payment.publicId);
      await onRefresh?.();
      toast.success(
        `Pagamento da Mesa ${String(account.tableNumber).padStart(2, '0')} confirmado.`,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyPaymentId('');
    }
  };

  return (
    <>
      <S.PageIntro>
        <div>
          <span>CONTA E RECEBIMENTO</span>
          <h2>Feche o salão sem pendências financeiras</h2>
          <p>Confirme apenas valores já recebidos em dinheiro ou na maquininha.</p>
        </div>
      </S.PageIntro>

      <MetricCards
        items={[
          { label: 'Para confirmar', value: pendingPayments.length, icon: 'orders' },
          { label: 'Valor presencial', value: brl(pendingTotalCents / 100), icon: 'clock' },
          {
            label: 'Contas solicitadas',
            value: accounts.filter((account) => account.status === 'CLOSING_REQUESTED').length,
            icon: 'calls',
          },
          { label: 'Saldo em aberto', value: brl(remainingTotalCents / 100), icon: 'tables' },
        ]}
      />

      <P.FilterBar aria-label="Filtros das contas de mesa">
        <label>
          <Search aria-hidden="true" />
          <input
            aria-label="Buscar conta por mesa ou responsável"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetVisible();
            }}
            placeholder="Buscar mesa ou responsável"
          />
        </label>
        <select
          aria-label="Filtrar contas"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value as PaymentFilter);
            resetVisible();
          }}
        >
          <option value="ALL">Todas as contas abertas</option>
          <option value="PENDING">Aguardando confirmação</option>
          <option value="CLOSING">Conta solicitada</option>
          <option value="BALANCE">Com saldo em aberto</option>
        </select>
      </P.FilterBar>

      {error && <P.Error role="alert">{error}</P.Error>}

      <P.Workspace>
        <P.Section aria-labelledby="pending-payments-title">
          <header>
            <div>
              <h2 id="pending-payments-title">Recebimentos para confirmar</h2>
              <p>Mais antigos primeiro. Confira mesa, método e valor antes de confirmar.</p>
            </div>
            <P.SectionCount>{pendingPayments.length}</P.SectionCount>
          </header>
          <P.List>
            {pendingPayments.slice(0, visiblePayments).map(({ account, payment }) => (
              <P.PendingPayment key={payment.publicId} $method={payment.method}>
                <span className="method-icon" aria-hidden="true">
                  {payment.method === 'CASH' ? <Banknote /> : <CreditCard />}
                </span>
                <span className="identity">
                  <b>Mesa {String(account.tableNumber).padStart(2, '0')}</b>
                  <span>{paymentMethodLabel(payment.method)}</span>
                  <small>Solicitado em {formatDateTime(payment.createdAt)}</small>
                </span>
                <span className="value">
                  <strong>{brl(payment.totalCents / 100)}</strong>
                  <span>Aguardando</span>
                </span>
                <button
                  type="button"
                  disabled={busyPaymentId === payment.publicId}
                  aria-label={`Confirmar ${paymentMethodLabel(payment.method)} de ${brl(payment.totalCents / 100)} da Mesa ${String(account.tableNumber).padStart(2, '0')}`}
                  onClick={() => void confirmPayment(account, payment)}
                >
                  <CheckCircle2 />
                  {busyPaymentId === payment.publicId
                    ? 'Confirmando recebimento...'
                    : 'Confirmar recebimento'}
                </button>
              </P.PendingPayment>
            ))}
            {!pendingPayments.length && (
              <Empty>Nenhum pagamento presencial aguarda confirmação.</Empty>
            )}
          </P.List>
          <WaiterListControls
            visibleCount={Math.min(visiblePayments, pendingPayments.length)}
            totalCount={pendingPayments.length}
            itemLabel="pagamentos"
            onShowMore={() => setVisiblePayments((current) => current + WAITER_LIST_BATCH_SIZE)}
            onReset={() => setVisiblePayments(WAITER_LIST_BATCH_SIZE)}
          />
        </P.Section>

        <P.Section aria-labelledby="open-accounts-title">
          <header>
            <div>
              <h2 id="open-accounts-title">Contas abertas</h2>
              <p>Saldo e andamento financeiro por mesa.</p>
            </div>
            <P.SectionCount>{filteredAccounts.length}</P.SectionCount>
          </header>
          <P.List>
            {filteredAccounts.slice(0, visibleAccounts).map((account) => {
              const paidPercent = account.summary.consumedCents
                ? Math.min(
                    100,
                    Math.round(
                      (account.summary.netPaidCents / account.summary.consumedCents) * 100,
                    ),
                  )
                : 0;
              return (
                <P.AccountCard key={account.sessionPublicId}>
                  <header>
                    <div>
                      <h3>Mesa {String(account.tableNumber).padStart(2, '0')}</h3>
                      <p>Aberta em {formatDateTime(account.openedAt)}</p>
                    </div>
                    <span className={account.status === 'CLOSING_REQUESTED' ? 'closing' : ''}>
                      {account.status === 'CLOSING_REQUESTED' ? 'Conta solicitada' : 'Em consumo'}
                    </span>
                  </header>
                  <div className="amounts">
                    <span>
                      <small>Consumido</small>
                      <b>{brl(account.summary.consumedCents / 100)}</b>
                    </span>
                    <span className="paid">
                      <small>Confirmado</small>
                      <b>{brl(account.summary.netPaidCents / 100)}</b>
                    </span>
                    <span className="remaining">
                      <small>Em aberto</small>
                      <b>{brl(account.summary.remainingCents / 100)}</b>
                    </span>
                  </div>
                  <div className="progress" aria-label={`${paidPercent}% da conta confirmada`}>
                    <i style={{ width: `${paidPercent}%` }} />
                  </div>
                  <div className="meta">
                    <span>
                      <Users /> {account.summary.participantsCount} cliente(s)
                    </span>
                    <span>
                      <ReceiptText /> {account.itemsCount} item(ns)
                    </span>
                    <span>
                      <Clock3 /> {account.pendingManualPayments.length} confirmação(ões)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccountTable(accountAsTable(account, tables))}
                  >
                    <ReceiptText /> Ver conta completa
                  </button>
                </P.AccountCard>
              );
            })}
            {!filteredAccounts.length && (
              <Empty>Nenhuma conta encontrada para estes filtros.</Empty>
            )}
          </P.List>
          <WaiterListControls
            visibleCount={Math.min(visibleAccounts, filteredAccounts.length)}
            totalCount={filteredAccounts.length}
            itemLabel="contas"
            onShowMore={() => setVisibleAccounts((current) => current + WAITER_LIST_BATCH_SIZE)}
            onReset={() => setVisibleAccounts(WAITER_LIST_BATCH_SIZE)}
          />
        </P.Section>
      </P.Workspace>

      {accountTable && (
        <WaiterTableAccountDialog table={accountTable} onClose={() => setAccountTable(null)} />
      )}
    </>
  );
}
