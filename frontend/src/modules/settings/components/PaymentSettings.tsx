import { useState } from "react";
import type { RestaurantSettings } from "../types/settings.types";
import restaurantSettingsService from "../../../Services/restaurantSettingsService";
import * as S from "../styles/settings.styles";
import { Field, FormInput, FormSelect } from "./FormControls";

type Props = {
  settings: RestaurantSettings;
  onChange: (patch: Partial<RestaurantSettings>) => void;
};

export function PaymentSettings({ settings, onChange }: Props) {
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [connectingPagBank, setConnectingPagBank] = useState(false);
  const [onboardingAsaas, setOnboardingAsaas] = useState(false);
  const [asaasDocument, setAsaasDocument] = useState("");

  async function connectMercadoPago() {
    setConnecting(true);
    setConnectionError("");
    try {
      const result = await restaurantSettingsService.startMercadoPagoOAuth();
      const authorizationUrl = String(result?.authorizationUrl || "");
      if (!/^https:\/\//i.test(authorizationUrl)) {
        throw new Error("URL de autorização inválida.");
      }
      window.location.assign(authorizationUrl);
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : "Não foi possível conectar ao Mercado Pago.",
      );
      setConnecting(false);
    }
  }

  async function connectPagBank() {
    setConnectingPagBank(true);
    setConnectionError("");
    try {
      const result = await restaurantSettingsService.startPagBankOAuth();
      const authorizationUrl = String(result?.authorizationUrl || "");
      if (!/^https:\/\//i.test(authorizationUrl)) throw new Error("URL de autorização inválida.");
      window.location.assign(authorizationUrl);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Não foi possível conectar ao PagBank.");
      setConnectingPagBank(false);
    }
  }

  async function onboardAsaas() {
    setOnboardingAsaas(true);
    setConnectionError("");
    try {
      const document = asaasDocument.replace(/\D/g, "");
      await restaurantSettingsService.onboardAsaas({
        ...(document.length === 14 ? { cnpj: document } : { cpf: document }),
        restaurantName: settings.restaurantName,
        pixKey: settings.pixKey,
      });
      onChange({ asaasAccessTokenConfigured: true });
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Não foi possível criar a conta Asaas.");
    } finally {
      setOnboardingAsaas(false);
    }
  }

  return (
    <S.Panel>
      <header>
        <span>Integrações financeiras</span>
        <h2>Pagamentos e webhooks</h2>
        <p>
          As credenciais são enviadas somente ao backend e nunca são exibidas
          novamente.
        </p>
      </header>

      <S.Card $stack>
        <S.Grid>
          <Field label="Provedor Pix">
            <FormSelect
              value={settings.pixProvider}
              onChange={(event) =>
                onChange({ pixProvider: event.target.value })
              }
            >
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="ASAAS">Asaas</option>
              <option value="PAGBANK">PagBank</option>
            </FormSelect>
          </Field>
          <Field label="Chave Pix" hint="Chave ativa na conta do provedor selecionado.">
            <FormInput
              value={settings.pixKey}
              onChange={(event) => onChange({ pixKey: event.target.value })}
              autoComplete="off"
            />
          </Field>
          <Field label="Gateway de cartão">
            <FormSelect
              value={settings.cardGateway}
              onChange={(event) =>
                onChange({ cardGateway: event.target.value })
              }
            >
              <option value="">Selecione</option>
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="PAGBANK">PagBank</option>
              <option value="ASAAS">Asaas</option>
            </FormSelect>
          </Field>
        </S.Grid>

        {(settings.cardGateway === "MERCADO_PAGO" ||
          settings.pixProvider === "MERCADO_PAGO") && (
          <>
            <S.SaveButton type="button" onClick={connectMercadoPago} disabled={connecting}>
              {connecting
                ? "Abrindo Mercado Pago..."
                : settings.mercadoPagoAccessTokenConfigured
                  ? "Reconectar conta Mercado Pago"
                  : "Conectar minha conta Mercado Pago"}
            </S.SaveButton>
            {connectionError && <S.InfoBox>{connectionError}</S.InfoBox>}
          </>
        )}

        {(settings.cardGateway === "ASAAS" ||
          settings.pixProvider === "ASAAS") && (
          <>
            <Field label="CPF ou CNPJ do responsável">
              <FormInput value={asaasDocument} inputMode="numeric" placeholder="Somente números" onChange={(event) => setAsaasDocument(event.target.value)} />
            </Field>
            <S.SaveButton type="button" onClick={onboardAsaas} disabled={onboardingAsaas}>
              {onboardingAsaas
                ? "Criando conta Asaas..."
                : settings.asaasAccessTokenConfigured
                  ? "Conta Asaas configurada"
                  : "Criar e conectar conta Asaas"}
            </S.SaveButton>
          </>
        )}

        {(settings.cardGateway === "PAGBANK" ||
          settings.pixProvider === "PAGBANK") && (
          <S.SaveButton type="button" onClick={connectPagBank} disabled={connectingPagBank}>
            {connectingPagBank
              ? "Abrindo PagBank..."
              : settings.pagbankTokenConfigured
                ? "Reconectar conta PagBank"
                : "Conectar minha conta PagBank"}
          </S.SaveButton>
        )}

        {connectionError && <S.InfoBox>{connectionError}</S.InfoBox>}

        <S.InfoBox>
          Configure os webhooks no painel do provedor apontando para a URL do
          backend. Teste primeiro no ambiente de homologação.
        </S.InfoBox>
      </S.Card>
    </S.Panel>
  );
}
