import styled, { css, keyframes } from "styled-components";

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
`;

// --- TEMAS (Design System Premium) ---
export const lightTheme = {
  background: "#f1f5f9",
  surface: "#ffffff",
  surfaceHover: "#f8fafc",
  sidebarSurface: "linear-gradient(160deg, #ea1d2c 0%, #b8141f 100%)",
  sidebarBorder: "transparent",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  primary: "#ea1d2c",
  primaryHover: "#b8141f",
  success: "#10b981",
  danger: "#ef4444",
  shadow: "rgba(15, 23, 42, 0.12) 0px 4px 16px 0px",
};

export const darkTheme = {
  background: "#f1f5f9",
  surface: "#ffffff",
  surfaceHover: "#f8fafc",
  sidebarSurface: "linear-gradient(160deg, #ea1d2c 0%, #b8141f 100%)",
  sidebarBorder: "transparent",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  primary: "#ea1d2c",
  primaryHover: "#b8141f",
  success: "#34d399",
  danger: "#f87171",
  shadow: "rgba(15, 23, 42, 0.12) 0px 4px 16px 0px",
};

// --- LAYOUT E ESTRUTURA GLOBAL ---
export const AdminLayout = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100vw;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family:
    "Inter",
    system-ui,
    -apple-system,
    sans-serif;
  overflow-x: hidden;
  transition: background-color 0.2s ease;
`;

export const MainContent = styled.main`
  flex: 1;
  padding: 2.5rem;
  overflow-y: auto;
  box-sizing: border-box;
  max-height: 100vh;

  @media (max-width: 1024px) {
    padding: 1.8rem;
  }

  @media (max-width: 768px) {
    padding: 4.4rem 1rem 1.1rem;
  }

  @media (max-width: 480px) {
    padding: 4.6rem 0.75rem 0.85rem;
  }

  @media (max-width: 360px) {
    padding: 4.55rem 0.6rem 0.7rem;
  }
`;

export const PageHeader = styled.div`
  margin-bottom: 2.5rem;

  @media (max-width: 480px) {
    margin-bottom: 1.3rem;
  }

  h2 {
    font-size: 1.85rem;
    margin: 0 0 0.35rem 0;
    font-weight: 800;
    letter-spacing: -0.025em;

    @media (max-width: 480px) {
      font-size: 1.4rem;
    }

    @media (max-width: 360px) {
      font-size: 1.22rem;
    }
  }

  p {
    margin: 0;
    color: ${(props) => props.theme.textMuted};
    font-size: 1rem;

    @media (max-width: 480px) {
      font-size: 0.86rem;
    }
  }
`;

// --- SIDEBAR (BARRA LATERAL) ---
export const Sidebar = styled.aside`
  width: ${(props) => (props.$collapsed ? "80px" : "280px")};
  background: ${(props) => props.theme.sidebarSurface || props.theme.surface};
  border-right: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: ${(props) => (props.$collapsed ? "28px 12px" : "28px 20px")};
  gap: 24px;
  box-sizing: border-box;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
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
  padding-bottom: 0;
  border-bottom: 0;
  color: ${(props) => props.theme.primary};
  width: 100%;
  min-height: 52px;

  .brand-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #ffffff;
  }

  .brand-logo-image {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: #ffffff;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.24);
    flex-shrink: 0;
  }

  .brand-logo-fallback {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: #ffffff;
    flex-shrink: 0;
  }

  .brand-text {
    h1 {
      font-size: 1.15rem;
      margin: 0;
      color: #ffffff;
      font-weight: 800;
    }
    span {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.74);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
  }

  .toggle-btn {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: #ffffff;
    padding: 0.4rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.24);
      color: white;
      border-color: rgba(255, 255, 255, 0.34);
    }
  }
`;

export const NavigationList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 0;
  flex: 1;
`;

export const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$collapsed ? "center" : "start")};
  gap: 10px;
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: ${(props) =>
    props.$active ? "#ffffff" : "rgba(255, 255, 255, 0.86)"};
  white-space: nowrap;
  transition: all 0.2s ease;
  width: 100%;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
  }

  ${(props) =>
    props.$active &&
    css`
      background: rgba(255, 255, 255, 0.25) !important;
      color: #ffffff !important;
    `}
`;

