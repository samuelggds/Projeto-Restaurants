import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  Layers3,
  QrCode,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'react-toastify';
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
  BASICO: 'Para restaurantes que trabalham somente com pedidos por delivery.',
  PREMIUM: 'A experiência completa para delivery e atendimento nas mesas por QR Code.',
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
  CANCELADO: 'Cancelado',
};

const money = (value: number | string) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
const date = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '--';
const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { error?: string } } }).response?.data?.error;

type MonthlyBillingProps = {
  restricted?: boolean;
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
      toast.error(errorMessage(error) || 'Não foi possível carregar as mensalidades.');
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
          toast.success('Pagamento confirmado. A escolha do plano foi liberada.');
          await load();
        }
      } catch {
        // A próxima consulta tenta novamente sem interromper o pagamento.
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [load, pix]);

  const changePlan = async (plan: PlanCode) => {
    setChangingPlan(plan);
    try {
      const result = await monthlyBillingService.requestPlanChange(plan);
      toast.success(result.message || 'Troca de plano agendada.');
      await load();
    } catch (error) {
      toast.error(errorMessage(error) || 'Não foi possível alterar o plano.');
    } finally {
      setChangingPlan(null);
    }
  };

  const payInvoice = async (invoice: Invoice) => {
    setPayingInvoice(invoice.id);
    try {
      const result = await monthlyBillingService.generatePix(invoice.id);
      setPix({
        invoice,
        qrCode: result.pixQrCode,
        qrCodeBase64: result.pixQrCodeBase64,
        expiresAt: result.pixExpiresAt,
      });
    } catch (error) {
      toast.error(
        errorMessage(error) ||
          (error instanceof Error ? error.message : 'Não foi possível gerar o Pix.'),
      );
    } finally {
      setPayingInvoice(null);
    }
  };

  const copyPix = async () => {
    if (!pix?.qrCode) return;
    await navigator.clipboard.writeText(pix.qrCode);
    toast.success('Código Pix copiado.');
  };

  if (loading) return <S.Loading>Carregando planos e mensalidades...</S.Loading>;

  const active = subscription?.status === 'ATIVA' || subscription?.status === 'TESTE';
  const displayedPlans = plans.length ? plans : fallbackPlans;
  const currentPlan = displayedPlans.find((plan) => plan.plan === subscription?.plan);
  const scheduledPlan = displayedPlans.find((plan) => plan.plan === subscription?.scheduledPlan);
  const planChoice = subscription?.planChangeEligibility;
  const payableStatuses = new Set(['PENDENTE', 'ATRASADO', 'VENCIDO']);
  const currentInvoice =
    invoices.find((invoice) => invoice.id === billing?.currentInvoiceId) ||
    invoices.find((invoice) => payableStatuses.has(invoice.status));
  const currentPixAvailable = Boolean(currentInvoice && billing?.pixAvailable);

  const invoicePixAvailable = (invoice: Invoice) => {
    if (invoice.status === 'ATRASADO') return true;
    if (invoice.id === currentInvoice?.id) return currentPixAvailable;

    const availableAt = new Date(invoice.dueDate);
    availableAt.setDate(availableAt.getDate() - 5);
    return new Date() >= availableAt;
  };

  return (
    <S.Shell>
      <S.Summary>
        <div>
          <small>SEU PLANO ATUAL</small>
          <h2>{currentPlan?.name || subscription?.plan || 'Sem plano'}</h2>
          <p>
            {currentPlan
              ? `${money(currentPlan.monthlyFee)} por mês`
              : 'Escolha o plano ideal para o restaurante.'}
          </p>
        </div>
        <S.Status $active={active}>
          {statusLabels[subscription?.status || ''] || subscription?.status || 'Não configurada'}
        </S.Status>
      </S.Summary>

      {subscription?.status === 'TESTE' && subscription.trialEndsAt ? (
        <S.Notice>
          Seu período de teste termina em <strong>{date(subscription.trialEndsAt)}</strong>.
        </S.Notice>
      ) : null}
      {scheduledPlan ? (
        <S.Notice>
          A troca para <strong>{scheduledPlan.name}</strong> está agendada para{' '}
          {String(subscription?.scheduledPlanEffectiveMonth).padStart(2, '0')}/
          {subscription?.scheduledPlanEffectiveYear}.
        </S.Notice>
      ) : null}

      <S.ViewTabs aria-label="Seções de cobrança e assinatura">
        {!restricted ? (
          <button className={view === 'plans' ? 'active' : ''} onClick={() => setView('plans')}>
            <Layers3 size={17} /> Assinatura e planos
          </button>
        ) : null}
        <button className={view === 'charges' ? 'active' : ''} onClick={() => setView('charges')}>
          <CreditCard size={17} /> Cobranças
        </button>
      </S.ViewTabs>

      {!restricted && view === 'plans' ? (
        <>
          <S.SectionTitle>
            <h2>Planos disponíveis</h2>
            <p>
              {planChoice?.reason || 'A escolha é liberada depois que uma fatura vencida for paga.'}
            </p>
          </S.SectionTitle>
          <S.Plans>
            {displayedPlans.map((plan) => {
              const Icon = planIcons[plan.plan];
              const current = subscription?.plan === plan.plan;
              return (
                <S.PlanCard key={plan.plan} $featured={plan.plan === 'PREMIUM'} $current={current}>
                  {current ? <S.CurrentTag>Plano atual</S.CurrentTag> : null}
                  {plan.plan === 'PREMIUM' && !current ? (
                    <S.RecommendedTag>Recomendado</S.RecommendedTag>
                  ) : null}
                  <S.PlanHeading>
                    <span>
                      <Icon size={22} />
                    </span>
                    <div>
                      <small>PLANO</small>
                      <h3>{plan.name}</h3>
                    </div>
                  </S.PlanHeading>
                  <p className="description">{planDescriptions[plan.plan]}</p>
                  <div className="price">
                    {money(plan.monthlyFee)} <small>por mês</small>
                  </div>
                  <S.Benefits>
                    {(plan.features?.length ? plan.features : benefits[plan.plan]).map(
                      (benefit) => (
                        <li key={benefit}>
                          <CheckCircle2 size={16} /> <span>{benefit}</span>
                        </li>
                      ),
                    )}
                  </S.Benefits>
                  <S.ChoosePlanButton
                    $current={current}
                    disabled={
                      !planChoice?.allowed ||
                      Boolean(changingPlan) ||
                      Boolean(subscription?.scheduledPlan)
                    }
                    onClick={() => void changePlan(plan.plan)}
                  >
                    {changingPlan === plan.plan
                      ? 'Registrando escolha...'
                      : current && planChoice?.allowed
                        ? 'Continuar neste plano'
                        : current
                          ? 'Plano atual'
                          : planChoice?.allowed
                            ? 'Escolher para o próximo ciclo'
                            : 'Escolha bloqueada'}
                  </S.ChoosePlanButton>
                </S.PlanCard>
              );
            })}
          </S.Plans>
        </>
      ) : (
        <>
          <S.SectionTitle>
            <h2>Mensalidades</h2>
            <p>Acompanhe vencimentos, pagamentos e mensalidades pendentes.</p>
          </S.SectionTitle>
          <S.BillingCard>
            <S.BillingCardHeader>
              <div>
                <span className="label">
                  <CalendarClock size={16} /> Ciclo da assinatura
                </span>
                <h2>{billing?.completedMonths || 0} meses completos</h2>
                <p>Contagem iniciada quando o restaurante e seu primeiro Admin foram vinculados.</p>
              </div>
              <div className="cycle">
                <small>CICLO ATUAL</small>
                <strong>{billing?.currentCycle || 1}º mês</strong>
              </div>
            </S.BillingCardHeader>
            <S.BillingDates>
              <div>
                <span>Restaurante criado em</span>
                <strong>{date(billing?.restaurantCreatedAt)}</strong>
              </div>
              <div>
                <span>Admin vinculado em</span>
                <strong>
                  {date(billing?.adminCreatedAt)}
                  {billing?.adminName ? ` • ${billing.adminName}` : ''}
                </strong>
              </div>
              <div>
                <span>Vencimento da mensalidade</span>
                <strong>{date(billing?.dueDate || currentInvoice?.dueDate)}</strong>
              </div>
              <div className="grace">
                <span>Limite com 5 dias úteis</span>
                <strong>{date(billing?.graceLimitDate)}</strong>
              </div>
            </S.BillingDates>
            <S.BillingPayment>
              <div>
                <h3>Pagamento mensal via Pix Mercado Pago</h3>
                <p>
                  {currentInvoice && currentPixAvailable
                    ? `Mensalidade atual: ${money(currentInvoice.total)}. O valor é recebido pela conta Mercado Pago do dono da plataforma e a confirmação é automática.`
                    : currentInvoice
                      ? `O QR Code será liberado em ${date(billing?.pixAvailableAt)}, próximo ao vencimento da mensalidade.`
                      : 'Não existe mensalidade pendente para gerar o QR Code neste momento.'}
                </p>
              </div>
              <button
                disabled={!currentPixAvailable || payingInvoice === currentInvoice?.id}
                onClick={() => currentInvoice && void payInvoice(currentInvoice)}
              >
                <QrCode size={18} />
                {currentInvoice && payingInvoice === currentInvoice.id
                  ? 'Gerando QR Code...'
                  : 'Gerar QR Code Pix'}
              </button>
            </S.BillingPayment>
          </S.BillingCard>
          {invoices.length ? (
            <S.Invoices>
              {invoices.map((invoice) => (
                <S.InvoiceRow key={invoice.id}>
                  <div>
                    <h3>
                      Mensalidade {String(invoice.month).padStart(2, '0')}/{invoice.year}
                    </h3>
                    <p>
                      Vencimento em {date(invoice.dueDate)}
                      {invoice.paidAt ? ` • Pago em ${date(invoice.paidAt)}` : ''}
                    </p>
                  </div>
                  <strong>{money(invoice.total)}</strong>
                  <S.InvoiceStatus $status={invoice.status}>
                    {invoiceLabels[invoice.status] || invoice.status}
                  </S.InvoiceStatus>
                  {invoice.status === 'PAGO' ? (
                    <S.PaidMark title="Mensalidade paga">
                      <CheckCircle2 size={22} />
                    </S.PaidMark>
                  ) : payableStatuses.has(invoice.status) ? (
                    <button
                      disabled={!invoicePixAvailable(invoice) || payingInvoice === invoice.id}
                      onClick={() => void payInvoice(invoice)}
                    >
                      {payingInvoice === invoice.id
                        ? 'Gerando Pix...'
                        : invoicePixAvailable(invoice)
                          ? 'Pagar com Pix'
                          : 'Pix ainda não disponível'}
                    </button>
                  ) : (
                    <S.InvoiceUnavailable>Pagamento indisponível</S.InvoiceUnavailable>
                  )}
                </S.InvoiceRow>
              ))}
            </S.Invoices>
          ) : (
            <S.Empty>Nenhuma mensalidade foi gerada para este restaurante ainda.</S.Empty>
          )}
        </>
      )}

      {pix ? (
        <S.PixBackdrop role="presentation" onMouseDown={() => setPix(null)}>
          <S.PixModal
            role="dialog"
            aria-modal="true"
            aria-label="Pagamento Pix Mercado Pago"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="close" aria-label="Fechar" onClick={() => setPix(null)}>
              ×
            </button>
            <span className="brand">
              <QrCode size={17} /> Pix Mercado Pago
            </span>
            <h2>Pague sua mensalidade</h2>
            <p>Escaneie o QR Code pelo aplicativo do seu banco ou copie o código Pix.</p>
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code Pix da mensalidade"
            />
            <div className="amount">{money(pix.invoice.total)}</div>
            <button className="copy" onClick={() => void copyPix()}>
              <Copy size={17} /> Copiar código Pix
            </button>
            <div className="expires">
              Válido até {date(pix.expiresAt)}. A confirmação acontece automaticamente.
            </div>
          </S.PixModal>
        </S.PixBackdrop>
      ) : null}
    </S.Shell>
  );
}
