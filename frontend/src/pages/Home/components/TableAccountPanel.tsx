import { useMemo, useState } from 'react';
import { ArrowRight, ReceiptText, RefreshCw, X } from 'lucide-react';
import {
  formatTableMoney,
  isCancelableOwnTablePayment,
  type CreateTablePaymentResult,
  type TableAccountSnapshot,
  type TablePaymentDraft,
  type TablePaymentMethod,
  type TablePaymentSelectionMode,
} from '../domain/tableAccount';
import * as S from './TableAccountPanel.styles';

type Props = {
  open: boolean;
  tableNumber: string | number;
  snapshot: TableAccountSnapshot | null;
  loading: boolean;
  actionLoading: boolean;
  error: string;
  onRefresh: () => void;
  onCreatePayment: (draft: TablePaymentDraft) => Promise<CreateTablePaymentResult | null>;
  onCancelPayment: (paymentPublicId: string) => Promise<boolean>;
  onClose: () => void;
};

const statusLabels = {
  RESERVED: 'Reservado',
  PROCESSING: 'Processando',
  PAID: 'Pago',
  FAILED: 'Falhou',
  EXPIRED: 'Expirou',
  CANCELED: 'Cancelado',
  REFUNDED: 'Estornado',
} as const;

const modeLabels: Array<{
  value: TablePaymentSelectionMode;
  title: string;
  description: string;
}> = [
  { value: 'MY_ITEMS', title: 'Meus itens', description: 'Somente o que você pediu' },
  { value: 'SELECTED_ITEMS', title: 'Escolher itens', description: 'Marque itens desta conta' },
  { value: 'EQUAL_SPLIT', title: 'Dividir igualmente', description: 'Uma parte do saldo total' },
  { value: 'FULL_ACCOUNT', title: 'Conta completa', description: 'Quite todo o saldo disponível' },
  { value: 'WAITER', title: 'Pagar com o garçom', description: 'Dinheiro ou maquininha' },
];

function methodLabel(method: TablePaymentMethod) {
  if (method === 'PIX') return 'Pix online';
  if (method === 'CARD') return 'Cartão online';
  if (method === 'CASH') return 'Dinheiro';
  return 'Maquininha';
}

