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

export const ProfileLayout = styled.div`
  min-height: 100vh;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Inter", sans-serif;
  transition: all 0.3s ease;
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

export const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 2rem;

  @media (max-width: 968px) {
    grid-template-columns: 1fr; /* Quebra em uma coluna no tablet e celular */
    gap: 1.5rem;
  }
`;

export const ProfileCard = styled.div`
  background-color: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 1rem;
  padding: 2rem;
  height: fit-content;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);

  @media (max-width: 480px) {
    padding: 1.5rem;
  }
`;

export const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 2rem;

  .avatar-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background-color: ${(props) => props.theme.surfaceHover};
    border: 2px solid ${(props) => props.theme.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.theme.text};
    margin-bottom: 1rem;
  }

  h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
  }
  p {
    margin: 0.25rem 0 0 0;
    font-size: 0.85rem;
    opacity: 0.6;
  }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  opacity: 0.8;
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: ${(props) =>
    props.disabled ? props.theme.background : props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};
  font-size: 0.95rem;
  box-sizing: border-box;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.primary};
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export const ActionButton = styled.button`
  width: 100%;
  padding: 0.85rem;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;

  background-color: ${(props) =>
    props.$variant === "primary" ? props.theme.primary : "transparent"};
  color: ${(props) =>
    props.$variant === "primary" ? "#000000" : props.theme.text};
  border: ${(props) =>
    props.$variant === "primary" ? "none" : `1px solid ${props.theme.border}`};

  &:hover {
    opacity: 0.9;
    background-color: ${(props) =>
      props.$variant === "secondary"
        ? props.theme.surfaceHover
        : props.theme.primary};
  }
`;

export const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

export const OrdersCard = styled.div`
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

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: ${(props) => props.theme.text};
  }
`;

export const OrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .empty-msg {
    font-size: 0.9rem;
    opacity: 0.6;
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
      opacity: 0.6;
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
      font-size: 0.75rem;
      font-weight: 700;
      background-color: ${(props) => props.theme.border};
      color: ${(props) => props.theme.text};
      padding: 0.2rem 0.6rem;
      border-radius: 2rem;

      &.status-pendente {
        background: #eab30820;
        color: #eab308;
      }

      &.status-preparando {
        background: #3b82f620;
        color: #3b82f6;
      }

      &.status-pronto {
        background: #a855f720;
        color: #a855f7;
      }

      &.status-saiu_para_entrega {
        background: #06b6d420;
        color: #06b6d4;
      }

      &.status-entregue {
        background: #10b98120;
        color: #10b981;
      }

      &.status-cancelado {
        background: #ef444420;
        color: #ef4444;
      }
    }
  }
`;

export const AddressList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  .empty-msg {
    font-size: 0.9rem;
    opacity: 0.6;
    text-align: center;
    padding: 1rem 0;
    margin: 0;
  }
`;

export const AddressItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 0.75rem;
  background-color: ${(props) => props.theme.background};
  gap: 1rem;

  .address-details {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    h5 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: ${(props) => props.theme.primary};
    }
    p {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 500;
    }
    span {
      font-size: 0.8rem;
      opacity: 0.6;
    }
  }
`;

export const DeleteAddressButton = styled.button`
  background: transparent;
  border: none;
  color: ${(props) => props.theme.danger};
  opacity: 0.7;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    background-color: ${(props) => props.theme.danger}15;
  }
`;

export const AddressForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1rem;

  h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 700;
  }

  .form-row {
    display: flex;
    gap: 0.85rem;
    width: 100%;

    /* Transforma a linha lado a lado em coluna vertical no celular */
    @media (max-width: 580px) {
      flex-direction: column;
      gap: 0.85rem;
    }
  }

  .split-rua input:nth-child(1) {
    flex: 4;
  }
  .split-rua input:nth-child(2) {
    flex: 1;
  }
  .split-bairro input {
    flex: 1;
  }

  input {
    padding: 0.65rem 0.85rem;
    border-radius: 0.5rem;
    background-color: ${(props) => props.theme.background};
    border: 1px solid ${(props) => props.theme.border};
    color: ${(props) => props.theme.text};
    font-size: 0.9rem;
    box-sizing: border-box;
    width: 100%;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.primary};
    }
  }
`;

export const AddAddressButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: transparent;
  border: 1px solid ${(props) => props.theme.primary};
  color: ${(props) => props.theme.primary};
  padding: 0.65rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    background-color: ${(props) => props.theme.primary};
    color: #000000;
  }
`;
