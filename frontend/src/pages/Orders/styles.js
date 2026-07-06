import styled, { css } from "styled-components";

const deliveredPulse = css`
  animation: deliveredPulseIn 0.7s ease;

  @keyframes deliveredPulseIn {
    0% {
      transform: scale(0.9);
      opacity: 0;
    }
    55% {
      transform: scale(1.08);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

export const lightTheme = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceCard: "#f1f5f9",
  surfaceHover: "#f1f5f9",
  text: "#0f172a",
  textMuted: "#475569",
  border: "#e2e8f0",
  primary: "#eab308",
  primaryDim: "rgba(234, 179, 8, 0.12)",
  danger: "#dc2626",
  dangerGlow: "rgba(220, 38, 38, 0.1)",
  success: "#16a34a",
};

export const darkTheme = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceCard: "#0b1329",
  surfaceHover: "#334155",
  text: "#f8fafc",
  textMuted: "#cbd5e1",
  border: "#334155",
  primary: "#eab308",
  primaryDim: "rgba(234, 179, 8, 0.14)",
  danger: "#f87171",
  dangerGlow: "rgba(248, 113, 113, 0.12)",
  success: "#4ade80",
};

export const AppContainer = styled.div`
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(
      circle at 6% 0%,
      ${(props) => props.theme.primaryDim},
      transparent 35%
    ),
    radial-gradient(
      circle at 100% 100%,
      rgba(59, 130, 246, 0.1),
      transparent 30%
    ),
    ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Inter", sans-serif;
  padding: 1.25rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;

  @media (max-width: 768px) {
    padding: 0.9rem;
  }
`;

export const TopNavbar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 16px;
  background: ${(props) => props.theme.surface};
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(6px);
  padding: 0.8rem 1rem;
`;

export const BrandLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  font-size: 1.15rem;
  color: ${(props) => props.theme.primary};
  letter-spacing: -0.2px;
`;

export const NavActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const ThemeToggleButton = styled.button`
  background: none;
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  &:hover {
    background: ${(props) => props.theme.surfaceHover};
  }
`;

export const TrackingCard = styled.div`
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.04), transparent),
    ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 22px;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
  box-shadow: 0 18px 35px rgba(15, 23, 42, 0.14);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  border-bottom: 1px solid ${(props) => props.theme.border};
  padding-bottom: 0.9rem;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
  }

  p {
    margin: 0.25rem 0 0 0;
    color: ${(props) => props.theme.textMuted};
    font-size: 0.9rem;
  }

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const LiveStatus = styled.span`
  font-size: 0.78rem;
  color: ${(props) => props.theme.textMuted};
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
`;

export const HeaderStatusArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.45rem;

  @media (max-width: 640px) {
    align-items: flex-start;
  }
`;

export const DeliveredBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.32rem 0.7rem;
  font-size: 0.73rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f172a;
  background: ${(props) => props.theme.success};
  box-shadow: 0 0 0 3px ${(props) => props.theme.primaryDim};

  ${(props) => props.$pulse && deliveredPulse}
`;

export const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 700px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const MetricCard = styled.article`
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surfaceCard};
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  span {
    font-size: 0.74rem;
    color: ${(props) => props.theme.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 700;
  }

  strong {
    font-size: 1.1rem;
    color: ${(props) => props.theme.text};
    font-weight: 800;
  }
`;

export const FiltersRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

export const StatusChips = styled.div`
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  background: ${(props) => props.theme.surfaceCard};
  padding: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

export const MainGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.95fr);
  gap: 0.95rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const PrimaryPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  min-width: 0;
`;

export const SidePanel = styled.aside`
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 14px;
  background: ${(props) => props.theme.surfaceCard};
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-height: 360px;
`;

export const SidePanelHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  border-bottom: 1px solid ${(props) => props.theme.border};
  padding-bottom: 0.6rem;

  h3 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: 0.01em;
  }

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 24px;
    border-radius: 999px;
    background: ${(props) => props.theme.primaryDim};
    color: ${(props) => props.theme.text};
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0 0.4rem;
  }
`;

export const OrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  overflow-y: auto;
  max-height: 520px;
  padding-right: 0.1rem;
`;

export const OrderListItem = styled.button`
  border: 1px solid
    ${(props) => (props.$active ? props.theme.primary : props.theme.border)};
  background: ${(props) =>
    props.$active ? props.theme.primaryDim : props.theme.surface};
  border-radius: 12px;
  padding: 0.65rem 0.7rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    transform: translateY(-1px);
  }

  .top-row,
  .bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
  }

  .top-row {
    strong {
      font-size: 0.9rem;
      color: ${(props) => props.theme.text};
    }

    span {
      font-size: 0.7rem;
      font-weight: 700;
      color: ${(props) => props.theme.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  }

  p {
    margin: 0;
    color: ${(props) => props.theme.text};
    font-size: 0.86rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bottom-row {
    small {
      color: ${(props) => props.theme.textMuted};
      font-size: 0.72rem;
    }

    b {
      color: ${(props) => props.theme.text};
      font-size: 0.84rem;
      letter-spacing: 0.01em;
    }
  }
`;

