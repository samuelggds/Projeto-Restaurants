import styled from "styled-components";

export const AdminLayout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
`;

export const Navbar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background-color: ${(props) => props.theme.surface};
  border-bottom: 1px solid ${(props) => props.theme.border};
  position: sticky;
  top: 0;
  z-index: 100;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-weight: 800;
  font-size: 1.5rem;
  color: ${(props) => props.theme.primary};
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
  transition: all 0.2s;

  &:hover {
    background: ${(props) => props.theme.surfaceHover};
  }
`;

export const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    font-weight: 800;
  }

  p {
    color: ${(props) => props.theme.textMuted};
  }
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem 2rem;
  text-align: center;
  color: ${(props) => props.theme.textMuted};
`;

export const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background-color: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.danger};
  border-radius: 12px;
  color: ${(props) => props.theme.danger};
  margin-bottom: 2rem;

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
  }

  p {
    margin: 0;
    color: ${(props) => props.theme.danger};
  }
`;

export const EmptyContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem 2rem;
  text-align: center;
  background-color: ${(props) => props.theme.surface};
  border: 1px dashed ${(props) => props.theme.border};
  border-radius: 12px;
  color: ${(props) => props.theme.textMuted};
`;

export const InvoicesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

export const InvoiceCard = styled.div`
  background-color: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.2s;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 4px 12px rgba(234, 179, 8, 0.1);
  }
`;

export const InvoiceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`;

export const InvoiceTitle = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
`;

export const InvoiceDate = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${(props) => props.theme.textMuted};
`;

export const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
  background-color: ${(props) => {
    const colors = {
      PENDENTE: "rgba(245, 158, 11, 0.1)",
      PAGO: "rgba(16, 185, 129, 0.1)",
      VENCIDO: "rgba(239, 68, 68, 0.1)",
      ATRASADO: "rgba(239, 68, 68, 0.1)",
    };
    return colors[props.status] || "rgba(107, 114, 128, 0.1)";
  }};
  color: ${(props) => {
    const colors = {
      PENDENTE: "#f59e0b",
      PAGO: "#10b981",
      VENCIDO: "#ef4444",
      ATRASADO: "#ef4444",
    };
    return colors[props.status] || "#6b7280";
  }};
`;

export const InvoiceDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 0;
  border-top: 1px solid ${(props) => props.theme.border};
  border-bottom: 1px solid ${(props) => props.theme.border};
`;

export const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;

  span {
    color: ${(props) => props.theme.textMuted};
  }

  strong {
    color: ${(props) => props.theme.text};
    font-weight: 700;
  }
`;

export const DetailRowTotal = styled(DetailRow)`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${(props) => props.theme.primary};

  strong {
    color: ${(props) => props.theme.primary};
  }
`;

export const PaidInfo = styled.div`
  font-size: 0.85rem;
  color: ${(props) => props.theme.success};
  font-weight: 600;
`;

export const PaymentButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  background-color: ${(props) => props.theme.primary};
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.primaryHover};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

export const PaidButton = styled(PaymentButton)`
  background-color: ${(props) => props.theme.success};
  color: white;
  cursor: default;

  &:hover {
    background-color: ${(props) => props.theme.success};
    transform: none;
  }
`;

export const DisabledButton = styled(PaymentButton)`
  background-color: ${(props) => props.theme.border};
  color: ${(props) => props.theme.textMuted};
  cursor: not-allowed;
  opacity: 0.6;

  &:hover {
    background-color: ${(props) => props.theme.border};
    transform: none;
  }
`;

export const PlanSection = styled.section`
  margin-bottom: 2rem;
  background-color: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 14px;
  padding: 1.25rem;
  display: grid;
  gap: 1rem;
`;

export const PlanHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  p {
    margin: 0.3rem 0 0;
    font-size: 0.92rem;
    max-width: 780px;
    color: ${(props) => props.theme.textMuted};
  }
`;

export const PlanTag = styled.span`
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surfaceHover};
  color: ${(props) => props.theme.text};
  border-radius: 999px;
  padding: 0.36rem 0.76rem;
  font-weight: 700;
  font-size: 0.82rem;
`;

export const PlanInfo = styled.div`
  border: 1px solid rgba(217, 119, 6, 0.35);
  background: rgba(251, 191, 36, 0.12);
  color: ${(props) => props.theme.text};
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
  font-size: 0.9rem;
  font-weight: 600;
`;

export const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const PlanCard = styled.div`
  border: 1px solid
    ${(props) =>
      props.$tone === "basic"
        ? "rgba(148, 163, 184, 0.26)"
        : props.$tone === "pro"
          ? "rgba(59, 130, 246, 0.32)"
          : props.$tone === "premium" || props.$highlighted
            ? "rgba(234, 179, 8, 0.55)"
            : "rgba(148, 163, 184, 0.35)"};
  background: ${(props) =>
    props.$tone === "basic"
      ? props.theme.surfaceHover
      : props.$tone === "pro"
        ? "linear-gradient(160deg, rgba(59, 130, 246, 0.1), rgba(15, 23, 42, 0.04))"
        : props.$tone === "premium" || props.$highlighted
          ? "linear-gradient(160deg, rgba(234, 179, 8, 0.16), rgba(30, 41, 59, 0.12))"
          : props.theme.surface};
  border-radius: 12px;
  padding: 1rem;
  display: grid;
  gap: 0.8rem;
  opacity: ${(props) => (props.$tone === "basic" ? 0.92 : 1)};
  box-shadow: ${(props) =>
    props.$tone === "premium"
      ? "0 14px 26px rgba(234, 179, 8, 0.14)"
      : props.$tone === "pro"
        ? "0 10px 18px rgba(59, 130, 246, 0.1)"
        : "none"};
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;

  &:hover {
    transform: ${(props) =>
      props.$tone === "basic" ? "none" : "translateY(-2px)"};
    box-shadow: ${(props) =>
      props.$tone === "premium"
        ? "0 18px 30px rgba(234, 179, 8, 0.2)"
        : props.$tone === "pro"
          ? "0 14px 24px rgba(59, 130, 246, 0.16)"
          : "none"};
  }
`;

export const PlanTitle = styled.h3`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 1.02rem;
`;

export const PlanPrice = styled.div`
  font-size: 1rem;
  font-weight: 800;
  color: ${(props) => props.theme.primary};
`;

export const PlanList = styled.ul`
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;

  li {
    font-size: 0.88rem;
    color: ${(props) => props.theme.textMuted};
  }
`;

export const PlanActionButton = styled.button`
  border: none;
  border-radius: 8px;
  min-height: 38px;
  padding: 0 0.85rem;
  font-weight: 800;
  background: ${(props) =>
    props.$tone === "basic"
      ? props.theme.border
      : props.$tone === "pro"
        ? "#3b82f6"
        : props.theme.primary};
  color: ${(props) =>
    props.$tone === "basic" ? props.theme.textMuted : "#0f172a"};
  cursor: pointer;
  transition:
    filter 160ms ease,
    transform 160ms ease;

  &:hover:not(:disabled) {
    filter: brightness(1.03);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

export const PlanMutedText = styled.p`
  margin: 0;
  min-height: 4.1rem;
  font-size: 0.88rem;
  color: ${(props) => props.theme.textMuted};
  display: flex;
  align-items: center;
`;
