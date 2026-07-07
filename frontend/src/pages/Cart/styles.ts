import styled from "styled-components";

// --- TEMAS (DARK & LIGHT) ---
export const darkTheme = {
  background: "#13131a",
  surface: "#1c1c24",
  surfaceHover: "#232330",
  border: "#2d2d3d",
  text: "#ffffff",
  textMuted: "#a0aec0",
  inputBg: "#232330",
  primary: "#eab308",
  primaryHover: "#ca8a04",
};

export const lightTheme = {
  background: "#f7fafc",
  surface: "#ffffff",
  surfaceHover: "#f1f5f9",
  border: "#e2e8f0",
  text: "#1a202c",
  textMuted: "#718096",
  inputBg: "#f8fafc",
  primary: "#dba206",
  primaryHover: "#b48404",
};

// --- ESTRUTURA GLOBAL E LAYOUT ---
export const HomeLayout = styled.div`
  min-height: 100vh;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Inter", sans-serif;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  overflow-x: hidden;
  position: relative;
`;

// --- NAVBAR ---
export const Navbar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2rem;
  background-color: ${(props) => props.theme.surface};
  border-bottom: 1px solid ${(props) => props.theme.border};
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  box-sizing: border-box;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(props) => props.theme.primary};
  font-weight: 800;
  font-size: 1.3rem;

  span {
    color: ${(props) => props.theme.text};
    font-weight: 700;
  }
`;

// --- BOTÕES E COMPONENTES GLOBAIS ---
export const PrimaryButton = styled.button`
  background: ${(props) => (props.$loading ? "#1f2937" : props.theme.primary)};
  color: ${(props) => (props.$loading ? "#f8fafc" : "#000")};
  font-weight: 700;
  font-size: 1rem;
  padding: 0.85rem 2rem;
  border: none;
  border-radius: 50px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;

  &:hover {
    background: ${(props) =>
      props.$loading ? "#111827" : props.theme.primaryHover};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3);
  }

  &:disabled {
    opacity: 0.75;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export const LoadingFill = styled.span`
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #111827 0%, #1f2937 50%, #111827 100%);
  opacity: 0.95;
  animation: fillPulse 1.2s ease-in-out infinite;

  @keyframes fillPulse {
    0% {
      transform: translateX(-20%);
      opacity: 0.82;
    }
    50% {
      transform: translateX(0%);
      opacity: 1;
    }
    100% {
      transform: translateX(20%);
      opacity: 0.82;
    }
  }
`;

export const LoadingSpinner = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

export const ProductCard = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  box-sizing: border-box;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
`;

export const MenuSection = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;

  h3 {
    font-weight: 800;
  }
`;

// --- LAYOUT DIVIDIDO DO CARRINHO (SPLIT) ---
export const CartSplitLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2.5rem;
  align-items: flex-start;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

export const CartItemsSection = styled.div`
  display: flex;
  flex-direction: column;

  h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.3rem;
    font-weight: 700;
  }
`;

export const CartSummarySection = styled.div`
  h3 {
    margin: 0;
    font-size: 1.2rem;
  }
`;

// --- JANELA DESLIZANTE (DRAWER) ---
export const DrawerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 200;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  animation: fadeIn 0.2s ease;
`;

export const DrawerContainer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  width: 450px;
  max-width: 100%;
  height: 100vh;
  background: ${(props) => props.theme.surface};
  border-left: 1px solid ${(props) => props.theme.border};
  box-shadow: -10px 0 25px -5px rgba(0, 0, 0, 0.2);
  z-index: 201;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  transition: transform 0.3s ease-in-out;
  transform: ${(props) =>
    props.$isOpen ? "translateX(0)" : "translateX(100%)"};
`;

export const DrawerHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${(props) => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  button {
    background: none;
    border: none;
    color: ${(props) => props.theme.text};
    cursor: pointer;
    display: flex;
    align-items: center;
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
`;

export const DrawerContent = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  box-sizing: border-box;

  input {
    width: 100%;
    min-height: 50px;
    padding: 0.9rem 1rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    background: ${(props) => props.theme.inputBg};
    border: 1px solid ${(props) => props.theme.border};
    color: ${(props) => props.theme.text};
    outline: none;
    box-sizing: border-box;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    transition: all 0.2s ease;

    &:hover {
      border-color: ${(props) => props.theme.textMuted};
    }

    &:focus {
      border-color: ${(props) => props.theme.primary};
      box-shadow:
        0 0 0 4px rgba(234, 179, 8, 0.16),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
      transform: translateY(-1px);
    }

    &::placeholder {
      color: ${(props) => props.theme.textMuted};
      font-size: 0.95rem;
    }
  }
`;
