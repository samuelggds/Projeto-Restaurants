import styled from "styled-components";

// Reutilize as definições de lightTheme, darkTheme, OrdersLayout, Navbar, etc., anteriores.

export const lightTheme = {
  background: "#fdfbf7",
  surface: "#ffffff",
  text: "#2d2219",
  textMuted: "#7c6e65",
  border: "#f1ede4",
  primary: "#e65c00",
  primaryHover: "#cc5200",
  shadow: "rgba(230, 92, 0, 0.05)",
  success: "#10b981",
  info: "#2563eb", // azul para delivery
};

export const darkTheme = {
  background: "#18130f",
  surface: "#241c16",
  text: "#fdfbf7",
  textMuted: "#a39385",
  border: "#362b22",
  primary: "#ff6b00",
  primaryHover: "#e65c00",
  shadow: "rgba(0, 0, 0, 0.4)",
  success: "#10b981",
  info: "#3b82f6",
};

/* --- MANTENHA TODOS OS ESTILOS DO PASSO ANTERIOR E ADICIONE/ATUALIZE ESSES ABAIXO --- */

export const OrdersLayout = styled.div`
  min-height: 100vh;
  width: 100vw;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Inter", sans-serif;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
`;

export const Navbar = styled.nav`
  height: 70px;
  background: ${(props) => props.theme.surface};
  border-bottom: 1px solid ${(props) => props.theme.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 800;
  span {
    color: ${(props) => props.theme.primary};
  }
`;

export const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

export const ThemeToggleButton = styled.button`
  background: transparent;
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const MenuLink = styled.button`
  background: ${(props) => props.theme.primary};
  color: white;
  border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    background: ${(props) => props.theme.primaryHover};
  }
`;

export const MainContainer = styled.main`
  flex: 1;
  max-width: 850px;
  width: 100%;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
  box-sizing: border-box;
`;

export const HeaderSection = styled.div`
  margin-bottom: 2.5rem;
  h2 {
    font-size: 2rem;
    font-weight: 800;
    margin: 0 0 0.5rem 0;
  }
  p {
    margin: 0;
    color: ${(props) => props.theme.textMuted};
    font-size: 1.05rem;
  }
`;

export const OrdersGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

export const OrderCard = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  padding: 1.75rem;
  box-shadow: 0 4px 20px ${(props) => props.theme.shadow};
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
  }
  .timestamp {
    font-size: 0.85rem;
    color: ${(props) => props.theme.textMuted};
  }
`;

/* NOVO: Badge dinâmica para separar Mesa e Delivery visualmente */
export const TypeBadge = styled.span`
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  background-color: ${(props) =>
    props.$type === "DELIVERY"
      ? `${props.theme.info}15`
      : `${props.theme.primary}15`};
  color: ${(props) =>
    props.$type === "DELIVERY" ? props.theme.info : props.theme.primary};
  border: 1px solid
    ${(props) =>
      props.$type === "DELIVERY"
        ? `${props.theme.info}30`
        : `${props.theme.primary}30`};
`;

export const PriceBadge = styled.div`
  background: ${(props) => props.theme.border}50;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 800;
  color: ${(props) => props.theme.text};
  font-size: 1.1rem;
`;

/* TIMELINE */
export const StatusTimeline = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  position: relative;
  margin-bottom: 2.5rem;
  padding-bottom: 0.5rem;

  &::before {
    content: "";
    position: absolute;
    top: 20px;
    left: 12%;
    right: 12%;
    height: 3px;
    background: ${(props) => props.theme.border};
    z-index: 1;
  }
`;

export const TimelineStep = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 2;

  .icon-wrapper {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: ${(props) =>
      props.$done ? props.theme.primary : props.theme.surface};
    color: ${(props) => (props.$done ? "#ffffff" : props.theme.textMuted)};
    border: 3px solid
      ${(props) => (props.$done ? props.theme.primary : props.theme.border)};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: ${(props) =>
      props.$current ? `0 0 0 4px ${props.theme.primary}30` : "none"};
  }

  span {
    margin-top: 0.75rem;
    font-size: 0.8rem;
    font-weight: ${(props) => (props.$done ? "700" : "500")};
    color: ${(props) =>
      props.$done ? props.theme.text : props.theme.textMuted};
  }
`;

/* NOVO: Box de endereço elegante para pedidos que possuem Delivery */
export const DeliveryAddressBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background-color: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.border};
  padding: 0.85rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: ${(props) => props.theme.text};

  svg {
    color: ${(props) => props.theme.info};
    flex-shrink: 0;
  }
`;

export const ItemsSummary = styled.div`
  border-top: 1px dashed ${(props) => props.theme.border};
  padding-top: 1.5rem;
  h4 {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: ${(props) => props.theme.textMuted};
    text-transform: uppercase;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  li {
    display: flex;
    align-items: center;
    font-size: 0.95rem;
    .item-qty {
      font-weight: 700;
      color: ${(props) => props.theme.primary};
      width: 35px;
    }
    .item-name {
      flex: 1;
      color: ${(props) => props.theme.text};
    }
    .item-price {
      font-weight: 600;
      color: ${(props) => props.theme.textMuted};
    }
  }
`;

export const EmptyStateCard = styled.div`
  background: ${(props) => props.theme.surface};
  border: 1px dashed ${(props) => props.theme.border};
  border-radius: 12px;
  padding: 4rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  svg {
    color: ${(props) => props.theme.textMuted};
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  h3 {
    margin: 0;
  }
  p {
    margin: 0 0 2rem 0;
    color: ${(props) => props.theme.textMuted};
  }
  button {
    background: ${(props) => props.theme.primary};
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
  }
`;
