import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import {
  formatTableMoney,
  isCancelableOwnTablePayment,
  type CreateTablePaymentResult,
  type TableAccountSnapshot,
  type TablePaymentDraft,
  type TablePaymentMethod,
  type TablePaymentSelectionMode,
  type TablePaymentStatus,
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
  explanation: string;
}> = [
  {
    value: 'MY_ITEMS',
    title: 'Meus itens',
    description: 'Somente o que você pediu',
    explanation: 'Seleciona automaticamente os itens vinculados a este aparelho.',
  },
  {
    value: 'SELECTED_ITEMS',
    title: 'Escolher itens',
    description: 'Marque itens desta conta',
    explanation: 'Você escolhe exatamente quais itens disponíveis deseja quitar.',
  },
  {
    value: 'EQUAL_SPLIT',
    title: 'Dividir igualmente',
    description: 'Uma parte do saldo total',
    explanation: 'O sistema calcula uma parte igual do saldo ainda disponível.',
  },
  {
    value: 'FULL_ACCOUNT',
    title: 'Conta completa',
    description: 'Quite todo o saldo disponível',
    explanation: 'Inclui todo o valor que ainda não foi pago ou reservado.',
  },
  {
    value: 'WAITER',
    title: 'Pagar com o garçom',
    description: 'Dinheiro ou maquininha',
    explanation: 'A equipe recebe presencialmente e confirma o pagamento no painel.',
  },
];

const statusDescriptions: Record<TablePaymentStatus, string> = {
  RESERVED: 'Valor separado enquanto o pagamento começa',
  PROCESSING: 'Aguardando confirmação do banco ou da equipe',
  PAID: 'Pagamento confirmado e abatido da conta',
  FAILED: 'Não foi aprovado; o valor voltou a ficar disponível',
  EXPIRED: 'O prazo terminou; o valor voltou a ficar disponível',
  CANCELED: 'Reserva cancelada e valor liberado novamente',
  REFUNDED: 'Pagamento estornado ao pagador',
};

function methodLabel(method: TablePaymentMethod) {
  if (method === 'PIX') return 'Pix online';
  if (method === 'CARD') return 'Cartão online';
  if (method === 'CASH') return 'Dinheiro';
  return 'Maquininha';
}

function methodDescription(method: TablePaymentMethod) {
  if (method === 'PIX') {
    return 'Gere o Pix e aguarde a confirmação automática do banco.';
  }
  if (method === 'CARD') {
    return 'Pague no checkout seguro e aguarde a aprovação do cartão.';
  }
  if (method === 'CASH') {
    return 'O garçom recebe o dinheiro e confirma manualmente no painel.';
  }
  return 'O garçom cobra na maquininha e confirma manualmente no painel.';
}

function MethodIcon({ method }: { method: TablePaymentMethod }) {
  if (method === 'PIX') return <Smartphone size={18} />;
  if (method === 'CARD') return <CreditCard size={18} />;
  if (method === 'CASH') return <Banknote size={18} />;
  return <WalletCards size={18} />;
}

function formatPaymentTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentStatusLabel(payment: TableAccountSnapshot['payments'][number]) {
  if (
    payment.selectionMode === 'WAITER' &&
    (payment.status === 'RESERVED' || payment.status === 'PROCESSING')
  ) {
    return 'Aguardando garçom';
  }
  return statusLabels[payment.status];
}

