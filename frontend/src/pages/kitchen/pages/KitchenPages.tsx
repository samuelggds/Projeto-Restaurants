import {
  Bike,
  CheckCircle2,
  ChefHat,
  Clock3,
  History,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Order, OrderChannel, OrderStatus } from "../types";
import { useKitchenWorkspace as useWorkspace } from "../useKitchenWorkspace";
import {
  Empty,
  MetricCards,
  OrderItems,
  StatusBadge,
  channelLabel,
} from "../components/Shared";
import * as S from "../Kitchen.styles";

const activeStatuses: OrderStatus[] = ["PENDENTE", "PREPARANDO", "PRONTO"];

export function KitchenOverviewPage() {
  const { orders } = useWorkspace();
  const active = orders.filter((o) => activeStatuses.includes(o.status));
  const urgent = active
    .filter((o) => o.status !== "PRONTO")
    .sort((a, b) => b.elapsed.localeCompare(a.elapsed))
    .slice(0, 4);
  return (
    <>
      <MetricCards
        items={[
          { label: "Pedidos ativos", value: active.length },
          {
            label: "Pendentes",
            value: active.filter((o) => o.status === "PENDENTE").length,
            icon: "clock",
          },
          {
            label: "Preparando",
            value: active.filter((o) => o.status === "PREPARANDO").length,
            icon: "chef",
          },
          {
            label: "Prontos",
            value: active.filter((o) => o.status === "PRONTO").length,
            tone: "green",
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <header>
            <div>
              <h2>Prioridade da cozinha</h2>
              <p>Pedidos com maior tempo de espera.</p>
            </div>
            <ChefHat />
          </header>
          <S.Stack>
            {urgent.map((order) => (
              <S.PriorityOrder key={order.id}>
                <div className="identity">
                  <b>{order.id}</b>
                  <span>
                    {order.channel === "TABLE"
                      ? order.reference
                      : channelLabel[order.channel]}{" "}
                    • {order.elapsed}
                  </span>
                </div>
                <OrderItems order={order} />
                <div className="right">
                  <StatusBadge status={order.status} />
                </div>
              </S.PriorityOrder>
            ))}
          </S.Stack>
        </S.Card>
        <S.Card>
          <header>
            <div>
              <h2>Resumo por canal</h2>
              <p>Pedidos ativos neste turno.</p>
            </div>
            <UtensilsCrossed />
          </header>
          <S.Stack>
            {(["TABLE", "PICKUP", "DELIVERY"] as OrderChannel[]).map(
              (channel) => (
                <S.CodeBox key={channel}>
                  <span className="label">
                    <b>{channelLabel[channel]}</b>
                    <small>Pendente e em preparo</small>
                  </span>
                  <span className="code">
                    {
                      active.filter(
                        (o) => o.channel === channel && o.status !== "PRONTO",
                      ).length
                    }
                  </span>
                </S.CodeBox>
              ),
            )}
          </S.Stack>
        </S.Card>
      </S.Grid>
    </>
  );
}

function ChannelFilter({
  value,
  onChange,
}: {
  value: OrderChannel;
  onChange: (channel: OrderChannel) => void;
}) {
  return (
    <S.ChannelButtons>
      {(
        [
          ["TABLE", "Mesa", UtensilsCrossed],
          ["PICKUP", "Retirada", ShoppingBag],
          ["DELIVERY", "Delivery", Bike],
        ] as const
      ).map(([id, label, Icon]) => (
        <button
          key={id}
          className={value === id ? "active" : ""}
          onClick={() => onChange(id)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </S.ChannelButtons>
  );
}

function KitchenCard({ order }: { order: Order }) {
  const { role, updateOrderStatus } = useWorkspace();
  const next =
    order.status === "PENDENTE"
      ? "PREPARANDO"
      : order.status === "PREPARANDO"
        ? "PRONTO"
        : null;
  return (
    <S.KitchenOrder>
      <div className="head">
        <span className="identity">
          <b>{order.id}</b>
          <small>
            {order.channel === "TABLE"
              ? order.reference
              : channelLabel[order.channel]}
            {order.customer ? ` • ${order.customer}` : ""}
          </small>
        </span>
        <StatusBadge status={order.status} />
      </div>
      <OrderItems order={order} />
      {order.status === "PRONTO" ? (
        <span className="waiting">Aguardando retirada pelo responsável</span>
      ) : (
        <span className="elapsed">
          <Clock3 size={17} /> {order.elapsed}
        </span>
      )}
      {next && role === "KITCHEN" && (
        <button
          className={`action ${order.status === "PENDENTE" ? "pending" : "preparing"}`}
          onClick={() => updateOrderStatus(order.id, next)}
        >
          {order.status === "PENDENTE"
            ? "Iniciar preparo"
            : "Marcar como pronto"}
        </button>
      )}
    </S.KitchenOrder>
  );
}

export function KitchenQueuePage() {
  const { orders } = useWorkspace();
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<OrderChannel>("TABLE");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const visible = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.channel === channel &&
          activeStatuses.includes(o.status) &&
          (status === "ALL" || o.status === status) &&
          `${o.id} ${o.reference} ${o.customer ?? ""} ${o.items.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [orders, channel, status, query],
  );
  return (
    <>
      <S.Toolbar>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pedido ou mesa"
        />
        <ChannelFilter
          value={channel}
          onChange={(value) => {
            setChannel(value);
            setStatus("ALL");
          }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "ALL")}
        >
          <option value="ALL">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PREPARANDO">Preparando</option>
          <option value="PRONTO">Pronto</option>
        </select>
        <button className="live">Atualização em tempo real</button>
      </S.Toolbar>
      <MetricCards
        items={[
          {
            label: "Pendentes",
            value: visible.filter((o) => o.status === "PENDENTE").length,
            icon: "clock",
          },
          {
            label: "Preparando",
            value: visible.filter((o) => o.status === "PREPARANDO").length,
            icon: "chef",
          },
          {
            label: "Prontos",
            value: visible.filter((o) => o.status === "PRONTO").length,
            tone: "green",
          },
          { label: "Tempo médio", value: "18 min", icon: "clock" },
        ]}
      />
      <S.StatusColumns>
        {activeStatuses
          .filter((item) => status === "ALL" || item === status)
          .map((item) => (
            <S.StatusColumn key={item}>
              <header>
                <span className="dot" />
                <b>{item}</b>
                <span>{visible.filter((o) => o.status === item).length}</span>
              </header>
              {visible
                .filter((o) => o.status === item)
                .map((order) => (
                  <KitchenCard key={order.id} order={order} />
                ))}
              {!visible.some((o) => o.status === item) && (
                <Empty>Nenhum pedido neste status.</Empty>
              )}
            </S.StatusColumn>
          ))}
      </S.StatusColumns>
    </>
  );
}

export function KitchenReadyPage() {
  const { orders } = useWorkspace();
  const [channel, setChannel] = useState<OrderChannel>("TABLE");
  const ready = orders.filter(
    (o) => o.status === "PRONTO" && o.channel === channel,
  );
  return (
    <>
      <S.Toolbar>
        <ChannelFilter value={channel} onChange={setChannel} />
        <button className="live">Atualização em tempo real</button>
      </S.Toolbar>
      <MetricCards
        items={[
          { label: "Prontos", value: ready.length, tone: "green" },
          {
            label: "Maior espera",
            value: ready[0]?.elapsed ?? "00:00",
            icon: "clock",
          },
        ]}
      />
      <S.Card>
        <header>
          <div>
            <h2>Aguardando retirada</h2>
            <p>
              A cozinha finalizou estes pedidos; não é necessário alterar outro
              status.
            </p>
          </div>
          <CheckCircle2 />
        </header>
        <S.Stack>
          {ready.map((order) => (
            <S.PriorityOrder key={order.id}>
              <div className="identity">
                <b>{order.id}</b>
                <span>
                  {order.channel === "TABLE"
                    ? order.reference
                    : channelLabel[order.channel]}{" "}
                  • pronto há {order.elapsed}
                </span>
              </div>
              <OrderItems order={order} />
              <div className="right">
                <StatusBadge status="PRONTO" />
              </div>
            </S.PriorityOrder>
          ))}
          {!ready.length && <Empty>Nenhum pedido pronto neste canal.</Empty>}
        </S.Stack>
      </S.Card>
    </>
  );
}

export function KitchenHistoryPage() {
  const { orders } = useWorkspace();
  const [channel, setChannel] = useState<OrderChannel>("TABLE");
  const completed = orders.filter(
    (o) =>
      o.channel === channel &&
      (o.status === "ENTREGUE" || o.status === "CANCELADO"),
  );
  return (
    <>
      <S.Toolbar>
        <ChannelFilter value={channel} onChange={setChannel} />
        <input placeholder="Buscar no histórico" />
      </S.Toolbar>
      <MetricCards
        items={[
          {
            label: "Concluídos hoje",
            value: completed.filter((o) => o.status === "ENTREGUE").length,
            tone: "green",
          },
          {
            label: "Cancelados",
            value: completed.filter((o) => o.status === "CANCELADO").length,
          },
          { label: "Tempo médio", value: "18 min", icon: "clock" },
        ]}
      />
      <S.SectionTitle>
        <div>
          <h2>Histórico do turno</h2>
          <p>Pedidos finalizados e cancelados.</p>
        </div>
        <History />
      </S.SectionTitle>
      <S.HistoryTable>
        <div className="row head">
          <span>Pedido</span>
          <span>Canal</span>
          <span>Horário</span>
          <span>Status</span>
          <span>Total</span>
        </div>
        {completed.map((order) => (
          <div className="row" key={order.id}>
            <b>{order.id}</b>
            <span>
              {order.channel === "TABLE"
                ? order.reference
                : channelLabel[order.channel]}
            </span>
            <span>{order.completedAt ?? order.createdAt}</span>
            <span>
              <StatusBadge status={order.status} />
            </span>
            <span>
              {order.total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        ))}
        {!completed.length && (
          <Empty>Nenhum pedido encontrado neste canal.</Empty>
        )}
      </S.HistoryTable>
    </>
  );
}
