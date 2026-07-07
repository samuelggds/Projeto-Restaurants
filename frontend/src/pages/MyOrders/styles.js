import styled from "styled-components";

export const lightTheme = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceHover: "#f1f5f9",
  text: "#0f172a",
  border: "#e2e8f0",
  primary: "#eab308",
  danger: "#ef4444",
  success: "#22c55e",
};

export const darkTheme = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceHover: "#334155",
  text: "#f8fafc",
  border: "#334155",
  primary: "#eab308",
  danger: "#ef4444",
  success: "#22c55e",
};

export const PageLayout = styled.div`
  min-height: 100vh;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Inter", sans-serif;
`;

export const Navbar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: ${(props) => props.theme.surface};
  border-bottom: 1px solid ${(props) => props.theme.border};
  position: sticky;
  top: 0;
  z-index: 100;

  @media (max-width: 480px) {
    padding: 1rem;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  font-size: 1.25rem;
  color: ${(props) => props.theme.primary};
  text-transform: uppercase;
  letter-spacing: -0.5px;
`;

export const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const ThemeToggleButton = styled.button`
  background: none;
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: ${(props) => props.theme.surfaceHover};
  }
`;

export const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: transparent;
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.danger};
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.danger}10;
    border-color: ${(props) => props.theme.danger};
  }

  @media (max-width: 480px) {
    span {
      display: none;
    }
    padding: 0.5rem;
    width: 40px;
    height: 40px;
    justify-content: center;
  }
`;

export const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: transparent;
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.surfaceHover};
    border-color: ${(props) => props.theme.primary};
  }

  @media (max-width: 480px) {
    span {
      display: none;
    }
    padding: 0.5rem;
    width: 40px;
    height: 40px;
    justify-content: center;
  }
`;

export const AdminButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${(props) => props.theme.primary}10;
  border: 1px solid ${(props) => props.theme.primary};
  color: ${(props) => props.theme.primary};
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.primary}18;
    transform: translateY(-1px);
  }

  @media (max-width: 480px) {
    span {
      display: none;
    }
    padding: 0.5rem;
    width: 40px;
    height: 40px;
    justify-content: center;
  }
`;

export const MainContainer = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;

  @media (max-width: 480px) {
    padding: 1.5rem 1rem;
  }
`;

export const OrdersCard = styled.section`
  background-color: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);

  @media (max-width: 480px) {
    padding: 1.5rem;
  }
`;

export const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  color: ${(props) => props.theme.primary};
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: ${(props) => props.theme.text};
  }
`;

export const SectionTitleActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.55rem;

  @media (max-width: 580px) {
    width: 100%;
    margin-left: 0;
    flex-direction: column;
    align-items: stretch;
  }
`;

export const BulkArchiveButton = styled.button`
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;

  &:hover:not(:disabled) {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 580px) {
    width: 100%;
  }
`;

export const ScrollActionWrapper = styled.div`
  position: relative;
`;

export const ScrollActionMenu = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  min-width: 210px;
  padding: 0.35rem;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 0.75rem;
  background: ${(props) => props.theme.surface};
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  @media (max-width: 580px) {
    left: 0;
    right: auto;
    width: 100%;
  }
`;

export const ScrollActionMenuItem = styled.button`
  border: 1px solid
    ${(props) => (props.$active ? props.theme.primary : "transparent")};
  background: ${(props) =>
    props.$active ? `${props.theme.primary}18` : "transparent"};
  color: ${(props) => (props.$active ? props.theme.primary : props.theme.text)};
  border-radius: 0.55rem;
  padding: 0.45rem 0.55rem;
  font-size: 0.76rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
    background: ${(props) => `${props.theme.primary}10`};
  }
`;

export const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
`;

export const FilterSectionLabel = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.72;
`;

export const FilterButton = styled.button`
  border: 1px solid
    ${(props) => (props.$active ? props.theme.primary : props.theme.border)};
  background: ${(props) =>
    props.$active ? `${props.theme.primary}20` : props.theme.background};
  color: ${(props) => (props.$active ? props.theme.primary : props.theme.text)};
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
  }
`;

export const OrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .empty-msg {
    font-size: 0.95rem;
    opacity: 0.7;
    text-align: center;
    padding: 2rem 0;
    margin: 0;
  }
`;

export const OrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 0.75rem;
  background-color: ${(props) => props.theme.background};

  @media (max-width: 580px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .order-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    h5 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }

    span {
      font-size: 0.8rem;
      opacity: 0.7;
    }
  }

  .order-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.4rem;

    @media (max-width: 580px) {
      align-items: flex-start;
      width: 100%;
      flex-direction: row;
      justify-content: space-between;
    }

    .price {
      font-weight: 800;
      font-size: 1rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.01em;
      background-color: ${(props) => props.theme.border};
      color: ${(props) => props.theme.text};
      border: 1px solid transparent;
      padding: 0.32rem 0.62rem;
      border-radius: 999px;

      &.status-pendente {
        background: #eab30822;
        border-color: #eab30866;
        color: #a16207;
      }

      &.status-preparando {
        background: #3b82f622;
        border-color: #3b82f666;
        color: #1d4ed8;
      }

      &.status-pronto {
        background: #a855f722;
        border-color: #a855f766;
        color: #7e22ce;
      }

      &.status-saiu_para_entrega {
        background: #06b6d422;
        border-color: #06b6d466;
        color: #0e7490;
      }

      &.status-entregue {
        background: #10b98122;
        border-color: #10b98166;
        color: #047857;
      }

      &.status-cancelado {
        background: #ef444422;
        border-color: #ef444466;
        color: #b91c1c;
      }
    }

    .archive-btn {
      border: 1px solid ${(props) => props.theme.border};
      background: transparent;
      color: ${(props) => props.theme.text};
      border-radius: 999px;
      padding: 0.28rem 0.7rem;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: ${(props) => props.theme.primary};
        color: ${(props) => props.theme.primary};
      }
    }
  }
`;
