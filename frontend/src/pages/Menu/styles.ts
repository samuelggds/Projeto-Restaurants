import styled, { css } from "styled-components";

// --- THEME TOKENS ---
export const lightTheme = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceHover: "#fff7ed",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#f1f5f9",
  primary: "#ea580c",
  primaryHover: "#c2410c",
  shadow:
    "rgba(234, 88, 12, 0.04) 0px 8px 24px, rgba(15, 23, 42, 0.02) 0px 2px 8px",
};

export const darkTheme = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceHover: "#2c3b54",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  border: "#334155",
  primary: "#f97316",
  primaryHover: "#ea580c",
  shadow: "rgba(0, 0, 0, 0.2) 0px 10px 30px",
};

// --- ESTRUTURA DO LAYOUT ---
export const Layout = styled.div`
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
  transition:
    background-color 0.3s ease,
    color 0.3s ease;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
  }
`;

// --- NAVBAR SUPERIOR ---
export const TopNavbar = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2.5rem;
  background: ${(props) => props.theme.surface};
  border-bottom: 1px solid ${(props) => props.theme.border};
  position: sticky;
  top: 0;
  z-index: 40;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
  }
`;

// --- SIDEBAR / NAVEGAÇÃO DE CATEGORIAS ---
export const SidebarNav = styled.aside`
  width: 290px;
  background: ${(props) => props.theme.surface};
  border-right: 1px solid ${(props) => props.theme.border};
  display: flex;
  flex-direction: column;
  padding: 2rem 1.25rem;
  height: calc(100vh - 73px);
  position: sticky;
  top: 73px;
  z-index: 10;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  @media (max-width: 1024px) {
    width: 100%;
    height: auto;
    position: relative;
    top: 0;
    padding: 1rem;
    border-right: none;
    border-bottom: 1px solid ${(props) => props.theme.border};
  }
`;

export const CategoryList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;

  @media (max-width: 1024px) {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 0.5rem;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const CategoryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.95rem 1.25rem;
  border: none;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: ${(props) =>
    props.$active ? props.theme.primary : props.theme.textMuted};
  white-space: nowrap;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;

  &:hover {
    background: ${(props) => props.theme.border};
    color: ${(props) => props.theme.text};
  }

  ${(props) =>
    props.$active &&
    css`
      background: ${props.theme.primary}15 !important;
      color: ${props.theme.primary} !important;
      font-weight: 700;
    `}

  @media (max-width: 1024px) {
    width: auto;
  }
`;

// --- CONTEÚDO VITRINE ---
export const MainContent = styled.main`
  flex: 1;
  padding: 2.5rem;
  overflow-y: auto;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

export const SectionHeader = styled.div`
  margin-bottom: 2rem;
  border-left: 4px solid ${(props) => props.theme.primary};
  padding-left: 0.85rem;

  h3 {
    font-size: 1.5rem;
    margin: 0 0 0.25rem 0;
    font-weight: 800;
    letter-spacing: -0.025em;
  }
  p {
    margin: 0;
    color: ${(props) => props.theme.textMuted};
    font-size: 0.9rem;
  }
`;

export const MenuGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.75rem;
`;

// --- CARD DE PRODUTO COM FOTO ---
export const ProductCard = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 24px;
  overflow: hidden;
  box-shadow: ${(props) => props.theme.shadow};
  display: flex;
  flex-direction: column;
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.25s,
    background-color 0.25s;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    border-color: ${(props) => props.theme.primary}40;
    background: ${(props) => props.theme.surfaceHover};
  }

  .image-container {
    width: 100%;
    height: 180px;
    overflow: hidden;
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
  }

  &:hover .image-container img {
    transform: scale(1.05);
  }

  .card-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;

    h4 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
  }

  .price {
    font-size: 1.2rem;
    font-weight: 800;
    color: ${(props) => props.theme.primary};
    white-space: nowrap;
  }

  .description {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: ${(props) => props.theme.textMuted};
    flex: 1;
  }

  .tag-highlight {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: rgba(15, 23, 42, 0.75);
    color: #ffffff;
    backdrop-filter: blur(4px);
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    z-index: 2;

    &.pop {
      background: ${(props) => props.theme.primary};
    }
  }
`;

// --- BOTÕES ---
export const ActionButton = styled.button`
  width: ${(props) => props.$width || "100%"};
  padding: ${(props) => props.$padding || "0.85rem"};
  background: ${(props) =>
    props.$secondary ? props.theme.border : props.theme.primary};
  color: ${(props) => (props.$secondary ? props.theme.text : "#ffffff")};
  border: none;
  border-radius: 14px;
  font-weight: 700;
  font-size: ${(props) => props.$fontSize || "0.95rem"};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition:
    background 0.2s,
    transform 0.1s,
    color 0.2s;

  &:hover {
    background: ${(props) =>
      props.$secondary ? props.theme.border : props.theme.primaryHover};
    opacity: ${(props) => (props.$secondary ? 0.85 : 1)};
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    background: ${(props) => props.theme.border};
    color: ${(props) => props.theme.textMuted};
    cursor: not-allowed;
  }
`;

// --- OVERLAY & CARRINHO DESLIZANTE ---
export const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 90;
  opacity: ${(props) => (props.$isOpen ? "1" : "0")};
  pointer-events: ${(props) => (props.$isOpen ? "auto" : "none")};
  transition: opacity 0.3s ease;
`;

export const CartSidebar = styled.div`
  width: 400px;
  max-width: 100vw;
  background: ${(props) => props.theme.surface};
  padding: 2rem 1.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  top: 0;
  right: 0;
  z-index: 100;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
  transform: translateX(${(props) => (props.$isOpen ? "0" : "100%")});
  transition:
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.3s ease;

  .cart-header {
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${(props) => props.theme.border};
    padding-bottom: 1rem;

    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.6rem;
      color: ${(props) => props.theme.textMuted};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: ${(props) => props.theme.primary};
      }
    }
  }

  .items-container {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 1.5rem;
  }
`;

export const CartItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid ${(props) => props.theme.border};

  .details {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    strong {
      font-size: 0.95rem;
    }
    span {
      font-size: 0.85rem;
      color: ${(props) => props.theme.primary};
      font-weight: 600;
    }
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 0.65rem;

    .qty-btn {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid ${(props) => props.theme.border};
      background: ${(props) => props.theme.background};
      color: ${(props) => props.theme.text};
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: ${(props) => props.theme.primary};
        color: white;
        border-color: ${(props) => props.theme.primary};
      }
    }

    .qty-val {
      font-weight: 700;
      font-size: 0.95rem;
      min-width: 20px;
      text-align: center;
    }
  }
`;

export const CartFooter = styled.div`
  margin-top: auto;
  padding-top: 1.25rem;
  border-top: 2px dashed ${(props) => props.theme.border};

  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;

    span {
      color: ${(props) => props.theme.textMuted};
      font-weight: 600;
    }
    strong {
      font-size: 1.6rem;
      font-weight: 900;
    }
  }
`;
