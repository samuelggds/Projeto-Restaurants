import type { ChangeEvent } from "react";
import { CheckCircle, Copy } from "lucide-react";
import QRCode from "react-qr-code";
import * as S from "../styles";

type PixPaymentData = {
  orderId: number | null;
  total: number;
  provider: string;
  pixCode: string;
  qrCodeBase64: string | null;
};

type PixPaymentPanelProps = {
  pixPaymentData: PixPaymentData;
  formatCurrency: (value: number) => string;
  pixManualProof: string;
  pixManualProofImage: string;
  pixManualProofImageName: string;
  isSubmittingPixConfirmation: boolean;
  isManualProvider: boolean;
  isConfirmDisabled: boolean;
  onCopyPixKey: () => void;
  onPixManualProofChange: (value: string) => void;
  onManualProofFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onConfirmPayment: () => void;
};

export default function PixPaymentPanel({
  pixPaymentData,
  formatCurrency,
  pixManualProof,
  pixManualProofImage,
  pixManualProofImageName,
  isSubmittingPixConfirmation,
  isManualProvider,
  isConfirmDisabled,
  onCopyPixKey,
  onPixManualProofChange,
  onManualProofFileChange,
  onConfirmPayment,
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
      <h2 style={{ margin: 0 }}>Pedido confirmado!</h2>
      <p style={{ margin: 0, color: "#334155", lineHeight: 1.5 }}>
        {pixPaymentData?.provider === "MERCADO_PAGO"
          ? "Finalize o pagamento com PIX para agilizar a preparação."
          : "Realize o pagamento PIX no app do provedor e depois confirme para gerar o pedido."}
        {pixPaymentData.orderId ? ` Pedido #${pixPaymentData.orderId}.` : ""}
      </p>

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

        {isManualProvider && (
          <div style={{ width: "100%" }}>
            <span
              style={{
                display: "block",
                fontSize: 13,
                color: "#475569",
                marginBottom: "0.35rem",
              }}
            >
              Comprovante/código da transação (obrigatório)
            </span>
            <input
              type="text"
              value={pixManualProof}
              onChange={(event) => onPixManualProofChange(event.target.value)}
              placeholder="Ex: NSU, ID da transação ou referência do comprovante"
              style={{
                width: "100%",
                minHeight: 46,
                padding: "0.75rem",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#0f172a",
                fontWeight: 600,
                boxSizing: "border-box",
              }}
            />

            <div style={{ marginTop: "0.75rem" }}>
              <span
                style={{
                  display: "block",
                  fontSize: 13,
                  color: "#475569",
                  marginBottom: "0.35rem",
                }}
              >
                Upload da imagem do comprovante (opcional)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={onManualProofFileChange}
                style={{
                  width: "100%",
                  fontSize: 13,
                }}
              />
              {pixManualProofImageName ? (
                <small
                  style={{
                    display: "block",
                    marginTop: "0.35rem",
                    color: "#64748b",
                  }}
                >
                  Arquivo: {pixManualProofImageName}
                </small>
              ) : null}
            </div>

            {pixManualProofImage ? (
              <div
                style={{
                  marginTop: "0.75rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "0.5rem",
                  background: "#ffffff",
                }}
              >
                <img
                  src={pixManualProofImage}
                  alt="Prévia do comprovante"
                  style={{
                    width: "100%",
                    maxHeight: 220,
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <S.PrimaryButton
        onClick={onConfirmPayment}
        disabled={isConfirmDisabled}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {isSubmittingPixConfirmation ? (
          <>
            <S.LoadingSpinner /> Gerando pedido...
          </>
        ) : (
          <>
            <CheckCircle size={18} /> Confirmar pagamento e gerar pedido
          </>
        )}
      </S.PrimaryButton>
    </div>
  );
}
