import { useEffect, useMemo, useState } from 'react';
import {
  evaluatePassword,
  PasswordRequirements,
  PRIVILEGED_PASSWORD_POLICY,
} from '../../../features/password-policy';
import type {
  AuditLog,
  Invoice,
  PlatformAdministrator,
  PlatformPlan,
  RestaurantTenant,
  SubscriptionLifecycleStatus,
  SuperAdminActions,
  SupportTicket,
} from '../types';
import {
  formatCurrency,
  formatDate,
  normalizeEmail,
  requestErrorMessage,
  statusTone,
  tenantLabels,
} from '../domain/superAdminDomain';
import * as S from '../SuperAdmin.styles';
import { ConfirmAction, Empty, Modal } from './Shared';
import { acquireSocket } from '../../../Services/socketService';
import { getAccessToken } from '../../../modules/auth/session/authSession';

const isoToLocalInput = (value: string | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 16) : '';
const localInputToIso = (value: string) => (value ? new Date(value).toISOString() : null);

export function RestaurantDetails({
  restaurant,
  plans,
  actions,
  onClose,
  notify,
}: {
  restaurant: RestaurantTenant;
  plans: PlatformPlan[];
  actions: SuperAdminActions;
  onClose: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [confirmAccess, setConfirmAccess] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  return (
    <>
      <Modal
        drawer
        title={restaurant.name}
        description={`Tenant #${restaurant.id} • /${restaurant.slug}`}
        onClose={onClose}
        footer={<S.Button onClick={onClose}>Fechar</S.Button>}
      >
        <S.DetailGrid>
          <div>
            <dt>Status operacional</dt>
            <dd>
              <S.Badge $tone={statusTone(restaurant.status)}>
                {tenantLabels[restaurant.status]}
              </S.Badge>
            </dd>
          </div>
          <div>
            <dt>Acesso</dt>
            <dd>{restaurant.active ? 'Liberado' : 'Bloqueado'}</dd>
          </div>
          {!restaurant.active ? (
            <div>
              <dt>Origem do bloqueio</dt>
              <dd>
                {restaurant.accessBlockReason === 'BILLING'
                  ? 'Inadimplência detectada automaticamente'
                  : 'Suspensão manual da plataforma'}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>E-mail</dt>
            <dd>{restaurant.email || 'Não informado'}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{restaurant.phone || 'Não informado'}</dd>
          </div>
          <div>
            <dt>Cadastrado em</dt>
            <dd>{formatDate(restaurant.createdAt, true)}</dd>
          </div>
          <div>
            <dt>Último acesso</dt>
            <dd>{formatDate(restaurant.lastAccessAt, true)}</dd>
          </div>
          <div>
            <dt>Plano atual</dt>
            <dd>{restaurant.subscription?.planCode || 'Sem assinatura'}</dd>
          </div>
          <div>
            <dt>Mensalidade</dt>
            <dd>{formatCurrency(restaurant.monthlyFee)}</dd>
          </div>
          <div>
            <dt>Próxima cobrança</dt>
            <dd>{formatDate(restaurant.nextBillingAt)}</dd>
          </div>
          <div>
            <dt>Volume de pedidos no mês</dt>
            <dd>{formatCurrency(restaurant.monthlyOrderRevenue)}</dd>
          </div>
        </S.DetailGrid>
        <S.Card>
          <S.SectionHeading>
            <div>
              <h2>Administrador principal</h2>
              <p>Responsável com acesso administrativo ao restaurante.</p>
            </div>
          </S.SectionHeading>
          {restaurant.primaryAdmin ? (
            <S.DetailGrid>
              <div>
                <dt>Nome</dt>
                <dd>{restaurant.primaryAdmin.name}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{restaurant.primaryAdmin.email}</dd>
              </div>
            </S.DetailGrid>
          ) : (
            <Empty
              title="Sem administrador"
              description="Crie um administrador na aba Administradores."
            />
          )}
        </S.Card>
        <S.ActionGroup>
          <S.Button $variant="primary" onClick={() => setEditingSubscription(true)}>
            Editar assinatura
          </S.Button>
          <S.Button
            $variant={restaurant.active ? 'danger' : 'quiet'}
            onClick={() => setConfirmAccess(true)}
          >
            {restaurant.active ? 'Bloquear acesso' : 'Liberar acesso'}
          </S.Button>
        </S.ActionGroup>
      </Modal>
      {confirmAccess ? (
        <ConfirmAction
          title={restaurant.active ? 'Bloquear restaurante' : 'Liberar restaurante'}
          description={
            restaurant.active
              ? 'O restaurante e seus usuários perderão o acesso operacional. A ação será auditada.'
              : 'O acesso operacional será restabelecido imediatamente.'
          }
          confirmLabel={restaurant.active ? 'Bloquear acesso' : 'Liberar acesso'}
          danger={restaurant.active}
          onClose={() => setConfirmAccess(false)}
          onConfirm={async (reason) => {
            await actions.updateRestaurantAccess(restaurant.id, {
              active: !restaurant.active,
              reason,
            });
            notify('Acesso do restaurante atualizado.');
          }}
        />
      ) : null}
      {editingSubscription ? (
        <SubscriptionDialog
          restaurant={restaurant}
          plans={plans}
          actions={actions}
          onClose={() => setEditingSubscription(false)}
          notify={notify}
        />
      ) : null}
    </>
  );
}

export function SubscriptionDialog({
  restaurant,
  plans,
  actions,
  onClose,
  notify,
}: {
  restaurant: RestaurantTenant;
  plans: PlatformPlan[];
  actions: SuperAdminActions;
  onClose: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const subscription = restaurant.subscription;
  const [planCode, setPlanCode] = useState(
    subscription?.planCode || plans.find((plan) => plan.active)?.code || '',
  );
  const [status, setStatus] = useState<SubscriptionLifecycleStatus>(
    subscription?.status || 'TESTE',
  );
  const [trialEndsAt, setTrialEndsAt] = useState(isoToLocalInput(subscription?.trialEndsAt));
  const [nextBillingAt, setNextBillingAt] = useState(isoToLocalInput(restaurant.nextBillingAt));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (reason.trim().length < 8) {
      setError('Informe um motivo com pelo menos 8 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await actions.updateSubscription(restaurant.id, {
        planCode,
        status,
        trialEndsAt: localInputToIso(trialEndsAt),
        nextBillingAt: localInputToIso(nextBillingAt),
        reason: reason.trim(),
      });
      notify('Assinatura atualizada.');
      onClose();
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível atualizar a assinatura.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title="Editar assinatura"
      description={`Alterações para ${restaurant.name} afetam acesso e próximas cobranças.`}
      onClose={onClose}
      footer={
        <>
          <S.Button onClick={onClose}>Cancelar</S.Button>
          <S.Button $variant="primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Salvando…' : 'Salvar assinatura'}
          </S.Button>
        </>
      }
    >
      <S.Fields>
        <label>
          Plano
          <select value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
            {plans.map((plan) => (
              <option key={plan.code} value={plan.code}>
                {plan.name}
                {plan.active ? '' : ' (inativo)'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SubscriptionLifecycleStatus)}
          >
            <option value="TESTE">Período de teste</option>
            <option value="ATIVA">Ativa</option>
            <option value="EXPIRADA">Expirada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </label>
        <label>
          Fim do trial
          <input
            type="datetime-local"
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.target.value)}
          />
        </label>
        <label>
          Próxima cobrança
          <input
            type="datetime-local"
            value={nextBillingAt}
            onChange={(e) => setNextBillingAt(e.target.value)}
          />
        </label>
        <label className="wide">
          Motivo
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo registrado na auditoria"
          />
        </label>
      </S.Fields>
      {error ? (
        <S.InlineAlert $tone="error" role="alert">
          {error}
        </S.InlineAlert>
      ) : null}
    </Modal>
  );
}

export function EditPlanDialog({
  plan,
  actions,
  onClose,
  notify,
}: {
  plan: PlatformPlan;
  actions: SuperAdminActions;
  onClose: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [form, setForm] = useState({ ...plan, featuresText: plan.features.join('\n') });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    const features = form.featuresText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    if (form.name.trim().length < 2 || form.description.trim().length < 10 || !features.length) {
      setError('Preencha nome, descrição detalhada e pelo menos uma funcionalidade.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await actions.updatePlan(plan.code, {
        name: form.name.trim(),
        description: form.description.trim(),
        monthlyFee: Number(form.monthlyFee),
        trialDays: Number(form.trialDays),
        features,
        featured: form.featured,
        active: form.active,
        version: plan.version,
      });
      notify('Plano atualizado para novas cobranças.');
      onClose();
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível atualizar o plano.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={`Editar plano ${plan.name}`}
      description="O novo preço é aplicado às próximas faturas; cobranças já emitidas não são recalculadas."
      onClose={onClose}
      footer={
        <>
          <S.Button onClick={onClose}>Cancelar</S.Button>
          <S.Button $variant="primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Salvando…' : 'Salvar plano'}
          </S.Button>
        </>
      }
    >
      <S.Fields>
        <label>
          Nome
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Mensalidade
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.monthlyFee}
            onChange={(e) => setForm({ ...form, monthlyFee: Number(e.target.value) })}
          />
        </label>
        <label>
          Dias de trial
          <input
            type="number"
            min="0"
            max="90"
            value={form.trialDays}
            onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })}
          />
        </label>
        <label className="wide">
          Descrição
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="wide">
          Funcionalidades — uma por linha
          <textarea
            value={form.featuresText}
            onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
          />
        </label>
        <label className="wide">
          <span>
            Plano ativo{' '}
            <S.Switch
              type="button"
              role="switch"
              aria-checked={form.active}
              $on={form.active}
              onClick={() => setForm({ ...form, active: !form.active })}
            />
          </span>
        </label>
      </S.Fields>
      {error ? (
        <S.InlineAlert $tone="error" role="alert">
          {error}
        </S.InlineAlert>
      ) : null}
    </Modal>
  );
}

