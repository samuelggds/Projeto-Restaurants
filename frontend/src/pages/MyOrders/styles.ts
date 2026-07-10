import styled, { keyframes } from "styled-components";

const mapOverlayIn = keyframes`
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
`;

const mapModalIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

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

    .delivery-live {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      margin-top: 0.15rem;
      padding: 0.18rem 0.45rem;
      border-radius: 999px;
      border: 1px solid rgba(14, 116, 144, 0.35);
      background: rgba(6, 182, 212, 0.12);
      color: #0e7490;
      font-size: 0.7rem;
      font-weight: 700;
      opacity: 1;
    }

    .delivery-waiting-location {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      margin-top: 0.15rem;
      padding: 0.18rem 0.45rem;
      border-radius: 999px;
      border: 1px solid rgba(245, 158, 11, 0.4);
      background: rgba(251, 191, 36, 0.14);
      color: #92400e;
      font-size: 0.7rem;
      font-weight: 700;
      opacity: 1;
    }

    .delivery-live-map {
      width: min(360px, 96vw);
      margin-top: 0.45rem;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(14, 116, 144, 0.32);
      background: #e0f2fe;
      display: grid;
      gap: 0;

      iframe {
        width: 100%;
        height: 148px;
        border: 0;
        display: block;
      }

      a,
      button {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        min-height: 32px;
        font-size: 0.74rem;
        font-weight: 800;
        color: #0c4a6e;
        background: rgba(255, 255, 255, 0.86);
        text-decoration: none;
        border-top: 1px solid rgba(14, 116, 144, 0.25);
        border-left: 0;
        border-right: 0;
        border-bottom: 0;
        transition: all 0.2s ease;
        cursor: pointer;

        &:hover {
          background: rgba(255, 255, 255, 0.96);
          color: #075985;
        }
      }
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

    .track-btn {
      border: 1px solid rgba(14, 116, 144, 0.35);
      background: rgba(6, 182, 212, 0.12);
      color: #0e7490;
      border-radius: 999px;
      padding: 0.28rem 0.7rem;
      font-size: 0.7rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        border-color: #0891b2;
        background: rgba(6, 182, 212, 0.2);
        color: #155e75;
      }

      &:disabled {
        border-color: rgba(245, 158, 11, 0.35);
        background: rgba(251, 191, 36, 0.14);
        color: #92400e;
        cursor: not-allowed;
      }
    }

    .issue-btn {
      border: 1px solid #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      color: #b45309;
      border-radius: 999px;
      padding: 0.28rem 0.7rem;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        border-color: #d97706;
        background: rgba(245, 158, 11, 0.18);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
`;

export const IssueReplyPopup = styled.div`
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  width: min(360px, calc(100vw - 2rem));
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.22);
  z-index: 120;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.64rem 0.75rem;
    background: linear-gradient(135deg, #16a34a, #15803d);
    color: #ffffff;

    strong {
      font-size: 0.83rem;
      letter-spacing: 0.01em;
    }

    button {
      border: 1px solid rgba(255, 255, 255, 0.45);
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
      border-radius: 8px;
      padding: 0.22rem 0.52rem;
      font-size: 0.73rem;
      font-weight: 700;
      cursor: pointer;
    }
  }

  .bubble {
    margin: 0.75rem;
    border-radius: 12px 12px 12px 4px;
    border: 1px solid rgba(22, 163, 74, 0.25);
    background: #dcfce7;
    color: #14532d;
    padding: 0.62rem 0.68rem;
    display: grid;
    gap: 0.28rem;

    small {
      font-weight: 700;
      font-size: 0.74rem;
      opacity: 0.9;
    }

    p {
      margin: 0;
      line-height: 1.4;
      font-size: 0.84rem;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
`;

export const IssueChatPopup = styled.div`
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  width: min(420px, calc(100vw - 2rem));
  max-height: min(70vh, 560px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(5, 91, 76, 0.35);
  background: ${(props) => props.theme.surface};
  box-shadow: 0 24px 52px rgba(7, 94, 84, 0.28);
  z-index: 130;
  display: grid;
  grid-template-rows: auto 1fr auto;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.7rem;
    padding: 0.7rem 0.8rem;
    background: linear-gradient(135deg, #075e54, #0b7f6e);
    color: #ffffff;

    strong {
      font-size: 0.86rem;
      letter-spacing: 0.01em;
    }
  }

  .header-subtitle {
    font-size: 0.7rem;
    opacity: 0.86;
    font-weight: 700;
  }

  .header-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;

    button {
      border: 1px solid rgba(255, 255, 255, 0.42);
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
      border-radius: 8px;
      padding: 0.22rem 0.52rem;
      font-size: 0.73rem;
      font-weight: 700;
      cursor: pointer;
    }
  }

  .resolved-pill {
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.52);
    background: rgba(255, 255, 255, 0.22);
    color: #ffffff;
    padding: 0.16rem 0.52rem;
    font-size: 0.67rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .chat-scroll {
    overflow: auto;
    padding: 0.72rem;
    background:
      radial-gradient(
        circle at 10% 15%,
        rgba(255, 255, 255, 0.34) 0 6px,
        transparent 7px
      ),
      radial-gradient(
        circle at 82% 24%,
        rgba(255, 255, 255, 0.28) 0 5px,
        transparent 6px
      ),
      radial-gradient(
        circle at 26% 78%,
        rgba(255, 255, 255, 0.3) 0 5px,
        transparent 6px
      ),
      linear-gradient(180deg, #e6ddd4 0%, #dcd2c6 100%);
    display: grid;
    gap: 0.52rem;
    align-content: start;
  }

  .empty-chat {
    margin: 0;
    font-size: 0.82rem;
    opacity: 0.75;
    text-align: center;
  }

  .chat-message {
    max-width: 88%;
    border-radius: 12px;
    padding: 0.52rem 0.6rem;
    display: grid;
    gap: 0.2rem;
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);

    &.client {
      margin-left: auto;
      border: 1px solid rgba(37, 211, 102, 0.38);
      background: #dcf8c6;
      color: #1f2937;
      border-radius: 12px 12px 4px 12px;
    }

    &.admin {
      margin-right: auto;
      border: 1px solid rgba(148, 163, 184, 0.32);
      background: #ffffff;
      color: #111827;
      border-radius: 12px 12px 12px 4px;
    }

    small {
      font-size: 0.68rem;
      font-weight: 700;
      opacity: 0.84;
    }

    p {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.36;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  .chat-tip {
    width: 100%;
    max-width: 95%;
    margin: 0 auto;
    border-radius: 10px;
    border: 1px solid rgba(7, 94, 84, 0.24);
    background: rgba(255, 255, 255, 0.8);
    color: #0f172a;
    padding: 0.62rem 0.72rem;
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);

    p {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 700;
      line-height: 1.3;
    }

    small {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.72rem;
      opacity: 0.82;
    }
  }

  .composer {
    border-top: 1px solid rgba(5, 91, 76, 0.16);
    padding: 0.62rem 0.72rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: flex-end;
    gap: 0.5rem;
    background: #f0f2f5;

    .resolved-note {
      grid-column: 1 / -1;
      font-size: 0.75rem;
      color: #065f46;
      font-weight: 700;
      margin-bottom: 0.2rem;
    }

    .suggestions {
      grid-column: 1 / -1;
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      margin-bottom: 0.1rem;
    }

    .suggestion-chip {
      border-radius: 999px;
      border: 1px solid rgba(7, 94, 84, 0.32);
      background: #ffffff;
      color: #0f172a;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.28rem 0.62rem;
      cursor: pointer;

      &.active {
        background: #dcf8c6;
        border-color: rgba(37, 211, 102, 0.45);
        color: #0f5132;
      }
    }

    textarea {
      flex: 1;
      min-height: 42px;
      max-height: 120px;
      resize: vertical;
      border-radius: 22px;
      border: 1px solid rgba(148, 163, 184, 0.42);
      background: #ffffff;
      color: #111827;
      padding: 0.55rem 0.78rem;
      font-size: 0.83rem;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: #0b7f6e;
        box-shadow: 0 0 0 3px rgba(11, 127, 110, 0.16);
      }
    }

    button {
      min-width: 74px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid rgba(7, 94, 84, 0.48);
      background: linear-gradient(135deg, #25d366, #128c7e);
      color: #ffffff;
      font-weight: 800;
      cursor: pointer;
      padding: 0 0.85rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }
  }
`;

export const IssueReportOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 140;
  background:
    radial-gradient(
      circle at top right,
      rgba(234, 179, 8, 0.16),
      transparent 46%
    ),
    rgba(2, 6, 23, 0.58);
  display: grid;
  place-items: center;
  padding: 1rem;
`;

export const IssueReportModal = styled.div`
  width: min(520px, 100%);
  border-radius: 18px;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.text};
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.35);
  overflow: hidden;
`;

export const IssueReportHeader = styled.div`
  padding: 0.95rem 1rem;
  border-bottom: 1px solid ${(props) => props.theme.border};
  background: linear-gradient(
    135deg,
    rgba(234, 179, 8, 0.22) 0%,
    rgba(251, 191, 36, 0.1) 100%
  );
`;

export const IssueReportTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
`;

export const IssueReportSubtitle = styled.small`
  display: block;
  margin-top: 0.15rem;
  opacity: 0.75;
`;

export const IssueReportBody = styled.div`
  padding: 0.95rem 1rem 1rem;
  display: grid;
  gap: 0.75rem;
`;

export const IssueReportField = styled.label`
  display: grid;
  gap: 0.35rem;
`;

export const IssueReportLabel = styled.span`
  font-size: 0.82rem;
  font-weight: 700;
`;

export const IssueReportSelect = styled.select`
  min-height: 42px;
  border-radius: 11px;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  padding: 0 0.75rem;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.18);
  }
`;

export const IssueReportTextarea = styled.textarea`
  width: 100%;
  min-height: 90px;
  resize: vertical;
  border-radius: 11px;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  padding: 0.7rem 0.78rem;
  font-size: 0.9rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.18);
  }
