import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ─── Layout geral ─── */

export const PageWrapper = styled.div`
  display: flex;
  min-height: 100vh;
  background: #fcfbf9;
  color: #191816;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

/* ─── Sidebar ─── */

export const Sidebar = styled.aside`
  width: 244px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #14212d 0%, #0d1821 100%);
  color: #f9fafb;
  display: flex;
  flex-direction: column;
  padding: 26px 14px 20px;
  gap: 22px;
  box-shadow: 6px 0 22px rgba(15, 23, 42, 0.08);

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
      font-size: 17px;
      font-weight: 800;
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
  width: 46px;
  height: 46px;
  color: #fff;
  background: linear-gradient(135deg, #e85d2a, #c74620);
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const SidebarStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.055);
  border-radius: 13px;
  padding: 13px;

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-around;
  }
`;

export const WorkspaceStatsGrid = styled.div<{ $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$columns || 3}, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 24px;

  & > div {
    min-height: 112px;
    padding: 20px;
    border: 1px solid #e5e1dc;
    border-radius: 16px;
    background: #fff;
    color: #17191b !important;
    box-shadow: 0 10px 28px rgba(54, 36, 20, 0.055);
  }

  & > div svg {
    color: #d64d08;
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
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

export const SidebarFooter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 768px) {
    display: none;
  }
`;

export const SideNavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 13px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 650;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
  background: ${(p) => (p.$active ? 'rgba(232, 93, 42, 0.18)' : 'transparent')};
  color: ${(p) => (p.$active ? '#ff7a45' : '#c7d0d9')};
  box-shadow: ${(p) => (p.$active ? 'inset 2px 0 0 #e85d2a' : 'none')};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(2px);
  }
`;

export const NavBadge = styled.span`
  margin-left: auto;
  background: ${(p) => (p.$urgent ? '#fbbf24' : 'rgba(255,255,255,0.3)')};
  color: ${(p) => (p.$urgent ? '#1e293b' : 'white')};
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
  margin-top: 0;

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
  padding: 34px clamp(22px, 4vw, 60px);
  overflow-y: auto;
  max-width: 1640px;

  @media (max-width: 1024px) {
    padding: 24px 20px;
  }

  @media (max-width: 768px) {
    padding: 16px 12px 24px;
  }
`;

export const LocationAlertCard = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.8rem;
  align-items: center;
  border: 1px solid rgba(214, 77, 8, 0.28);
  background:
    radial-gradient(circle at top right, rgba(255, 169, 91, 0.22), transparent 45%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 241, 0.96));
  border-radius: 16px;
  padding: 1rem 1.1rem;
  margin-bottom: 1.15rem;
  box-shadow: 0 10px 26px rgba(112, 65, 30, 0.08);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }
`;

export const LocationAlertIcon = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d64d08;
  background: #fff1e8;
  border: 1px solid #f3c4aa;
`;

export const LocationAlertContent = styled.div`
  display: grid;
  gap: 0.2rem;

  strong {
    font-size: 0.95rem;
    color: #34271f;
  }

  p {
    margin: 0;
    font-size: 0.82rem;
    color: #725f53;
    line-height: 1.35;
  }

  small {
    font-size: 0.74rem;
    color: #9b4928;
    font-weight: 700;
    opacity: 0.92;
  }
`;

export const LocationAlertButton = styled.button`
  min-height: 38px;
  border-radius: 11px;
  border: 1px solid #d64d08;
  background: linear-gradient(135deg, #e8642f, #c9471b);
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 0 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.04);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

export const LocationStatusChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  border: 1px solid rgba(22, 163, 74, 0.35);
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
  min-height: 32px;
  padding: 0 0.75rem;
  font-size: 0.78rem;
  font-weight: 800;
  margin-bottom: 1rem;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08);
`;

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid #e5e1dc;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 7px 22px rgba(52, 38, 25, 0.04);

  @media (max-width: 768px) {
    display: none;
  }
`;

export const TopBarTitle = styled.h1`
  font-size: clamp(25px, 2vw, 31px);
  font-weight: 800;
  letter-spacing: -0.035em;
  color: #191816;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
`;

