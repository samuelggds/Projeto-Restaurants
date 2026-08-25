import { useMemo, useState } from 'react';
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
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { adminMockSettings } from '../data';
import { isValidCnpj, isValidCpf } from '../domain/businessSettingsValidation';
import * as PS from './PaymentSettings.styles';

type Settings = typeof adminMockSettings;
type Provider = 'MERCADO_PAGO' | 'ASAAS' | 'PAGBANK';
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
    incomeValue: number;
  }) => void | Promise<void>;
};

const providers: Array<{
  id: Provider;
  name: string;
  initials: string;
  description: string;
}> = [
  {
    id: 'MERCADO_PAGO',
    name: 'Mercado Pago',
    initials: 'MP',
    description: 'Autorize a conta do restaurante sem copiar tokens ou chaves secretas.',
  },
  {
    id: 'ASAAS',
    name: 'Asaas',
    initials: 'AS',
    description: 'Crie uma subconta vinculada ao restaurante usando o CPF ou CNPJ do responsável.',
  },
  {
    id: 'PAGBANK',
    name: 'PagBank',
    initials: 'PB',
    description: 'Autorize a conta PagBank pelo fluxo Connect configurado na plataforma.',
  },
];

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (!error || typeof error !== 'object') return fallback;
  const response = (error as { response?: { data?: Record<string, unknown> } }).response;
  return String(response?.data?.error || response?.data?.message || fallback);
}

function providerIsConnected(settings: Settings, provider: Provider) {
  if (provider === 'MERCADO_PAGO') return settings.mercadoPagoAccessTokenConfigured;
  if (provider === 'ASAAS') return settings.asaasAccessTokenConfigured;
  return settings.pagbankTokenConfigured;
}