function paymentStatusDescription(payment: TableAccountSnapshot['payments'][number]) {
  if (
    payment.selectionMode === 'WAITER' &&
    (payment.status === 'RESERVED' || payment.status === 'PROCESSING')
  ) {
    return 'A equipe ainda precisa receber e confirmar o valor';
  }
  return statusDescriptions[payment.status];
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
  const activeParticipants = useMemo(
    () => snapshot?.participants.filter((participant) => participant.status === 'ACTIVE') || [],
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
  const selectedMode =
    modeLabels.find((candidate) => candidate.value === selectionMode) || modeLabels[0];
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
  const submitLabel =
    selectionMode === 'WAITER'
      ? 'Solicitar pagamento ao garçom'
      : resolvedMethod === 'PIX'
        ? 'Gerar pagamento Pix'
        : 'Ir para pagamento com cartão';

  useEffect(() => {
    setSelectionMode('MY_ITEMS');
    setSelectedItemIds([]);
    setSplitCount(2);
    setMethod('PIX');
    setIncludeOptionalServiceFee(true);
    setResultMessage('');
  }, [open, snapshot?.summary.sessionPublicId]);

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
        result.payment.provider === 'FAKE_TABLE'
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
            <p>Escolha o que pagar, a forma de pagamento e acompanhe a confirmação.</p>
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
                <S.Alert $info>
                  <span>{resultMessage}</span>
                </S.Alert>
              )}

              <S.Guide aria-label="Como funciona o pagamento da mesa">
                <header>
                  <span className="guide-icon">
                    <ShieldCheck size={19} />
                  </span>
                  <div>
                    <h3>Pagamento seguro, sem cobranças duplicadas</h3>
                    <p>O valor escolhido fica reservado enquanto a confirmação é processada.</p>
                  </div>
                </header>
                <ol>
                  <li>
                    <b>1</b>
                    <span>
                      <strong>Escolha o valor</strong>
                      <small>Seus itens, itens específicos, uma divisão ou a conta completa.</small>
                    </span>
                  </li>
                  <li>
                    <b>2</b>
                    <span>
                      <strong>Escolha como pagar</strong>
                      <small>Online pelo banco ou presencialmente com o garçom.</small>
                    </span>
                  </li>
                  <li>
                    <b>3</b>
                    <span>
                      <strong>Acompanhe a confirmação</strong>
                      <small>A conta é atualizada automaticamente em todos os aparelhos.</small>
                    </span>
                  </li>
                </ol>
              </S.Guide>

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
                <article>
                  <small>Em confirmação</small>
                  <strong>{formatTableMoney(snapshot.summary.processingCents)}</strong>
                </article>
              </S.Summary>
              <S.SummaryNote>
                <Info size={14} />
                <span>
                  “Falta pagar” inclui valores que ainda estão em confirmação, mas esses valores
                  ficam reservados e não podem ser cobrados novamente.
                </span>
              </S.SummaryNote>

              <S.Card>
                <header>
                  <div>
                    <h3>Acessos identificados nesta mesa</h3>
                    <p>
                      Cada celular ou navegador recebe uma identificação segura. Reabrir em outro
                      aparelho pode criar um novo acesso, mesmo sendo a mesma pessoa.
                    </p>
                  </div>
                  <span>{snapshot.summary.participantsCount} acessos</span>
                </header>
                <S.ContextNote>
                  <Users size={16} />
                  <span>Essas identificações são encerradas quando o garçom finaliza a mesa.</span>
                </S.ContextNote>
                <S.Participants>
                  {activeParticipants.map((participant) => (
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
                      return (
                        <S.Item key={item.publicId}>
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
                    <h3>1. O que você deseja pagar?</h3>
                    <p>Escolha uma opção. O sistema calcula o valor exato no servidor.</p>
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
                      <span className="mode-copy">
                        <b>{mode.title}</b>
                        <small>{mode.description}</small>
                      </span>
                      {selectionMode === mode.value && <CheckCircle2 size={17} />}
                    </button>
                  ))}
                </S.Modes>

                <S.SelectionHelp>
                  <Info size={17} />
                  <span>
                    <b>{selectedMode.title}</b>
                    <small>{selectedMode.explanation}</small>
                  </span>
                </S.SelectionHelp>

                {selectionMode === 'SELECTED_ITEMS' && (
                  <S.SelectionBox>
                    <header>
                      <div>
                        <h4>Marque os itens que deseja pagar</h4>
                        <p>Somente itens disponíveis podem ser selecionados.</p>
                      </div>
                      <span>{selectedPayableIds.length} selecionados</span>
                    </header>
                    {payableItems.length ? (
                      <S.Items>
                        {payableItems.map((item) => {
                          const selected = selectedPayableIds.includes(item.publicId);
                          return (
                            <S.Item key={item.publicId} $selectable $selected={selected}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleItem(item.publicId)}
                                aria-label={`Selecionar ${item.productName}`}
                              />
                              <span>
                                <b>{item.productName}</b>
                                <small>
                                  Pedido por {item.orderedByDisplayName} •{' '}
                                  {formatTableMoney(item.availableCents)} disponível
                                </small>
                              </span>
                              <strong>{formatTableMoney(item.unitPriceCents)}</strong>
                            </S.Item>
                          );
                        })}
                      </S.Items>
                    ) : (
                      <S.Empty>Não há itens disponíveis para selecionar.</S.Empty>
                    )}
                  </S.SelectionBox>
                )}

                {selectionMode === 'EQUAL_SPLIT' && (
                  <S.FormGrid>
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
                  </S.FormGrid>
                )}

                <S.MethodHeading>
                  <div>
                    <h4>2. Como você deseja pagar?</h4>
                    <p>
                      {selectionMode === 'WAITER'
                        ? 'A equipe precisa confirmar depois de receber o valor.'
                        : 'A confirmação chega automaticamente após a aprovação do banco.'}
                    </p>
                  </div>
                  {selectionMode === 'WAITER' ? <Users size={18} /> : <ShieldCheck size={18} />}
                </S.MethodHeading>

                {availableMethods.length ? (
                  <S.Methods role="radiogroup" aria-label="Forma de pagamento">
                    {availableMethods.map((availableMethod) => (
                      <button
                        key={availableMethod}
                        type="button"
                        role="radio"
                        aria-checked={resolvedMethod === availableMethod}
                        onClick={() => setMethod(availableMethod)}
                      >
                        <span className="method-icon">
                          <MethodIcon method={availableMethod} />
                        </span>
                        <span>
                          <b>{methodLabel(availableMethod)}</b>
                          <small>{methodDescription(availableMethod)}</small>
                        </span>
                        {resolvedMethod === availableMethod && <CheckCircle2 size={18} />}
                      </button>
                    ))}
                  </S.Methods>
                ) : (
                  <S.Empty>Nenhuma forma de pagamento está habilitada para esta opção.</S.Empty>
                )}

                <S.ConfirmationInfo $manual={selectionMode === 'WAITER'}>
                  {selectionMode === 'WAITER' ? <Users size={18} /> : <Clock3 size={18} />}
                  <span>
                    <b>
                      {selectionMode === 'WAITER'
                        ? 'Confirmação feita pela equipe'
                        : 'Confirmação automática em tempo real'}
                    </b>
                    <small>
                      {selectionMode === 'WAITER'
                        ? 'Dinheiro e maquininha só aparecem como pagos depois que o garçom recebe e confirma no painel. Isso evita baixas incorretas.'
                        : 'Depois de concluir o Pix ou o cartão, o status fica Processando até o provedor confirmar. Em seguida a conta muda para Pago automaticamente.'}
                    </small>
                  </span>
                </S.ConfirmationInfo>

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
                  <S.Fee as="div">
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
                  {actionLoading ? 'Reservando valor com segurança...' : submitLabel}
                  <ArrowRight size={16} />
                </S.Submit>
              </S.Card>

              <S.Card>
                <header>
                  <div>
                    <h3>3. Acompanhe os pagamentos</h3>
                    <p>Veja quando o valor está em confirmação, pago, liberado ou estornado.</p>
                  </div>
                  <S.IconButton
                    type="button"
                    aria-label="Atualizar pagamentos"
                    onClick={onRefresh}
                  >
                    <RefreshCw size={15} />
                  </S.IconButton>
                </header>
                {snapshot.payments.length ? (
                  <S.PaymentList>
                    {snapshot.payments.map((payment) => (
                      <article key={payment.publicId} data-status={payment.status}>
                        <span>
                          <b className="status-label">{paymentStatusLabel(payment)}</b>
                          <small>
                            {payment.payerParticipantPublicId === currentParticipantId
                              ? 'Seu pagamento'
                              : 'Outro participante'}{' '}
                            • {paymentStatusDescription(payment)}
                          </small>
                          {formatPaymentTime(payment.createdAt) && (
                            <time dateTime={payment.createdAt}>
                              Iniciado em {formatPaymentTime(payment.createdAt)}
                            </time>
                          )}
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
                <S.StatusLegend>
                  <span>
                    <Clock3 size={14} />
                    <b>Processando</b> ainda não significa pago.
                  </span>
                  <span>
                    <CheckCircle2 size={14} />
                    <b>Pago</b> significa confirmação concluída.
                  </span>
                </S.StatusLegend>
              </S.Card>
            </>
          )}
        </S.Scroll>
      </S.Panel>
    </S.Backdrop>
  );
}
