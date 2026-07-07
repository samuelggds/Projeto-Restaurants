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