export const SidebarFooter = styled.div`
  margin-top: auto;
  border-top: 0;
  padding-top: 0;
`;

export const ThemeToggle = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$collapsed ? "center" : "start")};
  gap: 10px;
  padding: 10px 14px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #ffffff;
  border-radius: 10px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
  }
`;

// --- GRID E LAYOUT EXTRA ---
export const FlexDashboardLayout = styled.div`
  display: flex;
  gap: 1.75rem;
  align-items: flex-start;
  width: 100%;

  @media (max-width: 1024px) {
    flex-direction: column;
    & > div,
    & > form {
      width: 100% !important;
      max-width: 100% !important;
    }
  }
`;

// --- FLUXO DE PEDIDOS REAL-TIME ---
export const OrdersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  align-items: start;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

export const OrdersFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-bottom: 1.25rem;

  @media (max-width: 360px) {
    gap: 0.4rem;
    margin-bottom: 0.9rem;
  }
`;

export const OrderTypeFilterButton = styled.button`
  ${(props) => {
    const tone = String(props.$tone || "default").toLowerCase();

    if (tone === "warning") {
      return css`
        &:hover {
          border-color: #eab308;
          color: #eab308;
        }

        ${props.$active &&
        css`
          border-color: #eab308;
          background: #eab30820;
          color: #eab308;
          box-shadow: inset 0 0 0 1px #eab30840;
        `}
      `;
    }

    if (tone === "info") {
      return css`
        &:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        ${props.$active &&
        css`
          border-color: #3b82f6;
          background: #3b82f620;
          color: #3b82f6;
          box-shadow: inset 0 0 0 1px #3b82f640;
        `}
      `;
    }

    if (tone === "violet") {
      return css`
        &:hover {
          border-color: #a855f7;
          color: #a855f7;
        }

        ${props.$active &&
        css`
          border-color: #a855f7;
          background: #a855f720;
          color: #a855f7;
          box-shadow: inset 0 0 0 1px #a855f740;
        `}
      `;
    }

    if (tone === "cyan") {
      return css`
        &:hover {
          border-color: #06b6d4;
          color: #06b6d4;
        }

        ${props.$active &&
        css`
          border-color: #06b6d4;
          background: #06b6d420;
          color: #06b6d4;
          box-shadow: inset 0 0 0 1px #06b6d440;
        `}
      `;
    }

    if (tone === "success") {
      return css`
        &:hover {
          border-color: #10b981;
          color: #10b981;
        }

        ${props.$active &&
        css`
          border-color: #10b981;
          background: #10b98120;
          color: #10b981;
          box-shadow: inset 0 0 0 1px #10b98140;
        `}
      `;
    }

    if (tone === "danger") {
      return css`
        &:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        ${props.$active &&
        css`
          border-color: #ef4444;
          background: #ef444420;
          color: #ef4444;
          box-shadow: inset 0 0 0 1px #ef444440;
        `}
      `;
    }

    return null;
  }}

  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.textMuted};
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: all 0.2s ease;

  @media (max-width: 360px) {
    padding: 0.4rem 0.7rem;
    font-size: 0.76rem;
  }

  &:hover {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.text};
  }

  ${(props) =>
    props.$active &&
    !props.$tone &&
    css`
      border-color: ${props.theme.primary};
      background: ${props.theme.primary}18;
      color: ${props.theme.primary};
      box-shadow: inset 0 0 0 1px ${props.theme.primary}28;
    `}
`;