export function CreateAdministratorDialog({
  restaurants,
  actions,
  initialRestaurantId,
  onClose,
  notify,
}: {
  restaurants: RestaurantTenant[];
  actions: SuperAdminActions;
  initialRestaurantId?: number;
  onClose: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [restaurantId, setRestaurantId] = useState(initialRestaurantId || restaurants[0]?.id || 0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const passwordEvaluation = useMemo(
    () => evaluatePassword(password, confirmation, PRIVILEGED_PASSWORD_POLICY),
    [confirmation, password],
  );
  const save = async () => {
    if (!restaurantId || name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(normalizeEmail(email))) {
      setError('Preencha restaurante, nome e e-mail válido.');
      return;
    }
    if (!passwordEvaluation.isValid) {
      setError(passwordEvaluation.errors.join(' '));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await actions.createAdministrator(restaurantId, {
        name: name.trim(),
        email: normalizeEmail(email),
        password,
        passwordConfirmation: confirmation,
      });
      notify('Administrador criado. Ele deverá trocar a senha temporária no primeiro acesso.');
      onClose();
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível criar o administrador.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title="Novo administrador"
      description="Crie um acesso individual. Nunca compartilhe credenciais entre pessoas."
      onClose={onClose}
      footer={
        <>
          <S.Button onClick={onClose}>Cancelar</S.Button>
          <S.Button
            $variant="primary"
            disabled={saving || !passwordEvaluation.isValid}
            onClick={() => void save()}
          >
            {saving ? 'Criando…' : 'Criar administrador'}
          </S.Button>
        </>
      }
    >
      <S.Fields>
        <label className="wide">
          Restaurante
          <select value={restaurantId} onChange={(e) => setRestaurantId(Number(e.target.value))}>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nome completo
          <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Senha temporária
          <input
            type="password"
            autoComplete="new-password"
            minLength={PRIVILEGED_PASSWORD_POLICY.minLength}
            maxLength={PRIVILEGED_PASSWORD_POLICY.maxLength}
            aria-describedby="administrator-password-requirements"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Confirmar senha
          <input
            type="password"
            autoComplete="new-password"
            minLength={PRIVILEGED_PASSWORD_POLICY.minLength}
            maxLength={PRIVILEGED_PASSWORD_POLICY.maxLength}
            aria-describedby="administrator-password-requirements"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
      </S.Fields>
      <PasswordRequirements
        id="administrator-password-requirements"
        password={password}
        confirmation={confirmation}
        policy={PRIVILEGED_PASSWORD_POLICY}
        title="A senha temporária precisa ter:"
      />
      {error ? (
        <S.InlineAlert $tone="error" role="alert">
          {error}
        </S.InlineAlert>
      ) : null}
    </Modal>
  );
}

export function AdministratorDetails({
  administrator,
  actions,
  onClose,
  notify,
}: {
  administrator: PlatformAdministrator;
  actions: SuperAdminActions;
  onClose: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Modal
        title={administrator.name}
        description={administrator.restaurant}
        onClose={onClose}
        footer={<S.Button onClick={onClose}>Fechar</S.Button>}
      >
        <S.DetailGrid>
          <div>
            <dt>E-mail</dt>
            <dd>{administrator.email}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <S.Badge $tone={statusTone(administrator.status)}>
                {administrator.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
              </S.Badge>
            </dd>
          </div>
          <div>
            <dt>Último acesso</dt>
            <dd>{formatDate(administrator.lastAccessAt, true)}</dd>
          </div>
          <div>
            <dt>MFA efetivo</dt>
            <dd>{administrator.effectiveMfa ? 'Protegido' : 'Não habilitado'}</dd>
          </div>
          <div>
            <dt>Troca de senha pendente</dt>
            <dd>{administrator.mustChangePassword ? 'Sim' : 'Não'}</dd>
          </div>
          <div>
            <dt>Criado em</dt>
            <dd>{formatDate(administrator.createdAt, true)}</dd>
          </div>
        </S.DetailGrid>
        <S.ActionGroup>
          <S.Button
            $variant={administrator.status === 'ACTIVE' ? 'danger' : 'primary'}
            onClick={() => setConfirm(true)}
          >
            {administrator.status === 'ACTIVE' ? 'Bloquear administrador' : 'Liberar administrador'}
          </S.Button>
        </S.ActionGroup>
      </Modal>
      {confirm ? (
        <ConfirmAction
          title={
            administrator.status === 'ACTIVE' ? 'Bloquear administrador' : 'Liberar administrador'
          }
          description="A alteração de acesso é imediata e ficará registrada na auditoria."
          confirmLabel={administrator.status === 'ACTIVE' ? 'Bloquear' : 'Liberar'}
          danger={administrator.status === 'ACTIVE'}
          onClose={() => setConfirm(false)}
          onConfirm={async (reason) => {
            await actions.updateAdministratorAccess(administrator.id, {
              active: administrator.status !== 'ACTIVE',
              reason,
            });
            notify('Acesso do administrador atualizado.');
          }}
        />
      ) : null}
    </>
  );
}

export function SupportConversation({
  ticket,
  actions,
  onClose,
  notify,
}: {
  ticket: SupportTicket;
  actions: SuperAdminActions;
  onClose: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [messages, setMessages] = useState<
    Awaited<ReturnType<SuperAdminActions['getSupportMessages']>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setMessages(await actions.getSupportMessages(ticket.restaurantId));
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível carregar a conversa.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    actions
      .getSupportMessages(ticket.restaurantId)
      .then((result) => {
        if (active) setMessages(result);
      })
      .catch((requestError) => {
        if (active)
          setError(requestErrorMessage(requestError, 'Não foi possível carregar a conversa.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actions, ticket.restaurantId]);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;

    const { socket, release } = acquireSocket(token, 'super-admin-support-conversation');
    const onMessage = (incoming: { restaurantId?: number | string }) => {
      if (Number(incoming?.restaurantId) !== Number(ticket.restaurantId)) return;
      void actions
        .getSupportMessages(ticket.restaurantId)
        .then(setMessages)
        .catch(() => undefined);
    };
    socket.on('support:chat-message', onMessage);
    return () => {
      socket.off('support:chat-message', onMessage);
      release();
    };
  }, [actions, ticket.restaurantId]);
  const send = async (closeConversation = false) => {
    if (message.trim().length < 2) {
      setError('Escreva uma resposta antes de enviar.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await actions.sendSupportMessage(ticket.restaurantId, message.trim(), closeConversation);
      setMessage('');
      await load();
      notify(
        closeConversation
          ? 'Resposta enviada e atendimento encerrado.'
          : 'Resposta enviada ao restaurante.',
      );
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível enviar a resposta.'));
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal
      title={`Suporte • ${ticket.restaurant}`}
      description={ticket.subject}
      onClose={onClose}
      footer={
        <>
          <S.Button onClick={onClose}>Fechar</S.Button>
          <S.Button disabled={sending} onClick={() => void send(true)}>
            {sending ? 'Enviando…' : 'Responder e encerrar'}
          </S.Button>
          <S.Button $variant="primary" disabled={sending} onClick={() => void send()}>
            {sending ? 'Enviando…' : 'Enviar resposta'}
          </S.Button>
        </>
      }
    >
      <S.Chat aria-live="polite">
        {loading ? (
          <p>Carregando conversa…</p>
        ) : messages.length ? (
          messages.map((item) => (
            <article
              key={item.id}
              className={`message ${item.senderRole === 'SUPER_ADMIN' ? 'super' : ''}`}
            >
              <b>{item.senderLabel || item.senderRole}</b>
              <p>{item.message}</p>
              <time>{formatDate(item.sentAt, true)}</time>
            </article>
          ))
        ) : (
          <Empty
            title="Conversa vazia"
            description="Nenhuma mensagem foi encontrada para este restaurante."
          />
        )}
      </S.Chat>
      <S.Fields>
        {ticket.status === 'CLOSED' ? (
          <S.InlineAlert $tone="success" className="wide" role="status">
            Atendimento encerrado. Uma nova mensagem do restaurante reabrirá a conversa
            automaticamente.
          </S.InlineAlert>
        ) : null}
        <label className="wide">
          Sua resposta
          <textarea
            maxLength={1200}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Descreva o diagnóstico e o próximo passo com clareza"
          />
          <small>{message.length}/1200 caracteres</small>
        </label>
      </S.Fields>
      {error ? (
        <S.InlineAlert $tone="error" role="alert">
          {error}
        </S.InlineAlert>
      ) : null}
    </Modal>
  );
}

export function AuditDetails({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <Modal
      title="Detalhes do evento"
      description={`Registro imutável #${log.id}`}
      onClose={onClose}
      footer={<S.Button onClick={onClose}>Fechar</S.Button>}
    >
      <S.DetailGrid>
        <div>
          <dt>Data e hora</dt>
          <dd>{formatDate(log.createdAt, true)}</dd>
        </div>
        <div>
          <dt>Resultado</dt>
          <dd>
            <S.Badge $tone={statusTone(log.result)}>{log.result}</S.Badge>
          </dd>
        </div>
        <div>
          <dt>Usuário</dt>
          <dd>
            {log.user} ({log.role})
          </dd>
        </div>
        <div>
          <dt>Restaurante</dt>
          <dd>{log.restaurant}</dd>
        </div>
        <div>
          <dt>Ação</dt>
          <dd>{log.action}</dd>
        </div>
        <div>
          <dt>Recurso</dt>
          <dd>{log.resource}</dd>
        </div>
        <div>
          <dt>IP</dt>
          <dd>{log.ip}</dd>
        </div>
        <div>
          <dt>Request ID</dt>
          <dd>{log.requestId || 'Não disponível'}</dd>
        </div>
        <div>
          <dt>User agent</dt>
          <dd>{log.userAgent || 'Não disponível'}</dd>
        </div>
      </S.DetailGrid>
      {log.metadata ? (
        <S.InlineAlert $tone="info">
          <b>Metadados técnicos</b>
          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
        </S.InlineAlert>
      ) : null}
    </Modal>
  );
}

export function InvoiceDetails({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <Modal
      title={invoice.code}
      description={invoice.restaurant}
      onClose={onClose}
      footer={
        <>
          <S.Button onClick={onClose}>Fechar</S.Button>
          {invoice.paymentLink ? (
            <S.Button
              as="a"
              href={invoice.paymentLink}
              target="_blank"
              rel="noreferrer"
              $variant="primary"
            >
              Abrir link de pagamento
            </S.Button>
          ) : null}
        </>
      }
    >
      <S.DetailGrid>
        <div>
          <dt>Status</dt>
          <dd>
            <S.Badge $tone={statusTone(invoice.status)}>{invoice.status}</S.Badge>
          </dd>
        </div>
        <div>
          <dt>Vencimento</dt>
          <dd>{formatDate(invoice.dueDate)}</dd>
        </div>
        <div>
          <dt>Mensalidade</dt>
          <dd>{formatCurrency(invoice.monthlyFee)}</dd>
        </div>
        <div>
          <dt>Taxas do sistema</dt>
          <dd>{formatCurrency(invoice.systemFees)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatCurrency(invoice.value)}</dd>
        </div>
        <div>
          <dt>Pago em</dt>
          <dd>{formatDate(invoice.paidAt, true)}</dd>
        </div>
      </S.DetailGrid>
    </Modal>
  );
}
