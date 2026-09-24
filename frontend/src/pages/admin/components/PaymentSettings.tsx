import { useMemo, useRef, useState } from 'react';
import type {
  PaymentConnectionOverview,
  PaymentConnection,
} from '../../../Services/paymentConnectionService';
import {
  BadgeCheck,
  Building2,
  Check,
  CircleAlert,
  CreditCard,
  ExternalLink,
  KeyRound,
  Landmark,
  LockKeyhole,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Unplug,
  WalletCards,
} from 'lucide-react';
import { adminMockSettings } from '../data';
import { isValidCnpj, isValidCpf } from '../domain/businessSettingsValidation';
import { adminErrorMessage } from '../utils/adminErrorMessage';
import { PaymentTerminalSettings } from './PaymentTerminalSettings';
import { usePaymentConnections } from './usePaymentConnections';
import * as PS from './PaymentSettings.styles';

type Settings = typeof adminMockSettings;
type Provider = 'MERCADO_PAGO' | 'PAGARME' | 'ASAAS';
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onConnectMercadoPago?: () => void | Promise<void>;
  onDisconnectMercadoPago?: () => Promise<boolean>;
  onLoadPaymentConnections?: () => Promise<PaymentConnectionOverview>;
  onOnboardAsaas?: (payload: {
    cpf?: string;
    cnpj?: string;
    restaurantName: string;
    pixKey: string;
    incomeValue: number;
    birthDate?: string;
  }) => void | Promise<void>;
};

const providers: Array<{
  id: Provider;
  name: string;
  logoUrl: string;
  description: string;
}> = [
  {
    id: 'MERCADO_PAGO',
    name: 'Mercado Pago',
    logoUrl: 'https://www.mercadopago.com.br/favicon.ico',
    description: 'Conecte a conta do restaurante sem copiar senhas ou códigos de acesso.',
  },
  {
    id: 'PAGARME',
    name: 'Pagar.me',
    logoUrl: 'https://www.pagar.me/favicon.ico',
    description: 'Integração preparada para uso futuro. Temporariamente indisponível.',
  },
  {
    id: 'ASAAS',
    name: 'Asaas',
    logoUrl: 'https://www.asaas.com/favicon.ico',
    description: 'Integração preparada para uso futuro. Temporariamente indisponível.',
  },
];

function errorMessage(error: unknown, fallback: string) {
  return adminErrorMessage(error, fallback);
}

function providerIsConnected(settings: Settings, provider: Provider) {
  if (provider === 'MERCADO_PAGO') return settings.mercadoPagoAccessTokenConfigured;
  if (provider === 'PAGARME') {
    return settings.pagarmeSecretKeyConfigured && Boolean(settings.pagarmePublicKey.trim());
  }
  return settings.asaasAccessTokenConfigured;
}

function activeProvider(value: string): Provider | null {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'MERCADO_PAGO' || normalized === 'PAGARME' || normalized === 'ASAAS'
    ? (normalized as Provider)
    : null;
}

function providerName(provider: string) {
  return (
    providers.find((item) => item.id === provider)?.name || 'Selecione uma empresa de pagamento'
  );
}

function documentDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 14);
}

function documentIsValid(value: string) {
  const normalized = documentDigits(value);
  return normalized.length === 11 ? isValidCpf(normalized) : isValidCnpj(normalized);
}

