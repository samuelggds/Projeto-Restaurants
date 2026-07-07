import styled, { css } from "styled-components";

// --- TEMAS (DARK & LIGHT) ---
export const darkTheme = {
  background: "#13131a",
  surface: "#1c1c24",
  surfaceHover: "#232330",
  sidebarSurface: "#1c1c24",
  sidebarBorder: "#2d2d3d",
  border: "#2d2d3d",
  text: "#ffffff",
  textMuted: "#a0aec0",
  inputBg: "#232330",
  primary: "#eab308", // Amarelo vibrante para a marca/destaques
};

export const lightTheme = {
  background: "#cfd9e4",
  surface: "#d9e3ee",
  surfaceHover: "#cfdbe8",
  sidebarSurface: "#afc0d1",
  sidebarBorder: "#95a8bd",
  border: "#b3c1d2",
  text: "#1a202c",
  textMuted: "#334155",
  inputBg: "#d8e2ed",
  primary: "#dba206",
};

// --- ESTRUTURA DO LAYOUT ---
export const AdminLayout = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Inter", sans-serif;
  transition: all 0.25s ease;
`;

export const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
`;

export const PageHeader = styled.div`
  margin-bottom: 2rem;

  h2 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  p {
    color: ${(props) => props.theme.textMuted};
    font-size: 0.95rem;
  }
`;

// --- SIDEBAR (BARRA LATERAL CORRIGIDA) ---
export const Sidebar = styled.aside`
  width: ${(props) => (props.$collapsed ? "80px" : "260px")};
  background-color: ${(props) =>
    props.theme.sidebarSurface || props.theme.surface};
  border-right: 1px solid
    ${(props) => props.theme.sidebarBorder || props.theme.border};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem 1rem;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 10;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${(props) =>
    props.$collapsed ? "center" : "space-between"};
  flex-direction: ${(props) => (props.$collapsed ? "column" : "row")};
  gap: ${(props) => (props.$collapsed ? "1rem" : "0")};
  margin-bottom: 2.5rem;
  padding: 0 0.5rem;
  min-height: 75px;

  .brand-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: ${(props) => props.theme.primary};

    .brand-text {
      display: flex;
      flex-direction: column;

      h1 {
        font-size: 1.15rem;
        font-weight: 800;
        line-height: 1.1;
        color: ${(props) => props.theme.text};
        margin: 0;
      }
      span {
        font-size: 0.75rem;
        color: ${(props) => props.theme.textMuted};
      }
    }
  }

  .toggle-btn {
    background: ${(props) => props.theme.inputBg};
    border: 1px solid ${(props) => props.theme.border};
    color: ${(props) => props.theme.text};
    border-radius: 6px;
    width: 28px;
    height: 28px;
    display: flex; /* Corrigido: Agora sempre visível como flexbox */
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: ${(props) => props.theme.primary};
      color: #fff;
    }
  }
`;

export const NavigationList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
`;

export const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$collapsed ? "center" : "flex-start")};
  gap: 1rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  background: ${(props) =>
    props.$active ? props.theme.inputBg : "transparent"};
  color: ${(props) => (props.$active ? props.theme.primary : props.theme.text)};
  font-weight: ${(props) => (props.$active ? "600" : "500")};
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  white-space: nowrap;

  border-left: 3px solid
    ${(props) => (props.$active ? props.theme.primary : "transparent")};

  &:hover {
    background: ${(props) => props.theme.surfaceHover};
    color: ${(props) => props.theme.primary};
  }
`;

export const SidebarFooter = styled.div`
  border-top: 1px solid ${(props) => props.theme.border};
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const ThemeToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$collapsed ? "center" : "flex-start")};
  gap: 1rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: ${(props) => props.theme.textMuted};
  cursor: pointer;
  font-weight: 500;
  border-radius: 8px;

  &:hover {
    background: ${(props) => props.theme.surfaceHover};
    color: ${(props) => props.theme.text};
  }
`;

// --- GRID E CARDS DE PEDIDOS ---
export const OrdersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
`;

export const OrderCard = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition:
    opacity 0.28s ease,
    transform 0.28s ease,
    max-height 0.28s ease,
    margin 0.28s ease,
    padding 0.28s ease;
  max-height: 520px;
  overflow: hidden;

  ${(props) =>
    props.$isClosing &&
    css`
      opacity: 0;
      transform: translateY(10px) scale(0.98);
      max-height: 0;
      margin: 0;
      padding-top: 0;
      padding-bottom: 0;
      border-width: 0;
    `}

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid ${(props) => props.theme.border};
    padding-bottom: 0.75rem;
    margin-bottom: 0.75rem;

    h3 {
      font-size: 1.1rem;
      font-weight: 700;
    }

    .price {
      font-weight: 700;
      color: ${(props) => props.theme.primary};
      font-size: 1.1rem;
    }
  }

  .badges {
    display: flex;
    gap: 0.35rem;
    margin-top: 0.35rem;

    .badge {
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;

      &.type {
        background: #3b82f6;
        color: #fff;
      }
      &.type-mesa {
        background: #3b82f6;
        color: #fff;
      }
      &.type-delivery {
        background: #ef4444;
        color: #fff;
      }
      &.type-retirada {
        background: #6b7280;
        color: #fff;
      }
      &.payment {
        background: #10b981;
        color: #fff;
      }
    }
  }

  .items-list {
    font-size: 0.9rem;
    line-height: 1.4;
    margin-bottom: 1rem;
    color: ${(props) => props.theme.text};
    opacity: 0.9;
  }
`;

