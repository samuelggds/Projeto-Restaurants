import { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle,
  Search,
  MessageCircle,
  Minimize2,
} from "lucide-react";
import { toast } from "react-toastify";
import restaurantsService from "../../Services/restaurantsService";
import supportChatService from "../../Services/supportChatService";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  waitForSocketConnection,
} from "../../Services/socketService";
import SuperAdminShell from "./SuperAdminShell";
import * as S from "./styles";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

function mapRestaurantForView(restaurant) {
  return {
    ...restaurant,
    owner:
      restaurant.owner?.name || restaurant.owner?.email || "Sem proprietário",
    joined: formatDate(restaurant.createdAt),
    revenue: Number(restaurant.revenue || 0),
    price: Number(restaurant.price || 0),
    uptime: Number(restaurant.uptime || 0),
    status: restaurant.status || "Aviso",
  };
}

function formatPlanBadge(plan) {
  const normalizedPlan = String(plan || "").toUpperCase();

  if (normalizedPlan === "PREMIUM") {
    return "PREMIUM";
  }

  if (normalizedPlan === "PROFISSIONAL") {
    return "PROFISSIONAL";
  }

  return "BASICO";
}

export default function SuperAdminMaster() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [metrics, setMetrics] = useState({
    totalGenerated: 0,
    restaurantsActive: 0,
    restaurantsTotal: 0,
  });
  const [restaurantes, setRestaurantes] = useState([]);
  const [supportChatMessages, setSupportChatMessages] = useState([]);
  const [supportChatInput, setSupportChatInput] = useState("");
  const [isSendingSupportChat, setIsSendingSupportChat] = useState(false);
  const [isSupportChatMinimized, setIsSupportChatMinimized] = useState(true);
  const [supportTargetRestaurantId, setSupportTargetRestaurantId] =
    useState("");
  const [isLoadingMoreSupportChat, setIsLoadingMoreSupportChat] =
    useState(false);
  const [supportChatHasMoreHistory, setSupportChatHasMoreHistory] =
    useState(false);
  const supportChatScrollRef = useRef<HTMLDivElement | null>(null);
  const supportChatScrollSnapshotRef = useRef({
    pending: false,
    previousScrollHeight: 0,
    previousScrollTop: 0,
  });

  const loadDashboard = useCallback(async () => {
    const [restaurantsResponse, metricsResponse] = await Promise.all([
      restaurantsService.listRestaurants(),
      restaurantsService.getMetrics(),
    ]);

    setRestaurantes(
      (Array.isArray(restaurantsResponse) ? restaurantsResponse : []).map(
        mapRestaurantForView,
      ),
    );

    const firstRestaurantId = Number(restaurantsResponse?.[0]?.id || 0);
    if (firstRestaurantId > 0) {
      setSupportTargetRestaurantId(String(firstRestaurantId));
    }

    setMetrics({
      totalGenerated: Number(metricsResponse?.totalGenerated || 0),
      restaurantsActive: Number(metricsResponse?.restaurantsActive || 0),
      restaurantsTotal: Number(metricsResponse?.restaurantsTotal || 0),
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrapDashboard() {
      try {
        await loadDashboard();

        if (!mounted) {
          return;
        }
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            "Erro ao carregar dados do super admin.",
        );
      }
    }

    bootstrapDashboard();

    return () => {
      mounted = false;
    };
  }, [loadDashboard]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token, "super-admin-dashboard");

    const onSupportChatMessage = (payload) => {
      const normalizedMessage = String(payload?.message || "")
        .replace(/\s+/g, " ")
        .trim();
      const messageId = String(payload?.id || "").trim();

      if (!normalizedMessage || !messageId) {
        return;
      }

      setSupportChatMessages((prev) => {
        if (prev.some((item) => String(item?.id || "") === messageId)) {
          return prev;
        }

        const next = [...prev, payload];
        return next.slice(-240);
      });

      if (String(payload?.senderRole || "").toUpperCase() === "ADMIN") {
        setIsSupportChatMinimized(false);
      }
    };

    socket.on("support:chat-message", onSupportChatMessage);

    return () => {
      socket.off("support:chat-message", onSupportChatMessage);
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    const restaurantId = Number(supportTargetRestaurantId || 0);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return undefined;
    }

    const currentRestaurant = restaurantes.find(
      (item) => Number(item?.id || 0) === restaurantId,
    );
    const currentPlan = String(
      currentRestaurant?.subscription?.plan || "",
    ).toUpperCase();
    const currentPlanAllowsChat =
      currentPlan === "PROFISSIONAL" || currentPlan === "PREMIUM";

    if (!currentPlanAllowsChat) {
      setSupportChatMessages([]);
      setSupportChatHasMoreHistory(false);
      return undefined;
    }

    let cancelled = false;

    async function loadSupportChatHistory() {
      try {
        const response = await supportChatService.getMessages({
          restaurantId,
          limit: 40,
        });
        const historyMessages = Array.isArray(response?.messages)
          ? response.messages
          : [];

        if (!cancelled) {
          setSupportChatMessages(historyMessages);
          setSupportChatHasMoreHistory(Boolean(response?.hasMore));
        }
      } catch (_error) {
        // Keep silent: real-time chat still works if history load fails.
      }
    }

    loadSupportChatHistory();

    return () => {
      cancelled = true;
    };
  }, [supportTargetRestaurantId, restaurantes]);

  useEffect(() => {
    const snapshot = supportChatScrollSnapshotRef.current;
    if (!snapshot.pending) {
      return;
    }

    const container = supportChatScrollRef.current;
    if (!container) {
      snapshot.pending = false;
      return;
    }

    const heightDelta = container.scrollHeight - snapshot.previousScrollHeight;
    container.scrollTop = snapshot.previousScrollTop + Math.max(heightDelta, 0);
    snapshot.pending = false;
  }, [supportChatMessages]);

  async function handleSendSupportChatToAdmin() {
    const normalizedMessage = String(supportChatInput || "")
      .replace(/\s+/g, " ")
      .trim();
    const restaurantId = Number(supportTargetRestaurantId || 0);

    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      toast.error("Selecione um restaurante para conversar com o admin.");
      return;
    }

    const selectedRestaurant = restaurantes.find(
      (item) => Number(item?.id || 0) === restaurantId,
    );
    const selectedPlan = String(
      selectedRestaurant?.subscription?.plan || "",
    ).toUpperCase();
    const selectedPlanAllowsChat =
      selectedPlan === "PROFISSIONAL" || selectedPlan === "PREMIUM";

    if (!selectedPlanAllowsChat) {
      toast.info(
        "Chat com Super Admin disponível apenas para restaurantes no plano Profissional ou Premium.",
      );
      return;
    }

    if (normalizedMessage.length < 2) {
      toast.error("Digite uma mensagem para o admin.");
      return;
    }

    const socket = getSocket();
    if (!socket) {
      toast.error(
        "Socket desconectado. Recarregue a página e tente novamente.",
      );
      return;
    }

    try {
      setIsSendingSupportChat(true);
      await waitForSocketConnection(6000);

      const result = await new Promise<{ ok?: boolean; error?: string }>(
        (resolve) => {
          socket.emit(
            "support:chat-send",
            {
              restaurantId,
              message: normalizedMessage,
            },
            (response) => resolve(response || {}),
          );
        },
      );

      if (!result?.ok) {
        throw new Error(result?.error || "Não foi possível enviar.");
      }

      setSupportChatInput("");
      setIsSupportChatMinimized(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar mensagem para o admin.",
      );
    } finally {
      setIsSendingSupportChat(false);
    }
  }

  async function handleLoadOlderSupportChatMessages() {
    if (isLoadingMoreSupportChat || !supportChatHasMoreHistory) {
      return;
    }

    const restaurantId = Number(supportTargetRestaurantId || 0);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return;
    }

    const selectedRestaurant = restaurantes.find(
      (item) => Number(item?.id || 0) === restaurantId,
    );
    const selectedPlan = String(
      selectedRestaurant?.subscription?.plan || "",
    ).toUpperCase();
    const selectedPlanAllowsChat =
      selectedPlan === "PROFISSIONAL" || selectedPlan === "PREMIUM";

    if (!selectedPlanAllowsChat) {
      return;
    }

    const visibleMessages = supportChatMessages.filter(
      (item) => Number(item?.restaurantId || 0) === restaurantId,
    );
    const oldestMessageId = Number(visibleMessages?.[0]?.id || 0);

    if (!Number.isInteger(oldestMessageId) || oldestMessageId <= 0) {
      setSupportChatHasMoreHistory(false);
      return;
    }

    try {
      setIsLoadingMoreSupportChat(true);
      const container = supportChatScrollRef.current;
      if (container) {
        supportChatScrollSnapshotRef.current = {
          pending: true,
          previousScrollHeight: container.scrollHeight,
          previousScrollTop: container.scrollTop,
        };
      }

      const response = await supportChatService.getMessages({
        restaurantId,
        beforeId: oldestMessageId,
        limit: 40,
      });

      const olderMessages = Array.isArray(response?.messages)
        ? response.messages
        : [];

      setSupportChatMessages((prev) => {
        const existingIds = new Set(prev.map((item) => String(item?.id || "")));
        const uniqueOlderMessages = olderMessages.filter(
          (item) => !existingIds.has(String(item?.id || "")),
        );

        if (uniqueOlderMessages.length === 0) {
          supportChatScrollSnapshotRef.current.pending = false;
          return prev;
        }

        return [...uniqueOlderMessages, ...prev];
      });

      setSupportChatHasMoreHistory(Boolean(response?.hasMore));
    } catch (_error) {
      supportChatScrollSnapshotRef.current.pending = false;
      toast.error("Não foi possível carregar mensagens antigas.");
    } finally {
      setIsLoadingMoreSupportChat(false);
    }
  }

  function handleToggleStatus(id, currentStatus) {
    const actionLabel = currentStatus === "Ativo" ? "bloqueio" : "liberação";
    toast.info(
      `Ação de ${actionLabel} da instância #${id} ainda não possui endpoint no backend.`,
    );
  }

  // Métricas Consolidadas para os Novos KPIs
  const totalFaturamento = metrics.totalGenerated;
  const totalAtivos = metrics.restaurantsActive;
  const uptimeMedio = (
    restaurantes.length
      ? restaurantes.reduce((acc, r) => acc + r.uptime, 0) / restaurantes.length
      : 0
  ).toFixed(1);

  // Filtro inteligente combinando busca por texto + pílulas de status
  const filteredData = restaurantes.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const selectedRestaurantId = Number(supportTargetRestaurantId || 0);
  const selectedRestaurant = restaurantes.find(
    (restaurant) => Number(restaurant?.id || 0) === selectedRestaurantId,
  );
  const selectedRestaurantPlan = String(
    selectedRestaurant?.subscription?.plan || "",
  ).toUpperCase();
  const supportChatPlanAllowedBySelectedRestaurant =
    selectedRestaurantPlan === "PROFISSIONAL" ||
    selectedRestaurantPlan === "PREMIUM";

  return (
    <SuperAdminShell
      title="Overview do Ecossistema"
      subtitle="Ambiente unificado para monitoria, controle de licenças e faturamento transacionado."
      activeItem="dashboard"
    >
      {/* GRID DE KPIS MINIMALISTAS COM IDENTIDADE DASHBOARD DE ALTO NÍVEL */}
      <S.KpiGrid>
        <S.KpiCard>
          <div className="header">
            <span>Volume Geral Transacionado</span>
            <TrendingUp size={16} color="#00a266" />
          </div>
          <h3>R$ {formatCurrency(totalFaturamento)}</h3>
          <p className="trend positive">+14.2% em relação ao mês anterior</p>
        </S.KpiCard>

        <S.KpiCard>
          <div className="header">
            <span>Instâncias em Operação</span>
            <CheckCircle size={16} color="#00a266" />
          </div>
          <h3>
            {totalAtivos}{" "}
            <span className="total">/ {metrics.restaurantsTotal}</span>
          </h3>
          <p className="trend">Lojas com checkout habilitado</p>
        </S.KpiCard>

        <S.KpiCard>
          <div className="header">
            <span>Uptime Médio da Rede</span>
            <Activity size={16} color="#ea1d2c" />
          </div>
          <h3>{uptimeMedio}%</h3>
          <p className="trend operational">SLA global esperado: 99.8%</p>
        </S.KpiCard>
      </S.KpiGrid>

      {/* ESPAÇO DE FILTROS E PESQUISA AVANÇADA */}
      <S.FilterSection>
        <S.SearchWrapper>
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por restaurante, proprietário ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </S.SearchWrapper>

        <S.FilterPills>
          {["todos", "Ativo", "Aviso", "Bloqueado", "Expirado"].map(
            (status) => (
              <S.FilterPill
                key={status}
                $active={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {status === "todos" ? "Todas as Instâncias" : status}
              </S.FilterPill>
            ),
          )}
        </S.FilterPills>
      </S.FilterSection>

      {/* SEÇÃO DA TABELA ENTERPRISE DE DADOS */}
      <S.TableContainer>
        <S.Table>
          <thead>
            <tr>
              <th>Parceiro / Razão Social</th>
              <th>Status Operacional</th>
              <th>Uptime da Instância</th>
              <th>Assinatura Mensal</th>
              <th>Transacionado (Mês)</th>
              <th align="right">Ações de Controle</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td>
                  <S.CompanyCell>
                    <div className="icon-box">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <span className="comp-name">{item.name}</span>
                      <span className="comp-owner">
                        Prop: {item.owner} • Desde {item.joined}
                      </span>
                    </div>
                  </S.CompanyCell>
                </td>
                <td>
                  <S.StatusBadge $type={item.status}>
                    <span className="dot" />
                    {item.status}
                  </S.StatusBadge>
                </td>
                <td>
                  <S.UptimeWrapper>
                    <span className="value">{item.uptime}%</span>
                    <S.UptimeBar $percentage={item.uptime} />
                  </S.UptimeWrapper>
                </td>
                <td>
                  <span className="price-tag">
                    R$ {formatCurrency(item.price)}
                  </span>
                </td>
                <td>
                  <span className="revenue-tag">
                    R$ {formatCurrency(item.revenue)}
                  </span>
                </td>
                <td align="right">
                  <S.ActionButton
                    $isAtivo={item.status === "Ativo"}
                    onClick={() => handleToggleStatus(item.id, item.status)}
                  >
                    {item.status === "Ativo"
                      ? "Bloquear Painel"
                      : "Liberar Licença"}
                  </S.ActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </S.Table>

        {filteredData.length === 0 && (
          <S.EmptyState>
            <AlertTriangle size={32} />
            <p>
              Nenhuma franquia ou loja parceira corresponde aos filtros
              aplicados.
            </p>
          </S.EmptyState>
        )}
      </S.TableContainer>

      {isSupportChatMinimized ? (
        <button
          type="button"
          onClick={() => setIsSupportChatMinimized(false)}
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 45,
            borderRadius: 999,
            border: "1px solid rgba(22,163,74,0.4)",
            background: "linear-gradient(135deg, #22c55e, #15803d)",
            color: "#fff",
            minHeight: 40,
            padding: "0 0.9rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <MessageCircle size={14} /> Chat com Admin
        </button>
      ) : (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 45,
            width: "min(390px, calc(100vw - 24px))",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(34,197,94,0.35)",
            background: "#f0fdf4",
            boxShadow: "0 24px 36px rgba(15,23,42,0.24)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.6rem",
              padding: "0.62rem 0.72rem",
              background: "linear-gradient(135deg, #16a34a, #166534)",
              color: "#fff",
            }}
          >
            <strong style={{ fontSize: "0.86rem" }}>
              Suporte em tempo real • Admin
            </strong>
            <button
              type="button"
              onClick={() => setIsSupportChatMinimized(true)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.45)",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <Minimize2 size={13} />
            </button>
          </div>

          <div style={{ padding: "0.72rem", display: "grid", gap: "0.45rem" }}>
            <select
              value={supportTargetRestaurantId}
              onChange={(event) =>
                setSupportTargetRestaurantId(event.target.value)
              }
              style={{
                minHeight: 34,
                borderRadius: 8,
                border: "1px solid rgba(22,163,74,0.35)",
                background: "#ffffff",
                padding: "0 0.5rem",
                color: "#0f172a",
                fontWeight: 600,
              }}
            >
              <option value="">Selecione o restaurante</option>
              {restaurantes.map((restaurant) => (
                <option key={restaurant.id} value={String(restaurant.id)}>
                  #{restaurant.id} • {restaurant.name} • Plano{" "}
                  {formatPlanBadge(restaurant?.subscription?.plan)}
                </option>
              ))}
            </select>

            <div
              ref={supportChatScrollRef}
              style={{
                maxHeight: 200,
                overflowY: "auto",
                display: "grid",
                gap: "0.35rem",
              }}
            >
              {!supportChatPlanAllowedBySelectedRestaurant && (
                <small
                  style={{
                    opacity: 0.84,
                    color: "#166534",
                    background: "#dcfce7",
                    border: "1px solid rgba(22,163,74,0.25)",
                    borderRadius: 8,
                    padding: "0.4rem 0.45rem",
                  }}
                >
                  Chat desativado para plano básico. Disponível apenas para
                  Profissional e Premium.
                </small>
              )}

              {supportChatPlanAllowedBySelectedRestaurant &&
                supportChatHasMoreHistory && (
                  <button
                    type="button"
                    onClick={handleLoadOlderSupportChatMessages}
                    disabled={isLoadingMoreSupportChat}
                    style={{
                      minHeight: 30,
                      borderRadius: 8,
                      border: "1px solid rgba(22,163,74,0.35)",
                      background: "#ffffff",
                      color: "#166534",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: isLoadingMoreSupportChat
                        ? "not-allowed"
                        : "pointer",
                      opacity: isLoadingMoreSupportChat ? 0.68 : 1,
                    }}
                  >
                    {isLoadingMoreSupportChat
                      ? "Carregando..."
                      : "Carregar mensagens antigas"}
                  </button>
                )}

              {supportChatMessages
                .filter((messageItem) => {
                  const currentRestaurantId = Number(
                    supportTargetRestaurantId || 0,
                  );
                  if (!currentRestaurantId) {
                    return true;
                  }
                  return (
                    Number(messageItem?.restaurantId || 0) ===
                    currentRestaurantId
                  );
                })
                .map((messageItem) => {
                  const senderRole = String(
                    messageItem?.senderRole || "SUPER_ADMIN",
                  ).toUpperCase();
                  const isMine = senderRole === "SUPER_ADMIN";

                  return (
                    <div
                      key={String(messageItem?.id || `${Math.random()}`)}
                      style={{
                        marginLeft: isMine ? "auto" : 0,
                        marginRight: isMine ? 0 : "auto",
                        maxWidth: "93%",
                        borderRadius: isMine
                          ? "11px 11px 4px 11px"
                          : "11px 11px 11px 4px",
                        border: isMine
                          ? "1px solid rgba(22,163,74,0.36)"
                          : "1px solid rgba(56,189,248,0.36)",
                        background: isMine ? "#dcfce7" : "#e0f2fe",
                        padding: "0.42rem 0.52rem",
                        color: "#0f172a",
                      }}
                    >
                      <small style={{ fontWeight: 800, opacity: 0.75 }}>
                        {messageItem?.senderLabel ||
                          (isMine ? "Super Admin" : "Admin")}{" "}
                        • R#{Number(messageItem?.restaurantId || 0) || "-"}
                      </small>
                      <div style={{ fontSize: "0.83rem", lineHeight: 1.32 }}>
                        {String(messageItem?.message || "").trim()}
                      </div>
                    </div>
                  );
                })}
            </div>

            <textarea
              value={supportChatInput}
              onChange={(event) => setSupportChatInput(event.target.value)}
              disabled={!supportChatPlanAllowedBySelectedRestaurant}
              rows={2}
              placeholder={
                supportChatPlanAllowedBySelectedRestaurant
                  ? "Responder admin em tempo real..."
                  : "Plano básico sem suporte de chat com Super Admin"
              }
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 9,
                border: "1px solid rgba(22,163,74,0.35)",
                background: "#ffffff",
                padding: "0.5rem 0.55rem",
                fontSize: "0.84rem",
                color: "#0f172a",
              }}
            />

            <button
              type="button"
              onClick={handleSendSupportChatToAdmin}
              disabled={
                isSendingSupportChat ||
                !supportChatPlanAllowedBySelectedRestaurant
              }
              style={{
                minHeight: 34,
                borderRadius: 9,
                border: "1px solid rgba(22,163,74,0.45)",
                background: "linear-gradient(135deg, #22c55e, #15803d)",
                color: "#ffffff",
                fontWeight: 800,
                cursor:
                  isSendingSupportChat ||
                  !supportChatPlanAllowedBySelectedRestaurant
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isSendingSupportChat ||
                  !supportChatPlanAllowedBySelectedRestaurant
                    ? 0.68
                    : 1,
              }}
            >
              {isSendingSupportChat ? "Enviando..." : "Enviar para Admin"}
            </button>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}