`;

export const IssueReportActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
`;

export const IssueReportCancelButton = styled.button`
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid ${(props) => props.theme.border};
  background: transparent;
  color: ${(props) => props.theme.text};
  font-weight: 700;
  padding: 0 0.9rem;
  cursor: pointer;
`;

export const IssueReportSendButton = styled.button`
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(234, 179, 8, 0.48);
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  font-weight: 800;
  padding: 0 0.95rem;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

export const MapTrackingOverlay = styled.div<{ $closing?: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 160;
  background: rgba(2, 6, 23, 0.62);
  display: grid;
  place-items: center;
  padding: 1rem;
  opacity: ${(props) => (props.$closing ? 0 : 1)};
  transition: opacity 0.18s ease;
  animation: ${(props) => (props.$closing ? "none" : mapOverlayIn)} 0.18s ease;
`;

export const MapTrackingModal = styled.div<{ $closing?: boolean }>`
  width: min(980px, 100%);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.4);
  opacity: ${(props) => (props.$closing ? 0 : 1)};
  transform: ${(props) =>
    props.$closing
      ? "translateY(18px) scale(0.985)"
      : "translateY(0) scale(1)"};
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
  animation: ${(props) => (props.$closing ? "none" : mapModalIn)} 0.2s
    cubic-bezier(0.2, 0.8, 0.2, 1);
`;

