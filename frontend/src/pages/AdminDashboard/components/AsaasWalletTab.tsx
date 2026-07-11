import * as S from "../styles";
import { Wallet, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

type AsaasWalletTabProps = {
  defaultPixKey: string;
  isMobileViewport: boolean;
  isExpanded: boolean;
  currentBalance: number | null;
  blockedBalance: number | null;
  pendingBalance: number | null;
  notice: {
    type: "success" | "error" | "info";
    message: string;
  } | null;
  onDismissNotice: () => void;
  withdrawAmount: string;
  withdrawPixKey: string;
  withdrawDescription: string;
  isLoadingBalance: boolean;
  isWithdrawing: boolean;
  lastTransfer: {
    transferId?: string;
    status?: string;
    value?: number;
    pixKey?: string;
    dateCreated?: string;
  } | null;
  onChangeField: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onToggleExpand: () => void;
  onRefreshBalance: () => void;
  onWithdraw: () => void;
};

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function AsaasWalletTab({
  defaultPixKey,
  isMobileViewport,
  isExpanded,
  currentBalance,
  blockedBalance,
  pendingBalance,
  notice,
  onDismissNotice,
  withdrawAmount,
  withdrawPixKey,
  withdrawDescription,
  isLoadingBalance,
  isWithdrawing,
  lastTransfer,
  onChangeField,
  onToggleExpand,
  onRefreshBalance,
  onWithdraw,
}: AsaasWalletTabProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: isMobileViewport ? "4.6rem" : "0.9rem",
        right: isMobileViewport
          ? "max(10px, env(safe-area-inset-right))"
          : "max(14px, env(safe-area-inset-right))",
        zIndex: 58,
        width: isMobileViewport ? "min(92vw, 350px)" : "min(360px, 42vw)",
        borderRadius: 14,
        border: "1px solid rgba(16, 185, 129, 0.4)",
        background:
          "linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.93) 100%)",
        color: "#e2e8f0",
        boxShadow: "0 18px 34px rgba(2, 6, 23, 0.36)",
        backdropFilter: "blur(7px)",
        padding: "0.65rem",
        display: "grid",
        gap: "0.58rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.55rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#ffffff",
            }}
          >
            <Wallet size={14} />
          </span>

          <div style={{ display: "grid", gap: "0.05rem" }}>
            <strong style={{ fontSize: "0.78rem", letterSpacing: "0.02em" }}>
              Carteira digital
            </strong>
            <small style={{ opacity: 0.86, fontSize: "0.74rem" }}>
              Saldo: {formatCurrency(currentBalance)}
            </small>
          </div>
        </div>

        <div style={{ display: "inline-flex", gap: "0.35rem" }}>
          <button
            type="button"
            onClick={onRefreshBalance}
            disabled={isLoadingBalance}
            title="Atualizar saldo"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid rgba(148, 163, 184, 0.45)",
              background: "rgba(148, 163, 184, 0.14)",
              color: "#e2e8f0",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isLoadingBalance ? "not-allowed" : "pointer",
              opacity: isLoadingBalance ? 0.72 : 1,
            }}
          >
            <RefreshCw size={14} />
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            title={isExpanded ? "Fechar carteira" : "Abrir carteira"}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid rgba(148, 163, 184, 0.45)",
              background: "rgba(148, 163, 184, 0.14)",
              color: "#e2e8f0",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          <div
            style={{
              border: "1px solid rgba(59, 130, 246, 0.35)",
              background: "rgba(59, 130, 246, 0.12)",
              borderRadius: 10,
              padding: "0.72rem",
              display: "grid",
              gap: "0.24rem",
            }}
          >
            <small>Saldo disponível: {formatCurrency(currentBalance)}</small>
            <small>Saldo bloqueado: {formatCurrency(blockedBalance)}</small>
            <small>Saldo pendente: {formatCurrency(pendingBalance)}</small>
          </div>

          {notice?.message ? (
            <div
              style={{
                border:
                  notice.type === "error"
                    ? "1px solid rgba(239, 68, 68, 0.55)"
                    : notice.type === "success"
                      ? "1px solid rgba(34, 197, 94, 0.55)"
                      : "1px solid rgba(251, 191, 36, 0.55)",
                background:
                  notice.type === "error"
                    ? "rgba(239, 68, 68, 0.12)"
                    : notice.type === "success"
                      ? "rgba(34, 197, 94, 0.12)"
                      : "rgba(251, 191, 36, 0.12)",
                borderRadius: 10,
                padding: "0.72rem",
                display: "grid",
                gap: "0.5rem",
              }}
            >
              <small
                style={{
                  lineHeight: 1.4,
                  color:
                    notice.type === "error"
                      ? "#fecaca"
                      : notice.type === "success"
                        ? "#bbf7d0"
                        : "#fde68a",
                }}
              >
                {notice.message}
              </small>

              <button
                type="button"
                onClick={onDismissNotice}
                style={{
                  justifySelf: "end",
                  minHeight: 28,
                  borderRadius: 7,
                  border: "1px solid rgba(148, 163, 184, 0.45)",
                  background: "rgba(15, 23, 42, 0.25)",
                  color: "#e2e8f0",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0 0.55rem",
                  cursor: "pointer",
                }}
              >
                Fechar aviso
              </button>
            </div>
          ) : null}

          <div
            style={{
              border: "1px solid rgba(16, 185, 129, 0.42)",
              background: "rgba(16, 185, 129, 0.1)",
              borderRadius: 10,
              padding: "0.72rem",
            }}
          >
            <strong style={{ fontSize: "0.82rem" }}>Saque rápido</strong>

            <S.FormGroup style={{ marginTop: "0.48rem" }}>
              <label>Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="asaasWalletWithdrawAmount"
                placeholder="Ex: 150.00"
                value={withdrawAmount}
                onChange={onChangeField}
              />
            </S.FormGroup>

            <S.FormGroup style={{ marginTop: "0.55rem" }}>
              <label>Chave Pix</label>
              <input
                type="text"
                name="asaasWalletWithdrawPixKey"
                placeholder="Pode ser e-mail, CPF ou celular (+55). Ex: financeiro@dominio.com"
                value={withdrawPixKey}
                onChange={onChangeField}
              />
              <small style={{ opacity: 0.85, marginTop: 4, display: "block" }}>
                Aceita e-mail, CPF ou celular com DDI (+55).
              </small>
            </S.FormGroup>

            <S.FormGroup style={{ marginTop: "0.55rem" }}>
              <label>Descrição (opcional)</label>
              <input
                type="text"
                name="asaasWalletWithdrawDescription"
                placeholder="Ex: Saque semanal"
                value={withdrawDescription}
                onChange={onChangeField}
              />
            </S.FormGroup>

            <button
              type="button"
              onClick={onWithdraw}
              disabled={isWithdrawing}
              style={{
                marginTop: "0.7rem",
                width: "100%",
                minHeight: 40,
                borderRadius: 9,
                border: "1px solid rgba(4, 120, 87, 0.55)",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                fontWeight: 800,
                cursor: isWithdrawing ? "not-allowed" : "pointer",
                opacity: isWithdrawing ? 0.72 : 1,
              }}
            >
              {isWithdrawing ? "Solicitando saque..." : "Sacar agora"}
            </button>
          </div>

          {lastTransfer ? (
            <div
              style={{
                border: "1px solid rgba(148, 163, 184, 0.38)",
                borderRadius: 10,
                padding: "0.62rem",
                display: "grid",
                gap: "0.28rem",
                background: "rgba(148, 163, 184, 0.1)",
              }}
            >
              <small style={{ fontWeight: 700 }}>Último saque</small>
              <small>Status: {lastTransfer.status || "--"}</small>
              <small>
                Valor: {formatCurrency(Number(lastTransfer.value || 0))}
              </small>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
