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
  border: 1px solid #e8d2a8;
  border-left: 4px solid #c98224;
  border-radius: 8px;
  padding: 13px 15px;
  margin-bottom: 14px;
  background: #fffbf1;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }
`;

export const LocationAlertIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #885914;
  background: #fff1ce;
  border: 1px solid #ecd39c;
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
  min-height: 42px;
  border-radius: 7px;
  border: 1px solid var(--courier-primary);
  background: var(--courier-primary);
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
  border-radius: 6px;
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
  min-height: 40px;
  border: 1px solid var(--courier-line);
  border-radius: 7px;
  padding: 10px 15px;
  font-size: 13px;
  font-weight: 500;
  color: #5d5147;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: color-mix(in srgb, var(--courier-primary) 50%, #96a39c);
    color: color-mix(in srgb, var(--courier-primary) 80%, #1d2823);
    background: color-mix(in srgb, var(--courier-primary) 6%, #fff);
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
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));

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
  min-height: 260px;
  padding: 42px 18px;
  border: 1px dashed #ccd4cf;
  border-radius: 8px;
  color: #7c8881;
  background: rgba(255, 255, 255, 0.64);

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

export const OrderCard = styled.article<{ $status: string }>`
  position: relative;
  min-width: 0;
  background: white;
  border: 1px solid var(--courier-line);
  border-top: 3px solid
    ${(props) =>
      props.$status === 'PRONTO'
        ? '#d68a24'
        : props.$status === 'SAIU_PARA_ENTREGA'
          ? '#197492'
          : '#3f8153'};
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  box-shadow: 0 5px 16px rgba(24, 32, 29, 0.045);
  transition:
    box-shadow 0.16s ease,
    border-color 0.2s ease;

  &:hover {
    box-shadow: 0 10px 24px rgba(24, 32, 29, 0.085);
  }

  @media (max-width: 480px) {
    padding: 14px;
  }
`;

export const OrderCardHeader = styled.button`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
  user-select: none;
  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--courier-primary) 24%, transparent);
    outline-offset: 3px;
    border-radius: 5px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.68;
    transform: none;
  }
`;

export const LocationActiveCard = styled(LocationAlertCard)`
  border-color: #bddfc7;
  border-left-color: #3c8753;
  background: #f2faf4;
  ${LocationAlertIcon} {
    color: #15803d;
    background: #dcfce7;
    border-color: #bbf7d0;
  }
`;

export const TrackingConnection = styled.span<{ $connected: boolean }>`
  min-height: 34px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 6px;
  color: ${(p) => (p.$connected ? '#166534' : '#92400e')};
  background: ${(p) => (p.$connected ? '#dcfce7' : '#fef3c7')};
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(p) => (p.$connected ? '#22c55e' : '#f59e0b')};
  }
  @media (max-width: 768px) {
    justify-self: start;
  }
`;

export const OrderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const OrderId = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: var(--courier-ink);
`;

export const StatusBadgeInline = styled.span<{ $color?: string }>`
  min-height: 24px;
  padding: 3px 8px;
  display: inline-flex;
  align-items: center;
  border: 1px solid ${(p) => `${p.$color || '#64748b'}55`};
  border-radius: 5px;
  color: ${(p) => p.$color || '#64748b'};
  background: ${(p) => `${p.$color || '#64748b'}12`};
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
`;

export const OrderTopRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
`;

export const OrderTotal = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: var(--courier-ink);
`;

