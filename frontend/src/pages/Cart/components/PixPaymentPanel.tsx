import { Copy } from "lucide-react";
import QRCode from "react-qr-code";
import * as S from "../styles";

type PixPaymentData = {
  orderId: number | null;
  total: number;
  paymentId?: string;
  provider: string;
  pixCode: string;
  qrCodeBase64: string | null;
  requiresStatusCheck?: boolean;
};

type PixPaymentPanelProps = {
  pixPaymentData: PixPaymentData;
  formatCurrency: (value: number) => string;
  onCopyPixKey: () => void;
  onBackToCart?: () => void;
};

export default function PixPaymentPanel({
  pixPaymentData,
  formatCurrency,
  onCopyPixKey,
  onBackToCart,
}: PixPaymentPanelProps) {
  return (
    <div
      style={{
        maxWidth: 560,
        margin: "2rem auto",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        borderRadius: 20,
        padding: "1.5rem",
        background:
          "linear-gradient(140deg, rgba(255,255,255,0.98), rgba(241,245,249,0.98))",
        color: "#0f172a",
        boxShadow: "0 22px 44px rgba(15, 23, 42, 0.12)",
        display: "grid",
        gap: "1rem",
      }}
    >
      <h2 style={{ margin: 0 }}>Pagamento PIX pendente</h2>
      <div
        style={{
          border: "1px solid #f59e0b66",
          background: "#fffbeb",
          color: "#92400e",
          borderRadius: 12,
          padding: "0.75rem 0.9rem",
          fontSize: 13,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        Status: aguardando pagamento
      </div>
      <p style={{ margin: 0, color: "#334155", lineHeight: 1.5 }}>
        Finalize o pagamento com PIX. Assim que o provedor aprovar, o pedido
        sera confirmado automaticamente.
        {pixPaymentData.orderId ? ` Pedido #${pixPaymentData.orderId}.` : ""}
      </p>

      {onBackToCart ? (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onBackToCart}
            style={{
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              borderRadius: 999,
              minHeight: 34,
              padding: "0 0.9rem",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Voltar ao carrinho
          </button>
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          color: "#1d4ed8",
          borderRadius: 12,
          padding: "0.85rem 1rem",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        Pagamento monitorado automaticamente. Nao e necessario clicar para
        confirmar.
      </div>

      <div
        style={{
          display: "grid",
          gap: "0.35rem",
          background: "#f8fafc",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          padding: "0.9rem 1rem",
        }}
      >
        <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>
          Total do pedido
        </span>
        <strong style={{ fontSize: 24, color: "#0f172a" }}>
          {formatCurrency(pixPaymentData.total)}
        </strong>
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
          Provedor: {pixPaymentData?.provider || "MERCADO_PAGO"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "0.85rem",
          padding: "1rem",
          borderRadius: 14,
          border: "1px solid #cbd5e1",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "0.85rem",
          }}
        >
          {pixPaymentData.qrCodeBase64 ? (
            <img
              src={`data:image/png;base64,${pixPaymentData.qrCodeBase64}`}
              alt="QR Code PIX"
              width={200}
              height={200}
            />
          ) : (
            <QRCode
              value={pixPaymentData.pixCode}
              size={200}
              bgColor="#ffffff"
              fgColor="#111827"
              level="M"
            />
          )}
        </div>

        <div style={{ width: "100%" }}>
          <span
            style={{
              display: "block",
              fontSize: 13,
              color: "#475569",
              marginBottom: "0.35rem",
            }}
          >
            Código PIX (copia e cola)
          </span>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#0f172a",
              wordBreak: "break-all",
              border: "1px dashed #94a3b8",
              borderRadius: 10,
              padding: "0.65rem 0.75rem",
              background: "#f8fafc",
            }}
          >
            {pixPaymentData.pixCode}
          </div>
        </div>

        <button
          type="button"
          onClick={onCopyPixKey}
          style={{
            border: "1px solid #0f172a",
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: 999,
            padding: "0.7rem 1.1rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Copy size={16} /> Copiar Código PIX
        </button>

        <div
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            borderRadius: 999,
            padding: "0.9rem 1.1rem",
            background: "#0f172a",
            color: "#f8fafc",
            fontWeight: 700,
          }}
        >
          <S.LoadingSpinner /> Aguardando confirmacao automatica do PIX...
        </div>
      </div>
    </div>
  );
}
