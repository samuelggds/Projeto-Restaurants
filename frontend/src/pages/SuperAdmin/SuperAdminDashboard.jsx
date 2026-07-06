import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import {
  Building2,
  LogOut,
  Sun,
  Moon,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle,
  Search,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/authContext";
import restaurantsService from "../../Services/restaurantsService";
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

export default function SuperAdminMaster() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [metrics, setMetrics] = useState({
    totalGenerated: 0,
    restaurantsActive: 0,
    restaurantsTotal: 0,
  });

  const dropdownRef = useRef(null);

  const [restaurantes, setRestaurantes] = useState([]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const [restaurantsResponse, metricsResponse] = await Promise.all([
          restaurantsService.listRestaurants(),
          restaurantsService.getMetrics(),
        ]);

        if (!mounted) {
          return;
        }

        setRestaurantes(
          (Array.isArray(restaurantsResponse) ? restaurantsResponse : []).map(
            (restaurant) => ({
              ...restaurant,
              owner:
                restaurant.owner?.name ||
                restaurant.owner?.email ||
                "Sem proprietário",
              joined: formatDate(restaurant.createdAt),
              revenue: Number(restaurant.revenue || 0),
              price: Number(restaurant.price || 0),
              uptime: Number(restaurant.uptime || 0),
              status: restaurant.status || "Aviso",
            }),
          ),
        );

        setMetrics({
          totalGenerated: Number(metricsResponse?.totalGenerated || 0),
          restaurantsActive: Number(metricsResponse?.restaurantsActive || 0),
          restaurantsTotal: Number(metricsResponse?.restaurantsTotal || 0),
        });
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            "Erro ao carregar dados do super admin.",
        );
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  function handleToggleStatus(id, currentStatus) {
    const actionLabel = currentStatus === "Ativo" ? "bloqueio" : "liberação";
    toast.info(
      `Ação de ${actionLabel} da instância #${id} ainda não possui endpoint no backend.`,
    );
  }

  function handleLogout() {
    logout();
    navigate("/login");
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
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.DashboardContainer>
        {/* SIDEBAR CORPORATIVA */}
        <S.Sidebar>
          <S.SidebarLogo>
            <ShieldCheck size={28} />
            <div>
              <h3>PeçaJá</h3>
              <span>MASTER CONSOLE</span>
            </div>
          </S.SidebarLogo>

          <S.SidebarNav>
            <S.SidebarLink $active={true}>
              <Building2 size={18} /> Empresas Parceiras
            </S.SidebarLink>
            <S.SidebarLink
              onClick={() =>
                toast.info("Módulo financeiro em desenvolvimento.")
              }
            >
              <DollarSign size={18} /> Conciliação Global
            </S.SidebarLink>
            <S.SidebarLink
              onClick={() => toast.info("Logs de auditoria protegidos.")}
            >
              <Activity size={18} /> Uptime & Logs (Infra)
            </S.SidebarLink>
          </S.SidebarNav>

          <S.SidebarFooter>
            <span className="version">v4.12.0 - Core Engine</span>
          </S.SidebarFooter>
        </S.Sidebar>

        {/* CONTEÚDO PRINCIPAL DA TELA */}
        <S.MainContent>
          {/* TOP BAR MODERNA */}
          <S.TopBar>
            <S.PageTitle>
              <h1>Overview do Ecossistema</h1>
              <p>
                Ambiente unificado para monitoria, controle de licenças e
                faturamento transacionado.
              </p>
            </S.PageTitle>

            <S.TopBarActions>
              <S.IconButton onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </S.IconButton>

              <S.UserDropdownContainer ref={dropdownRef}>
                <S.UserTrigger
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="avatar">M</div>
                  <div className="info">
                    <span className="name">{user?.name || "Diretor Root"}</span>
                    <span className="role">Super Admin</span>
                  </div>
                </S.UserTrigger>

                {isDropdownOpen && (
                  <S.DropdownMenu>
                    <S.DropdownItem onClick={handleLogout}>
                      <LogOut size={16} /> Encerrar Sessão
                    </S.DropdownItem>
                  </S.DropdownMenu>
                )}
              </S.UserDropdownContainer>
            </S.TopBarActions>
          </S.TopBar>

          {/* GRID DE KPIS MINIMALISTAS COM IDENTIDADE DASHBOARD DE ALTO NÍVEL */}
          <S.KpiGrid>
            <S.KpiCard>
              <div className="header">
                <span>Volume Geral Transacionado</span>
                <TrendingUp size={16} color="#00a266" />
              </div>
              <h3>R$ {formatCurrency(totalFaturamento)}</h3>
              <p className="trend positive">
                +14.2% em relação ao mês anterior
              </p>
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
        </S.MainContent>
      </S.DashboardContainer>
    </ThemeProvider>
  );
}