export const StatusChip = styled.button`
  border: 1px solid
    ${(props) => (props.$active ? props.theme.primary : props.theme.border)};
  background: ${(props) =>
    props.$active ? props.theme.primaryDim : props.theme.surface};
  color: ${(props) =>
    props.$active ? props.theme.text : props.theme.textMuted};
  border-radius: 999px;
  padding: 0.45rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.text};
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export const Select = styled.select`
  width: 100%;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  padding: 0.65rem 0.8rem;
  background: ${(props) => props.theme.surfaceCard};
  color: ${(props) => props.theme.text};
  font-size: 0.92rem;
  outline: none;

  &:focus {
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 0 0 3px ${(props) => props.theme.primaryDim};
  }

  &:hover {
    border-color: ${(props) => props.theme.primary};
  }
`;

export const ErrorMessage = styled.div`
  border: 1px solid ${(props) => props.theme.danger};
  background: ${(props) => props.theme.dangerGlow};
  color: ${(props) => props.theme.danger};
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  font-size: 0.9rem;
`;

export const EmptyState = styled.div`
  background: ${(props) => props.theme.surfaceCard};
  border: 1px dashed ${(props) => props.theme.border};
  border-radius: 14px;
  min-height: 140px;
  display: grid;
  place-items: center;
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  padding: 1rem;
`;

export const ProgressTimeline = styled.div`
  --track-offset: 32px;

  display: flex;
  justify-content: space-between;
  position: relative;
  margin: 0.5rem 0;
  padding: 0 6px;

  &::before {
    content: "";
    position: absolute;
    top: 18px;
    left: var(--track-offset);
    right: var(--track-offset);
    height: 4px;
    background: ${(props) => props.theme.border};
    border-radius: 2px;
    z-index: 1;
  }

  @media (max-width: 700px) {
    overflow-x: auto;
    gap: 1rem;
    padding-bottom: 0.3rem;
  }
`;

export const ActiveProgressBar = styled.div`
  position: absolute;
  top: 18px;
  left: var(--track-offset);
  height: 4px;
  background: ${(props) => props.theme.primary};
  box-shadow: 0 0 10px ${(props) => props.theme.primary};
  z-index: 2;
  transition: width 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  width: calc(
    (100% - (var(--track-offset) * 2)) * ${(props) => props.$ratio || 0}
  );

  ${(props) =>
    props.$isFinal &&
    css`
      animation: finalProgressGlow 0.65s ease;

      @keyframes finalProgressGlow {
        0% {
          box-shadow: 0 0 10px ${props.theme.primary};
        }
        50% {
          box-shadow:
            0 0 16px ${props.theme.primary},
            0 0 26px ${props.theme.primaryDim};
        }
        100% {
          box-shadow: 0 0 10px ${props.theme.primary};
        }
      }
    `}
`;

export const TimelineStep = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 3;
  width: 86px;
  flex: 0 0 auto;

  .circle-node {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: ${(props) =>
      props.$completed ? props.theme.primary : props.theme.surfaceCard};
    border: 3px solid
      ${(props) =>
        props.$completed ? props.theme.primary : props.theme.border};
    color: ${(props) => (props.$completed ? "#0f172a" : props.theme.textMuted)};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 700;
    transition: all 0.25s ease;

    ${(props) =>
      props.$current &&
      css`
        transform: scale(1.12);
        box-shadow: 0 0 0 4px ${props.theme.primaryDim};
      `}
  }

  .step-label {
    margin-top: 0.55rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: center;
    color: ${(props) =>
      props.$completed ? props.theme.text : props.theme.textMuted};
  }
`;

export const CancelledTimeline = styled.div`
  background: ${(props) => props.theme.dangerGlow};
  border: 1px dashed ${(props) => props.theme.danger};
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  color: ${(props) => props.theme.danger};
  font-weight: 700;

  .cross-icon {
    width: 34px;
    height: 34px;
    background: ${(props) => props.theme.danger};
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .subtext {
    font-size: 0.84rem;
    margin-top: 0.2rem;
    opacity: 0.9;
    font-weight: 500;
  }
`;

export const OrderSummary = styled.div`
  background: ${(props) => props.theme.surfaceCard};
  border-radius: 14px;
  border: 1px solid ${(props) => props.theme.border};
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);

  .item-row {
    display: flex;
    justify-content: space-between;
    gap: 0.7rem;
    font-size: 0.92rem;

    .name {
      color: ${(props) => props.theme.text};
      font-weight: 500;
    }

    .qty {
      color: ${(props) => props.theme.primary};
      font-weight: 700;
      margin-right: 0.45rem;
    }

    .price {
      color: ${(props) => props.theme.textMuted};
      font-weight: 600;
    }
  }

  .total-row {
    border-top: 1px dashed ${(props) => props.theme.border};
    padding-top: 0.7rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1rem;
    font-weight: 800;

    .total-price {
      color: ${(props) => props.theme.primary};
      font-size: 1.1rem;
    }
  }

  .empty-items {
    color: ${(props) => props.theme.textMuted};
    text-align: center;
    padding: 0.4rem;
  }
`;

export const TotalHint = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.textMuted};
`;

export const ControlPanel = styled.div`
  display: flex;
  gap: 0.8rem;

  button {
    flex: 1;
    background: ${(props) => props.theme.primary};
    color: #0f172a;
    border: none;
    padding: 0.85rem;
    border-radius: 12px;
    font-size: 0.92rem;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      filter 0.2s ease;

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }

    &:hover:not(:disabled) {
      filter: brightness(1.04);
      transform: translateY(-1px);
    }
  }

  button.ghost {
    background: transparent;
    color: ${(props) => props.theme.danger};
    border: 1px solid ${(props) => props.theme.danger}55;
  }

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;