function parseIncomeValue(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const connectionLabels: Record<PaymentConnection['status'], string> = {
  NOT_CONNECTED: 'Conta não vinculada',
  CONNECTED: 'Conexão pronta',
  NEEDS_RECONNECT: 'Reconexão necessária',
  PENDING_APPROVAL: 'Cadastro em análise',
  ACTION_REQUIRED: 'Ação necessária',
  UNAVAILABLE: 'Temporariamente indisponível',
};

function asaasOnboardingUrl(value?: string | null) {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.hostname === 'asaas.com' || url.hostname.endsWith('.asaas.com'))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function PaymentSettings({
  settings,
  update,
  onConnectMercadoPago,
  onDisconnectMercadoPago,
  onLoadPaymentConnections,
  onOnboardAsaas,
}: Props) {
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);
  const connecting = useRef(false);
  const connections = usePaymentConnections(onLoadPaymentConnections);
  const [connectionError, setConnectionError] = useState('');
  const [asaasDocument, setAsaasDocument] = useState(settings.companyDocument || '');
  const [asaasDocumentError, setAsaasDocumentError] = useState('');
  const [asaasIncome, setAsaasIncome] = useState('');
  const [asaasIncomeError, setAsaasIncomeError] = useState('');
  const [asaasBirthDate, setAsaasBirthDate] = useState('');
  const isConnected = (provider: Provider) =>
    connections.verifying
      ? Boolean(connections.get(provider)?.connected)
      : providerIsConnected(settings, provider);
  const isReady = (provider: Provider, method: 'readyForPix' | 'readyForCard') =>
    connections.verifying ? Boolean(connections.get(provider)?.[method]) : isConnected(provider);
  const canSelectProvider = (provider: Provider) =>
    provider === 'MERCADO_PAGO' || Boolean(connections.get(provider)?.canConnect);

  const pixProvider = activeProvider(settings.pixProvider);
  const cardProvider = activeProvider(settings.cardGateway);

  const selectedProviders = useMemo(() => {
    const selected = new Set<Provider>();
    if (settings.acceptsPix && pixProvider) selected.add(pixProvider);
    if (settings.acceptsCard && cardProvider) selected.add(cardProvider);
    return selected;
  }, [settings.acceptsCard, settings.acceptsPix, pixProvider, cardProvider]);

  const activeMethods =
    Number(settings.acceptsPix) +
    Number(settings.openFinancePixEnabled) +
    Number(settings.acceptsCard);
  const connectedSelectedProviders = Array.from(selectedProviders).filter((provider) =>
    isConnected(provider),
  ).length;
  const pixReady = !settings.acceptsPix || Boolean(pixProvider && isReady(pixProvider, 'readyForPix'));
  const openFinanceReady =
    !settings.openFinancePixEnabled ||
    Boolean(connections.openFinance?.ready && settings.acceptsPix && settings.pixKey.trim());
  const cardReady =
    !settings.acceptsCard || Boolean(cardProvider && isReady(cardProvider, 'readyForCard'));
  const configurationReady = activeMethods > 0 && pixReady && openFinanceReady && cardReady;
  const configurationNotice = !activeMethods
    ? 'Há etapas pendentes: ative Pix ou cartão para aceitar pagamentos online.'
    : connections.loading
      ? 'Verificando as conexões de pagamento...'
      : connections.error
        ? connections.error
        : settings.acceptsPix && !pixProvider
          ? 'Escolha Mercado Pago para receber por Pix.'
          : settings.acceptsPix && !pixReady
            ? connections.get(pixProvider as Provider)?.message ||
              `Há etapas pendentes: vincule a conta ${providerName(settings.pixProvider)} para liberar o Pix.`
            : settings.acceptsPix && pixProvider && !isConnected(pixProvider)
              ? `Há etapas pendentes: vincule a conta ${providerName(settings.pixProvider)} para liberar o Pix.`
              : settings.acceptsCard && !cardProvider
                ? 'Escolha Mercado Pago para processar cartão.'
                : settings.acceptsCard && !cardReady
                  ? connections.get(cardProvider as Provider)?.message ||
                    `Há etapas pendentes: vincule a conta ${providerName(settings.cardGateway)} para liberar o cartão.`
                  : 'Há etapas pendentes: revise o cadastro dos meios de pagamento.';

  const connectMercadoPago = async () => {
    if (connecting.current) return;
    connecting.current = true;
    setConnectionError('');
    setBusyProvider('MERCADO_PAGO');
    try {
      if (!onConnectMercadoPago) {
        throw new Error('A conexão do Mercado Pago não está disponível nesta tela.');
      }
      await onConnectMercadoPago();
      await connections.refresh();
    } catch (error) {
      setConnectionError(errorMessage(error, 'Não foi possível conectar ao Mercado Pago.'));
    } finally {
      connecting.current = false;
      setBusyProvider(null);
    }
  };

  const disconnectMercadoPago = async () => {
    if (connecting.current || !onDisconnectMercadoPago) return;
    connecting.current = true;
    setConnectionError('');
    setBusyProvider('MERCADO_PAGO');
    try {
      const disconnected = await onDisconnectMercadoPago();
      if (disconnected) {
        await connections.refresh();
      }
    } catch (error) {
      setConnectionError(
        errorMessage(error, 'Não foi possível desconectar a conta Mercado Pago.'),
      );
    } finally {
      connecting.current = false;
      setBusyProvider(null);
    }
  };

  const onboardAsaas = async () => {
    if (connecting.current) return;
    const reconnecting = isConnected('ASAAS');
    const document = documentDigits(asaasDocument);
    const incomeValue = parseIncomeValue(asaasIncome);
    setConnectionError('');
    setAsaasDocumentError('');
    setAsaasIncomeError('');

    if (!reconnecting && !documentIsValid(document)) {
      setAsaasDocumentError('Informe um CPF ou CNPJ válido, com os dígitos verificadores.');
      return;
    }
    if (!reconnecting && !incomeValue) {
      setAsaasIncomeError('Informe um faturamento mensal maior que zero.');
      return;
    }
    if (!settings.restaurantName.trim()) {
      setConnectionError(
        'Cadastre o nome do restaurante em Marca e identidade antes de continuar.',
      );
      return;
    }
    if (!reconnecting && document.length === 11 && !asaasBirthDate) {
      setConnectionError('Informe a data de nascimento do titular da conta Asaas.');
      return;
    }
    if (!onOnboardAsaas) {
      setConnectionError('A criação da conta Asaas não está disponível nesta tela.');
      return;
    }

    connecting.current = true;
    setBusyProvider('ASAAS');
    try {
      await onOnboardAsaas({
        ...(document.length === 14 ? { cnpj: document } : { cpf: document }),
        restaurantName: settings.restaurantName,
        pixKey: settings.pixKey,
        incomeValue,
        ...(asaasBirthDate ? { birthDate: asaasBirthDate } : {}),
      });
      await connections.refresh();
    } catch (error) {
      setConnectionError(errorMessage(error, 'Não foi possível criar a conta Asaas.'));
    } finally {
      connecting.current = false;
      setBusyProvider(null);
    }
  };

  const selectedUse = (provider: Provider) => {
    const methods: string[] = [];
    if (settings.acceptsPix && settings.pixProvider === provider) methods.push('Pix');
    if (settings.acceptsCard && settings.cardGateway === provider) methods.push('Cartão');
    return methods;
  };

  return (
    <PS.Page>
      <PS.Hero>
        <PS.HeroCopy>
          <PS.HeroIcon aria-hidden="true">
            <WalletCards />
          </PS.HeroIcon>
          <div>
            <span>RECEBIMENTOS DO RESTAURANTE</span>
            <h2>Configure seus pagamentos com segurança</h2>
            <p>
              Ative os meios aceitos, escolha quem processará cada pagamento e vincule a conta que
              receberá os valores.
            </p>
          </div>
        </PS.HeroCopy>
        <PS.Summary aria-label="Resumo da configuração de pagamentos">
          <div>
            <strong>{activeMethods}</strong>
            <span>meios ativos</span>
          </div>
          <div>
            <strong>
              {connectedSelectedProviders}/{selectedProviders.size || 0}
            </strong>
            <span>contas vinculadas</span>
          </div>
          <PS.ReadyStatus $ready={configurationReady}>
            {configurationReady ? <BadgeCheck /> : <CircleAlert />}
            <span>{configurationReady ? 'Configuração completa' : configurationNotice}</span>
          </PS.ReadyStatus>
        </PS.Summary>
      </PS.Hero>

      <PS.Guide aria-label="Como configurar pagamentos">
        <PS.GuideTitle>
          <span>PASSO A PASSO</span>
          <h3>São apenas três decisões</h3>
        </PS.GuideTitle>
        <ol>
          <li>
            <b>1</b>
            <div>
              <strong>Ative o meio</strong>
              <span>Escolha se aceitará Pix, cartão ou os dois.</span>
            </div>
          </li>
          <li>
            <b>2</b>
            <div>
              <strong>Escolha a empresa de pagamento</strong>
              <span>Defina qual empresa receberá e processará cada pagamento.</span>
            </div>
          </li>
          <li>
            <b>3</b>
            <div>
              <strong>Autorize a conexão</strong>
              <span>
                Ao conectar, salvamos suas escolhas antes de abrir a autorização da conta.
              </span>
            </div>
          </li>
        </ol>
      </PS.Guide>

      <PS.SectionHeading>
        <span>1</span>
        <div>
          <h3>Meios de pagamento</h3>
          <p>Configure o que o cliente poderá escolher ao finalizar um pedido.</p>
        </div>
      </PS.SectionHeading>

      <PS.MethodGrid>
        <PS.MethodCard $enabled={settings.acceptsPix}>
          <PS.MethodHeader>
            <PS.MethodIcon aria-hidden="true">
              <QrCode />
            </PS.MethodIcon>
            <div>
              <span>RECEBIMENTO IMEDIATO</span>
              <h3>Pix</h3>
              <p>O cliente paga pelo QR Code ou pelo código copia e cola.</p>
            </div>
            <PS.SwitchLabel>
              <span>{settings.acceptsPix ? 'Ativado' : 'Desativado'}</span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Aceitar pagamentos por Pix"
                checked={settings.acceptsPix}
                disabled={busyProvider !== null}
                onChange={(event) => update('acceptsPix', event.target.checked)}
              />
            </PS.SwitchLabel>
          </PS.MethodHeader>

          <PS.ControlGrid>
            <PS.Field $full>
              <span>Empresa que receberá o Pix</span>
              <select
                value={pixProvider || ''}
                disabled={!settings.acceptsPix || busyProvider !== null}
                onChange={(event) => update('pixProvider', event.target.value)}
              >
                <option value="">Selecione uma empresa</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="PAGARME" disabled={!canSelectProvider('PAGARME')}>
                  Pagar.me{canSelectProvider('PAGARME') ? '' : ' — temporariamente indisponível'}
                </option>
                <option value="ASAAS" disabled={!canSelectProvider('ASAAS')}>
                  Asaas{canSelectProvider('ASAAS') ? '' : ' — temporariamente indisponível'}
                </option>
              </select>
              <small>
                O QR Code e o código copia e cola são gerados automaticamente pela conta conectada.
              </small>
            </PS.Field>
          </PS.ControlGrid>
        </PS.MethodCard>

        <PS.MethodCard $enabled={settings.openFinancePixEnabled}>
          <PS.MethodHeader>
            <PS.MethodIcon aria-hidden="true">
              <Landmark />
            </PS.MethodIcon>
            <div>
              <span>PIX VIA OPEN FINANCE</span>
              <h3>Pix pelo app do banco</h3>
              <p>O cliente escolhe o banco, autoriza no aplicativo bancário e retorna ao pedido.</p>
            </div>
            <PS.SwitchLabel>
              <span>{settings.openFinancePixEnabled ? 'Ativado' : 'Desativado'}</span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Aceitar Pix pelo app do banco via Open Finance"
                checked={settings.openFinancePixEnabled}
                disabled={
                  busyProvider !== null ||
                  !settings.acceptsPix ||
                  connections.openFinance?.available === false
                }
                onChange={(event) => update('openFinancePixEnabled', event.target.checked)}
              />
            </PS.SwitchLabel>
          </PS.MethodHeader>
          <PS.ControlGrid>
            <PS.Field $full>
              <span>Status do Open Finance</span>
              <PS.OpenFinanceStatus $ready={Boolean(connections.openFinance?.ready)}>
                {connections.openFinance?.ready ? <BadgeCheck /> : <CircleAlert />}
                <div>
                  <strong>
                    {connections.openFinance?.ready ? 'Pronto para receber' : 'Configuração pendente'}
                  </strong>
                  <small>
                    {connections.openFinance?.message ||
                      'Salve as alterações e verifique as conexões para validar o Open Finance.'}
                  </small>
                </div>
              </PS.OpenFinanceStatus>
              <small>
                A autorização acontece no banco do cliente. O GastroNexa nunca recebe senha ou acesso bancário.
              </small>
            </PS.Field>
            {settings.openFinancePixEnabled && (
              <PS.Field $full>
                <span>Chave beneficiária do Open Finance</span>
                <input
                  value={settings.pixKey}
                  disabled={busyProvider !== null}
                  aria-invalid={!settings.pixKey.trim()}
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  autoComplete="off"
                  onChange={(event) => update('pixKey', event.target.value)}
                />
                <small>
                  Necessária somente para o Pix via Open Finance. O Pix normal do Mercado Pago não
                  precisa deste campo.
                </small>
              </PS.Field>
            )}
          </PS.ControlGrid>
        </PS.MethodCard>

        <PS.MethodCard $enabled={settings.acceptsCard}>
          <PS.MethodHeader>
            <PS.MethodIcon aria-hidden="true">
              <CreditCard />
            </PS.MethodIcon>
            <div>
              <span>PAGAMENTO ONLINE E ENTREGA</span>
              <h3>Cartão</h3>
              <p>Pagamento online e, com Mercado Pago Point, cobrança integrada na entrega.</p>
            </div>
            <PS.SwitchLabel>
              <span>{settings.acceptsCard ? 'Ativado' : 'Desativado'}</span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Aceitar pagamentos com cartão"
                checked={settings.acceptsCard}
                disabled={busyProvider !== null}
                onChange={(event) => update('acceptsCard', event.target.checked)}
              />
            </PS.SwitchLabel>
          </PS.MethodHeader>

          <PS.ControlGrid>
            <PS.Field $full>
              <span>Empresa que processará o cartão</span>
              <select
                value={cardProvider || ''}
                disabled={!settings.acceptsCard || busyProvider !== null}
                aria-invalid={settings.acceptsCard && !settings.cardGateway}
                onChange={(event) => update('cardGateway', event.target.value)}
              >
                <option value="">Selecione uma empresa</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="PAGARME" disabled={!canSelectProvider('PAGARME')}>
                  Pagar.me{canSelectProvider('PAGARME') ? '' : ' — temporariamente indisponível'}
                </option>
                <option value="ASAAS" disabled={!canSelectProvider('ASAAS')}>
                  Asaas{canSelectProvider('ASAAS') ? '' : ' — temporariamente indisponível'}
                </option>
              </select>
              <small>
                {settings.acceptsCard && !settings.cardGateway
                  ? 'Escolha uma empresa para aceitar cartão.'
                  : settings.cardGateway === 'MERCADO_PAGO'
                    ? 'Mercado Pago também habilita a integração com Point para cartão na entrega.'
                    : 'O cliente será direcionado à tela segura de pagamento.'}
              </small>
            </PS.Field>
          </PS.ControlGrid>
        </PS.MethodCard>
      </PS.MethodGrid>

      <PS.SectionHeading>
        <span>2</span>
        <div>
          <h3>Contas de recebimento</h3>
          <p>
            Conecte somente as empresas selecionadas acima. Cada conta é exclusiva deste
            restaurante.
          </p>
        </div>
      </PS.SectionHeading>

      {connections.verifying && (
        <PS.ConnectionTools aria-live="polite">
          <span>
            {connections.error ||
              'Consulte a situação das contas após autorizar ou concluir seu cadastro.'}
          </span>
          <button
            type="button"
            disabled={connections.loading || busyProvider !== null}
            onClick={() => void connections.refresh()}
          >
            <RefreshCw size={16} />
            {connections.loading ? 'Verificando...' : 'Verificar conexões'}
          </button>
        </PS.ConnectionTools>
      )}
      <PS.ProviderGrid>
        {providers.map((provider) => {
          const connection = connections.get(provider.id);
          const connected = isConnected(provider.id);
          const statusLabel = connection
            ? connectionLabels[connection.status]
            : connections.verifying
              ? connections.loading
                ? 'Verificando...'
                : 'Não verificada'
              : connected
                ? 'Conta vinculada'
                : 'Conta não vinculada';
          const ready = connection
            ? connection.status === 'CONNECTED'
            : !connections.verifying && connected;
          const canConnect =
            provider.id === 'MERCADO_PAGO'
              ? !connections.verifying || Boolean(connection?.canConnect)
              : Boolean(connection?.canConnect);
          const onboardingUrl = asaasOnboardingUrl(connection?.onboardingUrl);
          const uses = selectedUse(provider.id);
          const selected = uses.length > 0;
          const busy = busyProvider === provider.id;

          return (
            <PS.ProviderCard key={provider.id} $selected={selected}>
              <PS.ProviderTop>
                <PS.ProviderLogo $provider={provider.id}>
                  <img src={provider.logoUrl} alt="" aria-hidden="true" loading="lazy" />
                </PS.ProviderLogo>
                <PS.ConnectionBadge $connected={ready}>
                  {ready ? <Check /> : <KeyRound />}
                  {statusLabel}
                </PS.ConnectionBadge>
              </PS.ProviderTop>
              <h4>{provider.name}</h4>
              <p>{provider.description}</p>
              {connection?.message && <p role="status">{connection.message}</p>}
              {onboardingUrl && (
                <PS.OnboardingLink href={onboardingUrl} target="_blank" rel="noopener noreferrer">
                  Concluir cadastro no Asaas <ExternalLink size={15} />
                </PS.OnboardingLink>
              )}
              <PS.UsedFor $selected={selected}>
                <Landmark />
                {selected
                  ? `Selecionado para ${uses.join(' e ')}`
                  : provider.id === 'MERCADO_PAGO'
                    ? 'Não selecionado nos meios ativos'
                    : 'Não disponível no momento'}
              </PS.UsedFor>

              {provider.id === 'PAGARME' && selected && canConnect && (
                <PS.AsaasFields>
                  <PS.Field>
                    <span>Public Key do Pagar.me</span>
                    <input
                      value={settings.pagarmePublicKey}
                      disabled={busyProvider !== null}
                      placeholder="pk_... ou pk_test_..."
                      autoComplete="off"
                      onChange={(event) => update('pagarmePublicKey', event.target.value.trim())}
                    />
                    <small>
                      Usada somente no navegador para tokenizar o cartão sem enviar número ou CVV ao GastroNexa.
                    </small>
                  </PS.Field>
                  <PS.Field>
                    <span>Secret Key do Pagar.me</span>
                    <input
                      type="password"
                      value={settings.pagarmeSecretKey}
                      disabled={busyProvider !== null}
                      placeholder={
                        settings.pagarmeSecretKeyConfigured
                          ? 'Já configurada — deixe em branco para manter'
                          : 'sk_... ou sk_test_...'
                      }
                      autoComplete="new-password"
                      onChange={(event) => update('pagarmeSecretKey', event.target.value.trim())}
                    />
                    <small>A chave secreta é criptografada no servidor e nunca volta para esta tela.</small>
                  </PS.Field>
                  <PS.Field>
                    <span>Ambiente</span>
                    <select
                      value={settings.pagarmeEnvironment}
                      disabled={busyProvider !== null}
                      onChange={(event) =>
                        update(
                          'pagarmeEnvironment',
                          event.target.value === 'sandbox' ? 'sandbox' : 'production',
                        )
                      }
                    >
                      <option value="sandbox">Sandbox / testes</option>
                      <option value="production">Produção</option>
                    </select>
                    <small>As duas chaves precisam pertencer ao mesmo ambiente.</small>
                  </PS.Field>
                </PS.AsaasFields>
              )}

              {provider.id === 'ASAAS' && selected && canConnect && !connected && (
                <PS.AsaasFields>
                  <PS.Field>
                    <span>CPF ou CNPJ do responsável</span>
                    <input
                      value={asaasDocument}
                      inputMode="numeric"
                      disabled={busyProvider !== null}
                      aria-invalid={Boolean(asaasDocumentError)}
                      placeholder="Somente números"
                      onChange={(event) => {
                        setAsaasDocument(documentDigits(event.target.value));
                        setAsaasDocumentError('');
                      }}
                    />
                    <small>
                      {asaasDocumentError ||
                        'O documento deve pertencer ao responsável pela conta.'}
                    </small>
                  </PS.Field>
                  <PS.Field>
                    <span>Faturamento mensal estimado</span>
                    <input
                      value={asaasIncome}
                      inputMode="decimal"
                      disabled={busyProvider !== null}
                      aria-invalid={Boolean(asaasIncomeError)}
                      placeholder="Ex.: 25000"
                      onChange={(event) => {
                        setAsaasIncome(event.target.value);
                        setAsaasIncomeError('');
                      }}
                    />
                    <small>
                      {asaasIncomeError ||
                        'Valor solicitado pelo Asaas para analisar e criar a subconta.'}
                    </small>
                  </PS.Field>
                  {documentDigits(asaasDocument).length === 11 && (
                    <PS.Field>
                      <span>Data de nascimento do titular</span>
                      <input
                        type="date"
                        value={asaasBirthDate}
                        disabled={busyProvider !== null}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(event) => setAsaasBirthDate(event.target.value)}
                      />
                      <small>Solicitada pelo Asaas para contas cadastradas com CPF.</small>
                    </PS.Field>
                  )}
                </PS.AsaasFields>
              )}

              {selected ? (
                provider.id === 'PAGARME' ? (
                  <PS.InactiveHint>
                    {ready
                      ? 'Chaves validadas. Para trocar a conta, informe novas chaves e salve as alterações.'
                      : 'Informe as chaves acima e use “Salvar alterações”. Depois clique em “Verificar conexões”.'}
                  </PS.InactiveHint>
                ) : provider.id === 'ASAAS' ? (
                  <PS.ConnectButton
                    type="button"
                    $provider={provider.id}
                    disabled={busyProvider !== null || !canConnect || ready}
                    onClick={() => void onboardAsaas()}
                  >
                    {connected ? <BadgeCheck /> : <Building2 />}
                    {busy
                      ? 'Configurando conta...'
                      : connected
                        ? ready
                          ? 'Conta Asaas vinculada'
                          : 'Concluir conexão Asaas'
                        : 'Criar e vincular conta Asaas'}
                  </PS.ConnectButton>
                ) : (
                  <>
                    <PS.ConnectButton
                      type="button"
                      $provider={provider.id}
                      disabled={busyProvider !== null || !canConnect}
                      onClick={() => void connectMercadoPago()}
                    >
                      {connected ? <ShieldCheck /> : <ExternalLink />}
                      {busy
                        ? `Abrindo ${provider.name}...`
                        : connected
                          ? `Reconectar ${provider.name}`
                          : `Conectar ${provider.name}`}
                    </PS.ConnectButton>
                    {provider.id === 'MERCADO_PAGO' && connected && (
                      <PS.DisconnectButton
                        type="button"
                        disabled={busyProvider !== null}
                        onClick={() => void disconnectMercadoPago()}
                      >
                        <Unplug />
                        {busy ? 'Desconectando...' : 'Desconectar Mercado Pago'}
                      </PS.DisconnectButton>
                    )}
                  </>
                )
              ) : (
                <PS.InactiveHint>
                  {provider.id === 'MERCADO_PAGO'
                    ? 'Selecione esta empresa no Pix ou no cartão para conectá-la.'
                    : 'Em breve você poderá conectar esta conta.'}
                </PS.InactiveHint>
              )}
            </PS.ProviderCard>
          );
        })}
      </PS.ProviderGrid>

      {connectionError && (
        <PS.ErrorAlert role="alert">
          <CircleAlert />
          <div>
            <strong>Não foi possível concluir a conexão</strong>
            <span>{connectionError}</span>
          </div>
        </PS.ErrorAlert>
      )}

      {settings.acceptsCard && settings.cardGateway === 'MERCADO_PAGO' && (
        <PaymentTerminalSettings mercadoPagoConnected={isConnected('MERCADO_PAGO')} />
      )}

      <PS.SecurityNotes>
        <div>
          <LockKeyhole />
          <p>
            <strong>Credenciais protegidas</strong>
            Senhas e códigos de acesso não aparecem nesta tela. A conexão acontece no site seguro da
            empresa de pagamento.
          </p>
        </div>
        <div>
          <ShieldCheck />
          <p>
            <strong>Pagamento confirmado pela empresa</strong>
            Pix e cartão na entrega automatizados só ficam como pagos depois da confirmação
            financeira da empresa de pagamento. O motoqueiro não confirma pagamento.
          </p>
        </div>
      </PS.SecurityNotes>

      <PS.CurrentChoice aria-label="Resumo das empresas de pagamento escolhidas">
        <span>Configuração atual</span>
        <b>Pix: {settings.acceptsPix ? providerName(settings.pixProvider) : 'desativado'}</b>
        <b>Cartão: {settings.acceptsCard ? providerName(settings.cardGateway) : 'desativado'}</b>
      </PS.CurrentChoice>
    </PS.Page>
  );
}
