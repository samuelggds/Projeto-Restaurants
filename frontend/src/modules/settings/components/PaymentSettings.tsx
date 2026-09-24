import { useState } from 'react';
import type { RestaurantSettings } from '../types/settings.types';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import { isValidCnpj, isValidCpf } from '../../../pages/admin/domain/businessSettingsValidation';
import * as S from '../styles/settings.styles';
import { Field, FormInput, FormSelect } from './FormControls';

type Props = {
  settings: RestaurantSettings;
  onChange: (patch: Partial<RestaurantSettings>) => void;
};

export function PaymentSettings({ settings, onChange }: Props) {
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [onboardingAsaas, setOnboardingAsaas] = useState(false);
  const [asaasDocument, setAsaasDocument] = useState('');
  const [asaasIncome, setAsaasIncome] = useState('');
  const [asaasError, setAsaasError] = useState('');

  function parseIncome(value: string) {
    const parsed = Number(value.trim().replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  async function connectMercadoPago() {
    setConnecting(true);
    setConnectionError('');
    try {
      const result = await restaurantSettingsService.startMercadoPagoOAuth();
      const authorizationUrl = String(result?.authorizationUrl || '');
      if (!/^https:\/\//i.test(authorizationUrl)) {
        throw new Error('Não foi possível abrir a conexão com o Mercado Pago.');
      }
      window.location.assign(authorizationUrl);
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Não foi possível conectar ao Mercado Pago.',
      );
      setConnecting(false);
    }
  }

  async function onboardAsaas() {
    setOnboardingAsaas(true);
    setConnectionError('');
    setAsaasError('');
    try {
      const document = asaasDocument.replace(/\D/g, '');
      const incomeValue = parseIncome(asaasIncome);
      const validDocument =
        document.length === 11
          ? isValidCpf(document)
          : document.length === 14 && isValidCnpj(document);
      if (!validDocument) throw new Error('Informe um CPF ou CNPJ válido.');
      if (!incomeValue) throw new Error('Informe um faturamento mensal maior que zero.');
      await restaurantSettingsService.onboardAsaas({
        ...(document.length === 14 ? { cnpj: document } : { cpf: document }),
        restaurantName: settings.restaurantName,
        pixKey: settings.pixKey,
        incomeValue,
      });
      onChange({ asaasAccessTokenConfigured: true, monthlyRevenue: incomeValue });
    } catch (error) {
      setAsaasError(
        error instanceof Error ? error.message : 'Não foi possível criar a conta Asaas.',
      );
    } finally {
      setOnboardingAsaas(false);
    }
  }

  return (
    <S.Panel>
      <header>
        <span>Recebimentos do restaurante</span>
        <h2>Pagamentos online</h2>
        <p>Escolha onde receber Pix e cartão e conecte a conta do restaurante com segurança.</p>
      </header>

      <S.Card $stack>
        <S.Grid>
          <Field label="Empresa que receberá o Pix">
            <FormSelect
              value={settings.pixProvider}
              onChange={(event) => onChange({ pixProvider: event.target.value })}
            >
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="PAGARME">Pagar.me</option>
              <option value="ASAAS">Asaas</option>
            </FormSelect>
          </Field>
          <Field label="Chave Pix" hint="Use uma chave válida da conta escolhida, quando necessário.">
            <FormInput
              value={settings.pixKey}
              onChange={(event) => onChange({ pixKey: event.target.value })}
              autoComplete="off"
            />
          </Field>
          <Field label="Empresa que processará o cartão">
            <FormSelect
              value={settings.cardGateway}
              onChange={(event) => onChange({ cardGateway: event.target.value })}
            >
              <option value="">Selecione</option>
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="PAGARME">Pagar.me</option>
              <option value="ASAAS">Asaas</option>
            </FormSelect>
          </Field>
        </S.Grid>

        {(settings.cardGateway === 'MERCADO_PAGO' || settings.pixProvider === 'MERCADO_PAGO') && (
          <>
            <S.SaveButton type="button" onClick={connectMercadoPago} disabled={connecting}>
              {connecting
                ? 'Abrindo Mercado Pago...'
                : settings.mercadoPagoAccessTokenConfigured
                  ? 'Reconectar conta Mercado Pago'
                  : 'Conectar minha conta Mercado Pago'}
            </S.SaveButton>
            {connectionError && <S.InfoBox>{connectionError}</S.InfoBox>}
          </>
        )}

        {(settings.cardGateway === 'PAGARME' || settings.pixProvider === 'PAGARME') && (
          <>
            <Field label="Public Key do Pagar.me">
              <FormInput
                value={settings.pagarmePublicKey}
                placeholder="pk_... ou pk_test_..."
                autoComplete="off"
                onChange={(event) => onChange({ pagarmePublicKey: event.target.value.trim() })}
              />
            </Field>
            <Field label="Secret Key do Pagar.me" hint="Nunca é exibida depois de salva.">
              <FormInput
                type="password"
                value={settings.pagarmeSecretKey}
                placeholder={
                  settings.pagarmeSecretKeyConfigured
                    ? 'Já configurada — deixe em branco para manter'
                    : 'sk_... ou sk_test_...'
                }
                autoComplete="new-password"
                onChange={(event) => onChange({ pagarmeSecretKey: event.target.value.trim() })}
              />
            </Field>
            <Field label="Ambiente">
              <FormSelect
                value={settings.pagarmeEnvironment}
                onChange={(event) =>
                  onChange({
                    pagarmeEnvironment:
                      event.target.value === 'sandbox' ? 'sandbox' : 'production',
                  })
                }
              >
                <option value="sandbox">Sandbox / testes</option>
                <option value="production">Produção</option>
              </FormSelect>
            </Field>
            <S.InfoBox>
              Salve as alterações para validar as chaves do Pagar.me. Número do cartão e CVV não são enviados ao servidor do GastroNexa.
            </S.InfoBox>
          </>
        )}

        {(settings.cardGateway === 'ASAAS' || settings.pixProvider === 'ASAAS') && (
          <>
            <Field label="CPF ou CNPJ do responsável">
              <FormInput
                value={asaasDocument}
                inputMode="numeric"
                placeholder="Somente números"
                aria-invalid={Boolean(asaasError)}
                onChange={(event) => {
                  setAsaasDocument(event.target.value);
                  setAsaasError('');
                }}
              />
            </Field>
            <Field label="Faturamento mensal estimado" hint="Usado para concluir o cadastro da conta.">
              <FormInput
                value={asaasIncome}
                inputMode="decimal"
                placeholder="Ex.: 25000"
                aria-invalid={Boolean(asaasError)}
                onChange={(event) => {
                  setAsaasIncome(event.target.value);
                  setAsaasError('');
                }}
              />
            </Field>
            <S.SaveButton type="button" onClick={onboardAsaas} disabled={onboardingAsaas}>
              {onboardingAsaas
                ? 'Criando conta Asaas...'
                : settings.asaasAccessTokenConfigured
                  ? 'Conta Asaas configurada'
                  : 'Criar e conectar conta Asaas'}
            </S.SaveButton>
          </>
        )}



        {connectionError && <S.InfoBox>{connectionError}</S.InfoBox>}
        {asaasError && <S.InfoBox>{asaasError}</S.InfoBox>}

        <S.InfoBox>
          A confirmação dos pagamentos é feita automaticamente pelas empresas conectadas. Se alguma
          conta precisar de atenção, esta tela mostrará o que deve ser feito.
        </S.InfoBox>
      </S.Card>
    </S.Panel>
  );
}