export const OrderCard = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: ${(props) => props.theme.shadow};
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition:
    opacity 0.28s ease,
    transform 0.28s ease,
    max-height 0.28s ease,
    margin 0.28s ease,
    padding 0.28s ease;
  max-height: none;
  overflow: visible;

  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 12px;
  }

  ${(props) =>
    props.$isClosing &&
    css`
      opacity: 0;
      transform: translateY(10px) scale(0.98);
      max-height: 0;
      overflow: hidden;
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

    h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
      font-weight: 800;

      @media (max-width: 360px) {
        font-size: 1rem;
      }
    }
    .price {
      font-size: 1.25rem;
      font-weight: 800;
      color: ${(props) => props.theme.primary};

      @media (max-width: 360px) {
        font-size: 1rem;
      }
    }
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;

    .badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      text-transform: uppercase;

      &.type {
        background: ${(props) => props.theme.border};
        color: ${(props) => props.theme.text};
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
        background: ${(props) => props.theme.primary}15;
        color: ${(props) => props.theme.primary};
      }
    }
  }

  .items-list {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.background};
    padding: 1rem;
    border-radius: 10px;
  }
`;

export const CardHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;

  .price {
    font-size: 1.25rem;
    font-weight: 800;
    color: ${(props) => props.theme.primary};
  }
`;

export const CloseDeliveredButton = styled.button`
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
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid ${(props) => props.theme.border};
  padding-top: 1rem;

  h4 {
    margin: 0;
    font-size: 0.9rem;
    color: ${(props) => props.theme.textMuted};

    span {
      font-weight: 800;
      text-transform: uppercase;
      &.status-pendente {
        color: #eab308;
      }
      &.status-preparando {
        color: #3b82f6;
      }
      &.status-pronto {
        color: #a855f7;
      }
      &.status-saiu_para_entrega {
        color: #06b6d4;
      }
      &.status-entregue {
        color: ${(props) => props.theme.success};
      }
      &.status-cancelado {
        color: ${(props) => props.theme.danger};
      }
    }
  }
`;

export const ButtonGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 0.4rem;

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }

  .btn {
    background: ${(props) => props.theme.background};
    border: 1px solid ${(props) => props.theme.border};
    color: ${(props) => props.theme.textMuted};
    min-height: 38px;
    padding: 0.5rem 0.45rem;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    white-space: normal;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    transition: all 0.15s;

    @media (max-width: 360px) {
      min-height: 36px;
      font-size: 0.72rem;
      padding: 0.4rem 0.2rem;
    }

    &:hover {
      background: ${(props) => props.theme.border};
      color: ${(props) => props.theme.text};
    }

    &.active-pendente {
      background: #eab30820;
      color: #eab308;
      border-color: #eab308;
    }
    &.active-preparando {
      background: #3b82f620;
      color: #3b82f6;
      border-color: #3b82f6;
    }
    &.active-pronto {
      background: #a855f720;
      color: #a855f7;
      border-color: #a855f7;
    }
    &.active-entrega {
      background: #06b6d420;
      color: #06b6d4;
      border-color: #06b6d4;
    }
    &.active-entregue {
      background: #10b98120;
      color: #10b981;
      border-color: #10b981;
    }
    &.active-cancelado {
      background: #ef444420;
      color: #ef4444;
      border-color: #ef4444;
    }
  }
`;

// --- TABELAS ---
export const TableContainer = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: ${(props) => props.theme.shadow};
  width: 100%;
`;

export const Table = styled.table`
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.95rem;

  thead {
    background: ${(props) => props.theme.background};
    th {
      padding: 1.15rem 1.25rem;
      color: ${(props) => props.theme.textMuted};
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid ${(props) => props.theme.border};

      @media (max-width: 360px) {
        padding: 0.75rem 0.65rem;
        font-size: 0.78rem;
      }
    }
  }

  tbody tr {
    border-bottom: 1px solid ${(props) => props.theme.border};
    &:last-child {
      border-bottom: none;
    }
    &:hover {
      background: ${(props) => props.theme.surfaceHover};
    }

    td {
      padding: 1.25rem;
      color: ${(props) => props.theme.text};
      vertical-align: middle;

      @media (max-width: 360px) {
        padding: 0.75rem 0.65rem;
        font-size: 0.82rem;
      }

      strong {
        font-weight: 700;
      }
      small {
        color: ${(props) => props.theme.textMuted};
        font-size: 0.85rem;
      }
    }
  }
`;

export const SlugBadge = styled.span`
  background: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.border};
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: ${(props) => props.theme.primary};
`;

export const CategoryListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  background: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 10px;
  padding: 0.45rem;

  ${SlugBadge} {
    border: none;
    background: transparent;
    padding: 0.25rem 0.35rem;
  }
`;

export const CategoryActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
`;

export const CategoryActionButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.textMuted};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .loading-icon {
    animation: ${spin} 0.85s linear infinite;
  }
`;

