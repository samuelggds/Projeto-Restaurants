import styled, { keyframes } from "styled-components";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ─── Layout geral ─── */

export const PageWrapper = styled.div`
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
  font-family: "Inter", sans-serif;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

/* ─── Sidebar ─── */

export const Sidebar = styled.aside`
  width: 280px;
  flex-shrink: 0;
  background: linear-gradient(160deg, #ea1d2c 0%, #b8141f 100%);
  color: white;
  display: flex;
  flex-direction: column;
  padding: 28px 20px;
  gap: 24px;

  @media (max-width: 768px) {
    width: 100%;
    padding: 20px 16px 16px;
    gap: 16px;
  }
`;

export const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  div {
    h2 {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
    }
    p {
      font-size: 12px;
      opacity: 0.75;
      margin: 2px 0 0;
    }
  }
`;

export const BikeIcon = styled.div`
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const SidebarStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 14px;

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-around;
  }
`;

export const SideStatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;

  svg {
    opacity: 0.85;
    flex-shrink: 0;
  }

  div {
    span {
      display: block;
      font-size: 11px;
      opacity: 0.75;
    }
    strong {
      font-size: 20px;
      font-weight: 700;
      line-height: 1;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 4px;
    div {
      text-align: center;
    }
    div strong {
      font-size: 16px;
    }
  }
`;

export const SidebarNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;

  @media (max-width: 768px) {
    display: none;
  }
`;

export const SideNavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s;
  background: ${(p) => (p.$active ? "rgba(255,255,255,0.25)" : "transparent")};
  color: white;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
  }
`;

export const NavBadge = styled.span`
  margin-left: auto;
  background: ${(p) => (p.$urgent ? "#fbbf24" : "rgba(255,255,255,0.3)")};
  color: ${(p) => (p.$urgent ? "#1e293b" : "white")};
  font-size: 11px;
  font-weight: 700;
  border-radius: 20px;
  padding: 1px 8px;
  min-width: 20px;
  text-align: center;
`;

export const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: transparent;
  transition: background 0.15s;
  width: 100%;
  margin-top: auto;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

/* ─── Área principal ─── */

export const MainArea = styled.main`
  flex: 1;
  padding: 28px 32px;
  overflow-y: auto;

  @media (max-width: 1024px) {
    padding: 24px 20px;
  }

  @media (max-width: 768px) {
    padding: 16px 12px 24px;
  }
`;

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    display: none;
  }
`;

export const TopBarTitle = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
`;

export const CountChip = styled.span`
  background: #e2e8f0;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  border-radius: 20px;
  padding: 2px 10px;
`;

export const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #cbd5e1;
    color: #1e293b;
  }
`;

/* ─── Tabs mobile ─── */

export const MobileTabs = styled.div`
  display: none;
  margin-bottom: 16px;

  @media (max-width: 768px) {
    display: flex;
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }
`;

export const MobileTab = styled.button`
  flex: 1;
  padding: 11px 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: ${(p) => (p.active ? "#ea1d2c" : "transparent")};
  color: ${(p) => (p.active ? "white" : "#64748b")};
  transition:
    background 0.15s,
    color 0.15s;
`;

/* ─── Lista de pedidos ─── */

export const OrdersList = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #94a3b8;

  svg {
    opacity: 0.5;
  }
  p {
    font-size: 15px;
    margin: 0;
  }

  .spinning {
    animation: ${spin} 1s linear infinite;
  }
`;

/* ─── Card de pedido ─── */

export const OrderCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }
`;

export const OrderCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
`;

export const OrderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const OrderId = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
`;

export const StatusBadgeInline = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.color || "#64748b"};
  background: ${(p) => p.color + "18" || "#f1f5f9"};
  border: 1px solid ${(p) => p.color + "44" || "#e2e8f0"};
  border-radius: 20px;
  padding: 2px 9px;
`;

export const OrderTopRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
`;

export const OrderTotal = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #ea1d2c;
`;

export const OrderSummaryRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const InfoChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 3px 8px;
`;

export const AddressRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: #475569;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: #ea1d2c;
  }
  span {
    line-height: 1.4;
  }
`;

export const ExpandedContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 10px;
`;

export const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #475569;
  svg {
    color: #94a3b8;
  }
`;

export const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 10px;
`;

export const ItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #334155;

  span:last-child {
    font-weight: 600;
  }
`;

export const NotesBox = styled.p`
  font-size: 12px;
  color: #64748b;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 6px 10px;
  margin: 0;
`;

export const ErrorMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 6px 10px;
`;

export const CardActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
`;

export const DeliveryHint = styled.p`
  margin: 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.35;
`;

export const DeliveryCodeInput = styled.input`
  width: 100%;
  min-height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  &::placeholder {
    color: #94a3b8;
    font-weight: 500;
  }
`;

export const DeliverButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px;
  background: ${(p) => (p.disabled ? "#e2e8f0" : "#16a34a")};
  color: ${(p) => (p.disabled ? "#94a3b8" : "white")};
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #15803d;
  }
`;

export const SecondaryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 9px;
  background: transparent;
  border: 1.5px solid #ea1d2c;
  color: #ea1d2c;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: #fff1f2;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PinRow = styled.div`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    padding: 9px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 2px;
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: #ea1d2c;
    }
  }
`;

export const PinConfirmButton = styled.button`
  padding: 9px 16px;
  background: #ea1d2c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: #b8141f;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/* ─── Perfil ─── */

export const ProfilePanel = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 28px;
  max-width: 640px;

  @media (max-width: 600px) {
    padding: 16px;
  }
`;

export const ProfileAvatarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

export const ProfileAvatar = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ea1d2c, #b8141f);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

export const ProfileName = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
`;

export const ProfileRole = styled.span`
  font-size: 13px;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 20px;
  padding: 2px 10px;
  font-weight: 500;
`;

export const EditProfileBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 8px 16px;
  background: transparent;
  border: 1.5px solid #ea1d2c;
  color: #ea1d2c;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #fff1f2;
  }
`;

export const ProfileFieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

export const ProfileInfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;

  span {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  strong {
    font-size: 15px;
    color: #1e293b;
    font-weight: 600;
  }
`;

export const ProfileField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  input {
    padding: 10px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #1e293b;
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: #ea1d2c;
    }
  }
`;

export const ProfileActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #15803d;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const CancelButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: 1.5px solid #cbd5e1;
  color: #64748b;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #94a3b8;
    color: #475569;
  }
`;

export const SuccessMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #16a34a;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
`;

export const ActionButton = styled.button`
  width: 100%;
  background-color: #ea1d2c;
  color: white;
  border: none;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #b8141f;
  }
`;

export const BottomNav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  background-color: white;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-around;
  padding: 12px;
  z-index: 10;
`;

export const NavItem = styled.button`
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: ${(props) => (props.active ? "#ea1d2c" : "#94a3b8")};
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
`;
