import styled from "styled-components";

export const lightTheme = {
  background: "#eef1f6",
  surface: "#ffffff",
  surfaceHover: "#f5f8ff",
  text: "#121826",
  border: "#d9e1ef",
  primary: "#3f64ff",
  heroBg: "#1a1a1d",
  heroText: "#f8fafc",
};

export const darkTheme = {
  background: "#0f1118",
  surface: "#171b27",
  surfaceHover: "#252b3b",
  text: "#f8fafc",
  border: "#2c3448",
  primary: "#88a2ff",
  heroBg: "#17181e",
  heroText: "#f8fafc",
};

export const HomeLayout = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 10% -12%,
      rgba(63, 100, 255, 0.18),
      rgba(63, 100, 255, 0) 42%
    ),
    radial-gradient(
      circle at 92% 8%,
      rgba(14, 181, 197, 0.1),
      rgba(14, 181, 197, 0) 36%
    ),
    ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Manrope", "Sora", "Segoe UI", sans-serif;
  transition: all 0.3s ease;
`;

export const Navbar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #17181e, #1f2027);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);

  @media (max-width: 640px) {
    padding: 0.85rem 1rem;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 800;
  font-size: 1.15rem;
  color: #8ea5ff;
  letter-spacing: 0.02em;

  span {
    color: #ffffff;
    font-weight: 800;
  }
`;

export const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// --- NOVO: Estilo do botão do carrinho ---
export const CartButtonContainer = styled.button`
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #f8fafc;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);

  &:hover {
    background: rgba(63, 100, 255, 0.24);
    border-color: rgba(126, 151, 255, 0.62);
    color: #ffffff;
    transform: translateY(-1px);
  }
`;

// --- NOVO: Estilo do balão de contagem ---
export const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -5px;
  background: linear-gradient(135deg, #3f64ff, #6f86ff);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  animation: popScale 0.2s ease-out;

  @keyframes popScale {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }
`;

export const ThemeToggleButton = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #f8fafc;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);

  &:hover {
    background: rgba(63, 100, 255, 0.24);
    transform: translateY(-1px);
  }
`;

export const AdminQuickButton = styled.button`
  border: 1px solid ${(props) => props.theme.primary};
  background: linear-gradient(135deg, #f59e0b, #facc15);
  color: #0f172a;
  height: 42px;
  border-radius: 0.65rem;
  padding: 0 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 800;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 18px rgba(217, 119, 6, 0.22);

  &:hover {
    filter: brightness(1.04);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

export const UserMenuContainer = styled.div`
  position: relative;
`;

export const AvatarButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

export const DropdownMenu = styled.div`
  position: absolute;
  right: 0;
  top: 52px;
  background-color: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 0.75rem;
  width: 240px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 200;
`;

export const DropdownHeader = styled.div`
  padding: 1rem;
  background-color: ${(props) => props.theme.surfaceHover};
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid ${(props) => props.theme.border};

  .name {
    font-weight: 600;
    font-size: 0.95rem;
  }
  .email {
    font-size: 0.8rem;
    opacity: 0.6;
    margin-top: 0.15rem;
  }
`;

export const DropdownItem = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: ${(props) => (props.$danger ? "#ef4444" : props.theme.text)};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.surfaceHover};
  }
`;

export const HeroSection = styled.header`
  background:
    radial-gradient(
      circle at 20% 8%,
      rgba(63, 100, 255, 0.3),
      rgba(63, 100, 255, 0) 42%
    ),
    radial-gradient(
      circle at 84% 20%,
      rgba(14, 181, 197, 0.24),
      rgba(14, 181, 197, 0) 44%
    ),
    ${(props) => props.theme.heroBg};
  color: ${(props) => props.theme.heroText};
  padding: clamp(3.1rem, 8vw, 5.4rem) 2rem;
  text-align: center;
  display: flex;
  justify-content: center;
`;

export const HeroContent = styled.div`
  max-width: 700px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.3rem;

  h1 {
    font-size: clamp(2rem, 6.3vw, 3.3rem);
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.03em;
    margin: 0;

    span {
      color: ${(props) => props.theme.primary};
    }
  }

  p {
    font-size: clamp(0.98rem, 2.5vw, 1.08rem);
    opacity: 0.86;
    line-height: 1.7;
    margin: 0;
    max-width: 620px;
  }
`;

export const PrimaryButton = styled.button`
  background: linear-gradient(135deg, #10b7a5, #17cab6);
  color: #ffffff;
  border: none;
  padding: 0.88rem 1.7rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition:
    transform 0.2s,
    opacity 0.2s,
    box-shadow 0.2s;
  box-shadow: 0 16px 30px rgba(16, 183, 165, 0.34);

  &:hover {
    transform: translateY(-1px);
    opacity: 0.95;
  }
`;

export const MenuSection = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(2rem, 5.2vw, 4rem) 2rem;

  h2 {
    font-size: clamp(1.45rem, 3.6vw, 2rem);
    font-weight: 800;
    margin-bottom: 2rem;
    letter-spacing: -0.02em;
  }
`;

export const CategoriesContainer = styled.div`
  display: flex;
  gap: 0.65rem;
  overflow-x: auto;
  padding-bottom: 0.9rem;
  margin-bottom: 2.1rem;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.border};
    border-radius: 2px;
  }
