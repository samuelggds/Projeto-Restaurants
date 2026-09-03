import styled from 'styled-components';

export const Shell = styled.section`
  width: min(1240px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 20px;
  color: #211e1b;

  button,
  [role='tab'] {
    font: inherit;
  }

  button:focus-visible,
  [role='tab']:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 28%, transparent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export const BillingHero = styled.section`
  position: relative;
  isolation: isolate;
  min-height: 288px;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.72fr);
  gap: 26px;
  align-items: stretch;
  padding: clamp(26px, 3.5vw, 42px);
  border: 1px solid #302b27;
  border-radius: 26px;
  color: #fff;
  background:
    radial-gradient(circle at 82% 14%, rgba(231, 94, 41, 0.24), transparent 29%),
    linear-gradient(135deg, #17191b 0%, #24211f 56%, #39251d 100%);
  box-shadow: 0 22px 56px rgba(45, 31, 22, 0.16);

  &::before,
  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    border-radius: 50%;
    pointer-events: none;
  }

  &::before {
    width: 300px;
    height: 300px;
    right: -110px;
    top: -170px;
    border: 54px solid rgba(255, 255, 255, 0.035);
  }

  &::after {
    width: 150px;
    height: 150px;
    left: 47%;
    bottom: -120px;
    background: rgba(232, 89, 31, 0.08);
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 560px) {
    min-height: 0;
    gap: 20px;
    padding: 22px 18px;
    border-radius: 20px;
  }
`;

export const HeroCopy = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .eyebrow {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #ff9a6a;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .eyebrow svg {
    width: 15px;
    height: 15px;
  }

  h2 {
    max-width: 680px;
    margin: 12px 0 8px;
    font-size: clamp(27px, 3.3vw, 40px);
    line-height: 1.08;
    letter-spacing: -0.04em;
  }

  > p {
    max-width: 680px;
    margin: 0;
    color: #c8c3be;
    font-size: 13px;
    line-height: 1.65;
  }
`;

export const HeroFacts = styled.div`
  margin-top: 26px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  > span {
    min-width: 0;
    min-height: 68px;
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
    grid-template-rows: auto auto;
    column-gap: 8px;
    align-content: center;
    padding: 11px 12px;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.055);
  }

  svg {
    grid-row: 1 / 3;
    align-self: center;
    width: 17px;
    height: 17px;
    color: #ff9a6a;
  }

  small {
    overflow: hidden;
    color: #a9a39e;
    font-size: 9px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    overflow: hidden;
    margin-top: 2px;
    color: #fff;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    margin-top: 20px;
  }
`;

export const HeroStatusPanel = styled.aside<{ $active: boolean }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 19px;
  background: rgba(8, 9, 10, 0.28);
  backdrop-filter: blur(8px);

  .status-icon {
    width: 43px;
    height: 43px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: ${({ $active }) => ($active ? '#67d790' : '#ff9c83')};
    background: ${({ $active }) => ($active ? 'rgba(75,190,116,.15)' : 'rgba(235,89,58,.16)')};
  }

  .status-icon svg {
    width: 21px;
    height: 21px;
  }

  > small {
    margin-top: 17px;
    color: #a9a39e;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  > strong {
    margin-top: 4px;
    font-size: 19px;
  }

  p {
    margin: 7px 0 18px;
    color: #bdb7b2;
    font-size: 11px;
    line-height: 1.45;
  }

  button {
    width: 100%;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 14px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 11px;
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
    transition:
      background 160ms ease,
      border-color 160ms ease;
  }

  button:hover {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.14);
  }

  button svg {
    width: 16px;
    height: 16px;
  }
`;

export const Notice = styled.div<{ $tone: 'info' | 'warning' }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid ${({ $tone }) => ($tone === 'info' ? '#c9dfef' : '#edd7b8')};
  border-radius: 15px;
  color: ${({ $tone }) => ($tone === 'info' ? '#315f7c' : '#795525')};
  background: ${({ $tone }) => ($tone === 'info' ? '#f2f8fc' : '#fff9ee')};

  > span {
    width: 37px;
    height: 37px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.7);
  }

  svg {
    width: 18px;
    height: 18px;
  }

  strong {
    display: block;
    font-size: 12px;
  }

  p {
    margin: 3px 0 0;
    font-size: 11px;
    line-height: 1.45;
  }
`;

