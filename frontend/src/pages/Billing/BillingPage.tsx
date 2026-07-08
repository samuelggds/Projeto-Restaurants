import { useState, useEffect, useCallback } from "react";
import { ThemeProvider } from "styled-components";
import { useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  DollarSign,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Gem,
} from "lucide-react";
import { toast } from "react-toastify";
import * as S from "./styles";
import api from "../../Services/api";
import { useAuth } from "../../contexts/authContext.js";
import {
  clearSystemBlockState,
  setSystemBlockState,
} from "../../Services/systemBlock";

const darkTheme = {
  background: "#0a0a0a",
  surface: "#1a1a1a",
  surfaceHover: "#242424",
  text: "#ffffff",
  textMuted: "#b0b0b0",
  primary: "#eab308",
  primaryHover: "#d99e0b",
  border: "#333333",
  danger: "#ef4444",
  success: "#10b981",
};

const lightTheme = {
  background: "#ffffff",
  surface: "#f9f9f9",
  surfaceHover: "#f0f0f0",
  text: "#0a0a0a",
  textMuted: "#666666",
  primary: "#dba206",
  primaryHover: "#b88906",
  border: "#e5e5e5",
  danger: "#ef4444",
  success: "#10b981",
};

export default function BillingPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  const PLAN_DISPLAY = {
    BASICO: "Basico",
    PROFISSIONAL: "Profissional",
    PREMIUM: "Premium",
  };

  const PLAN_PRICES = {
    BASICO: "R$ 100,00 / mes",
    PROFISSIONAL: "R$ 200,00 / mes",
    PREMIUM: "R$ 300,00 / mes",
  };

  const PLAN_BENEFITS = {
    PROFISSIONAL: [
      "Mais controle financeiro com alertas inteligentes",
      "Prioridade media no suporte",
      "Taxa de split reduzida para 3%",
      "Relatorios de desempenho mensal para acelerar decisoes",
    ],
    PREMIUM: [
      "Tudo do Profissional",
      "Suporte prioritario dedicado",
      "Taxa de split reduzida para 2%",
      "Insights avancados de vendas e recompra",
      "Novas funcionalidades premium liberadas primeiro",
    ],
  };

  const isValidPaymentLink = (link) => {
    if (typeof link !== "string") {
      return false;
    }

    return link.includes("mercadopago.com") && link.includes("pref_id=");
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/billing/invoices");
      setInvoices(response.data);

      const overdueInvoices = response.data.filter(
        (invoice) => invoice.status === "ATRASADO",
      );

      const overdueInvoice =
        overdueInvoices.find((invoice) => Boolean(invoice.paymentLink)) ||
        overdueInvoices[0] ||
        null;

      if (overdueInvoice) {
        setSystemBlockState({
          message: "Sistema bloqueado por inadimplência",
          paymentLink: overdueInvoice.paymentLink || null,
          invoiceId: overdueInvoice.id,
          dueDate: overdueInvoice.dueDate,
        });
      } else {
        clearSystemBlockState();
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      console.error("Error details:", err.response?.status, err.response?.data);

      if (err.response?.status === 401) {
        toast.error("Sessão expirada. Faça login novamente");
        navigate("/login");
      } else {
        setError(err.response?.data?.error || "Erro ao carregar faturas");
        toast.error("Erro ao carregar faturas");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await api.get("/subscription");
      setSubscription(response.data);
    } catch {
      setSubscription(null);
    }
  }, []);

  useEffect(() => {
    // Wait for context to load
    if (isLoading) {
      console.log("BillingPage: Waiting for context to load...");
      return undefined;
    }

    console.log("BillingPage: Context loaded");
    console.log("BillingPage: User from context:", user);

    // Check if user is authenticated
    const token = localStorage.getItem("token");
    console.log("BillingPage: Token from localStorage:", !!token);

    if (!token) {
      console.log("BillingPage: No token found, redirecting to login");
      toast.error("Você precisa estar autenticado para acessar esta página");
      navigate("/login");
      return undefined;
    }

    console.log("BillingPage: Authentication OK, fetching invoices");
    const timeoutId = setTimeout(() => {
      fetchInvoices();
      fetchSubscription();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user, isLoading, navigate, fetchInvoices, fetchSubscription]);

  const getScheduledPlanLabel = () => {
    if (
      !subscription?.scheduledPlan ||
      !subscription?.scheduledPlanEffectiveMonth ||
      !subscription?.scheduledPlanEffectiveYear
    ) {
      return null;
    }

    const month = String(subscription.scheduledPlanEffectiveMonth).padStart(
      2,
      "0",
    );

    return `${PLAN_DISPLAY[subscription.scheduledPlan] || subscription.scheduledPlan} (${month}/${subscription.scheduledPlanEffectiveYear})`;
  };

  const normalizedInvoiceStatus = (status) =>
    String(status || "")
      .trim()
      .toUpperCase();

  const hasOpenInvoices = invoices.some((invoice) =>
    ["PENDENTE", "ATRASADO", "VENCIDO"].includes(
      normalizedInvoiceStatus(invoice.status),
    ),
  );
  const latestPaidInvoice = [...invoices]
    .filter((invoice) => normalizedInvoiceStatus(invoice.status) === "PAGO")
    .sort(
      (a, b) =>
        new Date(b.paidAt || b.createdAt).getTime() -
        new Date(a.paidAt || a.createdAt).getTime(),
    )[0];
  const now = new Date();
  const latestPaidReferenceDate = latestPaidInvoice
    ? new Date(latestPaidInvoice.paidAt || latestPaidInvoice.createdAt)
    : null;
  const latestPaidDeadline = latestPaidReferenceDate
    ? new Date(latestPaidReferenceDate)
    : null;

  if (latestPaidDeadline) {
    latestPaidDeadline.setDate(latestPaidDeadline.getDate() + 30);
  }

  const isInsideThirtyDayWindow =
    Boolean(latestPaidDeadline) && now <= latestPaidDeadline;
  const isPlanChangeAllowedByInvoice =
    Boolean(latestPaidInvoice) && !hasOpenInvoices && isInsideThirtyDayWindow;
  const planChangeBlockReason = !latestPaidInvoice
    ? "Pague a ultima fatura para liberar a troca de plano."
    : hasOpenInvoices
      ? "Existe fatura pendente/atrasada. Regularize para liberar a troca de plano."
      : !isInsideThirtyDayWindow
        ? `O prazo de 30 dias apos o pagamento expirou em ${formatDate(latestPaidDeadline)}.`
        : null;

  const handleRequestPlanChange = async (plan) => {
    if (!subscription) {
      return;
    }

    if (subscription.plan === plan) {
      toast.info("Esse ja e o seu plano atual.");
      return;
    }

    setIsChangingPlan(true);

    try {
      const response = await api.post("/subscription/change-plan", { plan });
      toast.success(
        response?.data?.message ||
          "Troca de plano agendada para o proximo ciclo.",
      );
      await fetchSubscription();
    } catch (err) {
      toast.error(
        err?.response?.data?.error || "Nao foi possivel solicitar a troca.",
      );
    } finally {
      setIsChangingPlan(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDENTE: "Pendente",
      PAGO: "Pago",
      VENCIDO: "Vencido",
      ATRASADO: "Vencido",
    };
    return labels[status] || status;
  };

  const isPayableStatus = (status) =>
    ["PENDENTE", "ATRASADO", "VENCIDO"].includes(status);

  const handlePaymentClick = async (invoice) => {
    const paymentWindow = window.open("", "_blank", "noopener,noreferrer");
    const openInSameTab = (url) => {
      window.location.href = url;
    };

    if (!paymentWindow) {
      if (isValidPaymentLink(invoice.paymentLink)) {
        openInSameTab(invoice.paymentLink);
        return;
      }
    }

    try {
      if (isValidPaymentLink(invoice.paymentLink)) {
        if (paymentWindow) {
          paymentWindow.location.href = invoice.paymentLink;
        } else {
          openInSameTab(invoice.paymentLink);
        }
        return;
      }

      const response = await api.post(
        `/billing/invoices/${invoice.id}/regenerate-link`,
      );

      const newLink = response?.data?.paymentLink;

      if (!isValidPaymentLink(newLink)) {
        if (paymentWindow) {
          paymentWindow.close();
        }
        toast.error("Não foi possível gerar um link de pagamento válido");
        return;
      }

      setInvoices((prev) =>
        prev.map((item) =>
          item.id === invoice.id ? { ...item, paymentLink: newLink } : item,
        ),
      );

      if (paymentWindow) {
        paymentWindow.location.href = newLink;
      } else {
        openInSameTab(newLink);
      }
    } catch {
      if (paymentWindow) {
        paymentWindow.close();
      }
      toast.error("Erro ao gerar link de pagamento");
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  };

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <S.AdminLayout>
        {/* NAVBAR */}
        <S.Navbar>
          <S.Brand>
            <DollarSign size={28} />
            <span>Faturas e Pagamentos</span>
          </S.Brand>
          <S.ThemeToggleButton onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </S.ThemeToggleButton>
        </S.Navbar>

        {/* MAIN CONTENT */}
        <S.MainContent>
          {isLoading ? (
            <S.LoadingContainer>
              <p>Carregando seu contexto de autenticação...</p>
            </S.LoadingContainer>
          ) : (
            <>
              <h1>Gerenciamento de Faturas</h1>
              <p style={{ marginBottom: "2rem", color: "#999" }}>
                Visualize e gerencie todas as suas faturas e efetue pagamentos
              </p>

              <S.PlanSection>
                <S.PlanHeader>
                  <div>
                    <h2>Troca de Plano</h2>
                    <p>
                      Escolha o plano ideal para o momento do seu restaurante. A
                      troca entra no proximo ciclo de faturamento e segue as
                      regras de adimplencia e prazo.
                    </p>
                  </div>
                  <S.PlanTag>
                    Plano atual: {PLAN_DISPLAY[subscription?.plan] || "-"}
                  </S.PlanTag>
                </S.PlanHeader>

                {getScheduledPlanLabel() ? (
                  <S.PlanInfo>
                    Troca agendada para: {getScheduledPlanLabel()}
                  </S.PlanInfo>
                ) : null}

                {!getScheduledPlanLabel() && planChangeBlockReason ? (
                  <S.PlanInfo
                    style={{
                      border: "1px solid rgba(220, 38, 38, 0.35)",
                      background: "rgba(239, 68, 68, 0.1)",
                    }}
                  >
                    {planChangeBlockReason}
                  </S.PlanInfo>
                ) : null}

                <S.PlanGrid>
                  <S.PlanCard $highlighted={false} $tone="basic">
                    <S.PlanTitle>
                      <Gem size={18} /> Basico
                    </S.PlanTitle>
                    <S.PlanPrice>{PLAN_PRICES.BASICO}</S.PlanPrice>
                    <S.PlanMutedText>
                      Este plano nao possui vantagens extras.
                    </S.PlanMutedText>
                    <S.PlanActionButton
                      $tone="basic"
                      disabled={
                        isChangingPlan ||
                        Boolean(getScheduledPlanLabel()) ||
                        !isPlanChangeAllowedByInvoice ||
                        subscription?.plan === "BASICO"
                      }
                      onClick={() => handleRequestPlanChange("BASICO")}
                    >
                      Solicitar Basico
                    </S.PlanActionButton>
                  </S.PlanCard>

                  <S.PlanCard $highlighted={false} $tone="pro">
                    <S.PlanTitle>
                      <Gem size={18} /> Profissional
                    </S.PlanTitle>
                    <S.PlanPrice>{PLAN_PRICES.PROFISSIONAL}</S.PlanPrice>
                    <S.PlanList>
                      {PLAN_BENEFITS.PROFISSIONAL.map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </S.PlanList>
                    <S.PlanActionButton
                      $tone="pro"
                      disabled={
                        isChangingPlan ||
                        Boolean(getScheduledPlanLabel()) ||
                        !isPlanChangeAllowedByInvoice ||
                        subscription?.plan === "PROFISSIONAL"
                      }
                      onClick={() => handleRequestPlanChange("PROFISSIONAL")}
                    >
                      Solicitar Profissional
                    </S.PlanActionButton>
                  </S.PlanCard>

                  <S.PlanCard $highlighted $tone="premium">
                    <S.PlanTitle>
                      <Gem size={18} /> Premium
                    </S.PlanTitle>
                    <S.PlanPrice>{PLAN_PRICES.PREMIUM}</S.PlanPrice>
                    <S.PlanList>
                      {PLAN_BENEFITS.PREMIUM.map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </S.PlanList>
                    <S.PlanActionButton
                      $tone="premium"
                      disabled={
                        isChangingPlan ||
                        Boolean(getScheduledPlanLabel()) ||
                        !isPlanChangeAllowedByInvoice ||
                        subscription?.plan === "PREMIUM"
                      }
                      onClick={() => handleRequestPlanChange("PREMIUM")}
                    >
                      Solicitar Premium
                    </S.PlanActionButton>
                  </S.PlanCard>
                </S.PlanGrid>
              </S.PlanSection>

              {loading ? (
                <S.LoadingContainer>
                  <p>Carregando faturas...</p>
                </S.LoadingContainer>
              ) : error ? (
                <S.ErrorContainer>
                  <AlertCircle size={24} style={{ marginRight: "1rem" }} />
                  <div>
                    <h3>Erro ao carregar faturas</h3>
                    <p>{error}</p>
                  </div>
                </S.ErrorContainer>
              ) : invoices.length === 0 ? (
                <S.EmptyContainer>
                  <p>Nenhuma fatura encontrada</p>
                </S.EmptyContainer>
              ) : (
                <S.InvoicesGrid>
                  {invoices.map((invoice) => (
                    <S.InvoiceCard key={invoice.id}>
                      <S.InvoiceHeader>
                        <div>
                          <S.InvoiceTitle>
                            Fatura {invoice.month}/{invoice.year}
                          </S.InvoiceTitle>
                          <S.InvoiceDate>
                            Vencimento: {formatDate(invoice.dueDate)}
                          </S.InvoiceDate>
                        </div>
                        <S.StatusBadge status={invoice.status}>
                          {invoice.status === "PAGO" && (
                            <CheckCircle2 size={16} />
                          )}
                          {invoice.status === "PENDENTE" && <Clock size={16} />}
                          {invoice.status === "VENCIDO" && (
                            <AlertCircle size={16} />
                          )}
                          {getStatusLabel(invoice.status)}
                        </S.StatusBadge>
                      </S.InvoiceHeader>

                      <S.InvoiceDetails>
                        <S.DetailRow>
                          <span>Taxa Mensal:</span>
                          <strong>{formatCurrency(invoice.monthlyFee)}</strong>
                        </S.DetailRow>
                        <S.DetailRow>
                          <span>Taxa de Sistema:</span>
                          <strong>{formatCurrency(invoice.systemFees)}</strong>
                        </S.DetailRow>
                        <S.DetailRowTotal>
                          <span>Total:</span>
                          <strong>{formatCurrency(invoice.total)}</strong>
                        </S.DetailRowTotal>
                      </S.InvoiceDetails>

                      {invoice.paidAt && (
                        <S.PaidInfo>
                          Pago em: {formatDate(invoice.paidAt)}
                        </S.PaidInfo>
                      )}

                      {console.log(`Invoice ${invoice.id}:`, {
                        status: invoice.status,
                        hasPaymentLink: !!invoice.paymentLink,
                        paymentLink: invoice.paymentLink,
                      })}

                      {isPayableStatus(invoice.status) ? (
                        <S.PaymentButton
                          onClick={() => handlePaymentClick(invoice)}
                        >
                          <ExternalLink size={18} />
                          {isValidPaymentLink(invoice.paymentLink)
                            ? "Pagar com Mercado Pago"
                            : "Gerar link e pagar"}
                        </S.PaymentButton>
                      ) : invoice.status === "PAGO" ? (
                        <S.PaidButton>
                          <CheckCircle2 size={18} />
                          Fatura Paga
                        </S.PaidButton>
                      ) : (
                        <S.DisabledButton>
                          <AlertCircle size={18} />
                          {invoice.paymentLink
                            ? "Preparando link..."
                            : "Link indisponível"}
                        </S.DisabledButton>
                      )}
                    </S.InvoiceCard>
                  ))}
                </S.InvoicesGrid>
              )}
            </>
          )}
        </S.MainContent>
      </S.AdminLayout>
    </ThemeProvider>
  );
}
