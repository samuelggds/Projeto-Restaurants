import styled from "styled-components";

// --- TEMAS (DARK & LIGHT) ---
export const darkTheme = {
  background: "#0f1118",
  surface: "#171b27",
  surfaceHover: "#252b3b",
  border: "#2c3448",
  text: "#ffffff",
  textMuted: "#a8b4d3",
  inputBg: "#1f2535",
  primary: "#3f64ff",
  primaryHover: "#2e50de",
};

export const lightTheme = {
  background: "#eef1f6",
  surface: "#ffffff",
  surfaceHover: "#f5f8ff",
  border: "#d9e1ef",
  text: "#171b26",
  textMuted: "#6f7586",
  inputBg: "#f7f9fe",
  primary: "#3f64ff",
  primaryHover: "#2e50de",
};

// --- ESTRUTURA GLOBAL E LAYOUT ---
export const HomeLayout = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 10% -12%,
      rgba(63, 100, 255, 0.16),
      rgba(63, 100, 255, 0) 40%
    ),
    ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Manrope", "Sora", "Segoe UI", sans-serif;
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
  background: linear-gradient(135deg, #17181e, #1f2027);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  color: #8ea5ff;
  font-weight: 800;
  font-size: 1.3rem;

  span {
    color: #ffffff;
    font-weight: 700;
  }
`;

// --- BOTÕES E COMPONENTES GLOBAIS ---
export const PrimaryButton = styled.button`
  background: ${(props) =>
    props.$loading ? "#1f2937" : "linear-gradient(135deg, #10b7a5, #17cab6)"};
  color: ${(props) => (props.$loading ? "#f8fafc" : "#000")};
  font-weight: 700;
  font-size: 1rem;
  padding: 0.85rem 2rem;
  border: none;
  border-radius: 10px;
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
      props.$loading ? "#111827" : "linear-gradient(135deg, #0fa08f, #16b6a5)"};
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(16, 183, 165, 0.24);
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
  border-radius: 14px;
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
  background: ${(props) => props.theme.background};
  border-left: 1px solid rgba(15, 23, 42, 0.12);
  box-shadow: -20px 0 40px rgba(15, 23, 42, 0.18);
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
    color: ${(props) => props.theme.text};
  }

  button {
    background: none;
    border: none;
    color: ${(props) => props.theme.text};
    cursor: pointer;
    display: flex;
    align-items: center;
    opacity: 0.88;
    transition:
      opacity 0.2s,
      color 0.2s;

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.primary};
      outline-offset: 2px;
      border-radius: 6px;
    }

    &:hover {
      opacity: 1;
      color: ${(props) => props.theme.primary};
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
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    background: #ffffff;
    border: none;
    border-bottom: 2px solid rgba(63, 100, 255, 0.5);
    color: ${(props) => props.theme.text};
    outline: none;
    box-sizing: border-box;
    box-shadow: none;
    transition: all 0.2s ease;

    &:hover {
      border-bottom-color: rgba(63, 100, 255, 0.75);
    }

    &:focus {
      border-bottom-color: ${(props) => props.theme.primary};
      box-shadow: none;
      transform: translateY(-1px);
    }

    &::placeholder {
      color: ${(props) => props.theme.textMuted};
      font-size: 0.95rem;
    }
  }
`;

export const CardVisualPreview = styled.div`
  width: min(240px, 100%);
  margin: 0 auto;
  border-radius: 14px;
  padding: 0.62rem;
  min-height: 112px;
  background:
    linear-gradient(140deg, rgba(64, 93, 255, 0.98), rgba(76, 106, 255, 0.95)),
    linear-gradient(45deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(31, 52, 150, 0.24);

  &::before {
    content: "";
    position: absolute;
    top: -20px;
    right: -12px;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.11);
  }

  &::after {
    content: "";
    position: absolute;
    left: 36%;
    top: 18%;
    width: 60px;
    height: 60px;
    transform: rotate(45deg);
    background: rgba(10, 15, 36, 0.13);
    border-radius: 12px;
  }