export const OrderSummaryRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const InfoChip = styled.span<{
  $tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid
    ${(props) =>
      props.$tone === 'success'
        ? '#b8ddc2'
        : props.$tone === 'warning'
          ? '#ead09c'
          : props.$tone === 'danger'
            ? '#efc2bc'
            : props.$tone === 'info'
              ? '#b8d9e4'
              : '#dce2de'};
  border-radius: 5px;
  color: ${(props) =>
    props.$tone === 'success'
      ? '#22623a'
      : props.$tone === 'warning'
        ? '#805415'
        : props.$tone === 'danger'
          ? '#98382e'
          : props.$tone === 'info'
            ? '#155d77'
            : '#52605a'};
  background: ${(props) =>
    props.$tone === 'success'
      ? '#eef8f0'
      : props.$tone === 'warning'
        ? '#fff8e8'
        : props.$tone === 'danger'
          ? '#fff1ef'
          : props.$tone === 'info'
            ? '#edf8fb'
            : '#f7f9f7'};
  font-size: 10px;
  font-weight: ${(props) => (props.$tone && props.$tone !== 'neutral' ? 800 : 650)};
`;

export const AddressRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 12px;
  border-left: 3px solid #68776f;
  color: #34413b;
  background: #f5f7f5;
  font-size: 12px;
  font-weight: 650;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: #52655b;
  }
  span {
    line-height: 1.4;
  }
`;

export const ExpandedContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--courier-line);
  padding-top: 11px;
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
  border: 1px solid #e3e8e4;
  border-radius: 6px;
  background: #f8faf8;
  padding: 9px 11px;
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

export const ItemDetail = styled.div`
  display: grid;
  gap: 7px;
  padding: 7px 0;
  & + & {
    border-top: 1px solid #ebe7e2;
  }
`;

export const ItemChoice = styled.p`
  margin: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.45;
  b {
    color: #27323a;
  }
`;

export const ItemObservation = styled.p`
  margin: 0;
  padding: 8px 10px;
  border-radius: 5px;
  color: #7c2d12;
  background: #fff7ed;
  font-size: 12px;
  line-height: 1.45;
`;

export const ItemsUnavailable = styled.p`
  margin: 0;
  padding: 10px;
  border-radius: 5px;
  color: #7c2d12;
  background: #fff7ed;
  font-size: 12px;
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
  border-radius: 5px;
  padding: 9px 10px;
`;

export const CardActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  border-top: 1px solid var(--courier-line);
  padding-top: 12px;
`;

export const DeliveryHint = styled.p`
  margin: 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.35;