export const CountChip = styled.span`
  background: #f8e8df;
  color: #cc542c;
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
  border: 1px solid #eadfd3;
  border-radius: 10px;
  padding: 10px 15px;
  font-size: 13px;
  font-weight: 500;
  color: #5d5147;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #df9c80;
    color: #c94e25;
    background: #fffaf6;
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
  background: ${(p) => (p.active ? '#ea1d2c' : 'transparent')};
  color: ${(p) => (p.active ? 'white' : '#64748b')};
  transition:
    background 0.15s,
    color 0.15s;
`;

/* ─── Lista de pedidos ─── */

export const OrdersList = styled.div`
  display: grid;
  gap: 16px;
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
  border: 1px solid #eadfd3;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 8px 22px rgba(69, 44, 20, 0.045);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: #e3b6a2;
    box-shadow: 0 15px 30px rgba(69, 44, 20, 0.09);
    transform: translateY(-2px);
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
  color: ${(p) => p.color || '#64748b'};
  background: ${(p) => p.color + '18' || '#f1f5f9'};
  border: 1px solid ${(p) => p.color + '44' || '#e2e8f0'};
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
  background: ${(p) => (p.disabled ? '#e2e8f0' : '#16a34a')};
  color: ${(p) => (p.disabled ? '#94a3b8' : 'white')};
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
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
  color: ${(props) => (props.active ? '#ea1d2c' : '#94a3b8')};
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
`;

export const RouteSection = styled.section`
  display: grid;
  gap: 16px;
`;

export const FinanceSection = styled.section`
  display: grid;
  gap: 18px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid #e5e1dc;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(35, 24, 17, 0.05);

  h2 {
    margin: 0;
    color: #191816;
    font-size: 20px;
  }
  p {
    margin: 4px 0 0;
    color: #73706d;
    font-size: 13px;
  }

  @media (max-width: 600px) {
    align-items: stretch;
    flex-direction: column;
    padding: 16px;
  }
`;

export const FinanceList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const CourierShell = styled.div<{ $primary: string; $sidebarOpen?: boolean }>`
  --courier-primary: ${(p) => p.$primary};
  --courier-ink: #17202a;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: ${(p) => (p.$sidebarOpen === false ? '0' : '270px')} minmax(0, 1fr);
  color: var(--courier-ink);
  background: linear-gradient(145deg, #f7f8fa 0%, #fffaf6 55%, #f4f7f9 100%);
  transition: grid-template-columns 0.25s ease;
  button,
  a {
    cursor: pointer;
  }
  @media (max-width: 820px) {
    display: block;
  }
`;

export const CourierSidebar = styled.aside<{ $open: boolean }>`
  position: sticky;
  top: 0;
  height: 100dvh;
  padding: 20px 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #f7fafc;
  background:
    radial-gradient(circle at 12% 2%, rgba(240, 103, 42, 0.28), transparent 25%),
    linear-gradient(165deg, #172733 0%, #101b24 58%, #0b141b 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  z-index: 80;
  @media (max-width: 820px) {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(88vw, 320px);
    transform: translateX(${(p) => (p.$open ? '0' : '-105%')});
    transition: transform 0.28s ease;
    box-shadow: 30px 0 70px rgba(0, 0, 0, 0.38);
  }
`;

export const CourierBrand = styled.div`
  display: grid;
  grid-template-columns: 54px 1fr;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  span {
    grid-row: 1 / span 2;
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border-radius: 17px;
    background: linear-gradient(135deg, #ff7b39, #d64d08);
    color: #fff;
    font:
      800 21px/1 Inter,
      sans-serif;
    letter-spacing: -0.06em;
    box-shadow: 0 10px 25px rgba(214, 77, 8, 0.32);
  }
  b {
    align-self: end;
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    align-self: start;
    color: #8ca0ad;
    font-size: 9px;
    letter-spacing: 0.13em;
  }
`;

