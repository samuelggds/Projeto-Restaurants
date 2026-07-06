import styled, { css } from "styled-components";

export const darkTheme = {
  background: "#13131a",
  surface: "#1c1c24",
  surfaceHover: "#232330",
  border: "#2d2d3d",
  text: "#ffffff",
  textMuted: "#a0aec0",
  inputBg: "#232330",
  primary: "#0ea5e9",
  primaryHover: "#0284c7",
  success: "#10b981",
  danger: "#ef4444",
};

export const lightTheme = {
  background: "#f7fafc",
  surface: "#ffffff",
  surfaceHover: "#f1f5f9",
  border: "#e2e8f0",
  text: "#1a202c",
  textMuted: "#718096",
  inputBg: "#f8fafc",
  primary: "#0284c7",
  primaryHover: "#0369a1",
  success: "#10b981",
  danger: "#ef4444",
};

export const Layout = styled.div`
  min-height: 100vh;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Inter", sans-serif;
`;

export const AppShell = styled.div`
  display: flex;
  min-height: 100vh;

  @media (max-width: 920px) {
    flex-direction: column;
  }
`;

export const Sidebar = styled.aside`
  width: ${(props) => (props.$collapsed ? "84px" : "290px")};
  background: ${(props) => props.theme.surface};
  border-right: 1px solid ${(props) => props.theme.border};
  padding: 1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  @media (max-width: 920px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid ${(props) => props.theme.border};
  }
`;

export const SidebarTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
`;

export const SidebarBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: ${(props) => props.theme.primary};
  font-weight: 800;
  white-space: nowrap;

  span {
    opacity: ${(props) => (props.$collapsed ? 0 : 1)};
    transform: translateX(${(props) => (props.$collapsed ? "-6px" : "0")});
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
  }
`;

export const CollapseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.inputBg};
  color: ${(props) => props.theme.text};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
  }
`;

export const ProfileCard = styled.div`
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.inputBg};
  border-radius: 12px;
  padding: ${(props) => (props.$collapsed ? "0.65rem" : "0.85rem")};
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  transition: padding 0.22s ease;
`;

export const ProfileBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #ef4444;
  font-weight: 800;
  font-size: 0.72rem;
  text-transform: uppercase;
`;

export const ProfileName = styled.div`
  font-size: 0.96rem;
  font-weight: 800;
  color: ${(props) => props.theme.text};
`;

export const ProfileEmail = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: ${(props) => props.theme.textMuted};
`;

export const SidebarActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const SidebarActionButton = styled.button`
  width: 100%;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 10px;
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.text};
  min-height: 40px;
  padding: 0.55rem;
  display: inline-flex;
  align-items: center;
  justify-content: ${(props) => (props.$collapsed ? "center" : "flex-start")};
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.18s ease;
  font-weight: 700;
  white-space: nowrap;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
    transform: translateY(-1px);
  }
`;

export const MainArea = styled.div`
  flex: 1;
  min-width: 0;
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  position: sticky;
  top: 0;
  z-index: 10;
`;

export const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;

  h1 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const IconButton = styled.button`
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.text};
  border-radius: 10px;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: ${(props) => props.theme.surfaceHover};
  }
`;

export const Content = styled.main`
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem;
  width: 100%;
`;

export const Intro = styled.div`
  margin-bottom: 1rem;

  h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
  }

  p {
    margin: 0.3rem 0 0;
    color: ${(props) => props.theme.textMuted};
  }
`;

export const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

export const FilterButton = styled.button`
  border: 1px solid
    ${(props) => (props.$active ? props.theme.primary : props.theme.border)};
  background: ${(props) =>
    props.$active ? props.theme.primary : props.theme.surface};
  color: ${(props) => (props.$active ? "#ffffff" : props.theme.text)};
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    transform: translateY(-1px);
  }
`;

export const EmptyState = styled.div`
  border: 1px dashed ${(props) => props.theme.border};
  border-radius: 14px;
  padding: 1.4rem;
  text-align: center;
  color: ${(props) => props.theme.textMuted};
  background: ${(props) => props.theme.surface};
`;

export const OrdersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 1rem;
`;

export const OrderCard = styled.div`
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 14px;
  background: ${(props) => props.theme.surface};
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  transition:
    opacity 0.28s ease,
    transform 0.28s ease,
    max-height 0.28s ease,
    margin 0.28s ease,
    padding 0.28s ease,
    border-width 0.28s ease;
  max-height: 560px;
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
`;

export const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  .id {
    font-weight: 800;
    font-size: 1rem;
  }

  .status {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }
`;

export const TopRowRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const DeliveryAlert = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  width: fit-content;
  padding: 0.32rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(239, 68, 68, 0.45);
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-transform: uppercase;
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

export const Price = styled.div`
  font-size: 1.05rem;
  font-weight: 800;
  color: ${(props) => props.theme.primary};
`;

export const AddressBox = styled.div`
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  padding: 0.75rem;
  background: ${(props) => props.theme.inputBg};

  .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 800;
    color: ${(props) => props.theme.textMuted};
    margin-bottom: 0.35rem;
  }

  .line {
    font-size: 0.9rem;
    line-height: 1.35;
    color: ${(props) => props.theme.text};
  }
`;

export const Items = styled.ul`
  margin: 0;
  padding-left: 1rem;
  color: ${(props) => props.theme.text};
  font-size: 0.88rem;
`;

export const DeliverButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 10px;
  background: linear-gradient(
    135deg,
    ${(props) => props.theme.primary},
    ${(props) => props.theme.primaryHover}
  );
  color: #ffffff;
  font-weight: 700;
  padding: 0.72rem 0.9rem;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    filter 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(14, 165, 233, 0.35);
    filter: brightness(1.04);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    filter: none;
  }
`;

export const MetaText = styled.p`
  margin: 0;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.84rem;
`;
