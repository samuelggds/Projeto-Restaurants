import { ThemeProvider } from "styled-components";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldAlert, Sparkles, CreditCard } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/authContext.js";
import api from "../../Services/api";
import {
  clearSystemBlockState,
  getSystemBlockState,
  setSystemBlockState,
} from "../../Services/systemBlock";
import * as S from "./styles";

const theme = {
  bgA: "#fff8e6",
  bgB: "#ffe1b3",
  card: "#1f1a16",
  text: "#fff8ef",
  muted: "#dccfbe",
  accent: "#ffb100",
  accentAlt: "#ff6f3c",
  border: "#3b322b",
};

export default function SystemBlockedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const blockState = getSystemBlockState();

  const isAdmin = useMemo(() => {
    const role = user?.role || "";
    return role === "ADMIN" || role === "SUPER_ADMIN";
  }, [user]);

  const handleGoToBilling = () => {
    navigate("/billing");
  };

  const isValidPaymentLink = (link) => {
    if (typeof link !== "string") {
      return false;
    }

    return link.includes("mercadopago.com") && link.includes("pref_id=");
  };

  const resolvePaymentLink = async () => {
    const response = await api.get("/billing/invoices");
    const payableInvoice = response.data.find(
      (invoice) =>
        ["ATRASADO", "PENDENTE", "VENCIDO"].includes(invoice.status) &&
        isValidPaymentLink(invoice.paymentLink),
    );

    if (payableInvoice?.paymentLink) {
      setSystemBlockState({
        message: "Sistema bloqueado por inadimplência",
        paymentLink: payableInvoice.paymentLink,
        invoiceId: payableInvoice.id,
        dueDate: payableInvoice.dueDate,
      });

      return payableInvoice.paymentLink;
    }

    const payableWithoutLink = response.data.find((invoice) =>
      ["ATRASADO", "PENDENTE", "VENCIDO"].includes(invoice.status),
    );

    if (!payableWithoutLink?.id) {
      return null;
    }

    const regenerated = await api.post(
      `/billing/invoices/${payableWithoutLink.id}/regenerate-link`,
    );

    const newLink = regenerated?.data?.paymentLink;

    if (!isValidPaymentLink(newLink)) {
      return null;
    }

    setSystemBlockState({
      message: "Sistema bloqueado por inadimplência",
      paymentLink: newLink,
      invoiceId: payableWithoutLink.id,
      dueDate: payableWithoutLink.dueDate,
    });

    return newLink;
  };

  const handlePayNow = async () => {
    const paymentWindow = window.open("", "_blank", "noopener,noreferrer");
    const openInSameTab = (url) => {
      window.location.href = url;
    };

    if (!paymentWindow) {
      if (isValidPaymentLink(blockState?.paymentLink)) {
        openInSameTab(blockState.paymentLink);
        return;
      }
    }

    if (isValidPaymentLink(blockState?.paymentLink)) {
      if (paymentWindow) {
        paymentWindow.location.href = blockState.paymentLink;
      } else {
        openInSameTab(blockState.paymentLink);
      }
      return;
    }

    try {
      setIsResolvingLink(true);
      const link = await resolvePaymentLink();

      if (!link) {
        if (paymentWindow) {
          paymentWindow.close();
        }
        toast.error("Link de pagamento ainda não disponível");
        return;
      }

      if (paymentWindow) {
        paymentWindow.location.href = link;
      } else {
        openInSameTab(link);
      }
    } catch {
      if (paymentWindow) {
        paymentWindow.close();
      }
      toast.error("Não foi possível obter o link de pagamento agora");
    } finally {
      setIsResolvingLink(false);
    }
  };

  const handleRetestAccess = async () => {
    try {
      const response = await api.get("/billing/invoices");
      const hasOverdue = response.data.some(
        (invoice) => invoice.status === "ATRASADO",
      );

      if (hasOverdue) {
        toast.warn(
          "Ainda existe fatura vencida em atraso. Finalize o pagamento para liberar o sistema.",
        );
        return;
      }

      clearSystemBlockState();
      toast.success(
        "Pagamento confirmado. Sistema liberado para o restaurante.",
      );
      navigate("/admin");
    } catch {
      toast.error(
        "Não foi possível validar a liberação agora. Tente novamente em instantes.",
      );
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <S.Page>
        <S.BlobTop />
        <S.BlobBottom />

        <S.Card>
          <S.Badge>
            <ShieldAlert size={16} />
            Controle de cobrança
          </S.Badge>

          <S.IconWrap>
            {isAdmin ? <AlertTriangle size={36} /> : <Sparkles size={36} />}
          </S.IconWrap>

          {isAdmin ? (
            <>
              <S.Title>Sistema temporariamente bloqueado</S.Title>
              <S.Description>
                Identificamos pendência de mensalidade. Para proteger a
                operação, as ações administrativas foram pausadas até a
                confirmação do pagamento.
              </S.Description>

              <S.InfoBox>
                {blockState?.message ||
                  "Restaurante bloqueado por inadimplência."}
              </S.InfoBox>

              <S.Actions>
                <S.PrimaryButton onClick={handlePayNow}>
                  <CreditCard size={18} />
                  {isResolvingLink ? "Buscando link..." : "Pagar agora"}
                </S.PrimaryButton>

                <S.SecondaryButton onClick={handleGoToBilling}>
                  Ver faturas
                </S.SecondaryButton>

                <S.GhostButton onClick={handleRetestAccess}>
                  Já paguei, testar liberação
                </S.GhostButton>
              </S.Actions>
            </>
          ) : (
            <>
              <S.Title>Estamos ajustando o atendimento</S.Title>
              <S.Description>
                O cardápio está temporariamente indisponível enquanto o
                restaurante finaliza uma atualização administrativa. Voltamos em
                breve com tudo normal.
              </S.Description>
              <S.InfoBox>
                Obrigado pela compreensão. Tente novamente em alguns minutos.
              </S.InfoBox>
              <S.Actions>
                <S.SecondaryButton onClick={() => window.location.reload()}>
                  Tentar novamente
                </S.SecondaryButton>
              </S.Actions>
            </>
          )}
        </S.Card>
      </S.Page>
    </ThemeProvider>
  );
}
