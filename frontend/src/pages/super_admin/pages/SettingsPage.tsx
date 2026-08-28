import { AlertTriangle, CheckCircle2, RotateCcw, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PlatformSettings, SuperAdminData, SystemPolicyItem } from '../types';
import {
  formatCurrency,
  formatDate,
  normalizeSearch,
  requestErrorMessage,
  validateSettings,
} from '../domain/superAdminDomain';
import * as S from '../SuperAdmin.styles';

type SettingsCategory =
  'general' | 'subscriptions' | 'billing' | 'email' | 'integrations' | 'security' | 'maintenance';

const categories: {
  id: SettingsCategory;
  label: string;
  keywords: string;
}[] = [
  { id: 'general', label: 'Geral', keywords: 'identidade dominio idioma moeda ambiente deploy' },
  {
    id: 'subscriptions',
    label: 'Assinaturas e trial',
    keywords: 'cadastro aprovação planos período teste trial',
  },
  { id: 'billing', label: 'Cobranças', keywords: 'faturas receita mensalidade pendente' },
  { id: 'email', label: 'E-mails', keywords: 'smtp remetente alertas recuperação mfa' },
  {
    id: 'integrations',
    label: 'Integrações',
    keywords: 'pagamento mercado pago pagbank asaas stripe sentry',
  },
  { id: 'security', label: 'Segurança', keywords: 'senha token mfa bloqueio rate limit' },
  {
    id: 'maintenance',
    label: 'Manutenção e auditoria',
    keywords: 'indisponibilidade mensagem logs retenção cache',
  },
];

function policyValue(item: SystemPolicyItem) {
  if (item.sensitive) return item.configured ? 'Configurado com segurança' : 'Não configurado';
  if (item.value === null || item.value === '') return 'Não informado';
  if (typeof item.value === 'boolean') return item.value ? 'Sim' : 'Não';
  return String(item.value);
}

function PolicyCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: SystemPolicyItem[];
}) {
  return (
    <S.FormCard>
      <header>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {items.length ? (
        <S.PolicyList>
          {items.map((item) => (
            <div className="policy" key={item.key}>
              <b>{item.label}</b>
              <small>{item.description || 'Política informada pelo backend.'}</small>
              <output title={policyValue(item)}>{policyValue(item)}</output>
            </div>
          ))}
        </S.PolicyList>
      ) : (
        <S.InlineAlert $tone="info">
          O backend ainda não publicou diagnósticos para esta categoria.
        </S.InlineAlert>
      )}
    </S.FormCard>
  );
}

function SavePanel({
  dirty,
  saving,
  errors,
  error,
  success,
  updatedAt,
  onReset,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  errors: string[];
  error: string;
  success: boolean;
  updatedAt: string | null;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <S.Card>
      <S.SectionHeading>
        <div>
          <h2>Configuração global da plataforma</h2>
          <p>
            As alterações afetam todos os restaurantes. Última atualização:{' '}
            {formatDate(updatedAt, true)}.
          </p>
        </div>
        <S.ActionGroup>
          <S.Button disabled={!dirty || saving} onClick={onReset}>
            <RotateCcw size={16} /> Descartar
          </S.Button>
          <S.Button $variant="primary" disabled={!dirty || saving} onClick={onSave}>
            <Save size={16} /> {saving ? 'Salvando…' : 'Salvar alterações'}
          </S.Button>
        </S.ActionGroup>
      </S.SectionHeading>
      {dirty && errors.length ? (
        <S.InlineAlert $tone="error" role="alert">
          <strong>Revise antes de salvar:</strong>
          <ul>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </S.InlineAlert>
      ) : null}
      {error ? (
        <S.InlineAlert $tone="error" role="alert">
          <AlertTriangle size={15} /> {error}
        </S.InlineAlert>
      ) : null}
      {success ? (
        <S.InlineAlert $tone="success" role="status">
          <CheckCircle2 size={15} /> Configurações salvas e aplicadas pelo backend.
        </S.InlineAlert>
      ) : null}
    </S.Card>
  );
}