`;

export const DeliveryCodeInput = styled.input`
  width: 100%;
  min-height: 46px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
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
  min-height: 48px;
  padding: 11px;
  background: ${(p) => (p.disabled ? '#e2e8f0' : '#16a34a')};
  color: ${(p) => (p.disabled ? '#94a3b8' : 'white')};
  border: none;
  border-radius: 7px;
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
  border: 1px solid var(--courier-line);
  border-radius: 8px;
  padding: 24px;
  max-width: none;

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
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: var(--courier-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

export const ProfileName = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: var(--courier-ink);
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
  min-height: 40px;
  border: 1px solid var(--courier-primary);
  color: color-mix(in srgb, var(--courier-primary) 80%, #1d2823);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: color-mix(in srgb, var(--courier-primary) 8%, #fff);
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
  background: #f7f9f7;
  border-radius: 6px;
  border: 1px solid var(--courier-line);

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
  min-height: 48px;
  background-color: var(--courier-primary);
  color: white;
  border: none;
  padding: 14px;
  border-radius: 7px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    filter: brightness(0.92);
  }

  &:disabled {
    opacity: 0.62;
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
  gap: 12px;
`;

export const RouteOrderSelect = styled.select`
  min-height: 42px;
  padding: 0 36px 0 13px;
  border: 1px solid #e1d8d1;
  border-radius: 7px;
  color: #27323a;
  background: #fff;
  font-weight: 700;
`;

export const RouteError = styled.div`
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #fed7aa;
  border-radius: 7px;
  color: #9a3412;
  background: #fff7ed;
  font-size: 13px;
  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;
  }
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
  padding: 17px 18px;
  border: 1px solid var(--courier-line);
  border-left: 4px solid #176b87;
  border-radius: 8px;
  background: #fff;

  h2 {
    margin: 0;
    color: #191816;
    font-size: 18px;
  }
  p {
    margin: 4px 0 0;
    color: var(--courier-muted);
    font-size: 12px;
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
  --courier-accent: #e9571b;
  --courier-ink: #18201d;
  --courier-muted: #66716c;
  --courier-line: #dfe4e0;
  --courier-surface: #ffffff;
  height: 100dvh;
  display: grid;
  grid-template-columns: ${(p) => (p.$sidebarOpen === false ? '0' : '252px')} minmax(0, 1fr);
  overflow: hidden;
  color: var(--courier-ink);
  background-color: #f4f6f3;
  background-image:
    linear-gradient(rgba(24, 32, 29, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(24, 32, 29, 0.025) 1px, transparent 1px);
  background-size: 32px 32px;
  font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
  transition: grid-template-columns 0.25s ease;
  button,
  a {
    cursor: pointer;
  }
  @media (max-width: 820px) {
    display: block;
    overflow: auto;
  }
`;

export const CourierMain = styled.main`
  min-width: 0;
  height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;

  @media (max-width: 820px) {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }
`;

export const CourierTop = styled.header`
  min-height: 84px;
  padding: 17px clamp(18px, 3vw, 38px);
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--courier-line);
  position: sticky;
  top: 0;
  z-index: 30;
  h1 {
    margin: 0 0 4px;
    font-size: 24px;
    letter-spacing: 0;
  }
  p {
    margin: 0;
    color: var(--courier-muted);
    font-size: 12px;
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
  width: min(100%, 1280px);
  margin: 0 auto;
  padding: 22px clamp(14px, 3vw, 30px) 68px;
  ${WorkspaceStatsGrid} {
    margin-bottom: 20px;
  }
  @media (max-width: 650px) {
    padding: 12px 10px 94px;
  }
`;

export const OverviewHero = styled.section`
  position: relative;
  overflow: hidden;
  padding: clamp(21px, 3vw, 30px);
  margin-bottom: 20px;
  display: grid;
  grid-template-columns: minmax(230px, 1fr) auto;
  align-items: center;
  gap: 24px;
  border-radius: 8px;
  color: #fff;
  background: #1d2823;
  box-shadow: 0 12px 30px rgba(24, 32, 29, 0.14);
  &::before {
    position: absolute;
    inset: 0 0 0 auto;
    width: 8px;
    background: var(--courier-primary);
    content: '';
  }
  & > div > small {
    color: #d8f06a;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0;
  }
  h2 {
    margin: 8px 0 5px;
    font-size: 29px;
    letter-spacing: 0;
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
  button {
    min-width: 100px;
    padding: 14px;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 2px 8px;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 8px;
    color: inherit;
    background: rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(8px);
    font: inherit;
    text-align: left;
    transition:
      background 160ms ease,
      border-color 160ms ease;
  }
  button:hover {
    border-color: rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.12);
  }
  svg {
    grid-row: 1 / span 2;
    width: 20px;
    color: #d8f06a;
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
    button {
      min-width: 0;
    }
  }
`;

export const EarningsPanel = styled.section`
  margin-bottom: 8px;
  padding: 20px 0;
  border-top: 1px solid var(--courier-line);
  background: transparent;
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
    width: 40px;
    height: 40px;
    padding: 9px;
    border-radius: 7px;
    color: #2c6f48;
    background: #eaf6ed;
  }
  span {
    display: grid;
    gap: 2px;
  }
  small {
    color: #6e7b74;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0;
  }
  h2 {
    margin: 0;
    font-size: 18px;
    letter-spacing: 0;
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
  min-height: 106px;
  padding: 15px;
  display: grid;
  align-content: center;
  gap: 7px;
  border-radius: 7px;
  border: 1px solid ${(p) => (p.$featured ? '#33463c' : 'var(--courier-line)')};
  color: ${(p) => (p.$featured ? '#fff' : '#1d252b')};
  background: ${(p) => (p.$featured ? '#25352d' : '#fff')};
  span {
    color: ${(p) => (p.$featured ? '#b7c8be' : '#7a7f83')};
    font-size: 11px;
  }
  strong {
    font-size: clamp(19px, 2vw, 25px);
    letter-spacing: 0;
  }
  small {
    color: ${(p) => (p.$featured ? '#d8f06a' : '#92979a')};
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
  border-radius: 6px;
  color: #805415;
  background: #fff2d3;
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
  border: 1px solid var(--courier-line);
  border-radius: 7px;
  color: #27323a;
  background: #fcfbfa;
  transition: 0.18s ease;
  &:hover {
    border-color: #aebbb4;
    background: #f7f9f7;
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
    border-radius: 7px;
    color: #805415;
    background: #fff2d3;
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
    color: var(--courier-primary);
  }
`;
export const CompactEmpty = styled.div`
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed #dce5dd;
  border-radius: 7px;
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