export const CategoryInlineEditor = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.45rem;

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }

  input {
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    border: 1px solid ${(props) => props.theme.border};
    background: ${(props) => props.theme.surface};
    color: ${(props) => props.theme.text};
    font-size: 0.92rem;
  }
`;

export const TableQrGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

export const TableQrCard = styled.div`
  background: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 18px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  box-shadow: ${(props) => props.theme.shadow};
`;

export const TableQrCodeBox = styled.div`
  background: ${(props) => props.theme.surfaceHover};
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;

  @media (max-width: 360px) {
    min-height: 180px;
    padding: 0.75rem;
  }

  svg {
    width: 100%;
    height: auto;
    max-width: 160px;

    @media (max-width: 360px) {
      max-width: 130px;
    }
  }
`;

export const TableQrMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  small {
    color: ${(props) => props.theme.textMuted};
    font-size: 0.82rem;
    word-break: break-word;
  }
`;

export const TableQrActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.35rem;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

export const TableQrActionButton = styled.button`
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.text};
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  white-space: normal;
  cursor: pointer;
  transition: all 0.2s ease;

  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
    transform: translateY(-1px);
  }

  @media (max-width: 360px) {
    min-height: 40px;
    font-size: 0.8rem;
    padding: 0.6rem;
  }
`;

// --- FORMULÁRIOS E INPUTS ---
export const FormCard = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 850px;
  box-shadow: ${(props) => props.theme.shadow};
  box-sizing: border-box;
  width: 100%;

  @media (max-width: 600px) {
    padding: 1rem;
    border-radius: 14px;
  }

  @media (max-width: 360px) {
    padding: 0.85rem;
    border-radius: 10px;
  }
`;

export const FormSectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 800;
  border-left: 4px solid ${(props) => props.theme.primary};
  padding-left: 0.75rem;
  margin: 0 0 1.5rem 0;
  color: ${(props) => props.theme.text};
  display: flex;
  align-items: center;
`;

export const FormRow = styled.div`
  display: flex;
  gap: 1.5rem;
  width: 100%;
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1.25rem;
  }

  @media (max-width: 360px) {
    gap: 0.85rem;
  }
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  width: 100%;
  box-sizing: border-box;

  label {
    font-size: 0.85rem;
    font-weight: 700;
    color: ${(props) => props.theme.textMuted};
  }

  input,
  select {
    padding: 0.85rem 1.15rem;
    background: ${(props) => props.theme.background};
    border: 1px solid ${(props) => props.theme.border};
    border-radius: 10px;
    color: ${(props) => props.theme.text};
    font-size: 1rem;
    width: 100%;
    box-sizing: border-box;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.primary};
      background: ${(props) => props.theme.surface};
      box-shadow: 0 0 0 4px ${(props) => props.theme.primary + "20"};
    }

    @media (max-width: 360px) {
      padding: 0.7rem 0.85rem;
      font-size: 0.9rem;
    }
  }

  select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1.1rem;
  }
`;

export const PasswordInputWrapper = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  input {
    padding-right: 3rem !important;
  }
  .toggle-password {
    position: absolute;
    right: 0.5rem;
    background: transparent;
    border: none;
    color: ${(props) => props.theme.textMuted};
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0.4rem;
  }
`;

export const CheckboxContainerRow = styled.div`
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  background: ${(props) => props.theme.background};
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px dashed ${(props) => props.theme.border};

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    color: ${(props) => props.theme.text};

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${(props) => props.theme.primary};
    }
  }

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

export const SubmitBtn = styled.button`
  width: 100%;
  padding: 1rem;
  background: ${(props) => props.theme.primary};
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  &:hover {
    background: ${(props) => props.theme.primaryHover};
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export const CancelBtn = styled.button`
  width: 100%;
  padding: 1rem;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export const ProductListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem;
  border-radius: 10px;
  background: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.border};
`;

export const ProductMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  strong {
    font-size: 0.95rem;
    color: ${(props) => props.theme.text};
  }

  small {
    color: ${(props) => props.theme.textMuted};
    font-size: 0.82rem;
  }
`;

export const ProductActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
`;