export const CourierNav = styled.nav`
  display: grid;
  gap: 7px;
  margin-top: 24px;
  a {
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 14px;
    border-radius: 13px;
    color: #aebbc4;
    font-size: 13.5px;
    font-weight: 550;
    cursor: pointer;
    transition: 0.18s ease;
  }
  a:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.07);
    transform: translateX(2px);
  }
  a.active {
    color: #fff;
    background: linear-gradient(90deg, rgba(230, 86, 20, 0.95), rgba(230, 86, 20, 0.62));
    box-shadow: 0 9px 24px rgba(214, 77, 8, 0.22);
  }
  svg {
    width: 19px;
    flex-shrink: 0;
  }
`;

export const CourierBottomNav = styled.nav`
  margin-top: auto;
  padding: 16px 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.09);

  a {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 46px;
    padding: 0 14px;
    border-radius: 13px;
    color: #aebbc4;
    font-size: 13.5px;
    font-weight: 550;
    cursor: pointer;
    transition: 0.18s ease;
  }

  a:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
  }

  a.active {
    color: #fff;
    background: linear-gradient(90deg, #ee5c12, #b9471d);
    box-shadow: 0 8px 18px rgba(222, 83, 21, 0.27);
  }

  svg {
    width: 19px;
    flex-shrink: 0;
  }
`;

export const CourierUser = styled.div`
  margin-top: 8px;
  padding: 10px 8px 2px;
  border-top: 0;
  display: grid;
  grid-template-columns: 42px 1fr 34px;
  align-items: center;
  gap: 10px;
  .avatar {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    color: #ff8b50;
    background: #ff78351a;
    border: 1px solid #ff783555;
    font-weight: 800;
  }
  span:not(.avatar) {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  b {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    color: #7f929e;
    font-size: 10px;
  }
  button {
    width: 34px;
    height: 34px;
    border: 0;
    cursor: pointer;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #aab6bd;
    background: rgba(255, 255, 255, 0.06);
  }
  button:hover {
    color: #fff;
    background: rgba(229, 62, 62, 0.22);
  }
  svg {
    width: 17px;
  }
`;

export const CourierMain = styled.main`
  min-width: 0;
`;

export const CourierTop = styled.header`
  min-height: 104px;
  padding: 22px clamp(20px, 3vw, 42px);
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(214, 205, 197, 0.72);
  position: sticky;
  top: 0;
  z-index: 30;
  h1 {
    margin: 0 0 4px;
    font-size: clamp(24px, 2vw, 31px);
    letter-spacing: -0.035em;
  }
  p {
    margin: 0;
    color: #71808a;
    font-size: 13px;
  }
  @media (max-width: 650px) {
    min-height: 84px;
    padding: 13px 12px;
    h1 {
      font-size: 21px;
    }
    p {
      display: none;
    }
  }
`;

export const CourierContent = styled.div`
  width: min(100%, 1340px);
  margin: 0 auto;
  padding: 28px clamp(16px, 3vw, 34px) 70px;
  ${WorkspaceStatsGrid} {
    margin-bottom: 20px;
  }
  @media (max-width: 650px) {
    padding: 14px 10px 82px;
  }
`;

export const OverviewHero = styled.section`
  padding: clamp(22px, 3vw, 34px);
  margin-bottom: 18px;
  display: grid;
  grid-template-columns: minmax(230px, 1fr) auto;
  align-items: center;
  gap: 24px;
  border-radius: 22px;
  color: #fff;
  background: linear-gradient(125deg, #172733 0%, #213845 62%, #d95719 160%);
  box-shadow: 0 18px 44px rgba(22, 38, 48, 0.16);
  & > div > small {
    color: #ff9b69;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }
  h2 {
    margin: 8px 0 5px;
    font-size: clamp(25px, 3vw, 37px);
    letter-spacing: -0.04em;
  }
  p {
    margin: 0;
    color: #b9c7ce;
    font-size: 13px;
  }
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const OverviewCounters = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(92px, 1fr));
  gap: 9px;
  span {
    min-width: 100px;
    padding: 14px;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 2px 8px;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(8px);
  }
  svg {
    grid-row: 1 / span 2;
    width: 20px;
    color: #ff8a50;
  }
  b {
    font-size: 22px;
    line-height: 1;
  }
  small {
    padding: 0;
    display: block;
    min-width: 0;
    border: 0;
    background: none;
    color: #aebdc5;
    font-size: 10px;
    white-space: nowrap;
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    span {
      min-width: 0;
    }
  }
`;

