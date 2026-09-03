import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  Info,
  Layers3,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import monthlyBillingService, {
  type BillingPlan,
  type BillingOverview,
  type Invoice,
  type PlanCode,
  type Subscription,
} from '../../../Services/monthlyBillingService';
import { clearSystemBlockState, findBlockingInvoice } from '../../../Services/systemBlock';
import * as S from './MonthlyBilling.styles';

const benefits: Record<PlanCode, string[]> = {
  BASICO: ['Sistema de delivery', 'Suporte padrão'],
  PREMIUM: ['Sistema de delivery', 'Cardápio digital com QR Code de mesa', 'Suporte prioritário'],
};

const fallbackPlans: BillingPlan[] = [
  {
    plan: 'BASICO',
    name: 'Básico',
    monthlyFee: 149.9,
    trialDays: 30,
    features: benefits.BASICO,
  },
  {
    plan: 'PREMIUM',
    name: 'Premium',
    monthlyFee: 249.9,
    trialDays: 30,
    features: benefits.PREMIUM,
  },
];

const planDescriptions: Record<PlanCode, string> = {
  BASICO: 'O essencial para receber e gerenciar pedidos de delivery.',
  PREMIUM: 'A operação completa, com delivery e atendimento nas mesas por QR Code.',
};

const planIcons = { BASICO: Zap, PREMIUM: Sparkles };
const statusLabels: Record<string, string> = {
  TESTE: 'Período de teste',
  ATIVA: 'Assinatura ativa',
  EXPIRADA: 'Assinatura expirada',
  CANCELADA: 'Assinatura cancelada',
};
const invoiceLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  ATRASADO: 'Atrasado',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
};
const payableStatuses = new Set(['PENDENTE', 'ATRASADO', 'VENCIDO']);

const money = (value: number | string) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
const date = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : 'Não informado';
const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { error?: string } } }).response?.data?.error;

function getInvoiceTone(status?: string) {
  if (status === 'PAGO') return 'success';
  if (status === 'ATRASADO' || status === 'VENCIDO') return 'danger';
  if (status === 'PENDENTE') return 'warning';
  return 'neutral';
}

type MonthlyBillingProps = {
  restricted?: boolean;
};

type BillingFeedback = {
  tone: 'success' | 'error';
  message: string;
};