export const FeedbackBanner = styled.div<{ $tone: 'success' | 'error' }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px 15px;
  border: 1px solid ${({ $tone }) => ($tone === 'success' ? '#c6e7d3' : '#efcbc5')};
  border-radius: 15px;
  color: ${({ $tone }) => ($tone === 'success' ? '#236b40' : '#a53f35')};
  background: ${({ $tone }) => ($tone === 'success' ? '#eef9f2' : '#fff1ef')};

  > span {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.72);
  }

  > span svg {
    width: 18px;
    height: 18px;
  }

  strong {
    display: block;
    font-size: 11px;
  }

  p {
    margin: 3px 0 0;
    font-size: 10px;
    line-height: 1.4;
  }

  button {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 10px;
    color: currentColor;
    background: transparent;
    cursor: pointer;
  }

  button:hover {
    background: rgba(255, 255, 255, 0.66);
  }

  button svg {
    width: 16px;
    height: 16px;
  }
`;

export const ViewTabs = styled.div`
  width: fit-content;
  max-width: 100%;
  display: flex;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #f4f1ed;

  button {
    position: relative;
    min-width: 205px;
    min-height: 54px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 8px 13px;
    border: 1px solid transparent;
    border-radius: 11px;
    color: #77706a;
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition:
      color 160ms ease,
      background 160ms ease,
      box-shadow 160ms ease;
  }

  button > svg {
    width: 18px;
    height: 18px;
  }

  button > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  button strong {
    font-size: 12px;
  }

  button small {
    overflow: hidden;
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button em {
    min-width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: #fff;
    background: var(--a);
    font-size: 9px;
    font-style: normal;
    font-weight: 900;
  }

  button.active {
    border-color: #eee7e0;
    color: var(--a);
    background: #fff;
    box-shadow: 0 6px 16px rgba(52, 37, 26, 0.08);
  }

  button:hover:not(.active) {
    color: #2e2925;
    background: rgba(255, 255, 255, 0.55);
  }

  @media (max-width: 560px) {
    width: 100%;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    button {
      min-width: max(170px, calc(50vw - 28px));
    }

    button small {
      display: none;
    }
  }
`;

export const ViewPanel = styled.div`
  min-width: 0;
  display: grid;
  gap: 18px;
`;

export const SectionHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 3px 2px;

  > div:first-child {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 13px;
  }

  .section-icon {
    width: 43px;
    height: 43px;
    flex: 0 0 43px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, #fff);
  }

  .section-icon.charges {
    color: #315f7c;
    background: #edf6fb;
  }

  .section-icon svg {
    width: 20px;
    height: 20px;
  }

  > div:first-child > span:last-child > small {
    color: var(--a);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  h2 {
    margin: 4px 0 3px;
    font-size: clamp(19px, 2.3vw, 24px);
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
  }

  @media (max-width: 760px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const ChoiceStatus = styled.div<{ $available: boolean }>`
  max-width: 350px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 11px 13px;
  border: 1px solid ${({ $available }) => ($available ? '#cde7d7' : '#eadfd4')};
  border-radius: 13px;
  color: ${({ $available }) => ($available ? '#267545' : '#6e6259')};
  background: ${({ $available }) => ($available ? '#f0faf4' : '#faf7f4')};

  > svg {
    width: 18px;
    height: 18px;
  }

  span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  strong {
    font-size: 10px;
  }

  small {
    color: #7a7068;
    font-size: 9px;
    line-height: 1.35;
  }

  @media (max-width: 760px) {
    max-width: none;
  }
`;

export const Plans = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const PlanCard = styled.article<{ $featured?: boolean; $current?: boolean }>`
  position: relative;
  min-width: 0;
  min-height: 390px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(20px, 2.5vw, 28px);
  border: 1px solid
    ${({ $current }) => ($current ? 'color-mix(in srgb, var(--a) 72%, #fff)' : 'var(--border)')};
  border-radius: 22px;
  background: ${({ $featured }) => ($featured ? 'linear-gradient(145deg, #fff8f2 0%, #fff 54%)' : '#fff')};
  box-shadow: ${({ $current }) => ($current ? '0 18px 42px rgba(126, 64, 28, 0.11)' : '0 10px 30px rgba(52, 36, 25, 0.06)')};
  content-visibility: auto;
  contain-intrinsic-size: auto 390px;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;

  &::before {
    content: '';
    position: absolute;
    width: 160px;
    height: 160px;
    right: -105px;
    top: -105px;
    border-radius: 50%;
    background: ${({ $featured }) => ($featured ? 'color-mix(in srgb, var(--a) 10%, transparent)' : '#f3f0ed')};
  }

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--a) 42%, var(--border));
    box-shadow: 0 18px 42px rgba(52, 36, 25, 0.1);
  }

  .description {
    max-width: 470px;
    min-height: 40px;
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.55;
  }

  .price {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .price > strong {
    color: var(--a);
    font-size: clamp(28px, 3.2vw, 36px);
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .price > span {
    display: grid;
    gap: 3px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
  }

  .price small {
    color: #8c7b6e;
    font-size: 9px;
    font-weight: 600;
  }
`;

export const PlanCardTop = styled.div`
  min-height: 52px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

export const PlanHeading = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;

  > span {
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 11%, #fff);
  }

  svg {
    width: 22px;
    height: 22px;
  }

  small {
    color: #8a7f76;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  h3 {
    margin: 3px 0 0;
    font-size: 21px;
  }
`;

export const PlanTag = styled.span<{ $tone: 'current' | 'recommended' }>`
  position: relative;
  z-index: 1;
  min-height: 29px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border-radius: 999px;
  color: ${({ $tone }) => ($tone === 'current' ? 'var(--a)' : '#fff')};
  background: ${({ $tone }) => ($tone === 'current' ? 'color-mix(in srgb, var(--a) 11%, #fff)' : '#211e1b')};
  font-size: 9px;
  font-weight: 850;
  white-space: nowrap;

  svg {
    width: 13px;
    height: 13px;
  }

  @media (max-width: 430px) {
    padding: 0 8px;
  }
`;

export const Benefits = styled.ul`
  margin: 0;
  padding: 16px 0 0;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 10px;
  list-style: none;

  > span {
    margin-bottom: 1px;
    color: #312c28;
    font-size: 10px;
    font-weight: 850;
  }

  li {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #595149;
    font-size: 11px;
    line-height: 1.4;
  }

  i {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #2c8249;
    background: #eaf7ef;
  }

  svg {
    width: 12px;
    height: 12px;
    stroke-width: 3;
  }
`;

export const ChoosePlanButton = styled.button<{ $current: boolean }>`
  width: 100%;
  min-height: 48px;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 16px;
  border: 1px solid
    ${({ $current }) => ($current ? 'color-mix(in srgb, var(--a) 28%, #ddd)' : 'var(--a)')};
  border-radius: 12px;
  color: ${({ $current }) => ($current ? 'var(--a)' : '#fff')};
  background: ${({ $current }) => ($current ? 'color-mix(in srgb, var(--a) 7%, #fff)' : 'var(--a)')};
  font-size: 11px;
  font-weight: 850;
  cursor: pointer;
  transition:
    filter 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover:not(:disabled) {
    filter: brightness(0.95);
    transform: translateY(-1px);
    box-shadow: 0 9px 20px color-mix(in srgb, var(--a) 22%, transparent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }
`;

export const PlanFootnote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 0 3px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.45;

  svg {
    width: 15px;
    height: 15px;
    flex: 0 0 15px;
    color: #7d7168;
  }
`;

export {
  InvoiceOverview,
  ChargeMetrics,
  ChargeMetric,
  BillingCard,
  BillingCardHeader,
  BillingTimeline,
  BillingPayment,
  HistorySection,
  HistoryHeader,
  Invoices,
  InvoiceRow,
  InvoiceStatus,
  PaidMark,
  InvoiceUnavailable,
  Empty,
  Loading,
  PixBackdrop,
  PixModal,
} from './MonthlyBilling.charges.styles';
