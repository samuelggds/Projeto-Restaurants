import styled from "styled-components";

export const lightTheme = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  text: "#334155",
  textDark: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  primary: "#ea1d2c",
  primaryHover: "#cc1422",
  zinc900: "#09090b",
};

export const darkTheme = {
  background: "#09090b",
  surface: "#18181b",
  surfaceAlt: "#27272a",
  text: "#a1a1aa",
  textDark: "#f4f4f5",
  textMuted: "#71717a",
  border: "#27272a",
  primary: "#ea1d2c",
  primaryHover: "#cc1422",
  zinc900: "#09090b",
};

export const DashboardContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family:
    "Inter",
    -apple-system,
    sans-serif;
`;

/* SIDEBAR LUXO */
export const Sidebar = styled.aside`
  width: 260px;
  background-color: ${(props) => props.theme.surface};
  border-right: 1px solid ${(props) => props.theme.border};
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  position: fixed;
  height: 100vh;
  box-sizing: border-box;
`;

export const SidebarLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(props) => props.theme.primary};
  margin-bottom: 2.5rem;

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    color: ${(props) => props.theme.textDark};
  }
  span {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1px;
    color: ${(props) => props.theme.textMuted};
  }
`;

export const SidebarNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
`;

export const SidebarLink = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: ${(props) => (props.$active ? props.theme.surfaceAlt : "none")};
  border: none;
  color: ${(props) =>
    props.$active ? props.theme.textDark : props.theme.textMuted};
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${(props) => props.theme.surfaceAlt};
    color: ${(props) => props.theme.textDark};
  }
`;

export const SidebarFooter = styled.div`
  padding-top: 1rem;
  border-top: 1px solid ${(props) => props.theme.border};
  .version {
    font-size: 0.75rem;
    color: ${(props) => props.theme.textMuted};
  }
`;

/* ÁREA PRINCIPAL */
export const MainContent = styled.main`
  flex: 1;
  margin-left: 260px;
  padding: 2.5rem;
  box-sizing: border-box;
  max-width: 1400px;
`;

export const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
`;

export const PageTitle = styled.div`
  h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: ${(props) => props.theme.textDark};
  }
  p {
    margin: 0;
    font-size: 0.9rem;
    color: ${(props) => props.theme.textMuted};
  }
`;

export const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const IconButton = styled.button`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${(props) => props.theme.textDark};

  &:hover {
    background: ${(props) => props.theme.surfaceAlt};
  }
`;

/* DROPDOWN USUÁRIO */
export const UserDropdownContainer = styled.div`
  position: relative;
`;

export const UserTrigger = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 0.75rem 0.35rem 0.35rem;
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 99px;
  cursor: pointer;

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${(props) => props.theme.primary};
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
  }

  .info {
    display: flex;
    flex-direction: column;
    .name {
      font-size: 0.8rem;
      font-weight: 700;
      color: ${(props) => props.theme.textDark};
    }
    .role {
      font-size: 0.65rem;
      color: ${(props) => props.theme.textMuted};
    }
  }
`;

export const DropdownMenu = styled.div`
  position: absolute;
  top: 48px;
  right: 0;
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 8px;
  padding: 0.35rem;
  min-width: 160px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
`;

export const DropdownItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border: none;
  background: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: #ef4444;
  cursor: pointer;
  border-radius: 6px;

  &:hover {
    background: #fee2e2;
  }
`;

/* CARDS KPI */
export const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
`;

export const KpiCard = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    font-weight: 600;
    color: ${(props) => props.theme.textMuted};
  }

  h3 {
    margin: 0.75rem 0 0.35rem 0;
    font-size: 1.75rem;
    font-weight: 800;
    color: ${(props) => props.theme.textDark};
    letter-spacing: -1px;

    .total {
      font-size: 1rem;
      color: ${(props) => props.theme.textMuted};
      font-weight: 500;
      letter-spacing: 0;
    }
  }

  .trend {
    margin: 0;
    font-size: 0.75rem;
    color: ${(props) => props.theme.textMuted};

    &.positive {
      color: #00a266;
      font-weight: 600;
    }
    &.operational {
      color: ${(props) => props.theme.textMuted};
    }
  }
`;

/* FILTROS */
export const FilterSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

export const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  padding: 0.6rem 1rem;
  border-radius: 8px;
  min-width: 320px;
  flex: 1;
  max-width: 450px;
  color: ${(props) => props.theme.textMuted};

  input {
    background: none;
    border: none;
    outline: none;
    width: 100%;
    font-size: 0.85rem;
    color: ${(props) => props.theme.textDark};

    &::placeholder {
      color: ${(props) => props.theme.textMuted};
    }
  }
`;

export const FilterPills = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const FilterPill = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid
    ${(props) => (props.$active ? props.theme.textDark : props.theme.border)};
  background: ${(props) =>
    props.$active ? props.theme.textDark : props.theme.surface};
  color: ${(props) =>
    props.$active ? props.theme.background : props.theme.text};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${(props) => props.theme.textDark};
  }
`;

/* TABELA ENTERPRISE */
export const TableContainer = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.85rem;

  thead {
    background: ${(props) => props.theme.surfaceAlt};
    border-bottom: 1px solid ${(props) => props.theme.border};

    th {
      padding: 1rem 1.5rem;
      font-weight: 600;
      color: ${(props) => props.theme.textDark};
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.5px;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid ${(props) => props.theme.border};
      background: transparent;
      transition: background 0.1s ease;

      &:hover {
        background: ${(props) => props.theme.surfaceAlt}33; // 20% opacity
      }

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      padding: 1rem 1.5rem;
      vertical-align: middle;
    }
  }
`;

export const CompanyCell = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  .icon-box {
    width: 32px;
    height: 32px;
    background: ${(props) => props.theme.surfaceAlt};
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.theme.textDark};
  }

  .comp-name {
    display: block;
    font-weight: 700;
    color: ${(props) => props.theme.textDark};
  }

  .comp-owner {
    display: block;
    font-size: 0.75rem;
    color: ${(props) => props.theme.textMuted};
    margin-top: 0.15rem;
  }
`;

export const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.65rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;

  ${(props) => {
    switch (props.$type) {
      case "Ativo":
        return "background: #e6f6f0; color: #00a266;";
      case "Aviso":
        return "background: #fffbeb; color: #d97706;";
      case "Bloqueado":
        return "background: #fef2f2; color: #ef4444;";
      default:
        return "background: #f4f4f5; color: #71717a;";
    }
  }}

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
  }
`;

export const UptimeWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100px;

  .value {
    font-weight: 700;
    font-size: 0.8rem;
    color: ${(props) => props.theme.textDark};
  }
`;

export const UptimeBar = styled.div`
  height: 4px;
  background: ${(props) => props.theme.border};
  border-radius: 2px;
  position: relative;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${(props) => props.$percentage}%;
    background: ${(props) =>
      props.$percentage > 95
        ? "#00a266"
        : props.$percentage > 0
          ? "#d97706"
          : "#ef4444"};
  }
`;

export const ActionButton = styled.button`
  background: none;
  border: 1px solid
    ${(props) => (props.$isAtivo ? "#ef444433" : props.theme.border)};
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${(props) => (props.$isAtivo ? "#ef4444" : props.theme.textDark)};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${(props) =>
      props.$isAtivo ? "#fef2f2" : props.theme.surfaceAlt};
    border-color: ${(props) =>
      props.$isAtivo ? "#ef4444" : props.theme.textDark};
  }
`;

export const EmptyState = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.9rem;
`;