`;

export const CardVisualTop = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const CardChip = styled.span`
  width: 20px;
  height: 16px;
  border-radius: 5px;
  background: linear-gradient(135deg, #f8df8c, #f2ba53);
  box-shadow: inset 0 0 0 1px rgba(116, 86, 27, 0.28);
`;

export const CardBrandMark = styled.span`
  position: relative;
  width: 34px;
  height: 20px;
  display: inline-block;

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 0;
    width: 20px;
    height: 20px;
    border-radius: 999px;
  }

  &::before {
    left: 0;
    background: #ff4d4f;
  }

  &::after {
    right: 0;
    background: #ffb800;
    opacity: 0.86;
  }
`;

export const CardBrandLogo = styled.img`
  width: 62px;
  height: 20px;
  object-fit: contain;
  background: transparent;
  padding: 0;
  border: none;
  filter: none;
`;

export const CardVisualNumber = styled.div`
  position: relative;
  z-index: 1;
  margin-top: 1rem;
  color: #ffffff;
  letter-spacing: 0.11em;
  font-size: 0.7rem;
  font-weight: 700;
`;

export const CardVisualFooter = styled.div`
  position: relative;
  z-index: 1;
  margin-top: 0.68rem;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 0.7rem;
  color: #ffffff;

  .left,
  .right {
    display: grid;
    gap: 0.12rem;
  }

  small {
    font-size: 0.45rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.82;
  }

  strong {
    font-size: 0.62rem;
    letter-spacing: 0.09em;
  }
`;

export const CardDraftRow = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 0.75rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const CardLastRow = styled.div`
  display: grid;
  grid-template-columns: 0.9fr 0.5fr;
  gap: 0.75rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const PaymentSuccessWrap = styled.section`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1rem;
  background:
    linear-gradient(145deg, #4f67df 0%, #546ee8 54%, #4a62d7 100%),
    radial-gradient(circle at 0% 80%, rgba(44, 58, 128, 0.24), transparent 44%),
    radial-gradient(
      circle at 95% 20%,
      rgba(255, 255, 255, 0.08),
      transparent 38%
    );
`;

export const PaymentSuccessFrame = styled.div`
  width: min(420px, 100%);
  display: grid;
  gap: 0.7rem;
  justify-items: center;
  animation: riseIn 0.34s ease;

  @keyframes riseIn {
    from {
      opacity: 0;
      transform: translateY(14px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const PaymentSuccessCard = styled.div`
  width: min(420px, 100%);
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.2);
  padding: clamp(1.2rem, 4vw, 1.75rem) clamp(1rem, 4vw, 1.6rem);
  display: grid;
  justify-items: center;
  gap: 0.95rem;
`;

export const PaymentSuccessIcon = styled.div`
  width: 92px;
  height: 92px;
  border-radius: 999px;
  border: 3px solid #18b467;
  color: #18b467;
  display: grid;
  place-items: center;
  animation:
    paymentRingAppear 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    paymentSuccessPulse 1.8s ease-out 0.48s infinite;

  @keyframes paymentSuccessPulse {
    0% {
      box-shadow: 0 0 0 0 rgba(24, 180, 103, 0.42);
    }

    70% {
      box-shadow: 0 0 0 16px rgba(24, 180, 103, 0);
    }

    100% {
      box-shadow: 0 0 0 0 rgba(24, 180, 103, 0);
    }
  }

  @keyframes paymentRingAppear {
    from {
      opacity: 0;
      transform: scale(0.82);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  svg {
    overflow: visible;
  }

  svg * {
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: paymentCheckDraw 0.58s ease 0.24s forwards;
  }

  @keyframes paymentCheckDraw {
    from {
      stroke-dashoffset: 48;
    }

    to {
      stroke-dashoffset: 0;
    }
  }
`;

export const PaymentSuccessTitle = styled.h2`
  margin: 0;
  font-size: clamp(1.7rem, 6vw, 2.3rem);
  line-height: 1;
  font-weight: 900;
  color: #111827;
  letter-spacing: -0.01em;
`;

export const PaymentSuccessText = styled.p`
  margin: 0;
  text-align: center;
  color: #111827;
  font-size: 1rem;
`;

export const PaymentSuccessMeta = styled.p`
  margin: 0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.8rem;
  line-height: 1.45;
`;

export const PaymentSuccessAction = styled.button`
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 999px;
  background: #0fb8ab;
  color: #ffffff;
  font-weight: 800;
  font-size: 1.12rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.03);
    box-shadow: 0 14px 26px rgba(15, 184, 171, 0.36);
  }
`;