function providerName(provider: string) {
  return providers.find((item) => item.id === provider)?.name || 'Selecione um provedor';
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

export function PaymentSettings({
  settings,
  update,
  onConnectMercadoPago,
  onConnectPagBank,
  onOnboardAsaas,
}: Props) {
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [asaasDocument, setAsaasDocument] = useState('');
  const [asaasDocumentError, setAsaasDocumentError] = useState('');
  const [asaasIncome, setAsaasIncome] = useState('');
  const [asaasIncomeError, setAsaasIncomeError] = useState('');

  const selectedProviders = useMemo(() => {
    const selected = new Set<Provider>();
    if (settings.acceptsPix && settings.pixProvider) {
      selected.add(settings.pixProvider as Provider);
    }
    if (settings.acceptsCard && settings.cardGateway) {
      selected.add(settings.cardGateway as Provider);
    }
    return selected;
  }, [settings.acceptsCard, settings.acceptsPix, settings.cardGateway, settings.pixProvider]);

  const activeMethods = Number(settings.acceptsPix) + Number(settings.acceptsCard);
  const connectedSelectedProviders = Array.from(selectedProviders).filter((provider) =>
    providerIsConnected(settings, provider),
  ).length;
  const pixReady =
    !settings.acceptsPix ||
    (Boolean(settings.pixProvider) &&
      Boolean(settings.pixKey.trim()) &&
      providerIsConnected(settings, settings.pixProvider as Provider));
  const cardReady =
    !settings.acceptsCard ||
    (Boolean(settings.cardGateway) &&
      providerIsConnected(settings, settings.cardGateway as Provider));
  const configurationReady = activeMethods > 0 && pixReady && cardReady;

  const connect = async (provider: 'MERCADO_PAGO' | 'PAGBANK') => {
    setConnectionError('');
    setBusyProvider(provider);
    try {
      const handler = provider === 'MERCADO_PAGO' ? onConnectMercadoPago : onConnectPagBank;
      if (!handler) throw new Error('A conexão deste provedor não está disponível nesta tela.');
      await handler();
    } catch (error) {
      setConnectionError(
        errorMessage(
          error,
          `Não foi possível conectar ao ${provider === 'MERCADO_PAGO' ? 'Mercado Pago' : 'PagBank'}.`,
        ),
      );
    } finally {
      setBusyProvider(null);
    }
  };

  const onboardAsaas = async () => {
    const document = documentDigits(asaasDocument);
    const incomeValue = parseIncomeValue(asaasIncome);
    setConnectionError('');
    setAsaasDocumentError('');
    setAsaasIncomeError('');

    if (!documentIsValid(document)) {
      setAsaasDocumentError('Informe um CPF ou CNPJ válido, com os dígitos verificadores.');
      return;
    }
    if (!incomeValue) {
      setAsaasIncomeError('Informe um faturamento mensal maior que zero.');
      return;
    }
    if (!settings.restaurantName.trim()) {
      setConnectionError(
        'Cadastre o nome do restaurante em Marca e identidade antes de continuar.',
      );
      return;
    }
    if (!settings.pixKey.trim()) {
      setConnectionError('Informe a chave Pix antes de criar a conta Asaas.');
      return;
    }
    if (!onOnboardAsaas) {
      setConnectionError('A criação da conta Asaas não está disponível nesta tela.');
      return;
    }

    setBusyProvider('ASAAS');
    try {
      await onOnboardAsaas({
        ...(document.length === 14 ? { cnpj: document } : { cpf: document }),
        restaurantName: settings.restaurantName,
        pixKey: settings.pixKey,
        incomeValue,
      });
      update('asaasAccessTokenConfigured', true);
    } catch (error) {
      setConnectionError(errorMessage(error, 'Não foi possível criar a conta Asaas.'));
    } finally {
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
            <span>{configurationReady ? 'Configuração completa' : 'Há etapas pendentes'}</span>
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
              <strong>Escolha o provedor</strong>
              <span>Defina quem processará cada forma de pagamento.</span>
            </div>
          </li>
          <li>
            <b>3</b>
            <div>
              <strong>Vincule e salve</strong>
              <span>Autorize a conta e use “Salvar alterações” no topo da tela.</span>
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
                onChange={(event) => update('acceptsPix', event.target.checked)}
              />
            </PS.SwitchLabel>
          </PS.MethodHeader>

          <PS.ControlGrid>
            <PS.Field>
              <span>Provedor do Pix</span>
              <select
                value={settings.pixProvider}
                disabled={!settings.acceptsPix}
                onChange={(event) => update('pixProvider', event.target.value)}
              >
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="ASAAS">Asaas</option>
                <option value="PAGBANK">PagBank</option>
              </select>
              <small>Os valores serão criados na conta vinculada deste provedor.</small>
            </PS.Field>
            <PS.Field>
              <span>Chave Pix do restaurante</span>
              <input
                value={settings.pixKey}
                disabled={!settings.acceptsPix}
                aria-invalid={settings.acceptsPix && !settings.pixKey.trim()}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                autoComplete="off"
                onChange={(event) => update('pixKey', event.target.value)}
              />
              <small>
                {settings.acceptsPix && !settings.pixKey.trim()
                  ? 'Obrigatória para concluir a configuração do Pix.'
                  : 'Use a chave pertencente ao mesmo restaurante.'}
              </small>
            </PS.Field>
          </PS.ControlGrid>
        </PS.MethodCard>

        <PS.MethodCard $enabled={settings.acceptsCard}>
          <PS.MethodHeader>
            <PS.MethodIcon aria-hidden="true">
              <CreditCard />
            </PS.MethodIcon>
            <div>
              <span>CHECKOUT DO PROVEDOR</span>
              <h3>Cartão</h3>
              <p>Os dados do cartão são informados no ambiente seguro</p>
            </div>
            <PS.SwitchLabel>
              <span>{settings.acceptsCard ? 'Ativado' : 'Desativado'}</span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Aceitar pagamentos com cartão"
                checked={settings.acceptsCard}
                onChange={(event) => update('acceptsCard', event.target.checked)}
              />
            </PS.SwitchLabel>
          </PS.MethodHeader>

          <PS.ControlGrid>
            <PS.Field $full>
              <span>Gateway do cartão</span>
              <select
                value={settings.cardGateway}
                disabled={!settings.acceptsCard}
                aria-invalid={settings.acceptsCard && !settings.cardGateway}
                onChange={(event) => update('cardGateway', event.target.value)}
              >
                <option value="">Selecione o gateway</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="PAGBANK">PagBank</option>
                <option value="ASAAS">Asaas</option>
              </select>
              <small>
                {settings.acceptsCard && !settings.cardGateway
                  ? 'Escolha um gateway para aceitar cartão.'
                  : 'O cliente será direcionado ao checkout protegido do provedor.'}
              </small>
            </PS.Field>
          </PS.ControlGrid>
        </PS.MethodCard>
      </PS.MethodGrid>

      <PS.SectionHeading>
        <span>2</span>
        <div>
          <h3>Contas dos provedores</h3>
          <p>
            Vincule somente os provedores selecionados acima. Uma conta é exclusiva deste
            restaurante.
          </p>
        </div>
      </PS.SectionHeading>

      <PS.ProviderGrid>
        {providers.map((provider) => {
          const connected = providerIsConnected(settings, provider.id);
          const uses = selectedUse(provider.id);
          const selected = uses.length > 0;
          const busy = busyProvider === provider.id;

          return (
            <PS.ProviderCard key={provider.id} $selected={selected}>
              <PS.ProviderTop>
                <PS.ProviderLogo $provider={provider.id}>{provider.initials}</PS.ProviderLogo>
                <PS.ConnectionBadge $connected={connected}>
                  {connected ? <Check /> : <KeyRound />}
                  {connected ? 'Conta vinculada' : 'Conta não vinculada'}
                </PS.ConnectionBadge>
              </PS.ProviderTop>
              <h4>{provider.name}</h4>
              <p>{provider.description}</p>
              <PS.UsedFor $selected={selected}>
                <Landmark />
                {selected
                  ? `Selecionado para ${uses.join(' e ')}`
                  : 'Não selecionado nos meios ativos'}
              </PS.UsedFor>

              {provider.id === 'ASAAS' && selected && !connected && (
                <PS.AsaasFields>
                  <PS.Field>
                    <span>CPF ou CNPJ do responsável</span>
                    <input
                      value={asaasDocument}
                      inputMode="numeric"
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
                </PS.AsaasFields>
              )}

              {selected ? (
                provider.id === 'ASAAS' ? (
                  <PS.ConnectButton
                    type="button"
                    $provider={provider.id}
                    disabled={busy || connected}
                    onClick={() => void onboardAsaas()}
                  >
                    {connected ? <BadgeCheck /> : <Building2 />}
                    {busy
                      ? 'Criando conta...'
                      : connected
                        ? 'Conta Asaas vinculada'
                        : 'Criar e vincular conta Asaas'}
                  </PS.ConnectButton>
                ) : (
                  <PS.ConnectButton
                    type="button"
                    $provider={provider.id}
                    disabled={busy}
                    onClick={() => void connect(provider.id as Exclude<Provider, 'ASAAS'>)}
                  >
                    {connected ? <ShieldCheck /> : <ExternalLink />}
                    {busy
                      ? `Abrindo ${provider.name}...`
                      : connected
                        ? `Reconectar ${provider.name}`
                        : `Conectar ${provider.name}`}
                  </PS.ConnectButton>
                )
              ) : (
                <PS.InactiveHint>
                  Selecione este provedor no Pix ou no cartão para conectá-lo.
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

      <PS.SecurityNotes>
        <div>
          <LockKeyhole />
          <p>
            <strong>Credenciais protegidas</strong>
            Tokens e chaves secretas não são exibidos nesta tela. A autorização acontece no ambiente
            do provedor.
          </p>
        </div>
        <div>
          <ShieldCheck />
          <p>
            <strong>Faça um pedido de teste</strong>
            “Conta vinculada” confirma o cadastro da credencial. Antes de vender, valide um Pix e um
            cartão no ambiente de homologação.
          </p>
        </div>
      </PS.SecurityNotes>

      <PS.CurrentChoice aria-label="Resumo dos provedores escolhidos">
        <span>Configuração atual</span>
        <b>Pix: {settings.acceptsPix ? providerName(settings.pixProvider) : 'desativado'}</b>
        <b>Cartão: {settings.acceptsCard ? providerName(settings.cardGateway) : 'desativado'}</b>
      </PS.CurrentChoice>
    </PS.Page>
  );
}