export const EarningsPanel = styled.section`
  margin-bottom: 18px;
  padding: 22px;
  border: 1px solid #e7e1dc;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 34px rgba(46, 35, 26, 0.07);
  @media (max-width: 600px) {
    padding: 16px;
  }
`;

export const EarningsHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 17px;
  & > div {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  & > div > svg {
    width: 42px;
    height: 42px;
    padding: 10px;
    border-radius: 13px;
    color: #d64d08;
    background: #fff1e9;
  }
  span {
    display: grid;
    gap: 2px;
  }
  small {
    color: #a06b50;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.13em;
  }
  h2 {
    margin: 0;
    font-size: 20px;
    letter-spacing: -0.025em;
  }
  @media (max-width: 520px) {
    align-items: flex-start;
    ${RefreshButton} {
      padding: 9px;
      font-size: 0;
    }
  }
`;

export const EarningsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 11px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const EarningCard = styled.article<{ $featured?: boolean }>`
  min-height: 116px;
  padding: 17px;
  display: grid;
  align-content: center;
  gap: 7px;
  border-radius: 16px;
  border: 1px solid ${(p) => (p.$featured ? '#df6a31' : '#ece6e1')};
  color: ${(p) => (p.$featured ? '#fff' : '#1d252b')};
  background: ${(p) => (p.$featured ? 'linear-gradient(135deg,#e96527,#c9480d)' : '#fbfaf9')};
  box-shadow: ${(p) => (p.$featured ? '0 12px 28px rgba(207,74,15,.2)' : 'none')};
  span {
    color: ${(p) => (p.$featured ? '#ffe3d4' : '#7a7f83')};
    font-size: 11px;
  }
  strong {
    font-size: clamp(19px, 2vw, 25px);
    letter-spacing: -0.035em;
  }
  small {
    color: ${(p) => (p.$featured ? '#ffd5bf' : '#92979a')};
    font-size: 10px;
  }
`;

export const PickupPanel = styled(EarningsPanel)`
  margin-bottom: 0;
`;
export const PickupCount = styled.b`
  min-width: 34px;
  height: 34px;
  padding: 0 10px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #d64d08;
  background: #fff0e7;
  font-size: 14px;
`;
export const CompactOrders = styled.div`
  display: grid;
  gap: 9px;
`;
export const CompactOrderButton = styled.button`
  width: 100%;
  min-height: 66px;
  padding: 11px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ebe5df;
  border-radius: 14px;
  color: #27323a;
  background: #fcfbfa;
  transition: 0.18s ease;
  &:hover {
    border-color: #e27a47;
    background: #fff8f4;
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(71, 44, 28, 0.07);
  }
  & > span {
    display: grid;
    grid-template-columns: 38px 1fr;
    gap: 2px 10px;
    text-align: left;
  }
  & > span svg {
    grid-row: 1 / span 2;
    width: 38px;
    height: 38px;
    padding: 9px;
    border-radius: 11px;
    color: #d64d08;
    background: #fff0e7;
  }
  b {
    align-self: end;
    font-size: 13px;
  }
  small {
    align-self: start;
    color: #7c858b;
    font-size: 10px;
  }
  & > svg {
    width: 18px;
    color: #d64d08;
  }
`;
export const CompactEmpty = styled.div`
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed #dce5dd;
  border-radius: 15px;
  color: #3f7f4b;
  background: #f7fbf7;
  & > svg {
    width: 30px;
  }
  span {
    display: grid;
    gap: 3px;
  }
  b {
    font-size: 13px;
  }
  small {
    color: #718178;
    font-size: 10px;
  }
`;
