import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  FileDown,
  LockKeyhole,
  ShieldCheck,
  Store,
  Ticket,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { PlatformSettings, SuperAdminData, TenantStatus } from "./types";
import * as S from "./SuperAdmin.styles";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const tenantLabel: Record<TenantStatus, string> = {
  ACTIVE: "ATIVO",
  TRIAL: "TRIAL",
  OVERDUE: "EM ATRASO",
  BLOCKED: "BLOQUEADO",
  CANCELED: "CANCELADO",
};
const tone = (status: string): "green" | "red" | "yellow" | "blue" | "gray" =>
  ["ACTIVE", "ATIVA", "PAID", "SUCCESS"].includes(status)
    ? "green"
    : ["OVERDUE", "BLOCKED", "CRITICAL", "FAILURE"].includes(status)
      ? "red"
      : ["TRIAL", "PENDING", "INVITED", "WAITING_CUSTOMER"].includes(status)
        ? "yellow"
        : ["IN_PROGRESS"].includes(status)
          ? "blue"
          : "gray";
function Metrics({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    hint?: string;
  }[];
}) {
  return (
    <S.Metrics>
      {items.map((item) => (
        <S.Metric key={item.label}>
          <i>{item.icon ?? <Store />}</i>
          <span className="copy">
            <span>{item.label}</span>
            <b>{item.value}</b>
            {item.hint && <small>{item.hint}</small>}
          </span>
        </S.Metric>
      ))}
    </S.Metrics>
  );
}
function Toolbar({
  placeholder = "Buscar...",
  children,
}: {
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <S.Toolbar>
      <input placeholder={placeholder} />
      {children}
      <button>
        <FileDown size={16} /> Exportar
      </button>
    </S.Toolbar>
  );
}