`;

export const CategoryButton = styled.button`
  background: ${(props) =>
    props.$active
      ? "linear-gradient(135deg, #3f64ff, #6f86ff)"
      : props.theme.surface};
  color: ${(props) => (props.$active ? "#ffffff" : props.theme.text)};
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(63, 100, 255, 0.46)" : props.theme.border};
  padding: 0.6rem 1.2rem;
  border-radius: 2rem;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: ${(props) =>
    props.$active ? "0 12px 22px rgba(63, 100, 255, 0.24)" : "none"};

  &:hover {
    border-color: ${(props) => props.theme.primary};
    transform: translateY(-1px);
  }
`;

export const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: clamp(1rem, 2.4vw, 1.6rem);
`;

export const CategorySection = styled.section`
  display: grid;
  gap: 1.1rem;
  position: relative;
  animation: categorySectionReveal 0.42s ease both;

  @keyframes categorySectionReveal {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &:nth-of-type(2) {
    animation-delay: 0.04s;
  }

  &:nth-of-type(3) {
    animation-delay: 0.08s;
  }

  &:nth-of-type(4) {
    animation-delay: 0.12s;
  }

  &:nth-of-type(5) {
    animation-delay: 0.16s;
  }

  & + & {
    margin-top: 2.15rem;
    padding-top: 1.45rem;
  }

  & + &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(148, 163, 184, 0),
      rgba(148, 163, 184, 0.62) 22%,
      rgba(63, 100, 255, 0.55) 50%,
      rgba(148, 163, 184, 0.62) 78%,
      rgba(148, 163, 184, 0)
    );
    background-size: 220% 100%;
    animation: categoryDividerFlow 5.4s linear infinite;

    @keyframes categoryDividerFlow {
      from {
        background-position: 0% 50%;
      }

      to {
        background-position: 220% 50%;
      }
    }
  }

  & + &::after {
    content: "";
    position: absolute;
    top: -4px;
    left: 50%;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #3f64ff, #17cab6);
    box-shadow: 0 0 0 3px ${(props) => props.theme.background};
    animation: categoryDividerDotPulse 2.2s ease-in-out infinite;

    @keyframes categoryDividerDotPulse {
      0% {
        transform: translateX(-50%) scale(1);
        filter: brightness(1);
      }

      50% {
        transform: translateX(-50%) scale(1.15);
        filter: brightness(1.08);
      }

      100% {
        transform: translateX(-50%) scale(1);
        filter: brightness(1);
      }
    }
  }
`;

export const CategorySectionTitle = styled.h3`
  margin: 0;
  font-size: clamp(1.05rem, 2.6vw, 1.35rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${(props) => props.theme.text};
`;

