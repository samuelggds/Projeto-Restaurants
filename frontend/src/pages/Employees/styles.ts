import styled, { css, keyframes } from "styled-components";

const pendingPulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.25);
    transform: translateY(0);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(249, 115, 22, 0);
    transform: translateY(-1px);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
    transform: translateY(0);
  }
`;

const pendingAlertPulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.34);
    transform: translateY(0);
  }

  50% {
    box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
    transform: translateY(-1px);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
    transform: translateY(0);
  }
`;

// --- TEMAS (DARK & LIGHT) ---
export const darkTheme = {
  background: "#f1f5f9",
  surface: "#ffffff",
  surfaceHover: "#f8fafc",
  sidebarSurface: "linear-gradient(160deg, #ea1d2c 0%, #b8141f 100%)",
  sidebarBorder: "transparent",
  border: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  inputBg: "rgba(255, 255, 255, 0.16)",
  primary: "#ea1d2c",
};

export const lightTheme = {
  background: "#f1f5f9",
  surface: "#ffffff",
  surfaceHover: "#f8fafc",
  sidebarSurface: "linear-gradient(160deg, #ea1d2c 0%, #b8141f 100%)",
  sidebarBorder: "transparent",
  border: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  inputBg: "rgba(255, 255, 255, 0.16)",
  primary: "#ea1d2c",
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

  @media (max-width: 1024px) {
    padding: 1.5rem;
  }

  @media (max-width: 768px) {
    padding: 4.4rem 1rem 1rem;
  }

  @media (max-width: 480px) {
    padding: 4.6rem 0.75rem 0.85rem;
  }

  @media (max-width: 360px) {
    padding: 4.55rem 0.6rem 0.7rem;
  }
`;

export const PageHeader = styled.div`
  margin-bottom: 2rem;

  @media (max-width: 480px) {
    margin-bottom: 1.3rem;
  }

  h2 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;

    @media (max-width: 480px) {
      font-size: 1.35rem;
    }

    @media (max-width: 360px) {
      font-size: 1.2rem;
    }
  }

  p {
    color: ${(props) => props.theme.textMuted};
    font-size: 0.95rem;

    @media (max-width: 480px) {
      font-size: 0.85rem;
    }
  }
`;

// --- SIDEBAR (BARRA LATERAL CORRIGIDA) ---
export const Sidebar = styled.aside`
  width: ${(props) => (props.$collapsed ? "80px" : "280px")};
  background: ${(props) => props.theme.sidebarSurface || props.theme.surface};
  border-right: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: ${(props) => (props.$collapsed ? "28px 12px" : "28px 20px")};
  gap: 24px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 10;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: ${(props) => (props.$mobileOpen ? "0" : "calc(-88vw - 24px)")};
    width: min(88vw, 300px);
    height: 100vh;
    transition: left 0.25s ease;
    z-index: 40;
    box-shadow: 0 18px 44px rgba(15, 23, 42, 0.35);
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${(props) =>
    props.$collapsed ? "center" : "space-between"};
  flex-direction: ${(props) => (props.$collapsed ? "column" : "row")};
  gap: ${(props) => (props.$collapsed ? "1rem" : "0")};
  margin-bottom: 0;
  padding: 0;
  min-height: 52px;

  .brand-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #ffffff;

    .brand-text {
      display: flex;
      flex-direction: column;

      h1 {
        font-size: 1.15rem;
        font-weight: 800;
        line-height: 1.1;
        color: #ffffff;
        margin: 0;
      }
      span {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.74);
      }
    }
  }

  .toggle-btn {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: #ffffff;
    border-radius: 6px;
    width: 28px;
    height: 28px;
    display: flex; /* Corrigido: Agora sempre visível como flexbox */
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.24);
      color: #fff;
    }
  }
`;

export const NavigationList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`;

export const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$collapsed ? "center" : "flex-start")};
  gap: 1rem;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: ${(props) =>
    props.$active ? "rgba(255,255,255,0.24)" : "transparent"};
  color: ${(props) =>
    props.$active ? "#ffffff" : "rgba(255, 255, 255, 0.86)"};
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
  }
`;

export const SidebarFooter = styled.div`
  border-top: 0;
  padding-top: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
`;

export const ThemeToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$collapsed ? "center" : "flex-start")};
  gap: 1rem;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.86);
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  border-radius: 10px;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
  }
`;

// --- GRID E CARDS DE PEDIDOS ---
export const OrdersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  align-items: start;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
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

  @media (max-width: 480px) {
    padding: 1rem;
  }

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
    gap: 0.5rem;
    flex-wrap: wrap;
    border-bottom: 1px solid ${(props) => props.theme.border};
    padding-bottom: 0.75rem;
    margin-bottom: 0.75rem;

    h3 {
      font-size: 1.1rem;
      font-weight: 700;

      @media (max-width: 360px) {
        font-size: 0.98rem;
      }
    }

    .price {
      font-weight: 700;
      color: ${(props) => props.theme.primary};
      font-size: 1.1rem;

      @media (max-width: 360px) {
        font-size: 1rem;
      }
    }
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
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

export const PixPendingRealtimeBadge = styled.span<{ $isDelayed?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${(props) => (props.$isDelayed ? "#7f1d1d" : "#7c2d12")};
  background: ${(props) => (props.$isDelayed ? "#fee2e2" : "#ffedd5")};
  border: 1px solid
    ${(props) =>
      props.$isDelayed
        ? "rgba(220, 38, 38, 0.45)"
        : "rgba(249, 115, 22, 0.45)"};
  border-radius: 6px;
  padding: 3px 8px;
  font-weight: 800;
  animation: ${(props) => (props.$isDelayed ? pendingAlertPulse : pendingPulse)}
    1.5s ease-in-out infinite;
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

  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  @media (max-width: 420px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }

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

    @media (max-width: 360px) {
      min-height: 36px;
      font-size: 0.72rem;
      padding: 0.4rem 0.2rem;
    }

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
  width: 100%;

  @media (max-width: 480px) {
    padding: 1rem;
  }

  @media (max-width: 360px) {
    padding: 0.85rem;
    border-radius: 10px;
  }
`;

export const FormRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  & > * {
    flex: 1;
    min-width: 200px;
  }

  @media (max-width: 640px) {
    & > * {
      min-width: 0;
      width: 100%;
    }
  }

  @media (max-width: 360px) {
    gap: 0.75rem;
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

    @media (max-width: 360px) {
      padding: 0.65rem 0.8rem;
      font-size: 0.9rem;
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

  @media (max-width: 900px) {
    & > * {
      min-width: 0;
      width: 100%;
    }
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
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
`;

export const Table = styled.table`
  width: 100%;
  min-width: 560px;
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

      @media (max-width: 360px) {
        padding: 0.7rem 0.6rem;
        font-size: 0.8rem;
      }
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

      @media (max-width: 360px) {
        padding: 0.7rem 0.6rem;
        font-size: 0.82rem;
      }
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