export function OverviewPage({
  data,
  onSelect,
}: {
  data: SuperAdminData;
  onSelect?: (id: string) => void;
}) {
  const active = data.restaurants.filter((r) => r.status === "ACTIVE").length;
  return (
    <>
      <Metrics
        items={[
          {
            label: "Restaurantes ativos",
            value: data.metrics?.restaurantsActive ?? active,
            icon: <Building2 />,
            hint: `${data.metrics?.restaurantsTotal ?? data.restaurants.length} no total`,
          },
          {
            label: "Receita mensal",
            value: data.metrics ? brl(data.metrics.mrr) : "R$ 0",
            icon: <DollarSign />,
            hint: "MRR atual",
          },
          {
            label: "Em período de teste",
            value: data.metrics?.restaurantsTrial ?? 0,
            icon: <Clock3 />,
          },
          {
            label: "Faturas pendentes",
            value: data.metrics?.pendingInvoicesCount ?? 0,
            icon: <AlertTriangle />,
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <header>
            <div>
              <h2>Crescimento da plataforma</h2>
              <p>Restaurantes ativos nos últimos seis meses.</p>
            </div>
          </header>
          <S.Chart>
            {(data.metrics?.monthlyGrowth ?? []).map((m) => {
              const max = Math.max(
                ...(data.metrics?.monthlyGrowth ?? []).map((x) => x.count),
                1,
              );
              return (
                <div
                  key={m.label}
                  className="bar"
                  style={{ height: `${Math.round((m.count / max) * 100)}%` }}
                >
                  <span>{m.label}</span>
                </div>
              );
            })}
          </S.Chart>
        </S.Card>
        <S.Card>
          <header>
            <div>
              <h2>Saúde das assinaturas</h2>
              <p>Distribuição atual por status.</p>
            </div>
            <ShieldCheck />
          </header>
          <S.Stack>
            <S.ListItem>
              <span className="info">
                <b>Ativas</b>
                <span>Restaurantes com acesso normal</span>
              </span>
              <strong>{data.metrics?.restaurantsActive ?? active}</strong>
            </S.ListItem>
            <S.ListItem>
              <span className="info">
                <b>Trial</b>
                <span>Em período de avaliação</span>
              </span>
              <strong>{data.metrics?.restaurantsTrial ?? 0}</strong>
            </S.ListItem>
            <S.ListItem>
              <span className="info">
                <b>Em atraso</b>
                <span>Requer acompanhamento</span>
              </span>
              <strong>{data.metrics?.restaurantsOverdue ?? 0}</strong>
            </S.ListItem>
            <S.ListItem>
              <span className="info">
                <b>Canceladas</b>
              </span>
              <strong>{data.metrics?.restaurantsCanceled ?? 0}</strong>
            </S.ListItem>
          </S.Stack>
        </S.Card>
      </S.Grid>
      <S.Card style={{ marginTop: 17 }}>
        <header>
          <div>
            <h2>Restaurantes recentes</h2>
            <p>Últimos tenants cadastrados.</p>
          </div>
        </header>
        <RestaurantTable data={data} onSelect={onSelect} />
      </S.Card>
    </>
  );
}

function RestaurantTable({
  data,
  onSelect,
}: {
  data: SuperAdminData;
  onSelect?: (id: string) => void;
}) {
  return (
    <S.Table>
      <div className="row head">
        <span>Restaurante</span>
        <span>Responsável</span>
        <span>Plano</span>
        <span>Status</span>
        <span>Último acesso</span>
        <span>Ação</span>
      </div>
      {data.restaurants.map((r) => (
        <div className="row" key={r.id}>
          <span className="name">
            <b>{r.name}</b>
            <small>{r.email}</small>
          </span>
          <span>{r.responsible}</span>
          <span>{r.plan}</span>
          <S.Badge $tone={tone(r.status)}>{tenantLabel[r.status]}</S.Badge>
          <span>{r.lastAccess}</span>
          <button className="action" onClick={() => onSelect?.(r.id)}>
            Ver detalhes
          </button>
        </div>
      ))}
    </S.Table>
  );
}

export function RestaurantsPage({
  data,
  onSelect,
}: {
  data: SuperAdminData;
  onSelect?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () =>
      data.restaurants.filter((r) =>
        `${r.name} ${r.responsible} ${r.email}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data, query],
  );
  return (
    <>
      <S.Toolbar>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar restaurante, domínio ou responsável"
        />
        <select>
          <option>Todos os planos</option>
          <option>Básico</option>
          <option>Premium</option>
        </select>
        <select>
          <option>Todos os status</option>
        </select>
        <button>Exportar</button>
      </S.Toolbar>
      <Metrics
        items={[
          {
            label: "Total",
            value: data.metrics?.restaurantsTotal ?? data.restaurants.length,
          },
          {
            label: "Ativos",
            value: data.metrics?.restaurantsActive ?? 0,
            icon: <CheckCircle2 />,
          },
          {
            label: "Em teste",
            value: data.metrics?.restaurantsTrial ?? 0,
            icon: <Clock3 />,
          },
          {
            label: "Bloqueados",
            value: data.metrics?.restaurantsBlocked ?? 0,
            icon: <LockKeyhole />,
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <RestaurantTable
            data={{ ...data, restaurants: visible }}
            onSelect={onSelect}
          />
        </S.Card>
        <S.Card>
          <header>
            <h2>Ações rápidas</h2>
          </header>
          <S.Stack>
            {["Reenviar acesso", "Alterar plano", "Bloquear restaurante"].map(
              (item) => (
                <S.ListItem key={item}>
                  <span className="info">
                    <b>{item}</b>
                    <span>Selecione um restaurante para continuar</span>
                  </span>
                  <span>›</span>
                </S.ListItem>
              ),
            )}
          </S.Stack>
        </S.Card>
      </S.Grid>
    </>
  );
}

export function SubscriptionsPage({ data }: { data: SuperAdminData }) {
  return (
    <>
      <Toolbar placeholder="Buscar por restaurante">
        <select>
          <option>Todos os status</option>
        </select>
        <select>
          <option>Todos os planos</option>
        </select>
        <select>
          <option>Próximos 30 dias</option>
        </select>
      </Toolbar>
      <Metrics
        items={[
          {
            label: "Ativas",
            value: data.restaurants.filter((r) => r.status === "ACTIVE").length,
            icon: <CheckCircle2 />,
          },
          {
            label: "Trials",
            value: data.metrics?.restaurantsTrial ?? 0,
            icon: <Clock3 />,
          },
          {
            label: "Renovam este mês",
            value: data.metrics?.restaurantsActive ?? 0,
            icon: <CreditCard />,
          },
          {
            label: "Em atraso",
            value: data.metrics?.restaurantsOverdue ?? 0,
            icon: <AlertTriangle />,
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <S.Table>
            <div className="row head">
              <span>Restaurante</span>
              <span>Plano</span>
              <span>Status</span>
              <span>Início</span>
              <span>Próxima cobrança</span>
              <span>Valor</span>
            </div>
            {data.restaurants.map((r) => (
              <div className="row" key={r.id}>
                <b>{r.name}</b>
                <span>{r.plan}</span>
                <S.Badge $tone={tone(r.status)}>
                  {tenantLabel[r.status]}
                </S.Badge>
                <span>{r.createdAt}</span>
                <span>{r.status === "BLOCKED" ? "—" : "15/08/2026"}</span>
                <span>{brl(r.monthlyRevenue)}</span>
              </div>
            ))}
          </S.Table>
        </S.Card>
        <S.Stack>
          <S.Card>
            <header>
              <h2>Próximas renovações</h2>
            </header>
            {data.restaurants.slice(0, 4).map((r) => (
              <S.ListItem key={r.id}>
                <span className="info">
                  <b>{r.name}</b>
                  <span>{r.nextBillingAt ?? "\u2014"}</span>
                </span>
                <strong>{brl(r.monthlyRevenue)}</strong>
              </S.ListItem>
            ))}
          </S.Card>
          <S.Card>
            <header>
              <h2>Ações rápidas</h2>
            </header>
            {[
              "Estender trial",
              "Alterar vencimento",
              "Cancelar assinatura",
            ].map((x) => (
              <S.ListItem key={x}>
                <b>{x}</b>
                <span>›</span>
              </S.ListItem>
            ))}
          </S.Card>
        </S.Stack>
      </S.Grid>
    </>
  );
}

export function PlansPage({ data }: { data: SuperAdminData }) {
  return (
    <>
      <Metrics
        items={[
          { label: "Planos ativos", value: data.plans.length },
          {
            label: "Assinaturas pagas",
            value: data.metrics?.restaurantsActive ?? 0,
            icon: <Users />,
          },
          {
            label: "MRR",
            value: data.metrics ? brl(data.metrics.mrr) : "R$ 0",
            icon: <DollarSign />,
          },
        ]}
      />
      <S.PlanGrid>
        {data.plans.map((plan) => (
          <S.PlanCard key={plan.id} $featured={plan.featured}>
            <h2>{plan.name}</h2>
            <div className="price">
              {plan.price ? brl(plan.price) : "Preço sob consulta"}
              {plan.price && <small>/mês</small>}
            </div>
            <small>{plan.restaurants} restaurantes</small>
            <div className="features">
              {plan.features.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
            <button className="edit">Editar plano</button>
          </S.PlanCard>
        ))}
      </S.PlanGrid>
    </>
  );
}

export function BillingPage({ data }: { data: SuperAdminData }) {
  return (
    <>
      <Metrics
        items={[
          {
            label: "MRR",
            value: data.metrics ? brl(data.metrics.mrr) : "R$ 0",
            icon: <DollarSign />,
          },
          {
            label: "Gerado no período",
            value: data.metrics ? brl(data.metrics.totalGenerated) : "R$ 0",
            icon: <CreditCard />,
          },
          {
            label: "Faturas pendentes",
            value: data.metrics
              ? brl(data.metrics.pendingInvoicesTotal)
              : "R$ 0",
            icon: <Clock3 />,
          },
          {
            label: "Qtd. faturas abertas",
            value: data.metrics?.pendingInvoicesCount ?? 0,
            icon: <AlertTriangle />,
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <header>
            <h2>Receita recorrente</h2>
          </header>
          <S.Chart>
            {(data.metrics?.monthlyRevenue ?? []).map((m) => {
              const max = Math.max(
                ...(data.metrics?.monthlyRevenue ?? []).map((x) => x.value),
                1,
              );
              return (
                <div
                  className="bar"
                  style={{ height: `${Math.round((m.value / max) * 100)}%` }}
                  key={m.label}
                >
                  <span>{m.label}</span>
                </div>
              );
            })}
          </S.Chart>
        </S.Card>
        <S.Card>
          <header>
            <h2>Resumo financeiro</h2>
          </header>
          <S.ListItem key="gerado">
            <b>Total gerado (pedidos)</b>
            <strong>
              {data.metrics ? brl(data.metrics.totalGenerated) : "R$\u00a00"}
            </strong>
          </S.ListItem>
          <S.ListItem key="recebiveis">
            <b>Taxa da plataforma (recebíveis)</b>
            <strong>
              {data.metrics ? brl(data.metrics.totalReceivable) : "R$\u00a00"}
            </strong>
          </S.ListItem>
          <S.ListItem key="pendente">
            <b>Faturas pendentes</b>
            <strong>
              {data.metrics
                ? brl(data.metrics.pendingInvoicesTotal)
                : "R$\u00a00"}
            </strong>
          </S.ListItem>
        </S.Card>
      </S.Grid>
      <S.Card style={{ marginTop: 17 }}>
        <header>
          <h2>Cobranças recentes</h2>
        </header>
        <S.Table>
          <div className="row head">
            <span>Restaurante</span>
            <span>Fatura</span>
            <span>Vencimento</span>
            <span>Valor</span>
            <span>Status</span>
            <span>Ação</span>
          </div>
          {data.invoices.map((i) => (
            <div className="row" key={i.id}>
              <b>{i.restaurant}</b>
              <span>{i.id}</span>
              <span>{i.dueDate}</span>
              <span>{brl(i.value)}</span>
              <S.Badge $tone={tone(i.status)}>{i.status}</S.Badge>
              <button className="action">Ver detalhes</button>
            </div>
          ))}
        </S.Table>
      </S.Card>
    </>
  );
}

export function AdministratorsPage({ data }: { data: SuperAdminData }) {
  return (
    <>
      <Toolbar placeholder="Buscar nome, e-mail ou restaurante">
        <select>
          <option>Todos os restaurantes</option>
        </select>
        <select>
          <option>Todos os status</option>
        </select>
      </Toolbar>
      <Metrics
        items={[
          {
            label: "Administradores",
            value: data.administrators.length,
            icon: <Users />,
          },
          {
            label: "Ativos",
            value: data.administrators.filter((a) => a.status === "ACTIVE")
              .length,
            icon: <CheckCircle2 />,
          },
          {
            label: "Convites pendentes",
            value: data.administrators.filter((a) => a.status === "INVITED")
              .length,
            icon: <Clock3 />,
          },
          {
            label: "Acessos bloqueados",
            value: data.administrators.filter((a) => a.status === "BLOCKED")
              .length,
            icon: <LockKeyhole />,
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <S.Table>
            <div className="row head">
              <span>Administrador</span>
              <span>Restaurante</span>
              <span>Status</span>
              <span>Último acesso</span>
              <span>2FA</span>
              <span>Ação</span>
            </div>
            {data.administrators.map((a) => (
              <div className="row" key={a.id}>
                <span className="name">
                  <b>{a.name}</b>
                  <small>{a.email}</small>
                </span>
                <span>{a.restaurant}</span>
                <S.Badge $tone={tone(a.status)}>{a.status}</S.Badge>
                <span>{a.lastAccess}</span>
                <span>{a.twoFactor ? "Ativado" : "Não ativado"}</span>
                <button className="action">Ver detalhes</button>
              </div>
            ))}
          </S.Table>
        </S.Card>
        <S.Card>
          <header>
            <h2>Segurança de acesso</h2>
          </header>
          <Metrics
            items={[
              { label: "2FA habilitado", value: "81%", icon: <ShieldCheck /> },
            ]}
          />
          <S.ListItem>
            <b>Senhas redefinidas</b>
            <strong>4</strong>
          </S.ListItem>
          <S.ListItem>
            <b>Tentativas bloqueadas</b>
            <strong>12</strong>
          </S.ListItem>
        </S.Card>
      </S.Grid>
    </>
  );
}

export function SupportPage({ data }: { data: SuperAdminData }) {
  return (
    <>
      <Toolbar placeholder="Buscar chamados">
        <select>
          <option>Prioridade</option>
        </select>
        <select>
          <option>Status</option>
        </select>
      </Toolbar>
      <Metrics
        items={[
          {
            label: "Abertos",
            value: data.tickets.filter((t) => t.status === "OPEN").length,
            icon: <Ticket />,
          },
          {
            label: "Críticos",
            value: data.tickets.filter((t) => t.priority === "CRITICAL").length,
            icon: <AlertTriangle />,
          },
          {
            label: "Em atendimento",
            value: data.tickets.filter((t) => t.status === "IN_PROGRESS")
              .length,
            icon: <Users />,
          },
          {
            label: "Total de chamados",
            value: data.tickets.length,
            icon: <Clock3 />,
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <S.Table>
            <div className="row head">
              <span>Protocolo</span>
              <span>Restaurante</span>
              <span>Assunto</span>
              <span>Prioridade</span>
              <span>Status</span>
              <span>Ação</span>
            </div>
            {data.tickets.map((t) => (
              <div className="row" key={t.id}>
                <b>{t.id}</b>
                <span>{t.restaurant}</span>
                <span>{t.subject}</span>
                <S.Badge $tone={tone(t.priority)}>{t.priority}</S.Badge>
                <S.Badge $tone={tone(t.status)}>{t.status}</S.Badge>
                <button className="action">Ver conversa</button>
              </div>
            ))}
          </S.Table>
        </S.Card>
        <S.Stack>
          <S.Card>
            <header>
              <h2>Fila crítica</h2>
            </header>
            {data.tickets
              .filter((t) => t.priority === "CRITICAL")
              .map((t) => (
                <S.ListItem key={t.id}>
                  <span className="info">
                    <b>{t.restaurant}</b>
                    <span>{t.subject}</span>
                  </span>
                  <button>Assumir</button>
                </S.ListItem>
              ))}
          </S.Card>
          <S.Card>
            <header>
              <h2>SLA de hoje</h2>
            </header>
            <Metrics
              items={[
                { label: "Meta: 90%", value: "94%", icon: <CheckCircle2 /> },
              ]}
            />
          </S.Card>
        </S.Stack>
      </S.Grid>
    </>
  );
}

export function AuditPage({ data }: { data: SuperAdminData }) {
  return (
    <>
      <Toolbar placeholder="Buscar usuário, ação ou recurso">
        <select>
          <option>Período</option>
        </select>
        <select>
          <option>Tipo de ação</option>
        </select>
        <select>
          <option>Usuário</option>
        </select>
      </Toolbar>
      <Metrics
        items={[
          { label: "Eventos registrados", value: data.auditLogs.length },
          {
            label: "Ações críticas",
            value: data.auditLogs.filter(
              (l) => l.result === "FAILURE" || l.result === "BLOCKED",
            ).length,
            icon: <ShieldCheck />,
          },
          {
            label: "Falhas de acesso",
            value: data.auditLogs.filter((l) => l.result === "FAILURE").length,
            icon: <LockKeyhole />,
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <S.Table>
            <div className="row head">
              <span>Data e hora</span>
              <span>Usuário</span>
              <span>Restaurante</span>
              <span>Ação</span>
              <span>IP</span>
              <span>Resultado</span>
            </div>
            {data.auditLogs.map((log) => (
              <div className="row" key={log.id}>
                <span>{log.date}</span>
                <span className="name">
                  <b>{log.user}</b>
                  <small>{log.role}</small>
                </span>
                <span>{log.restaurant}</span>
                <span>{log.action}</span>
                <span>{log.ip}</span>
                <S.Badge $tone={tone(log.result)}>{log.result}</S.Badge>
              </div>
            ))}
          </S.Table>
        </S.Card>
        <S.Card>
          <header>
            <h2>Eventos críticos</h2>
          </header>
          {[
            "Bloqueio manual de assinatura",
            "Exclusão de restaurante solicitada",
            "Múltiplas falhas de login",
          ].map((x) => (
            <S.ListItem key={x}>
              <span className="info">
                <b>{x}</b>
                <span>Ver detalhes do evento</span>
              </span>
              <span>›</span>
            </S.ListItem>
          ))}
        </S.Card>
      </S.Grid>
    </>
  );
}

export function SettingsPage({
  initial,
  onSave,
}: {
  initial: PlatformSettings;
  onSave?: (settings: PlatformSettings) => void | Promise<void>;
}) {
  const [settings, setSettings] = useState(initial);
  const set = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ) => setSettings((prev) => ({ ...prev, [key]: value }));
  return (
    <S.SettingsLayout>
      <S.SettingsNav>
        <input placeholder="Buscar configurações..." />
        {[
          "Geral",
          "Assinaturas e trial",
          "Cobranças",
          "E-mails",
          "Integrações",
          "Segurança",
          "Manutenção",
        ].map((x, i) => (
          <button key={x} className={i === 0 ? "active" : ""}>
            {x}
          </button>
        ))}
      </S.SettingsNav>
      <div>
        <S.FormGrid>
          <S.FormCard>
            <header>
              <h2>Identidade da plataforma</h2>
            </header>
            <label>
              Nome da plataforma
              <input
                value={settings.platformName}
                onChange={(e) => set("platformName", e.target.value)}
              />
            </label>
            <label>
              Domínio
              <input
                value={settings.domain}
                onChange={(e) => set("domain", e.target.value)}
              />
            </label>
            <label>
              E-mail de suporte
              <input
                value={settings.supportEmail}
                onChange={(e) => set("supportEmail", e.target.value)}
              />
            </label>
            <label>
              Cor principal
              <input
                value={settings.primaryColor}
                onChange={(e) => set("primaryColor", e.target.value)}
              />
            </label>
          </S.FormCard>
          <S.FormCard>
            <header>
              <h2>Configurações regionais</h2>
            </header>
            <label>
              Idioma
              <input value={settings.language} readOnly />
            </label>
            <label>
              Moeda
              <input value={settings.currency} readOnly />
            </label>
            <label>
              Fuso horário
              <input
                value={settings.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              />
            </label>
            <label>
              Formato de data
              <input value={settings.dateFormat} readOnly />
            </label>
          </S.FormCard>
          <S.FormCard>
            <header>
              <h2>Cadastro de restaurantes</h2>
            </header>
            <div className="line">
              <span>Permitir auto cadastro</span>
              <button
                className={`toggle ${settings.allowSignup ? "on" : ""}`}
                onClick={() => set("allowSignup", !settings.allowSignup)}
              />
            </div>
            <div className="line">
              <span>Aprovação manual</span>
              <button
                className={`toggle ${settings.manualApproval ? "on" : ""}`}
                onClick={() => set("manualApproval", !settings.manualApproval)}
              />
            </div>
            <label>
              Trial padrão
              <input
                type="number"
                value={settings.trialDays}
                onChange={(e) => set("trialDays", Number(e.target.value))}
              />
            </label>
          </S.FormCard>
          <S.FormCard>
            <header>
              <h2>Limites globais</h2>
            </header>
            <label>
              Upload máximo (MB)
              <input
                type="number"
                value={settings.uploadLimitMb}
                onChange={(e) => set("uploadLimitMb", Number(e.target.value))}
              />
            </label>
            <label>
              Retenção de logs (dias)
              <input
                type="number"
                value={settings.logRetentionDays}
                onChange={(e) =>
                  set("logRetentionDays", Number(e.target.value))
                }
              />
            </label>
            <div className="line">
              <span>Modo manutenção</span>
              <button
                className={`toggle ${settings.maintenanceMode ? "on" : ""}`}
                onClick={() =>
                  set("maintenanceMode", !settings.maintenanceMode)
                }
              />
            </div>
            <button onClick={() => onSave?.(settings)}>
              Salvar alterações
            </button>
          </S.FormCard>
        </S.FormGrid>
      </div>
    </S.SettingsLayout>
  );
}