export const ProductCard = styled.div<{
  $clicking?: boolean;
  $rippleX?: number;
  $rippleY?: number;
}>`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 1.15rem;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  isolation: isolate;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 36px rgba(15, 23, 42, 0.12);
    border-color: rgba(63, 100, 255, 0.34);
  }

  &:active {
    transform: translateY(-1px) scale(0.985);
  }

  &::after {
    content: "";
    position: absolute;
    width: 230%;
    aspect-ratio: 1;
    left: ${({ $rippleX = 50 }) => `${$rippleX}%`};
    top: ${({ $rippleY = 50 }) => `${$rippleY}%`};
    translate: -50% -50%;
    pointer-events: none;
    opacity: ${({ $clicking }) => ($clicking ? 1 : 0)};
    background: radial-gradient(
      circle,
      rgba(111, 134, 255, 0.34) 0%,
      rgba(111, 134, 255, 0.18) 26%,
      rgba(111, 134, 255, 0.06) 48%,
      rgba(111, 134, 255, 0) 72%
    );
    transform: scale(0.58);
    animation: ${({ $clicking }) =>
      $clicking ? "productCardClickGlow 0.34s ease forwards" : "none"};
  }

  ${({ $clicking }) =>
    $clicking
      ? `
    animation: productCardClickPulse 0.28s cubic-bezier(0.2, 0.9, 0.2, 1);
    border-color: rgba(63, 100, 255, 0.52);
    box-shadow: 0 22px 38px rgba(63, 100, 255, 0.24);
  `
      : ""}

  @keyframes productCardClickPulse {
    0% {
      transform: translateY(0) scale(1);
    }

    45% {
      transform: translateY(-2px) scale(0.982);
    }

    100% {
      transform: translateY(-4px) scale(1);
    }
  }

  @keyframes productCardClickGlow {
    0% {
      opacity: 0.2;
      transform: scale(0.5);
    }

    70% {
      opacity: 0.55;
      transform: scale(1.02);
    }

    100% {
      opacity: 0;
      transform: scale(1.26);
    }
  }
`;

export const ProductDetailOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 220;
  background: rgba(5, 8, 18, 0.78);
  backdrop-filter: blur(6px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: ${({ $closing }) =>
    $closing
      ? "homeDetailOverlayOut 0.2s ease forwards"
      : "homeDetailOverlayIn 0.24s ease"};

  @keyframes homeDetailOverlayIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes homeDetailOverlayOut {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  @media (max-width: 640px) {
    padding: 0.8rem;
    align-items: stretch;
    justify-content: center;
  }

  @media (max-width: 420px) {
    padding: 0.55rem;
  }

  @media (max-height: 700px) {
    justify-content: flex-start;
  }
`;

export const ProductDetailImage = styled.div`
  position: relative;
  width: min(640px, calc(100vw - 2rem));
  min-height: min(40vh, 320px);
  max-height: 44vh;
  background-image:
    linear-gradient(rgba(8, 11, 25, 0.18), rgba(8, 11, 25, 0.42)),
    url(${({ $image }) => JSON.stringify($image)});
  background-size: cover;
  background-position: center;
  border-radius: 1.2rem 1.2rem 0 0;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-bottom: none;
  box-shadow: 0 26px 58px rgba(0, 0, 0, 0.36);
  animation: ${({ $closing }) =>
    $closing
      ? "homeDetailImageOut 0.22s ease forwards"
      : "homeDetailImageIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)"};

  @keyframes homeDetailImageIn {
    from {
      transform: translateY(-8px) scale(0.975);
      opacity: 0;
    }

    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes homeDetailImageOut {
    from {
      transform: translateY(0) scale(1);
      opacity: 1;
    }

    to {
      transform: translateY(-6px) scale(0.985);
      opacity: 0;
    }
  }

  @media (max-width: 640px) {
    width: calc(100vw - 1.6rem);
    min-height: min(34vh, 250px);
    max-height: 36vh;
    border-radius: 1rem 1rem 0 0;
  }

  @media (max-width: 480px) {
    width: calc(100vw - 1.1rem);
    min-height: min(32vh, 220px);
    max-height: 34vh;
  }

  @media (max-width: 360px) {
    width: calc(100vw - 0.8rem);
    min-height: min(30vh, 200px);
    max-height: 32vh;
  }
`;

export const ProductDetailBackButton = styled.button`
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.86);
  color: #0f172a;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.22);
  }

  @media (max-width: 480px) {
    top: 0.75rem;
    left: 0.75rem;
    width: 38px;
    height: 38px;
  }
`;

export const ProductDetailBody = styled.div`
  width: min(640px, calc(100vw - 2rem));
  margin: 0;
  border-radius: 0 0 1.2rem 1.2rem;
  border: 1px solid ${(props) => props.theme.border};
  border-top: none;
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.text};
  box-shadow: 0 26px 58px rgba(0, 0, 0, 0.36);
  padding: 1.15rem 1rem 1.05rem;
  max-height: 48vh;
  overflow-y: auto;
  text-align: center;
  animation: ${({ $closing }) =>
    $closing
      ? "homeDetailBodyOut 0.2s ease forwards"
      : "homeDetailBodyIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)"};

  @keyframes homeDetailBodyIn {
    from {
      transform: translateY(10px) scale(0.97);
      opacity: 0;
    }

    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes homeDetailBodyOut {
    from {
      transform: translateY(0) scale(1);
      opacity: 1;
    }

    to {
      transform: translateY(8px) scale(0.985);
      opacity: 0;
    }
  }

  h2 {
    margin: 0;
    font-size: clamp(1.1rem, 3.4vw, 1.35rem);
    letter-spacing: 0.01em;
  }

  p {
    margin: 0.75rem 0 0;
    font-size: 0.9rem;
    line-height: 1.45;
    opacity: 0.82;
  }

  @media (max-width: 640px) {
    width: calc(100vw - 1.6rem);
    padding: 1rem 0.95rem 0.9rem;
    max-height: 52vh;
  }

  @media (max-width: 480px) {
    width: calc(100vw - 1.1rem);
    border-radius: 0 0 1rem 1rem;
    padding: 0.9rem 0.82rem 0.82rem;

    h2 {
      font-size: 1.02rem;
    }

    p {
      font-size: 0.84rem;
      line-height: 1.36;
    }
  }

  @media (max-width: 360px) {
    width: calc(100vw - 0.8rem);
    padding: 0.8rem 0.72rem 0.75rem;

    h2 {
      font-size: 0.96rem;
    }

    p {
      margin-top: 0.62rem;
      font-size: 0.8rem;
    }
  }
`;

export const ProductDetailPrice = styled.div`
  margin-top: 0.95rem;
  font-size: clamp(1.45rem, 5vw, 1.9rem);
  font-weight: 800;
  color: ${(props) => props.theme.primary};

  @media (max-width: 480px) {
    margin-top: 0.78rem;
    font-size: clamp(1.2rem, 7vw, 1.55rem);
  }

  @media (max-width: 360px) {
    margin-top: 0.68rem;
    font-size: 1.15rem;
  }
`;

export const ProductDetailActions = styled.div`
  margin-top: 0.95rem;
`;

export const ProductImage = styled.div`
  width: 100%;
  height: 212px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }

  &:hover img {
    transform: scale(1.04);
  }
