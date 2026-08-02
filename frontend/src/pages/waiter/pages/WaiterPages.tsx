import {
  BellRing,
  Check,
  Clipboard,
  Clock3,
  KeyRound,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { CallStatus, TableStatus } from "../types";
import { useWaiterWorkspace as useWorkspace } from "../useWaiterWorkspace";
import {
  Empty,
  MetricCards,
  OrderItems,
  StatusBadge,
  brl,
} from "../components/Shared";
import * as S from "../Waiter.styles";

export function WaiterOverviewPage() {
  const { orders, tables, calls } = useWorkspace();
  const ready = orders.filter(
    (o) => o.channel === "TABLE" && o.status === "PRONTO",
  );
  const waiting = calls.filter((c) => c.status === "WAITING");
  const code = tables.find((t) => t.status === "AWAITING_CODE");
  return (
    <>
      <MetricCards
        items={[
          {
            label: "Prontos para entregar",
            value: ready.length,
            tone: "green",
          },
          {
            label: "Chamados aguardando",
            value: waiting.length,
            icon: "calls",
          },
          {
            label: "Mesas ocupadas",
            value: tables.filter((t) => t.status === "OCCUPIED").length,
            icon: "tables",
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <header>
            <div>
              <h2>Prontos para entregar</h2>
              <p>O status é atualizado exclusivamente pela cozinha.</p>
            </div>
            <Clock3 />
          </header>
          <S.Stack>
            {ready.slice(0, 4).map((order) => (
              <S.PriorityOrder key={order.id}>
                <div className="identity">
                  <b>{order.reference}</b>
                  <span>
                    {order.id} • pronto há {order.elapsed}
                  </span>
                </div>
                <OrderItems order={order} />
                <div className="right">
                  <StatusBadge status={order.status} />
                  <S.LinkButton>Ver detalhes</S.LinkButton>
                </div>
              </S.PriorityOrder>
            ))}
            {!ready.length && <Empty>Nenhum pedido pronto.</Empty>}
          </S.Stack>
        </S.Card>
        <S.Stack>
          <WaiterCallsSummary />
          <S.Card>
            <header>
              <div>
                <h2>Códigos solicitados</h2>
                <p>Informe o código após o cliente escanear o QR.</p>
              </div>
              <KeyRound />
            </header>
            {code ? (
              <AccessCode
                tableId={code.id}
                tableNumber={code.number}
                code={code.accessCode ?? ""}
              />
            ) : (
              <Empty>Nenhum código solicitado.</Empty>
            )}
          </S.Card>
        </S.Stack>
      </S.Grid>
    </>
  );
}

function WaiterCallsSummary() {
  const { calls, updateCall } = useWorkspace();
  const waiting = calls.filter((c) => c.status === "WAITING").slice(0, 2);
  return (
    <S.Card>
      <header>
        <div>
          <h2>Chamados do salão</h2>
          <p>Atenda primeiro o chamado mais antigo.</p>
        </div>
        <BellRing />
      </header>
      {waiting.map((call) => (
        <CallRow
          key={call.id}
          call={call}
          action={() => updateCall(call.id, "IN_PROGRESS")}
        />
      ))}
    </S.Card>
  );
}

function AccessCode({
  tableId,
  tableNumber,
  code,
}: {
  tableId: string;
  tableNumber: number;
  code: string;
}) {
  const { generateAccessCode } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <S.CodeBox>
      <div className="label">
        <small>Mesa {String(tableNumber).padStart(2, "0")}</small>
        <span className="code">{code}</span>
        <small>Informe este código ao cliente</small>
      </div>
      <div>
        <S.LinkButton onClick={copy}>
          {copied ? <Check size={16} /> : <Clipboard size={16} />}{" "}
          {copied ? "Copiado" : "Copiar código"}
        </S.LinkButton>
        <S.LinkButton onClick={() => generateAccessCode(tableId)}>
          Gerar novo
        </S.LinkButton>
      </div>
    </S.CodeBox>
  );
}

export function WaiterDeliveriesPage() {
  const { orders } = useWorkspace();
  const [query, setQuery] = useState("");
  const [table, setTable] = useState("ALL");
  const ready = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            o.channel === "TABLE" &&
            o.status === "PRONTO" &&
            (table === "ALL" || o.reference === table) &&
            `${o.id} ${o.reference} ${o.items.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => b.elapsed.localeCompare(a.elapsed)),
    [orders, query, table],
  );
  const tables = [
    ...new Set(
      orders.filter((o) => o.channel === "TABLE").map((o) => o.reference),
    ),
  ];
  return (
    <>
      <S.Toolbar>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar número da mesa ou pedido"
        />
        <select value={table} onChange={(e) => setTable(e.target.value)}>
          <option value="ALL">Todas as mesas</option>
          {tables.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button className="live">Atualização em tempo real</button>
      </S.Toolbar>
      <MetricCards
        items={[
          {
            label: "Prontos para entregar",
            value: ready.length,
            tone: "green",
          },
          {
            label: "Maior espera",
            value: ready[0]?.elapsed ?? "00:00",
            icon: "clock",
          },
          { label: "Mesas ocupadas", value: 8, icon: "tables" },
        ]}
      />
      <S.Card>
        <header>
          <div>
            <h2>Prontos para entregar</h2>
            <p>Somente leitura: a cozinha controla todos os status.</p>
          </div>
        </header>
        <S.Stack>
          {ready.map((order) => (
            <S.PriorityOrder key={order.id}>
              <div className="identity">
                <b>{order.reference}</b>
                <span>
                  {order.id} • pronto há {order.elapsed}
                </span>
              </div>
              <OrderItems order={order} />
              <div className="right">
                <StatusBadge status="PRONTO" />
                <S.LinkButton>Ver detalhes</S.LinkButton>
              </div>
            </S.PriorityOrder>
          ))}
          {!ready.length && (
            <Empty>Nenhum pedido pronto para os filtros selecionados.</Empty>
          )}
        </S.Stack>
      </S.Card>
    </>
  );
}

export function WaiterTablesPage() {
  const { tables, generateAccessCode } = useWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TableStatus | "ALL">("ALL");
  const visible = tables.filter(
    (t) =>
      (status === "ALL" || t.status === status) &&
      String(t.number).includes(query),
  );
  return (
    <>
      <S.Toolbar>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar número da mesa"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TableStatus | "ALL")}
        >
          <option value="ALL">Todos os status</option>
          <option value="FREE">Livres</option>
          <option value="OCCUPIED">Ocupadas</option>
          <option value="AWAITING_CODE">Aguardando código</option>
        </select>
        <button>Imprimir QR Codes</button>
      </S.Toolbar>
      <MetricCards
        items={[
          { label: "Mesas", value: tables.length, icon: "tables" },
          {
            label: "Ocupadas",
            value: tables.filter((t) => t.status === "OCCUPIED").length,
            icon: "tables",
          },
          {
            label: "Livres",
            value: tables.filter((t) => t.status === "FREE").length,
            tone: "green",
            icon: "tables",
          },
          {
            label: "Aguardando código",
            value: tables.filter((t) => t.status === "AWAITING_CODE").length,
            icon: "clock",
          },
        ]}
      />
      <S.TableGrid>
        {visible.map((table) => (
          <S.TableCard key={table.id}>
            <header>
              <b>Mesa {String(table.number).padStart(2, "0")}</b>
              <S.TableState $state={table.status}>
                {table.status === "FREE"
                  ? "LIVRE"
                  : table.status === "OCCUPIED"
                    ? "OCUPADA"
                    : "AGUARDANDO CÓDIGO"}
              </S.TableState>
            </header>
            {table.status === "AWAITING_CODE" ? (
              <div className="access">
                <b>{table.accessCode}</b>
                <small>Informe este código ao cliente</small>
              </div>
            ) : (
              <div className="meta">
                <span>
                  <Users size={14} /> {table.guests} clientes
                </span>
                {table.openedAt && (
                  <span>
                    <Clock3 size={14} /> Aberta às {table.openedAt}
                  </span>
                )}
                <strong>{brl(table.total)}</strong>
              </div>
            )}
            <div className="actions">
              {table.status === "AWAITING_CODE" ? (
                <button onClick={() => generateAccessCode(table.id)}>
                  Gerar novo código
                </button>
              ) : table.status === "OCCUPIED" ? (
                <button>Ver pedido</button>
              ) : (
                <button>Visualizar QR Code</button>
              )}
            </div>
          </S.TableCard>
        ))}
      </S.TableGrid>
    </>
  );
}

function callTitle(type: "WAITER" | "BILL" | "ACCESS_CODE") {
  return type === "BILL"
    ? "Pediu a conta"
    : type === "ACCESS_CODE"
      ? "Solicitou código de acesso"
      : "Chamou o garçom";
}
function CallRow({
  call,
  action,
  label = "Atender",
}: {
  call: {
    id: string;
    tableNumber: number;
    type: "WAITER" | "BILL" | "ACCESS_CODE";
    elapsed: string;
  };
  action: () => void;
  label?: string;
}) {
  return (
    <S.CallCard>
      <span className="icon">
        {call.type === "ACCESS_CODE" ? <KeyRound /> : <BellRing />}
      </span>
      <span className="info">
        <b>Mesa {String(call.tableNumber).padStart(2, "0")}</b>
        <span>{callTitle(call.type)}</span>
      </span>
      <span className="time">{call.elapsed}</span>
      <S.PrimaryButton className="action" onClick={action}>
        {label}
      </S.PrimaryButton>
    </S.CallCard>
  );
}

export function WaiterCallsPage() {
  const { calls, updateCall } = useWorkspace();
  const [filter, setFilter] = useState<CallStatus | "ALL">("ALL");
  const waiting = calls.filter((c) => c.status === "WAITING");
  const attending = calls.filter((c) => c.status === "IN_PROGRESS");
  const complete = (id: string) => updateCall(id, "RESOLVED");
  return (
    <>
      <S.Toolbar>
        <input placeholder="Buscar mesa" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as CallStatus | "ALL")}
        >
          <option value="ALL">Todos os status</option>
          <option value="WAITING">Aguardando</option>
          <option value="IN_PROGRESS">Em atendimento</option>
          <option value="RESOLVED">Concluídos</option>
        </select>
        <button className="live">Atualização em tempo real</button>
      </S.Toolbar>
      <MetricCards
        items={[
          { label: "Aguardando", value: waiting.length, icon: "calls" },
          { label: "Em atendimento", value: attending.length, icon: "calls" },
          { label: "Tempo médio", value: "02:18", icon: "clock" },
          { label: "Atendidos hoje", value: 32, tone: "green", icon: "calls" },
        ]}
      />
      <S.Grid>
        {(filter === "ALL" || filter === "WAITING") && (
          <S.Card>
            <header>
              <div>
                <h2>Aguardando atendimento</h2>
                <p>Ordenados pelo maior tempo de espera.</p>
              </div>
            </header>
            {waiting.map((call) => (
              <CallRow
                key={call.id}
                call={call}
                action={() => updateCall(call.id, "IN_PROGRESS")}
              />
            ))}
          </S.Card>
        )}
        {(filter === "ALL" || filter === "IN_PROGRESS") && (
          <S.Card>
            <header>
              <div>
                <h2>Em atendimento</h2>
                <p>Chamados assumidos pelos garçons.</p>
              </div>
            </header>
            {attending.map((call) => (
              <CallRow
                key={call.id}
                call={call}
                action={() => complete(call.id)}
                label="Concluir"
              />
            ))}
            {!attending.length && <Empty>Nenhum chamado em atendimento.</Empty>}
          </S.Card>
        )}
      </S.Grid>
    </>
  );
}