function SettingsEditor({
  data,
  onSave,
}: {
  data: SuperAdminData;
  onSave: (settings: PlatformSettings) => Promise<void>;
}) {
  const [category, setCategory] = useState<SettingsCategory>('general');
  const [query, setQuery] = useState('');
  const [draftOverride, setDraftOverride] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const baseline = data.settings;
  const draft = draftOverride ?? baseline;

  const dirty = useMemo(
    () => draftOverride !== null && JSON.stringify(draftOverride) !== JSON.stringify(baseline),
    [baseline, draftOverride],
  );
  const errors = useMemo(() => validateSettings(draft), [draft]);
  const visibleCategories = useMemo(() => {
    const search = normalizeSearch(query);
    if (!search) return categories;
    return categories.filter((item) =>
      normalizeSearch(`${item.label} ${item.keywords}`).includes(search),
    );
  }, [query]);

  const set = <Key extends keyof PlatformSettings>(key: Key, value: PlatformSettings[Key]) => {
    setDraftOverride((current) => ({ ...(current ?? data.settings), [key]: value }));
    setError('');
    setSuccess(false);
  };

  const reset = () => {
    setDraftOverride(null);
    setError('');
    setSuccess(false);
  };

  const save = async () => {
    if (!dirty || errors.length) return;
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const normalized: PlatformSettings = {
        ...draft,
        platformName: draft.platformName.trim(),
        platformDomain: draft.platformDomain.trim(),
        supportEmail: draft.supportEmail.trim().toLowerCase(),
        primaryColor: draft.primaryColor.trim().toUpperCase(),
        locale: draft.locale.trim(),
        currency: draft.currency.trim().toUpperCase(),
        timezone: draft.timezone.trim(),
        maintenanceMessage: draft.maintenanceMessage.trim(),
      };
      await onSave(normalized);
      setDraftOverride(null);
      setSuccess(true);
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível salvar as configurações.'));
    } finally {
      setSaving(false);
    }
  };

  const content = () => {
    if (category === 'general') {
      return (
        <S.FormGrid>
          <S.FormCard>
            <header>
              <div>
                <h2>Identidade da plataforma</h2>
                <p>Dados usados no painel, nos links operacionais e nos canais de suporte.</p>
              </div>
            </header>
            <label>
              Nome da plataforma
              <input
                maxLength={80}
                value={draft.platformName}
                onChange={(event) => set('platformName', event.target.value)}
              />
            </label>
            <label>
              Domínio público
              <input
                maxLength={255}
                placeholder="app.seudominio.com"
                value={draft.platformDomain}
                onChange={(event) => set('platformDomain', event.target.value)}
              />
            </label>
            <label>
              E-mail de suporte
              <input
                type="email"
                value={draft.supportEmail}
                onChange={(event) => set('supportEmail', event.target.value)}
              />
            </label>
            <label>
              Cor principal
              <input
                maxLength={7}
                placeholder="#E9530B"
                value={draft.primaryColor}
                onChange={(event) => set('primaryColor', event.target.value)}
              />
            </label>
          </S.FormCard>
          <S.FormCard>
            <header>
              <div>
                <h2>Configurações regionais</h2>
                <p>Controlam idioma, moeda e apresentação padrão de datas.</p>
              </div>
            </header>
            <label>
              Idioma e região
              <input
                placeholder="pt-BR"
                value={draft.locale}
                onChange={(event) => set('locale', event.target.value)}
              />
            </label>
            <label>
              Moeda (ISO 4217)
              <input
                maxLength={3}
                placeholder="BRL"
                value={draft.currency}
                onChange={(event) => set('currency', event.target.value.toUpperCase())}
              />
            </label>
            <label>
              Fuso horário (IANA)
              <input
                placeholder="America/Sao_Paulo"
                value={draft.timezone}
                onChange={(event) => set('timezone', event.target.value)}
              />
            </label>
            <label>
              Formato de data
              <select
                value={draft.dateFormat}
                onChange={(event) => set('dateFormat', event.target.value)}
              >
                <option value="dd/MM/yyyy">DD/MM/AAAA</option>
                <option value="MM/dd/yyyy">MM/DD/AAAA</option>
                <option value="yyyy-MM-dd">AAAA-MM-DD</option>
              </select>
            </label>
          </S.FormCard>
          <PolicyCard
            title="Ambiente e publicação"
            description="Diagnóstico somente leitura. Ajustes de infraestrutura devem ser feitos no deploy."
            items={data.systemPolicies.deployment}
          />
        </S.FormGrid>
      );
    }

    if (category === 'subscriptions') {
      return (
        <S.FormGrid>
          <S.FormCard>
            <header>
              <div>
                <h2>Entrada de restaurantes</h2>
                <p>Defina como novos restaurantes entram na plataforma.</p>
              </div>
            </header>
            <div className="line">
              <span>
                <strong>Permitir auto cadastro</strong>
                <small>Exibe o fluxo público de criação de restaurante.</small>
              </span>
              <S.Switch
                $on={draft.allowRestaurantSignup}
                aria-label="Permitir auto cadastro de restaurantes"
                aria-checked={draft.allowRestaurantSignup}
                role="switch"
                onClick={() => set('allowRestaurantSignup', !draft.allowRestaurantSignup)}
              />
            </div>
            <div className="line">
              <span>
                <strong>Exigir aprovação manual</strong>
                <small>Mantém o novo restaurante aguardando análise antes da liberação.</small>
              </span>
              <S.Switch
                $on={draft.requireManualApproval}
                aria-label="Exigir aprovação manual"
                aria-checked={draft.requireManualApproval}
                role="switch"
                onClick={() => set('requireManualApproval', !draft.requireManualApproval)}
              />
            </div>
            <label>
              Trial padrão (dias)
              <input
                type="number"
                min={0}
                max={90}
                step={1}
                value={draft.defaultTrialDays}
                onChange={(event) => set('defaultTrialDays', Number(event.target.value))}
              />
              <small>Aplicado quando o fluxo não define um período específico no plano.</small>
            </label>
          </S.FormCard>
          <S.FormCard>
            <header>
              <div>
                <h2>Planos publicados</h2>
                <p>Resumo real do catálogo. Valores e recursos são editados na aba Planos.</p>
              </div>
            </header>
            <S.PolicyList>
              {data.plans.map((plan) => (
                <div className="policy" key={plan.code}>
                  <b>{plan.name}</b>
                  <small>
                    {plan.trialDays} dia(s) de trial · {plan.restaurantsCount} restaurante(s)
                  </small>
                  <output>
                    {plan.active
                      ? formatCurrency(plan.monthlyFee, draft.currency, draft.locale)
                      : 'Inativo'}
                  </output>
                </div>
              ))}
            </S.PolicyList>
          </S.FormCard>
        </S.FormGrid>
      );
    }

    if (category === 'billing') {
      const billingItems: SystemPolicyItem[] = [
        {
          key: 'mrr',
          label: 'Receita mensal recorrente',
          value: formatCurrency(data.metrics.mrr, draft.currency, draft.locale),
          description: 'Mensalidades das assinaturas ativas consolidadas pelo backend.',
        },
        {
          key: 'receivable',
          label: 'Total a receber',
          value: formatCurrency(data.metrics.totalReceivable, draft.currency, draft.locale),
          description: `${data.metrics.pendingInvoicesCount} fatura(s) em aberto.`,
        },
        {
          key: 'paid',
          label: 'Total faturado',
          value: formatCurrency(data.metrics.totalGenerated, draft.currency, draft.locale),
          description:
            'Somatório de todas as faturas emitidas no recorte disponibilizado pela API.',
        },
      ];
      return (
        <S.FormGrid>
          <PolicyCard
            title="Resumo financeiro"
            description="Indicadores calculados pelo backend; edite faturas e cobranças nos fluxos próprios."
            items={billingItems}
          />
          <PolicyCard
            title="Provedores de cobrança"
            description="Somente o estado da integração é exibido. Credenciais permanecem no gerenciador de segredos."
            items={data.systemPolicies.integrations.filter((item) =>
              ['mercadoPago', 'pagBank', 'asaas', 'stripe'].includes(item.key),
            )}
          />
        </S.FormGrid>
      );
    }

    if (category === 'email') {
      return (
        <S.FormGrid>
          <PolicyCard
            title="Entrega de e-mails"
            description="Diagnóstico do canal usado por recuperação de senha, MFA e alertas."
            items={data.systemPolicies.email}
          />
          <S.FormCard>
            <header>
              <div>
                <h2>Como corrigir uma configuração</h2>
                <p>Credenciais não podem ser alteradas pelo navegador.</p>
              </div>
            </header>
            <S.InlineAlert $tone="info">
              Atualize as variáveis SMTP no gerenciador de segredos do ambiente, publique novamente
              o backend e confirme nesta tela se o status passou para configurado.
            </S.InlineAlert>
            <label>
              E-mail público de suporte
              <input value={draft.supportEmail} readOnly />
              <small>
                Este endereço é público; ele não é a credencial usada para autenticar no SMTP.
              </small>
            </label>
          </S.FormCard>
        </S.FormGrid>
      );
    }

    if (category === 'integrations') {
      return (
        <PolicyCard
          title="Serviços integrados"
          description="A plataforma informa apenas se as credenciais necessárias existem; nenhum segredo é exposto."
          items={data.systemPolicies.integrations}
        />
      );
    }

    if (category === 'security') {
      return (
        <S.FormGrid>
          <PolicyCard
            title="Controles de autenticação"
            description="Políticas efetivas carregadas pelo backend e aplicadas a todas as contas."
            items={data.systemPolicies.security}
          />
          <S.FormCard>
            <header>
              <div>
                <h2>Responsabilidade operacional</h2>
                <p>
                  Controles sensíveis devem ser modificados no deploy e revisados após a publicação.
                </p>
              </div>
            </header>
            <S.InlineAlert $tone="info">
              Senhas, chaves JWT, tokens de pagamento e credenciais de terceiros nunca são exibidos
              ou salvos por este formulário.
            </S.InlineAlert>
            <S.PolicyList>
              <div className="policy">
                <b>Contas administrativas carregadas</b>
                <small>Revise acessos individuais na aba Administradores.</small>
                <output>{data.administrators.length}</output>
              </div>
              <div className="policy">
                <b>MFA efetivo</b>
                <small>
                  Contas protegidas por configuração individual ou política obrigatória.
                </small>
                <output>{data.administrators.filter((admin) => admin.effectiveMfa).length}</output>
              </div>
            </S.PolicyList>
          </S.FormCard>
        </S.FormGrid>
      );
    }

    return (
      <S.FormGrid>
        <S.FormCard>
          <header>
            <div>
              <h2>Modo manutenção</h2>
              <p>
                Interrompe rotas operacionais, preservando saúde, autenticação e o painel da
                plataforma.
              </p>
            </div>
          </header>
          <div className="line">
            <span>
              <strong>Ativar manutenção global</strong>
              <small>Use somente durante intervenções que possam afetar os restaurantes.</small>
            </span>
            <S.Switch
              $on={draft.maintenanceMode}
              aria-label="Ativar modo manutenção"
              aria-checked={draft.maintenanceMode}
              role="switch"
              onClick={() => set('maintenanceMode', !draft.maintenanceMode)}
            />
          </div>
          <label>
            Mensagem apresentada aos usuários
            <input
              maxLength={500}
              value={draft.maintenanceMessage}
              onChange={(event) => set('maintenanceMessage', event.target.value)}
            />
            <small>
              Informe o motivo e uma orientação clara. Não prometa horário sem confirmação.
            </small>
          </label>
          <label>
            Retenção da auditoria (dias)
            <input
              type="number"
              min={90}
              max={3650}
              step={1}
              value={draft.auditRetentionDays}
              onChange={(event) => set('auditRetentionDays', Number(event.target.value))}
            />
            <small>Eventos mais antigos são removidos pelo job automático de retenção.</small>
          </label>
          {draft.maintenanceMode ? (
            <S.InlineAlert $tone="error">
              O modo manutenção está selecionado. Ele será aplicado somente após salvar.
            </S.InlineAlert>
          ) : null}
        </S.FormCard>
        <PolicyCard
          title="Comportamento efetivo"
          description="Diagnóstico somente leitura informado pelo backend."
          items={data.systemPolicies.maintenance}
        />
      </S.FormGrid>
    );
  };

  return (
    <S.PageStack>
      <SavePanel
        dirty={dirty}
        saving={saving}
        errors={errors}
        error={error}
        success={success}
        updatedAt={baseline.updatedAt}
        onReset={reset}
        onSave={() => void save()}
      />
      <S.SettingsLayout>
        <S.SettingsNav aria-label="Categorias de configuração">
          <label className="sr-only" htmlFor="settings-search">
            Buscar configurações
          </label>
          <input
            id="settings-search"
            placeholder="Buscar configurações…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {visibleCategories.map((item) => (
            <button
              className={category === item.id ? 'active' : undefined}
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
          {!visibleCategories.length ? (
            <S.InlineAlert $tone="info">Nenhuma categoria corresponde à busca.</S.InlineAlert>
          ) : null}
        </S.SettingsNav>
        <S.PageStack>{content()}</S.PageStack>
      </S.SettingsLayout>
    </S.PageStack>
  );
}

export function SettingsPage(props: {
  data: SuperAdminData;
  onSave: (settings: PlatformSettings) => Promise<void>;
}) {
  return <SettingsEditor {...props} />;
}