`;

export const ProductInfo = styled.div`
  padding: 1.1rem 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.7rem;

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;

    h4 {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 700;
    }
    .price {
      font-weight: 800;
      color: ${(props) => props.theme.primary};
      font-size: 1rem;
    }
  }

  p {
    margin: 0;
    font-size: 0.86rem;
    opacity: 0.78;
    line-height: 1.58;
    flex: 1;
  }
`;

export const AddToCartButton = styled.button`
  background: rgba(63, 100, 255, 0.1);
  color: #2740b8;
  border: 1px solid rgba(63, 100, 255, 0.24);
  padding: 0.76rem;
  border-radius: 0.72rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(135deg, #10b7a5, #17cab6);
    border-color: transparent;
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(16, 183, 165, 0.26);
  }
`;

export const Footer = styled.footer`
  background-color: ${(props) => props.theme.surface};
  border-top: 1px solid ${(props) => props.theme.border};
  padding: 4rem 2rem 2rem 2rem;
  margin-top: 4rem;
`;

export const FooterGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 4rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
`;

export const FooterBrandColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  p {
    font-size: 0.9rem;
    opacity: 0.7;
    line-height: 1.6;
    margin: 0;
    max-width: 360px;
  }
`;

export const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;

  a {
    color: ${(props) => props.theme.text};
    opacity: 0.7;
    transition: opacity 0.2s;
    &:hover {
      opacity: 1;
      color: ${(props) => props.theme.primary};
    }
  }
`;

export const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  h5 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    li a,
    li span {
      font-size: 0.9rem;
      color: ${(props) => props.theme.text};
      opacity: 0.7;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: opacity 0.2s;
    }

    li a:hover {
      opacity: 1;
      color: ${(props) => props.theme.primary};
    }
  }
`;

export const FooterCopy = styled.div`
  max-width: 1200px;
  margin: 3rem auto 0 auto;
  padding-top: 1.5rem;
  border-top: 1px solid ${(props) => props.theme.border};
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  opacity: 0.5;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
`;
