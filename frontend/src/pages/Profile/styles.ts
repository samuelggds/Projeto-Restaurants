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

  .split-bairro .card-last-four-input {
    min-height: 36px;
    padding-top: 0.4rem;
    padding-bottom: 0.4rem;
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

export const SavedCardsSection = styled.div`
  display: grid;
  gap: 0.8rem;
`;

export const SavedCardRow = styled.div`
  display: grid;
  gap: 0.6rem;
`;

export const SavedCardMainButton = styled.button`
  border: 1px solid
    ${({ $selected }) => ($selected ? "rgba(219, 162, 6, 0.7)" : "transparent")};
  border-radius: 0.9rem;
  background: ${({ $background }) =>
    $background || "linear-gradient(135deg, #334155, #64748b)"};
  color: ${({ $color }) => $color || "#f8fafc"};
  padding: 0.85rem 0.95rem;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  box-shadow: ${({ $selected }) =>
    $selected
      ? "0 12px 26px rgba(219, 162, 6, 0.25)"
      : "0 10px 20px rgba(15, 23, 42, 0.18)"};

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(219, 162, 6, 0.62);
  }
`;

export const SavedCardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
`;

export const SavedCardBrandIdentity = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  strong {
    font-size: 0.92rem;
    letter-spacing: 0.01em;
  }
`;

export const CardBrandLogo = styled.img`
  width: 40px;
  height: 24px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 0.35rem;
  padding: 0.15rem;
`;

export const SavedCardState = styled.span`
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.24rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.35);

  ${({ $tone }) => {
    if ($tone === "defaultCard") {
      return `
        background: rgba(16, 185, 129, 0.18);
        color: #d1fae5;
        border-color: rgba(16, 185, 129, 0.45);
      `;
    }

    if ($tone === "active") {
      return `
        background: rgba(59, 130, 246, 0.18);
        color: #dbeafe;
        border-color: rgba(59, 130, 246, 0.45);
      `;
    }

    return `
      background: rgba(255, 255, 255, 0.18);
      color: rgba(255, 255, 255, 0.9);
      border-color: rgba(255, 255, 255, 0.35);
    `;
  }}
`;

export const SavedCardNumber = styled.div`
  margin-top: 0.6rem;
  font-size: 1.02rem;
  font-weight: 800;
  letter-spacing: 0.06em;
`;

export const SavedCardHolder = styled.div`
  margin-top: 0.35rem;
  font-size: 0.82rem;
  opacity: 0.92;
`;

export const SavedCardActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const CardMiniAction = styled.button`
  border: 1px solid
    ${({ $variant, theme }) => {
      if ($variant === "success") {
        return "rgba(16, 185, 129, 0.5)";
      }

      if ($variant === "danger") {
        return "rgba(239, 68, 68, 0.5)";
      }

      return theme.border;
    }};
  background: ${({ $variant }) => {
    if ($variant === "success") {
      return "rgba(16, 185, 129, 0.14)";
    }

    if ($variant === "danger") {
      return "rgba(239, 68, 68, 0.14)";
    }

    return "transparent";
  }};
  color: ${({ $variant, theme }) => {
    if ($variant === "success") {
      return "#047857";
    }

    if ($variant === "danger") {
      return "#b91c1c";
    }

    return theme.text;
  }};
  border-radius: 0.6rem;
  padding: 0.46rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(0.98);
  }
`;

export const CardVisualPreview = styled.div`
  border-radius: 16px;
  padding: 1rem;
  min-height: 156px;
  background:
    linear-gradient(140deg, rgba(64, 93, 255, 0.98), rgba(76, 106, 255, 0.95)),
    linear-gradient(45deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  position: relative;
  overflow: hidden;
  box-shadow: 0 14px 26px rgba(31, 52, 150, 0.3);

  &::before {
    content: "";
    position: absolute;
    top: -24px;
    right: -16px;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.11);
  }

  &::after {
    content: "";
    position: absolute;
    left: 36%;
    top: 18%;
    width: 90px;
    height: 90px;
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
  width: 28px;
  height: 22px;
  border-radius: 5px;
  background: linear-gradient(135deg, #f8df8c, #f2ba53);
  box-shadow: inset 0 0 0 1px rgba(116, 86, 27, 0.28);
`;

export const CardVisualNumber = styled.div`
  position: relative;
  z-index: 1;
  margin-top: 1.7rem;
  color: #ffffff;
  letter-spacing: 0.17em;
  font-size: clamp(1rem, 2.5vw, 1.2rem);
  font-weight: 700;
`;

export const CardVisualFooter = styled.div`
  position: relative;
  z-index: 1;
  margin-top: 1.2rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;

  .left,
  .right {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .right {
    align-items: flex-end;
  }

  small {
    color: rgba(255, 255, 255, 0.78);
    font-size: 0.67rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  strong {
    color: #f8fafc;
    font-size: 0.78rem;
    font-weight: 700;
    max-width: 18ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