export function TableAccountPanel({
  open,
  tableNumber,
  snapshot,
  loading,
  actionLoading,
  error,
  onRefresh,
  onCreatePayment,
  onCancelPayment,
  onClose,
}: Props) {
  const [selectionMode, setSelectionMode] = useState<TablePaymentSelectionMode>('MY_ITEMS');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [splitCount, setSplitCount] = useState(2);
  const [method, setMethod] = useState<TablePaymentMethod>('PIX');
  const [includeOptionalServiceFee, setIncludeOptionalServiceFee] = useState(true);
  const [resultMessage, setResultMessage] = useState('');

  const items = useMemo(
    () => snapshot?.items.filter((item) => item.orderStatus !== 'CANCELED') || [],
    [snapshot],
  );
  const payableItems = items.filter((item) => item.availableCents > 0);
  const currentParticipantId = snapshot?.currentParticipantPublicId || '';
  const myPayableItems = payableItems.filter(
    (item) => item.orderedByParticipantPublicId === currentParticipantId,
  );
  const selectedPayableIds = selectedItemIds.filter((id) =>
    payableItems.some((item) => item.publicId === id),
  );
  const capabilities = snapshot?.capabilities;
  const onlineMethods: TablePaymentMethod[] = capabilities?.allowOnlinePayment
    ? ['PIX', 'CARD']
    : [];
  const waiterMethods: TablePaymentMethod[] = [
    ...(capabilities?.allowCash ? (['CASH'] as const) : []),
    ...(capabilities?.allowCardMachine ? (['CARD_MACHINE'] as const) : []),
  ];
  const availableMethods = selectionMode === 'WAITER' ? waiterMethods : onlineMethods;
  const resolvedMethod = availableMethods.includes(method) ? method : availableMethods[0];
  const canPaySelection =
    selectionMode === 'MY_ITEMS'
      ? myPayableItems.length > 0
      : selectionMode === 'SELECTED_ITEMS'
        ? selectedPayableIds.length > 0
        : snapshot
          ? snapshot.summary.remainingCents > 0
          : false;
  const canSubmit = Boolean(
    snapshot &&
    capabilities?.enabled &&
    snapshot.summary.status !== 'CLOSED' &&
    resolvedMethod &&
    canPaySelection &&
    !actionLoading,
  );

  if (!open) return null;

  const chooseMode = (nextMode: TablePaymentSelectionMode) => {
    setSelectionMode(nextMode);
    setResultMessage('');
    if (nextMode === 'WAITER') {
      setMethod(waiterMethods[0] || 'CASH');
    } else {
      setMethod(onlineMethods[0] || 'PIX');
    }
  };

  const toggleItem = (publicId: string) => {
    setSelectedItemIds((current) =>
      current.includes(publicId)
        ? current.filter((candidate) => candidate !== publicId)
        : [...current, publicId],
    );
  };

  const submit = async () => {
    if (!canSubmit || !resolvedMethod) return;
    setResultMessage('');
    const result = await onCreatePayment({
      selectionMode,
      method: resolvedMethod,
      ...(selectionMode === 'SELECTED_ITEMS' ? { billItemPublicIds: selectedPayableIds } : {}),
      ...(selectionMode === 'EQUAL_SPLIT' ? { splitCount } : {}),
      includeOptionalServiceFee,
    });
    if (!result) return;

    const checkoutUrl = String(result.payment.checkoutUrl || '');
    if (/^https:\/\//i.test(checkoutUrl)) {
      window.location.assign(checkoutUrl);
      return;
    }
    if (selectionMode === 'WAITER') {
      setResultMessage('Solicitação registrada. O garçom confirmará o pagamento no atendimento.');
    } else {
      setResultMessage(
        result.payment.provider === 'FAKE'
          ? 'Pagamento criado no ambiente de testes. Aguarde a confirmação simulada.'
          : 'Pagamento iniciado. Acompanhe o status nesta conta.',
      );
    }
  };

  return (
    <S.Backdrop
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <S.Panel role="dialog" aria-modal="true" aria-labelledby="table-account-title">
        <S.Header>
          <span className="icon">
            <ReceiptText size={24} />
          </span>
          <div>
            <h2 id="table-account-title">Conta da mesa {String(tableNumber)}</h2>
            <p>Confira os pedidos e pague junto, separado ou com o garçom.</p>
          </div>
          <button type="button" aria-label="Fechar conta da mesa" onClick={onClose}>
            <X size={19} />
          </button>
        </S.Header>

        <S.Scroll>
          {loading && !snapshot ? (
            <S.Loading>Atualizando a conta da mesa...</S.Loading>
          ) : !snapshot ? (
            <S.Alert $error>
              <span>{error || 'Não foi possível carregar a conta desta mesa.'}</span>
              <button type="button" onClick={onRefresh}>
                Tentar novamente
              </button>
            </S.Alert>
          ) : (
            <>
              {error && (
                <S.Alert $error>
                  <span>{error}</span>
                  <button type="button" onClick={onRefresh}>
                    Atualizar
                  </button>
                </S.Alert>
              )}
              {resultMessage && (
                <S.Alert>
                  <span>{resultMessage}</span>
                </S.Alert>
              )}

              <S.Summary aria-label="Resumo da conta">
                <article>
                  <small>Falta pagar</small>
                  <strong>{formatTableMoney(snapshot.summary.remainingCents)}</strong>
                </article>
                <article>
                  <small>Consumido</small>
                  <strong>{formatTableMoney(snapshot.summary.consumedCents)}</strong>
                </article>
                <article>
                  <small>Pago</small>
                  <strong>{formatTableMoney(snapshot.summary.netPaidCents)}</strong>
                </article>
              </S.Summary>

              <S.Card>
                <header>
                  <div>
                    <h3>Pessoas nesta mesa</h3>
                    <p>A conta mostra apenas nomes de identificação.</p>
                  </div>
                  <span>{snapshot.summary.participantsCount} ativos</span>
                </header>
                <S.Participants>
                  {snapshot.participants.map((participant) => (
                    <span
                      key={participant.publicId}
                      className={participant.publicId === currentParticipantId ? 'current' : ''}
                    >
                      {participant.displayName || 'Cliente da mesa'}
                      {participant.publicId === currentParticipantId ? ' • você' : ''}
                    </span>
                  ))}
                </S.Participants>
              </S.Card>

              <S.Card>
                <header>
                  <div>
                    <h3>Itens lançados</h3>
                    <p>Valores reservados por outro pagamento não podem ser cobrados novamente.</p>
                  </div>
                  <span>{items.length} itens</span>
                </header>
                {items.length ? (
                  <S.Items>
                    {items.map((item) => {
                      const selectable =
                        selectionMode === 'SELECTED_ITEMS' && item.availableCents > 0;
                      const selected = selectedPayableIds.includes(item.publicId);
                      return (
                        <S.Item key={item.publicId} $selectable={selectable} $selected={selected}>
                          {selectable && (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleItem(item.publicId)}
                              aria-label={`Selecionar ${item.productName}`}
                            />
                          )}
                          <span>
                            <b>{item.productName}</b>
                            <small>
                              {item.orderedByDisplayName} •{' '}
                              {item.financialStatus === 'PAID'
                                ? 'pago'
                                : item.availableCents > 0
                                  ? 'disponível'
                                  : 'em pagamento'}
                            </small>
                          </span>
                          <strong>{formatTableMoney(item.unitPriceCents)}</strong>
                        </S.Item>
                      );
                    })}
                  </S.Items>
                ) : (
                  <S.Empty>Nenhum item foi lançado nesta conta ainda.</S.Empty>
                )}
              </S.Card>

              <S.Card>
                <header>
                  <div>
                    <h3>Como você quer pagar?</h3>
                    <p>O backend calcula e reserva somente o valor escolhido.</p>
                  </div>
                  <span>Seguro</span>
                </header>
                <S.Modes>
                  {modeLabels.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      aria-pressed={selectionMode === mode.value}
                      disabled={mode.value === 'EQUAL_SPLIT' && !capabilities.allowSplit}
                      onClick={() => chooseMode(mode.value)}
                    >
                      <b>{mode.title}</b>
                      <small>{mode.description}</small>
                    </button>
                  ))}
                </S.Modes>

                <S.FormGrid>
                  {selectionMode === 'EQUAL_SPLIT' && (
                    <label>
                      Dividir entre quantas pessoas?
                      <input
                        type="number"
                        min={2}
                        max={100}
                        value={splitCount}
                        onChange={(event) =>
                          setSplitCount(Math.min(100, Math.max(2, Number(event.target.value) || 2)))
                        }
                      />
                    </label>
                  )}
                  <label>
                    Forma de pagamento
                    <select
                      value={resolvedMethod || ''}
                      disabled={!availableMethods.length}
                      onChange={(event) => setMethod(event.target.value as TablePaymentMethod)}
                    >
                      {!availableMethods.length && <option value="">Indisponível</option>}
                      {availableMethods.map((availableMethod) => (
                        <option key={availableMethod} value={availableMethod}>
                          {methodLabel(availableMethod)}
                        </option>
                      ))}
                    </select>
                  </label>
                </S.FormGrid>

                {capabilities.serviceFeeMode === 'OPTIONAL' && (
                  <S.Fee>
                    <input
                      type="checkbox"
                      checked={includeOptionalServiceFee}
                      onChange={(event) => setIncludeOptionalServiceFee(event.target.checked)}
                    />
                    <span>
                      Incluir taxa de serviço de {capabilities.serviceFeeBasisPoints / 100}% neste
                      pagamento.
                    </span>
                  </S.Fee>
                )}
                {capabilities.serviceFeeMode === 'MANDATORY' && (
                  <S.Fee>
                    <span>
                      A taxa de serviço de {capabilities.serviceFeeBasisPoints / 100}% será
                      calculada automaticamente.
                    </span>
                  </S.Fee>
                )}

                {!capabilities.enabled && (
                  <S.Alert $error>
                    <span>A conta por mesa está desativada neste restaurante.</span>
                  </S.Alert>
                )}
                {!canPaySelection && (
                  <S.Empty>
                    {selectionMode === 'SELECTED_ITEMS'
                      ? 'Selecione ao menos um item disponível.'
                      : selectionMode === 'MY_ITEMS'
                        ? 'Você não possui itens disponíveis para este pagamento.'
                        : 'Não há saldo disponível para esta escolha.'}
                  </S.Empty>
                )}
                <S.Submit type="button" disabled={!canSubmit} onClick={() => void submit()}>
                  {actionLoading ? 'Reservando valor...' : 'Continuar com pagamento'}
                  <ArrowRight size={16} />
                </S.Submit>
              </S.Card>

              <S.Card>
                <header>
                  <div>
                    <h3>Pagamentos desta mesa</h3>
                    <p>Os demais participantes não veem sua forma de pagamento.</p>
                  </div>
                  <button type="button" aria-label="Atualizar pagamentos" onClick={onRefresh}>
                    <RefreshCw size={15} />
                  </button>
                </header>
                {snapshot.payments.length ? (
                  <S.PaymentList>
                    {snapshot.payments.map((payment) => (
                      <article key={payment.publicId}>
                        <span>
                          <b>{statusLabels[payment.status]}</b>
                          <small>
                            {payment.payerParticipantPublicId === currentParticipantId
                              ? 'Seu pagamento'
                              : 'Outro participante'}
                          </small>
                        </span>
                        <strong>{formatTableMoney(payment.totalCents)}</strong>
                        {isCancelableOwnTablePayment(payment, currentParticipantId) && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void onCancelPayment(payment.publicId)}
                          >
                            Cancelar reserva
                          </button>
                        )}
                      </article>
                    ))}
                  </S.PaymentList>
                ) : (
                  <S.Empty>Nenhum pagamento foi iniciado nesta mesa.</S.Empty>
                )}
              </S.Card>
            </>
          )}
        </S.Scroll>
      </S.Panel>
    </S.Backdrop>
  );
}
