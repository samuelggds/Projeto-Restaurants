import type { RestaurantSettings } from "../types/settings.types";
import * as S from "../styles/settings.styles";
import { Field, FormInput, FormSelect } from "./FormControls";

type Props = {
  settings: RestaurantSettings;
  onChange: (patch: Partial<RestaurantSettings>) => void;
};

function configuredHint(configured: boolean) {
  return configured
    ? "Credencial configurada. Preencha somente para substituir."
    : "Credencial ainda não configurada.";
}

export function PaymentSettings({ settings, onChange }: Props) {
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
              <option value="MANUAL">Chave Pix manual</option>
            </FormSelect>
          </Field>
          <Field label="Chave Pix" hint="Usada quando o Pix manual estiver ativo.">
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
              <option value="STRIPE">Stripe</option>
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="PAGBANK">PagBank</option>
              <option value="ASAAS">Asaas</option>
            </FormSelect>
          </Field>
        </S.Grid>

        {settings.cardGateway === "STRIPE" && (
          <S.Grid>
            <Field
              label="Stripe Secret Key"
              hint={configuredHint(settings.stripeSecretKeyConfigured)}
            >
              <FormInput
                type="password"
                value={settings.stripeSecretKey}
                placeholder={settings.stripeSecretKeyConfigured ? "••••••••" : "sk_live_..."}
                autoComplete="new-password"
                onChange={(event) =>
                  onChange({ stripeSecretKey: event.target.value })
                }
              />
            </Field>
            <Field
              label="Stripe Webhook Secret"
              hint={configuredHint(settings.stripeWebhookSecretConfigured)}
            >
              <FormInput
                type="password"
                value={settings.stripeWebhookSecret}
                placeholder={settings.stripeWebhookSecretConfigured ? "••••••••" : "whsec_..."}
                autoComplete="new-password"
                onChange={(event) =>
                  onChange({ stripeWebhookSecret: event.target.value })
                }
              />
            </Field>
          </S.Grid>
        )}

        {settings.cardGateway === "MERCADO_PAGO" && (
          <Field
            label="Mercado Pago Access Token"
            hint={configuredHint(settings.mercadoPagoAccessTokenConfigured)}
          >
            <FormInput
              type="password"
              value={settings.mercadoPagoAccessToken}
              placeholder={settings.mercadoPagoAccessTokenConfigured ? "••••••••" : "APP_USR-..."}
              autoComplete="new-password"
              onChange={(event) =>
                onChange({ mercadoPagoAccessToken: event.target.value })
              }
            />
          </Field>
        )}

        {settings.cardGateway === "ASAAS" && (
          <Field
            label="Asaas Access Token"
            hint={configuredHint(settings.asaasAccessTokenConfigured)}
          >
            <FormInput
              type="password"
              value={settings.asaasAccessToken}
              placeholder={settings.asaasAccessTokenConfigured ? "••••••••" : "$aact_..."}
              autoComplete="new-password"
              onChange={(event) =>
                onChange({ asaasAccessToken: event.target.value })
              }
            />
          </Field>
        )}

        {settings.cardGateway === "PAGBANK" && (
          <S.Grid>
            <Field label="E-mail PagBank">
              <FormInput
                type="email"
                value={settings.pagbankEmail}
                onChange={(event) =>
                  onChange({ pagbankEmail: event.target.value })
                }
              />
            </Field>
            <Field
              label="Token PagBank"
              hint={configuredHint(settings.pagbankTokenConfigured)}
            >
              <FormInput
                type="password"
                value={settings.pagbankToken}
                placeholder={settings.pagbankTokenConfigured ? "••••••••" : "Token de produção"}
                autoComplete="new-password"
                onChange={(event) =>
                  onChange({ pagbankToken: event.target.value })
                }
              />
            </Field>
          </S.Grid>
        )}

        <S.InfoBox>
          Configure os webhooks no painel do provedor apontando para a URL do
          backend. Teste primeiro no ambiente de homologação.
        </S.InfoBox>
      </S.Card>
    </S.Panel>
  );
}
