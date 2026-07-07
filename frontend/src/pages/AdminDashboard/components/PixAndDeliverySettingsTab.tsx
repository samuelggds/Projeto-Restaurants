import { lazy, Suspense } from "react";
import * as S from "../styles";

const QRCode = lazy(() => import("react-qr-code"));

type SettingsForm = {
  deliveryFee: string;
  minimumOrder: string;
  whatsapp: string;
  pixProvider: string;
  pixKey: string;
};

type PixAndDeliverySettingsTabProps = {
  settingsForm: SettingsForm;
  isSavingSettings: boolean;
  isPixKeyInvalid: boolean;
  hasPixKey: boolean;
  pixKeyTypeLabel: string;
  pixPreviewPayload: string;
  isDarkMode: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFieldChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
};

export default function PixAndDeliverySettingsTab({
  settingsForm,
  isSavingSettings,
  isPixKeyInvalid,
  hasPixKey,
  pixKeyTypeLabel,
  pixPreviewPayload,
  isDarkMode,
  onSubmit,
  onFieldChange,
}: PixAndDeliverySettingsTabProps) {
  return (
    <S.FormCard>
      <S.PageHeader>
        <h2>Configuracoes de PIX e Delivery</h2>
        <p>Configure a cobranca do checkout e os parametros de entrega.</p>
      </S.PageHeader>

      <form onSubmit={onSubmit}>
        <S.FormRow>
          <S.FormGroup>
            <label>Taxa de Entrega (R$)</label>
            <input
              type="number"
              name="deliveryFee"
              step="0.01"
              min="0"
              placeholder="Ex: 8.50"
              value={settingsForm.deliveryFee}
              onChange={onFieldChange}
            />
          </S.FormGroup>

          <S.FormGroup>
            <label>Pedido Minimo (R$)</label>
            <input
              type="number"
              name="minimumOrder"
              step="0.01"
              min="0"
              placeholder="Ex: 20.00"
              value={settingsForm.minimumOrder}
              onChange={onFieldChange}
            />
          </S.FormGroup>
        </S.FormRow>

        <S.FormGroup style={{ marginTop: "1rem" }}>
          <label>WhatsApp do Restaurante</label>
          <input
            type="text"
            name="whatsapp"
            placeholder="Ex: (85) 99999-9999"
            value={settingsForm.whatsapp}
            onChange={onFieldChange}
          />
          <small style={{ opacity: 0.8, lineHeight: 1.4 }}>
            Esse numero sera usado como remetente da confirmacao de pagamento
            para o cliente.
          </small>
        </S.FormGroup>

        <S.FormGroup style={{ marginTop: "1rem" }}>
          <label>Provedor PIX</label>
          <select
            name="pixProvider"
            value={settingsForm.pixProvider}
            onChange={onFieldChange}
          >
            <option value="MERCADO_PAGO">Mercado Pago</option>
            <option value="NUBANK">Nubank</option>
            <option value="PICPAY">PicPay</option>
          </select>
        </S.FormGroup>

        <S.FormGroup style={{ marginTop: "1rem" }}>
          <label>Chave PIX</label>
          <input
            type="text"
            name="pixKey"
            placeholder="Ex: email@dominio.com, CPF ou celular com DDD"
            value={settingsForm.pixKey}
            onChange={onFieldChange}
          />
          {hasPixKey && isPixKeyInvalid ? (
            <small
              style={{
                display: "block",
                marginTop: "0.45rem",
                color: "#dc2626",
                fontWeight: 600,
              }}
            >
              Formato invalido. Use apenas CPF, e-mail ou celular.
            </small>
          ) : hasPixKey ? (
            <small
              style={{
                display: "block",
                marginTop: "0.45rem",
                color: "#16a34a",
                fontWeight: 600,
              }}
            >
              {pixKeyTypeLabel}
            </small>
          ) : null}
        </S.FormGroup>

        <S.SubmitBtn
          type="submit"
          style={{ marginTop: "1.25rem" }}
          disabled={isSavingSettings || isPixKeyInvalid}
        >
          {isSavingSettings ? "Salvando..." : "Salvar PIX e Delivery"}
        </S.SubmitBtn>
      </form>

      <div style={{ marginTop: "1.75rem" }}>
        <h3 style={{ marginBottom: "0.5rem" }}>Pre-visualizacao do QR PIX</h3>
        {hasPixKey && !isPixKeyInvalid ? (
          <div
            style={{
              border: "1px solid rgba(148, 163, 184, 0.35)",
              borderRadius: "16px",
              padding: "1rem",
              display: "grid",
              gap: "0.75rem",
              justifyItems: "start",
              maxWidth: "360px",
            }}
          >
            <div
              style={{
                background: isDarkMode ? "#0f172a" : "#d8e2ed",
                borderRadius: "12px",
                padding: "0.75rem",
              }}
            >
              <Suspense fallback={null}>
                <QRCode
                  value={pixPreviewPayload}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#111827"
                  level="M"
                />
              </Suspense>
            </div>
            <small style={{ opacity: 0.85, lineHeight: 1.4 }}>
              Esse QR e gerado automaticamente a partir da chave PIX do provedor
              selecionado e sera exibido para o cliente no checkout delivery.
            </small>
          </div>
        ) : (
          <small style={{ opacity: 0.75 }}>
            Informe uma chave PIX valida (CPF, e-mail ou celular) para
            visualizar e habilitar o QR Code.
          </small>
        )}
      </div>
    </S.FormCard>
  );
}