export const CardHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;

  .price {
    font-weight: 700;
    color: ${(props) => props.theme.primary};
    font-size: 1.1rem;
  }
`;

export const CloseCompletedButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.42);
  background: linear-gradient(
    135deg,
    rgba(30, 41, 59, 0.06),
    rgba(14, 165, 233, 0.18)
  );
  color: ${(props) => props.theme.text};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(6px);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.16);
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(56, 189, 248, 0.65);
    background: linear-gradient(
      135deg,
      rgba(14, 165, 233, 0.22),
      rgba(37, 99, 235, 0.22)
    );
    color: #0f172a;
    transform: translateY(-1px) scale(1.06);
    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }
`;

export const StatusBox = styled.div`
  background: ${(props) => props.theme.inputBg};
  border: 1px solid ${(props) => props.theme.border};
  padding: 0.75rem;
  border-radius: 8px;

  h4 {
    font-size: 0.85rem;
    color: ${(props) => props.theme.textMuted};
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  /* CORES DINÂMICAS DO ORDERSTATUS ENUM */
  span {
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.85rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;

    &.status-pendente {
      background: #ef4444;
      color: #fff;
    }
    &.status-preparando {
      background: #f59e0b;
      color: #000;
    }
    &.status-pronto {
      background: #10b981;
      color: #fff;
    }
    &.status-saiu_para_entrega {
      background: #3b82f6;
      color: #fff;
    }
    &.status-entregue {
      background: #6366f1;
      color: #fff;
    }
    &.status-cancelado {
      background: #6b7280;
      color: #fff;
    }
  }
`;

export const ButtonGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  margin-top: 0.7rem;

  .btn {
    background: ${(props) => props.theme.surface};
    border: 1px solid ${(props) => props.theme.border};
    color: ${(props) => props.theme.text};
    padding: 0.45rem 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: ${(props) => props.theme.surfaceHover};
      border-color: ${(props) => props.theme.textMuted};
    }

    /* Estados Ativos baseados no Status do Pedido Atual */
    &.active-pendente {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    &.active-preparando {
      border-color: #f59e0b;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
    }
    &.active-pronto {
      border-color: #10b981;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }
    &.active-entrega {
      border-color: #3b82f6;
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
    &.active-entregue {
      border-color: #6366f1;
      color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
    }
    &.active-cancelado {
      border-color: #6b7280;
      color: #6b7280;
      background: rgba(107, 114, 128, 0.1);
    }
  }
`;

// --- FORMULÁRIOS ---
export const FormCard = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  max-width: 800px;
`;

export const FormRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  & > * {
    flex: 1;
    min-width: 200px;
  }
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: ${(props) => props.theme.text};
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  input,
  select,
  textarea {
    background: ${(props) => props.theme.inputBg};
    border: 1px solid ${(props) => props.theme.border};
    color: ${(props) => props.theme.text};
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: ${(props) => props.theme.primary};
    }

    &::placeholder {
      color: ${(props) => props.theme.textMuted};
      opacity: 0.6;
      font-size: 0.85rem;
    }

    &:disabled {
      background: ${(props) => props.theme.border};
      opacity: 0.6;
    }
  }
`;

export const PasswordInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  input {
    width: 100%;
    padding-right: 2.5rem;
  }

  .toggle-password {
    position: absolute;
    right: 0.75rem;
    background: transparent;
    border: none;
    color: ${(props) => props.theme.textMuted};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }
`;

export const CheckboxContainerRow = styled.div`
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: ${(props) => props.theme.primary};
      cursor: pointer;
    }
  }
`;

export const SubmitBtn = styled.button`
  background: ${(props) => props.theme.primary};
  color: #000;
  font-weight: 700;
  border: none;
  padding: 0.85rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

// --- LAYOUTS DIVERSOS E TABELAS ---
export const FlexDashboardLayout = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-start;

  & > * {
    flex: 1;
    min-width: 320px;
  }
`;

export const FormSectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
`;

export const TableContainer = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;

  thead {
    background: ${(props) => props.theme.inputBg};
    border-bottom: 1px solid ${(props) => props.theme.border};

    th {
      padding: 1rem;
      font-weight: 600;
      color: ${(props) => props.theme.textMuted};
    }
  }

  tbody tr {
    border-bottom: 1px solid ${(props) => props.theme.border};
    transition: background 0.15s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: ${(props) => props.theme.surfaceHover};
    }

    td {
      padding: 1rem;
      color: ${(props) => props.theme.text};
    }
  }
`;

export const SlugBadge = styled.span`
  background: ${(props) => props.theme.inputBg};
  border: 1px solid ${(props) => props.theme.border};
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
`;
