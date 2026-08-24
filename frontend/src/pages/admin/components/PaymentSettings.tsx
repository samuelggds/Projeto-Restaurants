import { useState } from 'react';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onConnectMercadoPago?: () => void | Promise<void>;
  onConnectPagBank?: () => void | Promise<void>;
  onOnboardAsaas?: (payload: {
    cpf?: string;
    cnpj?: string;
    restaurantName: string;
    pixKey: string;
  }) => void | Promise<void>;
};

function errorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback;
  const response = (error as { response?: { data?: Record<string, unknown> } }).response;
  return String(response?.data?.error || response?.data?.message || fallback);
}

const buttonStyle = (color: string, busy: boolean) =>
  ({
    minHeight: 46,
    padding: '0 18px',
    border: 0,
    borderRadius: 10,
    background: color,
    color: '#fff',
    fontWeight: 800,
    cursor: busy ? 'wait' : 'pointer',
    marginTop: 16,
    marginBottom: 10,
  }) as const;

export function PaymentSettings({
  settings,
  update,
  onConnectMercadoPago,
  onConnectPagBank,
  onOnboardAsaas,
}: Props) {
  const [busyProvider, setBusyProvider] = useState<'MERCADO_PAGO' | 'PAGBANK' | 'ASAAS' | null>(
    null,
  );
  const [connectionError, setConnectionError] = useState('');
  const [asaasDocument, setAsaasDocument] = useState('');

  const connect = async (provider: 'MERCADO_PAGO' | 'PAGBANK') => {
    setConnectionError('');
    setBusyProvider(provider);
    try {
      await (provider === 'MERCADO_PAGO' ? onConnectMercadoPago?.() : onConnectPagBank?.());
    } catch (error) {
      setConnectionError(
        errorMessage(
          error,
          `Não foi possível conectar ao ${provider === 'MERCADO_PAGO' ? 'Mercado Pago' : 'PagBank'}.`,
        ),
      );
      setBusyProvider(null);
    }
  };
  const onboardAsaas = async () => {
    const document = asaasDocument.replace(/\D/g, '');
    setConnectionError('');
    setBusyProvider('ASAAS');
    try {
      await onOnboardAsaas?.({
        ...(document.length === 14 ? { cnpj: document } : { cpf: document }),
        restaurantName: settings.restaurantName,
        pixKey: settings.pixKey,
      });
      update('asaasAccessTokenConfigured', true);
      update('pixProvider', 'ASAAS');
      update('cardGateway', 'ASAAS');
    } catch (error) {
      setConnectionError(errorMessage(error, 'Não foi possível criar a conta Asaas.'));
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <S.SettingSection>
      <S.Card>
        <h2>Pix do restaurante</h2>
        <p>A cobrança será criada na conta configurada por este administrador.</p>
        <S.ToggleRows>
          <label className="toggle-row">
            <div>
              <b>Aceitar pagamentos por Pix</b>
              <span>Quando desligado, o Pix deixa de aparecer para novos pedidos.</span>
            </div>
            <input
              type="checkbox"
              role="switch"
              aria-label="Aceitar pagamentos por Pix"
              checked={settings.acceptsPix}
              onChange={(event) => update('acceptsPix', event.target.checked)}
            />
          </label>
        </S.ToggleRows>
        <S.FormGrid>
          <S.Field>
            Provedor Pix
            <select
              value={settings.pixProvider}
              disabled={!settings.acceptsPix}
              onChange={(event) => update('pixProvider', event.target.value)}
            >
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="ASAAS">Asaas</option>
              <option value="PAGBANK">PagBank</option>
            </select>
          </S.Field>
          <S.Field>
            Chave Pix
            <input
              value={settings.pixKey}
              disabled={!settings.acceptsPix}
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              autoComplete="off"
              onChange={(event) => update('pixKey', event.target.value)}
            />
          </S.Field>
        </S.FormGrid>
        {((settings.acceptsPix && settings.pixProvider === 'MERCADO_PAGO') ||
          (settings.acceptsCard && settings.cardGateway === 'MERCADO_PAGO')) && (
          <>
            <button
              type="button"
              onClick={() => void connect('MERCADO_PAGO')}
              disabled={busyProvider === 'MERCADO_PAGO'}
              style={buttonStyle('#009ee3', busyProvider === 'MERCADO_PAGO')}
            >
              {busyProvider === 'MERCADO_PAGO'
                ? 'Abrindo Mercado Pago...'
                : settings.mercadoPagoAccessTokenConfigured
                  ? 'Reconectar conta Mercado Pago'
                  : 'Conectar minha conta Mercado Pago'}
            </button>
            <p>
              Você entrará no Mercado Pago e autorizará o recebimento. Não é necessário copiar o
              Access Token.
            </p>
          </>
        )}
        {((settings.acceptsPix && settings.pixProvider === 'ASAAS') ||
          (settings.acceptsCard && settings.cardGateway === 'ASAAS')) && (
          <>
            <S.Field>
              CPF ou CNPJ do responsável
              <input
                value={asaasDocument}
                inputMode="numeric"
                placeholder="Somente números"
                onChange={(event) => setAsaasDocument(event.target.value)}
              />
            </S.Field>
            <button
              type="button"
              onClick={() => void onboardAsaas()}
              disabled={busyProvider === 'ASAAS'}
              style={buttonStyle('#0b7', busyProvider === 'ASAAS')}
            >
              {busyProvider === 'ASAAS'
                ? 'Criando conta Asaas...'
                : settings.asaasAccessTokenConfigured
                  ? 'Conta Asaas configurada'
                  : 'Criar e conectar conta Asaas'}
            </button>
          </>
        )}
      </S.Card>
      <S.Card>
        <h2>Pagamento com cartão</h2>
        <p>O cliente informará o cartão no ambiente seguro do gateway.</p>
        <S.ToggleRows>
          <label className="toggle-row">
            <div>
              <b>Aceitar pagamentos com cartão</b>
              <span>Quando desligado, o cartão deixa de aparecer para novos pedidos.</span>
            </div>
            <input
              type="checkbox"
              role="switch"
              aria-label="Aceitar pagamentos com cartão"
              checked={settings.acceptsCard}
              onChange={(event) => update('acceptsCard', event.target.checked)}
            />
          </label>
        </S.ToggleRows>
        <S.Field>
          Gateway de cartão
          <select
            value={settings.cardGateway}
            disabled={!settings.acceptsCard}
            onChange={(event) => update('cardGateway', event.target.value)}
          >
            <option value="">Selecione o gateway</option>
            <option value="MERCADO_PAGO">Mercado Pago</option>
            <option value="PAGBANK">PagBank</option>
            <option value="ASAAS">Asaas</option>
          </select>
        </S.Field>
        {((settings.acceptsCard && settings.cardGateway === 'PAGBANK') ||
          (settings.acceptsPix && settings.pixProvider === 'PAGBANK')) && (
          <>
            <button
              type="button"
              onClick={() => void connect('PAGBANK')}
              disabled={busyProvider === 'PAGBANK'}
              style={buttonStyle('#22a64a', busyProvider === 'PAGBANK')}
            >
              {busyProvider === 'PAGBANK'
                ? 'Abrindo PagBank...'
                : settings.pagbankTokenConfigured
                  ? 'Reconectar conta PagBank'
                  : 'Conectar minha conta PagBank'}
            </button>
            <p>Você entrará no PagBank e autorizará Pix e cartão.</p>
          </>
        )}
        {connectionError && <p style={{ color: '#b91c1c', fontWeight: 700 }}>{connectionError}</p>}
      </S.Card>
    </S.SettingSection>
  );
}