export const MapTrackingHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.8rem 0.95rem;
  border-bottom: 1px solid ${(props) => props.theme.border};
  background: linear-gradient(
    135deg,
    rgba(6, 182, 212, 0.2),
    rgba(59, 130, 246, 0.14)
  );

  strong {
    font-size: 0.95rem;
    color: ${(props) => props.theme.text};
  }

  button {
    border: 1px solid ${(props) => props.theme.border};
    background: ${(props) => props.theme.surface};
    color: ${(props) => props.theme.text};
    border-radius: 10px;
    min-height: 34px;
    padding: 0 0.75rem;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;

    &:hover {
      border-color: ${(props) => props.theme.primary};
      color: ${(props) => props.theme.primary};
    }
  }
`;

export const MapTrackingBody = styled.div`
  padding: 0.95rem;
  display: grid;
  gap: 0.6rem;

  iframe {
    width: 100%;
    height: min(70vh, 560px);
    border: 1px solid ${(props) => props.theme.border};
    border-radius: 12px;
    background: #e2e8f0;
  }

  a {
    justify-self: end;
    border: 1px solid rgba(6, 182, 212, 0.45);
    background: rgba(6, 182, 212, 0.1);
    color: #0e7490;
    text-decoration: none;
    border-radius: 999px;
    min-height: 34px;
    display: inline-flex;
    align-items: center;
    padding: 0 0.85rem;
    font-weight: 800;
    font-size: 0.78rem;

    &:hover {
      border-color: #0891b2;
      color: #155e75;
      background: rgba(6, 182, 212, 0.18);
    }
  }

  @media (max-width: 600px) {
    iframe {
      height: min(62vh, 420px);
    }

    a {
      justify-self: stretch;
      justify-content: center;
    }
  }
`;
