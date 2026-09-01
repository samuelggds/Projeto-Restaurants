import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  ListChecks,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Split,
  UserRound,
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
  type TablePaymentIntent,
  type TablePaymentMethod,
  type TablePaymentSelectionMode,
  type TablePaymentStatus,
} from '../domain/tableAccount';
import * as S from './TableAccountPanel.styles';
import { TablePaymentStatusView } from './TablePaymentStatusView';

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
  onReconcilePayment: (paymentPublicId: string) => Promise<TablePaymentIntent | null>;
  onClose: () => void;
};

type PaymentStep = 'SELECTION' | 'METHOD' | 'STATUS';

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

function SelectionModeIcon({ mode }: { mode: TablePaymentSelectionMode }) {
  if (mode === 'MY_ITEMS') return <UserRound size={20} />;
  if (mode === 'SELECTED_ITEMS') return <ListChecks size={20} />;
  if (mode === 'EQUAL_SPLIT') return <Split size={20} />;
  return <ReceiptText size={20} />;
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

function TableAccountPanelContent({
  open,
  tableNumber,
  snapshot,
  loading,
  actionLoading,
  error,
  onRefresh,
  onCreatePayment,
  onCancelPayment,
  onReconcilePayment,
  onClose,
}: Props) {
  const [step, setStep] = useState<PaymentStep>(snapshot?.activePayment ? 'STATUS' : 'SELECTION');
  const [selectionMode, setSelectionMode] = useState<TablePaymentSelectionMode>('MY_ITEMS');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [splitCount, setSplitCount] = useState(2);
  const [method, setMethod] = useState<TablePaymentMethod>('PIX');
  const [includeOptionalServiceFee, setIncludeOptionalServiceFee] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [activePayment, setActivePayment] = useState<TablePaymentIntent | null>(
    snapshot?.activePayment || null,
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stepHeadingRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const items = useMemo(
    () => snapshot?.items.filter((item) => item.orderStatus !== 'CANCELED') || [],
    [snapshot],
  );
  const activeParticipants = useMemo(
    () => snapshot?.participants.filter((participant) => participant.status === 'ACTIVE') || [],
    [snapshot],
  );
  const payableItems = items.filter((item) => item.availableCents > 0);
  const selectableItems = payableItems.filter(
    (item) => item.availableCents === item.unitPriceCents - item.paidCents,
  );
  const currentParticipantId = snapshot?.currentParticipantPublicId || '';
  const myPayableItems = payableItems.filter(
    (item) => item.orderedByParticipantPublicId === currentParticipantId,
  );
  const selectedPayableIds = selectedItemIds.filter((id) =>
    selectableItems.some((item) => item.publicId === id),
  );
  const capabilities = snapshot?.capabilities;
  const onlineMethods: TablePaymentMethod[] = capabilities?.allowOnlinePayment
    ? ['PIX', 'CARD']
    : [];
  const waiterMethods: TablePaymentMethod[] = [
    ...(capabilities?.allowCash ? (['CASH'] as const) : []),
    ...(capabilities?.allowCardMachine ? (['CARD_MACHINE'] as const) : []),
  ];
  const availableMethods: TablePaymentMethod[] = [...onlineMethods, ...waiterMethods];
  const resolvedMethod = availableMethods.includes(method) ? method : availableMethods[0];
  const manualMethod = resolvedMethod === 'CASH' || resolvedMethod === 'CARD_MACHINE';
  const selectedMode =
    modeLabels.find((candidate) => candidate.value === selectionMode) || modeLabels[0];
  const tableHasPaymentInProgress = Boolean(
    snapshot && (snapshot.summary.reservedCents > 0 || snapshot.summary.processingCents > 0),
  );
  const myItemsHavePaymentInProgress = myPayableItems.some(
    (item) => item.reservedCents > 0 || item.processingCents > 0,
  );
  const availableSubtotalCents = payableItems.reduce(
    (total, item) => total + item.availableCents,
    0,
  );
  const estimatedSubtotalCents =
    selectionMode === 'MY_ITEMS'
      ? myPayableItems.reduce((total, item) => total + item.availableCents, 0)
      : selectionMode === 'SELECTED_ITEMS'
        ? selectableItems
            .filter((item) => selectedPayableIds.includes(item.publicId))
            .reduce((total, item) => total + item.availableCents, 0)
        : selectionMode === 'EQUAL_SPLIT'
          ? Math.ceil(availableSubtotalCents / splitCount)
          : availableSubtotalCents;
  const includeEstimatedFee = Boolean(
    capabilities &&
    capabilities.serviceFeeMode !== 'DISABLED' &&
    (capabilities.serviceFeeMode === 'MANDATORY' || includeOptionalServiceFee),
  );
  const estimatedServiceFeeCents = includeEstimatedFee
    ? Math.floor(
        (estimatedSubtotalCents * Number(capabilities?.serviceFeeBasisPoints || 0) + 5_000) /
          10_000,
      )
    : 0;
  const estimatedTotalCents = estimatedSubtotalCents + estimatedServiceFeeCents;
  const canPaySelection =
    selectionMode === 'MY_ITEMS'
      ? myPayableItems.length > 0 && !myItemsHavePaymentInProgress
      : selectionMode === 'SELECTED_ITEMS'
        ? selectedPayableIds.length > 0
        : selectionMode === 'EQUAL_SPLIT'
          ? availableSubtotalCents >= splitCount && !tableHasPaymentInProgress
          : availableSubtotalCents > 0 && !tableHasPaymentInProgress;
  const canSubmit = Boolean(
    snapshot &&
    capabilities?.enabled &&
    snapshot.summary.status !== 'CLOSED' &&
    resolvedMethod &&
    canPaySelection &&
    !actionLoading,
  );
  const canContinue = Boolean(
    snapshot &&
    capabilities?.enabled &&
    snapshot.summary.status !== 'CLOSED' &&
    canPaySelection &&
    !actionLoading,
  );
  const submitLabel =
    resolvedMethod === 'CASH'
      ? 'Solicitar cobrança em dinheiro'
      : resolvedMethod === 'CARD_MACHINE'
        ? 'Solicitar maquininha'
        : resolvedMethod === 'PIX'
          ? 'Gerar pagamento Pix'
          : 'Ir para pagamento com cartão';
  const canonicalPaymentStatus = activePayment
    ? snapshot?.payments.find((payment) => payment.publicId === activePayment.publicId)?.status ||
      activePayment.status
    : null;

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [onClose, open]);

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => stepHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [step]);

  const chooseMode = (nextMode: TablePaymentSelectionMode) => {
    setSelectionMode(nextMode);
    setMethod((current) =>
      availableMethods.includes(current) ? current : availableMethods[0] || 'PIX',
    );
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
    const result = await onCreatePayment({
      selectionMode,
      method: resolvedMethod,
      ...(selectionMode === 'SELECTED_ITEMS' ? { billItemPublicIds: selectedPayableIds } : {}),
      ...(selectionMode === 'EQUAL_SPLIT' ? { splitCount } : {}),
      includeOptionalServiceFee,
    });
    if (!result) return;

    // Evita que uma seleção antiga reapareça automaticamente se esta reserva
    // for cancelada ou expirar. Cada nova tentativa exige uma escolha consciente.
    setSelectedItemIds([]);
    setActivePayment(result.payment);
    setStep('STATUS');
  };

  const reconcileActivePayment = async () => {
    if (!activePayment) return null;
    const reconciled = await onReconcilePayment(activePayment.publicId);
    if (reconciled) setActivePayment(reconciled);
    return reconciled;
  };

  const cancelActivePayment = async () => {
    if (!activePayment) return false;
    const canceled = await onCancelPayment(activePayment.publicId);
    if (canceled) {
      setActivePayment((current) => (current ? { ...current, status: 'CANCELED' } : current));
    }
    return canceled;
  };

  const startOver = () => {
    setActivePayment(null);
    setSelectedItemIds([]);
    setShowDetails(false);
    setStep('SELECTION');
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
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fechar conta da mesa"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </S.Header>

        <S.Scroll>
          {loading && !snapshot ? (
            <S.Loading role="status" aria-live="polite">
              Atualizando a conta da mesa...
            </S.Loading>
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
              <S.StepHeader ref={stepHeadingRef} tabIndex={-1} aria-live="polite">
                <span>
                  {step === 'SELECTION' ? '1 de 3' : step === 'METHOD' ? '2 de 3' : '3 de 3'}
                </span>
                <div aria-hidden="true">
                  <i className="active" />
                  <i className={step === 'METHOD' || step === 'STATUS' ? 'active' : ''} />
                  <i className={step === 'STATUS' ? 'active' : ''} />
                </div>
              </S.StepHeader>

              {step !== 'STATUS' && (
                <S.BalanceHero aria-label="Valor que falta pagar">
                  <small>Mesa {String(tableNumber)}</small>
                  <span>Falta pagar</span>
                  <strong>{formatTableMoney(snapshot.summary.remainingCents)}</strong>
                </S.BalanceHero>
              )}

              {step === 'SELECTION' && showDetails && (
                <S.DetailsRegion id="table-account-details">
                  <S.Summary aria-label="Resumo detalhado da conta">
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
                      Valores em confirmação ficam reservados e não serão cobrados novamente.
                    </span>
                  </S.SummaryNote>

                  <S.Card>
                    <header>
                      <div>
                        <h3>Acessos identificados nesta mesa</h3>
                        <p>
                          Cada celular ou navegador recebe uma identificação segura. Reabrir em
                          outro aparelho pode criar um novo acesso, mesmo sendo a mesma pessoa.
                        </p>
                      </div>
                      <span>{snapshot.summary.participantsCount} acessos</span>
                    </header>
                    <S.ContextNote>
                      <Users size={16} />
                      <span>
                        Essas identificações são encerradas quando o garçom finaliza a mesa.
                      </span>
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
                        <p>
                          Valores reservados por outro pagamento não podem ser cobrados novamente.
                        </p>
                      </div>
                      <span>{items.length} itens</span>
                    </header>
                    {items.length ? (
                      <S.Items>
                        {items.map((item) => {
                          return (
                            <S.Item as="div" key={item.publicId}>
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
                </S.DetailsRegion>
              )}

              {step === 'SELECTION' && (
                <S.DetailsToggle
                  type="button"
                  aria-expanded={showDetails}
                  aria-controls="table-account-details"
                  onClick={() => setShowDetails((current) => !current)}
                >
                  <Info size={16} />
                  {showDetails ? 'Ocultar detalhes da conta' : 'Ver detalhes da conta'}
                </S.DetailsToggle>
              )}

              <S.Card>
                {step === 'SELECTION' ? (
                  <>
                    <header>
                      <div>
                        <h3>O que você quer pagar?</h3>
                        <p>Escolha uma opção para continuar.</p>
                      </div>
                    </header>
                    <S.Modes>
                      {modeLabels.map((mode) => {
                        const unavailable =
                          actionLoading ||
                          (mode.value === 'EQUAL_SPLIT' && !capabilities.allowSplit) ||
                          availableMethods.length === 0 ||
                          ((mode.value === 'EQUAL_SPLIT' || mode.value === 'FULL_ACCOUNT') &&
                            tableHasPaymentInProgress);
                        return (
                          <button
                            key={mode.value}
                            type="button"
                            aria-pressed={selectionMode === mode.value}
                            disabled={unavailable}
                            onClick={() => chooseMode(mode.value)}
                          >
                            <span className="mode-icon">
                              <SelectionModeIcon mode={mode.value} />
                            </span>
                            <span className="mode-copy">
                              <b>{mode.title}</b>
                              <small>{mode.description}</small>
                            </span>
                            {selectionMode === mode.value && <CheckCircle2 size={18} />}
                          </button>
                        );
                      })}
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
                        {items.length ? (
                          <S.Items>
                            {items.map((item) => {
                              const selected = selectedPayableIds.includes(item.publicId);
                              const selectable = selectableItems.some(
                                (candidate) => candidate.publicId === item.publicId,
                              );
                              return (
                                <S.Item
                                  key={item.publicId}
                                  $selectable={selectable}
                                  $selected={selected}
                                  $unavailable={!selectable}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    disabled={actionLoading || !selectable}
                                    onChange={() => toggleItem(item.publicId)}
                                    aria-label={`Selecionar ${item.productName}`}
                                  />
                                  <span>
                                    <b>{item.productName}</b>
                                    <small>Pedido por {item.orderedByDisplayName}</small>
                                  </span>
                                  <span className="item-state">
                                    <strong>{formatTableMoney(item.unitPriceCents)}</strong>
                                    <em>
                                      {item.financialStatus === 'PAID'
                                        ? 'Pago'
                                        : item.availableCents <= 0
                                          ? 'Em confirmação'
                                          : 'Disponível'}
                                    </em>
                                  </span>
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
                      <S.SplitControl>
                        <span>
                          <b>Dividir entre</b>
                          <small>Cada pessoa paga uma parte igual do saldo disponível.</small>
                        </span>
                        <div>
                          <button
                            type="button"
                            aria-label="Diminuir número de pessoas"
                            disabled={actionLoading || splitCount <= 2}
                            onClick={() => setSplitCount((current) => Math.max(2, current - 1))}
                          >
                            <Minus size={16} />
                          </button>
                          <output aria-live="polite">{splitCount} pessoas</output>
                          <button
                            type="button"
                            aria-label="Aumentar número de pessoas"
                            disabled={
                              actionLoading ||
                              splitCount >= Math.min(100, Math.max(2, availableSubtotalCents))
                            }
                            onClick={() => setSplitCount((current) => Math.min(100, current + 1))}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </S.SplitControl>
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
                    <S.Submit
                      type="button"
                      disabled={!canContinue}
                      onClick={() => setStep('METHOD')}
                    >
                      Continuar
                      <ArrowRight size={16} />
                    </S.Submit>
                  </>
                ) : step === 'METHOD' ? (
                  <>
                    <S.BackButton type="button" onClick={() => setStep('SELECTION')}>
                      <ArrowLeft size={16} />
                      Voltar
                    </S.BackButton>
                    <S.ReviewSummary>
                      <header>
                        <span>
                          <small>Sua escolha</small>
                          <b>{selectedMode.title}</b>
                        </span>
                        {selectionMode === 'EQUAL_SPLIT' && <em>{splitCount} pessoas</em>}
                      </header>
                      <div>
                        <span>
                          Subtotal estimado
                          <b>{formatTableMoney(estimatedSubtotalCents)}</b>
                        </span>
                        <span>
                          Taxa de serviço
                          <b>{formatTableMoney(estimatedServiceFeeCents)}</b>
                        </span>
                        <span>
                          Total estimado
                          <b>{formatTableMoney(estimatedTotalCents)}</b>
                        </span>
                      </div>
                      {selectionMode === 'FULL_ACCOUNT' && (
                        <S.ContextNote>
                          <Clock3 size={16} />
                          <span>
                            A conta completa fica reservada até a confirmação. Outros pagamentos
                            devem aguardar a conclusão desta tentativa.
                          </span>
                        </S.ContextNote>
                      )}
                    </S.ReviewSummary>
                    <S.MethodHeading>
                      <div>
                        <h3>Como deseja pagar?</h3>
                        <p>A confirmação acontece somente depois da aprovação do pagamento.</p>
                      </div>
                      <ShieldCheck size={18} />
                    </S.MethodHeading>

                    {availableMethods.length ? (
                      <S.Methods role="group" aria-label="Forma de pagamento">
                        {availableMethods.map((availableMethod) => (
                          <button
                            key={availableMethod}
                            type="button"
                            aria-pressed={resolvedMethod === availableMethod}
                            disabled={actionLoading}
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

                    <S.ConfirmationInfo $manual={manualMethod}>
                      {manualMethod ? <Users size={18} /> : <Clock3 size={18} />}
                      <span>
                        <b>
                          {manualMethod
                            ? 'Confirmação feita pela equipe'
                            : 'Confirmação automática em tempo real'}
                        </b>
                        <small>
                          {manualMethod
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
                          disabled={actionLoading}
                          onChange={(event) => setIncludeOptionalServiceFee(event.target.checked)}
                        />
                        <span>
                          Incluir taxa de serviço de {capabilities.serviceFeeBasisPoints / 100}%
                          neste pagamento.
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
                    <S.ActionSummary>
                      <span>
                        <small>Total estimado</small>
                        <strong>{formatTableMoney(estimatedTotalCents)}</strong>
                      </span>
                      <S.Submit type="button" disabled={!canSubmit} onClick={() => void submit()}>
                        {actionLoading ? 'Reservando...' : submitLabel}
                        <ArrowRight size={16} />
                      </S.Submit>
                    </S.ActionSummary>
                  </>
                ) : activePayment && canonicalPaymentStatus ? (
                  <TablePaymentStatusView
                    payment={activePayment}
                    status={canonicalPaymentStatus}
                    actionLoading={actionLoading}
                    onVerify={reconcileActivePayment}
                    onCancel={cancelActivePayment}
                    onStartOver={startOver}
                    onClose={onClose}
                  />
                ) : (
                  <S.Empty>Não foi possível recuperar este pagamento. Atualize a conta.</S.Empty>
                )}
              </S.Card>

              {step === 'SELECTION' && showDetails && (
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
              )}
            </>
          )}
        </S.Scroll>
      </S.Panel>
    </S.Backdrop>
  );
}

export function TableAccountPanel(props: Props) {
  if (!props.open) return null;

  // Desmontar o conteúdo ao fechar limpa escolhas e mensagens da tentativa anterior.
  // A chave também impede que uma seleção de outra sessão seja reaproveitada.
  const sessionKey = props.snapshot?.summary.sessionPublicId || 'loading';
  return <TableAccountPanelContent key={sessionKey} {...props} />;
}