export function MonthlyBilling({ restricted = false }: MonthlyBillingProps = {}) {
  const [view, setView] = useState<'plans' | 'charges'>(restricted ? 'charges' : 'plans');
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billing, setBilling] = useState<BillingOverview['billing']>();
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<PlanCode | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<BillingFeedback | null>(null);
  const [pixCopyState, setPixCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [pix, setPix] = useState<{
    invoice: Invoice;
    qrCode: string;
    qrCodeBase64: string;
    expiresAt?: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [available, current, overview] = await Promise.all([
        monthlyBillingService.getPlans(),
        monthlyBillingService.getSubscription(),
        monthlyBillingService.getOverview(),
      ]);
      setPlans(available);
      setSubscription(current);
      setInvoices(overview.invoices || []);
      setBilling(overview.billing);
      if (restricted && !findBlockingInvoice(overview.invoices || [])) {
        clearSystemBlockState();
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: errorMessage(error) || 'Não foi possível carregar as mensalidades.',
      });
    } finally {
      setLoading(false);
    }
  }, [restricted]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!pix) return;

    const timer = window.setInterval(async () => {
      try {
        const overview = await monthlyBillingService.getOverview();
        const paidInvoice = overview.invoices.find(
          (invoice) => invoice.id === pix.invoice.id && invoice.status === 'PAGO',
        );

        if (paidInvoice) {
          window.clearInterval(timer);
          setPix(null);
          setFeedback({
            tone: 'success',
            message: 'Pagamento confirmado. A escolha do plano foi liberada.',
          });
          await load();
        }
      } catch {
        // A próxima consulta tenta novamente sem interromper o pagamento.
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [load, pix]);

  useEffect(() => {
    if (feedback?.tone !== 'success') return;
    const timer = window.setTimeout(() => setFeedback(null), 4500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!pix) return;
    const previousOverflow = document.body.style.overflow;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPix(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeWithEscape);
    };
  }, [pix]);

  const changePlan = async (plan: PlanCode) => {
    setChangingPlan(plan);
    try {
      const result = await monthlyBillingService.requestPlanChange(plan);
      setFeedback({
        tone: 'success',
        message: result.message || 'Troca de plano agendada.',
      });
      await load();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: errorMessage(error) || 'Não foi possível alterar o plano.',
      });
    } finally {
      setChangingPlan(null);
    }
  };

  const payInvoice = async (invoice: Invoice) => {
    setPayingInvoice(invoice.id);
    try {
      const result = await monthlyBillingService.generatePix(invoice.id);
      setPixCopyState('idle');
      setPix({
        invoice,
        qrCode: result.pixQrCode,
        qrCodeBase64: result.pixQrCodeBase64,
        expiresAt: result.pixExpiresAt,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          errorMessage(error) ||
          (error instanceof Error ? error.message : 'Não foi possível gerar o Pix.'),
      });
    } finally {
      setPayingInvoice(null);
    }
  };

  const copyPix = async () => {
    if (!pix?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setPixCopyState('copied');
    } catch {
      setPixCopyState('error');
    }
  };

  const displayedPlans = useMemo(() => (plans.length ? plans : fallbackPlans), [plans]);
  const active = subscription?.status === 'ATIVA' || subscription?.status === 'TESTE';
  const currentPlan = displayedPlans.find((plan) => plan.plan === subscription?.plan);
  const scheduledPlan = displayedPlans.find((plan) => plan.plan === subscription?.scheduledPlan);
  const planChoice = subscription?.planChangeEligibility;
  const currentInvoice =
    invoices.find((invoice) => invoice.id === billing?.currentInvoiceId) ||
    invoices.find((invoice) => payableStatuses.has(invoice.status));
  const currentPixAvailable = Boolean(currentInvoice && billing?.pixAvailable);
  const openInvoices = invoices.filter((invoice) => payableStatuses.has(invoice.status));
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'PAGO');
  const currentStatus =
    statusLabels[subscription?.status || ''] || subscription?.status || 'Não configurada';

  const invoicePixAvailable = (invoice: Invoice) => {
    if (invoice.status === 'ATRASADO') return true;
    if (invoice.id === currentInvoice?.id) return currentPixAvailable;

    const availableAt = new Date(invoice.dueDate);
    availableAt.setDate(availableAt.getDate() - 5);
    return new Date() >= availableAt;
  };

  if (loading) {
    return (
      <S.Loading role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <strong>Organizando sua área financeira</strong>
        <small>Carregando planos e mensalidades...</small>
      </S.Loading>
    );
  }

  return (
    <S.Shell>
      <S.BillingHero aria-labelledby="billing-hero-title">
        <S.HeroCopy>
          <span className="eyebrow">
            <Sparkles aria-hidden="true" /> Gestão da assinatura
          </span>
          <h2 id="billing-hero-title">
            {active ? 'Sua assinatura está em dia' : 'Sua assinatura precisa de atenção'}
          </h2>
          <p>
            Veja o plano contratado, acompanhe os próximos vencimentos e resolva pagamentos em um só
            lugar.
          </p>
          <S.HeroFacts aria-label="Resumo da assinatura">
            <span>
              <Layers3 aria-hidden="true" />
              <small>Plano</small>
              <strong>{currentPlan?.name || subscription?.plan || 'Não definido'}</strong>
            </span>
            <span>
              <WalletCards aria-hidden="true" />
              <small>Mensalidade</small>
              <strong>{currentPlan ? money(currentPlan.monthlyFee) : 'A definir'}</strong>
            </span>
            <span>
              <CalendarDays aria-hidden="true" />
              <small>Próximo vencimento</small>
              <strong>{date(billing?.dueDate || currentInvoice?.dueDate)}</strong>
            </span>
          </S.HeroFacts>
        </S.HeroCopy>

        <S.HeroStatusPanel $active={active}>
          <span className="status-icon" aria-hidden="true">
            {active ? <ShieldCheck /> : <CircleAlert />}
          </span>
          <small>Status da assinatura</small>
          <strong>{currentStatus}</strong>
          <p>
            {active
              ? 'Todos os recursos do seu plano estão disponíveis.'
              : 'Regularize a situação para manter a operação disponível.'}
          </p>
          <button type="button" onClick={() => setView('charges')}>
            {currentInvoice ? 'Ver cobrança atual' : 'Ver histórico'}
            <ArrowRight aria-hidden="true" />
          </button>
        </S.HeroStatusPanel>
      </S.BillingHero>

      {feedback ? (
        <S.FeedbackBanner
          $tone={feedback.tone}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <span aria-hidden="true">
            {feedback.tone === 'success' ? <CheckCircle2 /> : <CircleAlert />}
          </span>
          <div>
            <strong>
              {feedback.tone === 'success' ? 'Tudo certo' : 'Não foi possível concluir'}
            </strong>
            <p>{feedback.message}</p>
          </div>
          <button type="button" aria-label="Fechar aviso" onClick={() => setFeedback(null)}>
            <X aria-hidden="true" />
          </button>
        </S.FeedbackBanner>
      ) : null}

      {subscription?.status === 'TESTE' && subscription.trialEndsAt ? (
        <S.Notice $tone="info" role="status">
          <span aria-hidden="true">
            <Clock3 />
          </span>
          <div>
            <strong>Período de teste em andamento</strong>
            <p>
              Você pode usar os recursos do plano até <b>{date(subscription.trialEndsAt)}</b>.
            </p>
          </div>
        </S.Notice>
      ) : null}
      {scheduledPlan ? (
        <S.Notice $tone="warning" role="status">
          <span aria-hidden="true">
            <CalendarClock />
          </span>
          <div>
            <strong>Troca de plano agendada</strong>
            <p>
              O plano muda para <b>{scheduledPlan.name}</b> em{' '}
              {String(subscription?.scheduledPlanEffectiveMonth).padStart(2, '0')}/
              {subscription?.scheduledPlanEffectiveYear}. Até lá, o plano atual continua ativo.
            </p>
          </div>
        </S.Notice>
      ) : null}

      <S.ViewTabs role="tablist" aria-label="Seções de cobrança e assinatura">
        {!restricted ? (
          <button
            role="tab"
            type="button"
            aria-selected={view === 'plans'}
            className={view === 'plans' ? 'active' : ''}
            onClick={() => setView('plans')}
          >
            <Layers3 aria-hidden="true" />
            <span>
              <strong>Planos</strong>
              <small>Compare os benefícios</small>
            </span>
          </button>
        ) : null}
        <button
          role="tab"
          type="button"
          aria-selected={view === 'charges'}
          className={view === 'charges' ? 'active' : ''}
          onClick={() => setView('charges')}
        >
          <CreditCard aria-hidden="true" />
          <span>
            <strong>Cobranças</strong>
            <small>Vencimentos e pagamentos</small>
          </span>
          {openInvoices.length ? <em>{openInvoices.length}</em> : null}
        </button>
      </S.ViewTabs>

      {!restricted && view === 'plans' ? (
        <S.ViewPanel role="tabpanel">
          <S.SectionHeader>
            <div>
              <span className="section-icon" aria-hidden="true">
                <Layers3 />
              </span>
              <span>
                <small>ESCOLHA COM TRANQUILIDADE</small>
                <h2>Encontre o plano certo para sua operação</h2>
                <p>Compare os recursos e programe a mudança para o próximo ciclo.</p>
              </span>
            </div>
            <S.ChoiceStatus $available={Boolean(planChoice?.allowed)}>
              {planChoice?.allowed ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <LockKeyhole aria-hidden="true" />
              )}
              <span>
                <strong>
                  {planChoice?.allowed ? 'Troca disponível' : 'Troca indisponível agora'}
                </strong>
                <small>
                  {planChoice?.reason ||
                    'A escolha é liberada depois que uma fatura vencida for paga.'}
                </small>
              </span>
            </S.ChoiceStatus>
          </S.SectionHeader>

          <S.Plans>
            {displayedPlans.map((plan) => {
              const Icon = planIcons[plan.plan];
              const current = subscription?.plan === plan.plan;
              const planFeatures = plan.features?.length ? plan.features : benefits[plan.plan];
              const actionDisabled =
                !planChoice?.allowed ||
                Boolean(changingPlan) ||
                Boolean(subscription?.scheduledPlan);
              return (
                <S.PlanCard
                  key={plan.plan}
                  $featured={plan.plan === 'PREMIUM'}
                  $current={current}
                  aria-label={`Plano ${plan.name}${current ? ', plano atual' : ''}`}
                >
                  <S.PlanCardTop>
                    <S.PlanHeading>
                      <span>
                        <Icon aria-hidden="true" />
                      </span>
                      <div>
                        <small>
                          {plan.plan === 'PREMIUM' ? 'EXPERIÊNCIA COMPLETA' : 'PARA COMEÇAR'}
                        </small>
                        <h3>{plan.name}</h3>
                      </div>
                    </S.PlanHeading>
                    {current ? (
                      <S.PlanTag $tone="current">
                        <BadgeCheck aria-hidden="true" /> Atual
                      </S.PlanTag>
                    ) : plan.plan === 'PREMIUM' ? (
                      <S.PlanTag $tone="recommended">Mais completo</S.PlanTag>
                    ) : null}
                  </S.PlanCardTop>
                  <p className="description">{planDescriptions[plan.plan]}</p>
                  <div className="price">
                    <strong>{money(plan.monthlyFee)}</strong>
                    <span>
                      por mês
                      {plan.trialDays ? <small>{plan.trialDays} dias de teste</small> : null}
                    </span>
                  </div>
                  <S.Benefits>
                    <span>O que está incluído</span>
                    {planFeatures.map((benefit) => (
                      <li key={benefit}>
                        <i aria-hidden="true">
                          <Check />
                        </i>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </S.Benefits>
                  <S.ChoosePlanButton
                    $current={current}
                    type="button"
                    disabled={actionDisabled}
                    title={actionDisabled ? planChoice?.reason : undefined}
                    onClick={() => void changePlan(plan.plan)}
                  >
                    {changingPlan === plan.plan
                      ? 'Registrando escolha...'
                      : current && planChoice?.allowed
                        ? 'Continuar neste plano'
                        : current
                          ? 'Este é o seu plano'
                          : planChoice?.allowed
                            ? 'Escolher para o próximo ciclo'
                            : 'Escolha indisponível'}
                    {!current && planChoice?.allowed ? <ArrowRight aria-hidden="true" /> : null}
                  </S.ChoosePlanButton>
                </S.PlanCard>
              );
            })}
          </S.Plans>
          <S.PlanFootnote>
            <Info aria-hidden="true" />
            <span>
              A alteração não interrompe sua operação. Quando permitida, ela é programada para o
              próximo ciclo de cobrança.
            </span>
          </S.PlanFootnote>
        </S.ViewPanel>
      ) : (
        <S.ViewPanel role="tabpanel">
          <S.SectionHeader>
            <div>
              <span className="section-icon charges" aria-hidden="true">
                <WalletCards />
              </span>
              <span>
                <small>CONTROLE FINANCEIRO</small>
                <h2>Mensalidades e pagamentos</h2>
                <p>Veja primeiro o que exige ação e consulte o histórico quando precisar.</p>
              </span>
            </div>
            <S.InvoiceOverview aria-label="Resumo das mensalidades">
              <span>
                <small>Em aberto</small>
                <strong>{openInvoices.length}</strong>
              </span>
              <span>
                <small>Pagas</small>
                <strong>{paidInvoices.length}</strong>
              </span>
            </S.InvoiceOverview>
          </S.SectionHeader>

          <S.ChargeMetrics>
            <S.ChargeMetric $tone={getInvoiceTone(currentInvoice?.status)}>
              <span className="metric-icon" aria-hidden="true">
                <FileText />
              </span>
              <span>
                <small>Cobrança atual</small>
                <strong>
                  {currentInvoice ? money(currentInvoice.total) : 'Nenhuma pendência'}
                </strong>
                <em>
                  {currentInvoice
                    ? invoiceLabels[currentInvoice.status] || currentInvoice.status
                    : 'Tudo em dia'}
                </em>
              </span>
            </S.ChargeMetric>
            <S.ChargeMetric $tone="neutral">
              <span className="metric-icon" aria-hidden="true">
                <CalendarDays />
              </span>
              <span>
                <small>Vencimento</small>
                <strong>{date(billing?.dueDate || currentInvoice?.dueDate)}</strong>
                <em>{currentInvoice ? 'Data da mensalidade atual' : 'Sem cobrança em aberto'}</em>
              </span>
            </S.ChargeMetric>
            <S.ChargeMetric $tone={currentPixAvailable ? 'success' : 'neutral'}>
              <span className="metric-icon" aria-hidden="true">
                <QrCode />
              </span>
              <span>
                <small>Pagamento via Pix</small>
                <strong>{currentPixAvailable ? 'Disponível agora' : 'Ainda não liberado'}</strong>
                <em>
                  {currentInvoice
                    ? currentPixAvailable
                      ? 'Confirmação automática'
                      : `Liberação em ${date(billing?.pixAvailableAt)}`
                    : 'Nenhum pagamento necessário'}
                </em>
              </span>
            </S.ChargeMetric>
          </S.ChargeMetrics>

          <S.BillingCard>
            <S.BillingCardHeader>
              <div>
                <span className="label">
                  <CalendarClock aria-hidden="true" /> Ciclo da assinatura
                </span>
                <h2>{billing?.currentCycle || 1}º mês da sua assinatura</h2>
                <p>
                  {billing?.completedMonths || 0}{' '}
                  {(billing?.completedMonths || 0) === 1 ? 'mês completo' : 'meses completos'} até
                  agora.
                </p>
              </div>
              <div className="cycle" aria-label={`${billing?.currentCycle || 1}º ciclo atual`}>
                <small>CICLO ATUAL</small>
                <strong>{billing?.currentCycle || 1}º</strong>
                <span>mês</span>
              </div>
            </S.BillingCardHeader>

            <S.BillingTimeline aria-label="Datas do ciclo da assinatura">
              <div className="completed">
                <span className="step-icon">
                  <Check aria-hidden="true" />
                </span>
                <small>Restaurante criado</small>
                <strong>{date(billing?.restaurantCreatedAt)}</strong>
              </div>
              <div className="completed">
                <span className="step-icon">
                  <Check aria-hidden="true" />
                </span>
                <small>Admin vinculado</small>
                <strong>{date(billing?.adminCreatedAt)}</strong>
                {billing?.adminName ? <em>{billing.adminName}</em> : null}
              </div>
              <div className="current">
                <span className="step-icon">
                  <CalendarDays aria-hidden="true" />
                </span>
                <small>Vencimento</small>
                <strong>{date(billing?.dueDate || currentInvoice?.dueDate)}</strong>
              </div>
              <div className="grace">
                <span className="step-icon">
                  <ShieldCheck aria-hidden="true" />
                </span>
                <small>Prazo de segurança</small>
                <strong>{date(billing?.graceLimitDate)}</strong>
                <em>5 dias úteis</em>
              </div>
            </S.BillingTimeline>

            <S.BillingPayment $available={currentPixAvailable}>
              <span className="payment-icon" aria-hidden="true">
                <QrCode />
              </span>
              <div>
                <small>{currentPixAvailable ? 'PAGAMENTO DISPONÍVEL' : 'PRÓXIMA ETAPA'}</small>
                <h3>
                  {currentPixAvailable
                    ? `Pague ${currentInvoice ? money(currentInvoice.total) : 'a mensalidade'} via Pix`
                    : 'Pagamento mensal via Pix Mercado Pago'}
                </h3>
                <p>
                  {currentInvoice && currentPixAvailable
                    ? 'Gere o QR Code, pague pelo aplicativo do seu banco e aguarde a confirmação automática.'
                    : currentInvoice
                      ? `O QR Code será liberado em ${date(billing?.pixAvailableAt)}, próximo ao vencimento.`
                      : 'Não existe mensalidade pendente. Quando uma nova cobrança for gerada, ela aparecerá aqui.'}
                </p>
              </div>
              <button
                type="button"
                disabled={!currentPixAvailable || payingInvoice === currentInvoice?.id}
                onClick={() => currentInvoice && void payInvoice(currentInvoice)}
              >
                <QrCode aria-hidden="true" />
                {currentInvoice && payingInvoice === currentInvoice.id
                  ? 'Gerando QR Code...'
                  : currentPixAvailable
                    ? 'Gerar QR Code Pix'
                    : 'Pix ainda não disponível'}
              </button>
            </S.BillingPayment>
          </S.BillingCard>

          <S.HistorySection>
            <S.HistoryHeader>
              <div>
                <span className="history-icon" aria-hidden="true">
                  <FileText />
                </span>
                <span>
                  <h3>Histórico de mensalidades</h3>
                  <p>Comprovantes, vencimentos e situação de cada cobrança.</p>
                </span>
              </div>
              <strong>
                {invoices.length} {invoices.length === 1 ? 'mensalidade' : 'mensalidades'}
              </strong>
            </S.HistoryHeader>
            {invoices.length ? (
              <S.Invoices>
                {invoices.map((invoice) => {
                  const pixAvailable = invoicePixAvailable(invoice);
                  const tone = getInvoiceTone(invoice.status);
                  return (
                    <S.InvoiceRow key={invoice.id} $tone={tone}>
                      <span className="invoice-icon" aria-hidden="true">
                        {invoice.status === 'PAGO' ? <CheckCircle2 /> : <FileText />}
                      </span>
                      <div className="invoice-copy">
                        <h3>
                          Mensalidade {String(invoice.month).padStart(2, '0')}/{invoice.year}
                        </h3>
                        <p>
                          Vencimento em {date(invoice.dueDate)}
                          {invoice.paidAt ? ` • Pago em ${date(invoice.paidAt)}` : ''}
                        </p>
                      </div>
                      <strong className="invoice-value">{money(invoice.total)}</strong>
                      <S.InvoiceStatus $status={invoice.status}>
                        {invoiceLabels[invoice.status] || invoice.status}
                      </S.InvoiceStatus>
                      {invoice.status === 'PAGO' ? (
                        <S.PaidMark title="Mensalidade paga" aria-label="Mensalidade paga">
                          <CheckCircle2 aria-hidden="true" />
                        </S.PaidMark>
                      ) : payableStatuses.has(invoice.status) ? (
                        <button
                          type="button"
                          disabled={!pixAvailable || payingInvoice === invoice.id}
                          onClick={() => void payInvoice(invoice)}
                        >
                          {payingInvoice === invoice.id
                            ? 'Gerando Pix...'
                            : pixAvailable
                              ? 'Pagar com Pix'
                              : 'Pix em breve'}
                        </button>
                      ) : (
                        <S.InvoiceUnavailable>Indisponível</S.InvoiceUnavailable>
                      )}
                    </S.InvoiceRow>
                  );
                })}
              </S.Invoices>
            ) : (
              <S.Empty>
                <span aria-hidden="true">
                  <FileText />
                </span>
                <strong>Nenhuma mensalidade gerada</strong>
                <p>Assim que o primeiro ciclo for fechado, o histórico aparecerá aqui.</p>
              </S.Empty>
            )}
          </S.HistorySection>
        </S.ViewPanel>
      )}

      {pix ? (
        <S.PixBackdrop role="presentation" onMouseDown={() => setPix(null)}>
          <S.PixModal
            role="dialog"
            aria-modal="true"
            aria-labelledby="pix-payment-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              type="button"
              aria-label="Fechar"
              onClick={() => setPix(null)}
            >
              <X aria-hidden="true" />
            </button>
            <span className="brand">
              <QrCode aria-hidden="true" /> Pagamento seguro via Pix
            </span>
            <h2 id="pix-payment-title">Pague sua mensalidade</h2>
            <p>Escaneie o QR Code pelo aplicativo do seu banco ou copie o código Pix.</p>
            <div className="qr-frame">
              <img
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR Code Pix da mensalidade"
              />
            </div>
            <small className="amount-label">VALOR DA MENSALIDADE</small>
            <div className="amount">{money(pix.invoice.total)}</div>
            <button className="copy" type="button" onClick={() => void copyPix()}>
              {pixCopyState === 'copied' ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {pixCopyState === 'copied' ? 'Código copiado' : 'Copiar código Pix'}
            </button>
            {pixCopyState !== 'idle' ? (
              <span className={`copy-feedback ${pixCopyState}`} role="status">
                {pixCopyState === 'copied'
                  ? 'Pronto! Agora cole o código no aplicativo do seu banco.'
                  : 'Não foi possível copiar automaticamente. Tente novamente.'}
              </span>
            ) : null}
            <div className="expires">
              <Clock3 aria-hidden="true" />
              <span>Válido até {date(pix.expiresAt)}. A confirmação acontece automaticamente.</span>
            </div>
          </S.PixModal>
        </S.PixBackdrop>
      ) : null}
    </S.Shell>
  );
}
