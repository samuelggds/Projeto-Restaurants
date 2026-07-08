import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle,
  Search,
} from "lucide-react";
import { toast } from "react-toastify";
import restaurantsService from "../../Services/restaurantsService";
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

export default function SuperAdminMaster() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [metrics, setMetrics] = useState({
    totalGenerated: 0,
    restaurantsActive: 0,
    restaurantsTotal: 0,
  });
  const [restaurantes, setRestaurantes] = useState([]);

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
    </SuperAdminShell>
  );
}
