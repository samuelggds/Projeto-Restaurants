import styled from 'styled-components';

type StatusTone = 'warning' | 'info' | 'success' | 'danger' | 'neutral';

export const OverviewRoot = styled.div`
  display: grid;
  gap: 24px;
  min-width: 0;
  color: #252a31;
  --overview-accent: #b94a17;
  --overview-line: #e5e7eb;
  --overview-muted: #68717d;
  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  button {
    cursor: pointer;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid #b94a17;
    outline-offset: 3px;
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  > [role='alert'] {
    margin: 0;
    padding: 14px 18px;
    border: 1px solid #f5cebf;
    border-radius: 10px;
    background: #fff7f2;
    color: #9d3416;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .overview-assistant-strip {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.5fr);
    border: 1px solid var(--overview-line);
    background: #fff;
    border-radius: 14px;
  }
  .assistant-intro {
    padding: 22px;
    border-right: 1px solid var(--overview-line);
  }
  .assistant-title {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--overview-muted);
    font-size: 12px;
  }
  .assistant-intro > strong {
    display: block;
    font-size: 16px;
    margin-top: 10px;
  }
  .assistant-intro p {
    margin: 8px 0 12px;
    font-size: 13px;
    line-height: 1.6;
    color: #555f6b;
  }
  .assistant-intro > small {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--overview-muted);
  }
  .assistant-intro > small svg {
    width: 12px;
    height: 12px;
  }
  .assistant-summary {
    padding: 22px;
    min-width: 0;
  }
  .assistant-summary-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
  }
  .assistant-summary-heading > span {
    color: var(--overview-muted);
    font-size: 12px;
  }
  .assistant-summary-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-top: 22px;
  }
  .assistant-summary-cards > div {
    min-width: 0;
  }
  .assistant-summary-cards svg {
    color: #838b95;
    width: 17px;
    height: 17px;
    margin-bottom: 8px;
  }
  .assistant-summary-cards span {
    display: block;
    font-size: 12px;
    line-height: 1.5;
  }
  .assistant-summary-cards small {
    display: block;
    color: var(--overview-muted);
    font-size: 11px;
  }
  .assistant-summary-cards b {
    display: block;
    margin-top: 10px;
    font-size: 21px;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 1100px) {
    .overview-assistant-strip {
      grid-template-columns: minmax(0, 1fr);
    }
    .assistant-intro {
      border-right: 0;
      border-bottom: 1px solid var(--overview-line);
    }
  }
  @media (max-width: 520px) {
    gap: 18px;
    .assistant-summary,
    .assistant-intro {
      padding: 18px 16px;
    }
    .assistant-summary-cards {
      gap: 12px;
    }
    .assistant-summary-cards b {
      font-size: 17px;
      overflow-wrap: anywhere;
    }
  }
`;

export const Hero = styled.section`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 28px;
  padding: 5px 0 2px;
  @media (max-width: 1050px) {
    align-items: flex-start;
  }
  @media (max-width: 680px) {
    flex-direction: column;
    gap: 18px;
  }
`;
export const HeroCopy = styled.div`
  min-width: 0;
  flex: 1;
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--overview-muted);
    font-size: 12px;
  }
  .eyebrow svg {
    width: 15px;
    height: 15px;
  }
  h2 {
    font-size: clamp(21px, 2vw, 28px);
    line-height: 1.35;
    letter-spacing: -0.5px;
    margin: 12px 0 8px;
    font-weight: 650;
  }
  p {
    max-width: 650px;
    margin: 0;
    color: var(--overview-muted);
    font-size: 13px;
    line-height: 1.7;
  }
  .hero-buttons {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 20px;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid #dfe3e8;
    border-radius: 9px;
    min-height: 42px;
    padding: 10px 15px;
    background: #fff;
    color: #39424d;
    font-size: 13px;
    font-weight: 600;
  }
  button:hover {
    background: #f1f3f5;
  }
  .primary {
    color: #fff;
    background: var(--overview-accent);
    border-color: var(--overview-accent);
  }
  .primary:hover {
    background: #9e3c10;
  }
  @media (max-width: 520px) {
    .hero-buttons {
      gap: 8px;
    }
    button {
      width: 100%;
      min-height: 44px;
    }
  }
`;
export const HeroAside = styled.aside`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex: 0 0 auto;
  .hero-operating-state {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 600;
  }
  .status-dot {
    width: 7px;
    height: 7px;
    background: #a36b29;
    border-radius: 50%;
  }
  .status-dot.open {
    background: #38805b;
  }
  .daily-count {
    color: var(--overview-muted);
    font-size: 12px;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: none;
    padding: 6px 0;
    background: transparent;
    color: #424b56;
    font-size: 13px;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  button:hover {
    color: var(--overview-accent);
  }
  @media (max-width: 680px) {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    button {
      margin-left: auto;
    }
  }
`;
export const Metrics = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 520px) {
    gap: 10px;
  }
`;
export const Metric = styled.article`
  position: relative;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--overview-line);
  border-radius: 12px;
  background: #fff;
  .metric-icon {
    position: absolute;
    top: 18px;
    right: 17px;
    color: #9aa1a9;
  }
  .metric-copy {
    display: grid;
    gap: 11px;
  }
  small {
    font-size: 13px;
    color: #606975;
    padding-right: 24px;
  }
  strong {
    font-size: clamp(22px, 2.4vw, 30px);
    font-weight: 650;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.8px;
    overflow-wrap: anywhere;
  }
  em {
    font-size: 11px;
    font-style: normal;
    line-height: 1.5;
    color: var(--overview-muted);
  }
  button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    background: transparent;
    width: fit-content;
    color: var(--overview-accent);
    font-size: 12px;
    font-weight: 600;
  }
  button svg {
    width: 13px;
    height: 13px;
  }
  button:hover {
    text-decoration: underline;
  }
  @media (max-width: 520px) {
    padding: 16px 13px;
    .metric-icon {
      display: none;
    }
    small {
      font-size: 12px;
      padding-right: 0;
    }
    strong {
      font-size: 23px;
    }
  }
`;
export const QuickAccess = styled.section`
  min-width: 0;
  .routines-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }
  h2 {
    font-size: 18px;
    margin: 0 0 5px;
    font-weight: 650;
  }
  p {
    font-size: 13px;
    margin: 0;
    color: var(--overview-muted);
    line-height: 1.5;
  }
  .all-settings {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 0;
    border: none;
    background: transparent;
    font-size: 12px;
    color: var(--overview-accent);
    font-weight: 600;
  }
  .routine-links {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .routine-links > button {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--overview-line);
    border-radius: 10px;
    background: #fff;
    text-align: left;
    min-width: 0;
    color: #555e68;
  }
  .routine-links > button:hover {
    border-color: #edc4aa;
    background: #fffcf9;
  }
  .routine-links > button > svg:first-child {
    width: 20px;
    height: 20px;
  }
  .routine-links span {
    min-width: 0;
  }
  strong {
    display: block;
    font-size: 13px;
    color: #303740;
    font-weight: 600;
  }
  small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--overview-muted);
  }
  .routine-arrow {
    width: 15px;
    height: 15px;
    margin-left: auto;
    color: #9ca3ab;
  }
  @media (max-width: 1050px) {
    .routine-links {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 480px) {
    .routine-links {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;
export const AdminGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr);
  align-items: start;
  gap: 20px;
  @media (max-width: 1180px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
export const Panel = styled.section`
  min-width: 0;
  border: 1px solid var(--overview-line);
  border-radius: 14px;
  background: #fff;
  > [role='alert'] {
    margin: 12px 20px;
    font-size: 13px;
    color: #a33727;
  }
`;
export const PanelHeader = styled.header`
  padding: 22px 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  > div {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .section-icon {
    color: #68717d;
  }
  small {
    display: block;
    color: var(--overview-muted);
    font-size: 11px;
    margin-bottom: 3px;
  }
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }
  button {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    border: 0;
    padding: 8px 0;
    background: transparent;
    color: var(--overview-accent);
    font-size: 12px;
    font-weight: 600;
  }
  button svg {
    width: 14px;
    height: 14px;
  }
  button:hover {
    text-decoration: underline;
  }
`;
export const PanelDescription = styled.p`
  margin: 13px 20px 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--overview-muted);
`;
export const CatalogHealth = styled.div`
  margin: 18px 20px 0;
  > div:first-child {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: var(--overview-muted);
  }
  strong {
    font-weight: 650;
    color: #424b56;
  }
  > small {
    display: block;
    color: var(--overview-muted);
    margin-top: 8px;
    font-size: 11px;
  }
`;
export const HealthTrack = styled.div`
  margin-top: 12px;
  height: 5px;
  border-radius: 4px;
  background: #edf0f2;
  overflow: hidden;
  > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #5c8e70;
  }
`;
export const OverviewFilters = styled.div`
  display: flex;
  gap: 8px;
  margin: 18px 20px 10px;
  label {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 7px;
    border: 1px solid var(--overview-line);
    border-radius: 8px;
    padding: 0 10px;
    background: #fff;
  }
  label:focus-within {
    border-color: #b94a17;
  }
  label > svg {
    color: #89929c;
    width: 15px;
    height: 15px;
  }
  input,
  select {
    width: 100%;
    min-width: 0;
    min-height: 40px;
    border: none;
    color: #444d58;
    background: transparent;
    font-size: 12px;
  }
  input::placeholder {
    color: #7a838d;
  }
  .select-field {
    flex: 0 1 155px;
  }
  select {
    appearance: none;
    padding-right: 17px;
  }
  .select-field > svg {
    position: absolute;
    right: 10px;
    pointer-events: none;
  }
  @media (max-width: 420px) {
    flex-direction: column;
    .select-field {
      flex-basis: auto;
    }
  }
`;
export const DataList = styled.div`
  padding: 0 20px;
  .data-row {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 16px 0;
    border-bottom: 1px solid #eef0f2;
  }
  .data-row:last-child {
    border-bottom: none;
  }
  .order-mark,
  .product-placeholder {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    color: #8a929b;
    background: #f5f6f8;
  }
  .product-row img {
    width: 36px;
    height: 36px;
    object-fit: cover;
    border-radius: 8px;
  }
  .row-copy {
    min-width: 0;
  }
  .row-copy b {
    display: block;
    font-size: 12px;
    font-weight: 600;
    overflow-wrap: anywhere;
    line-height: 1.5;
  }
  .row-copy b > span {
    color: #c3c8ce;
  }
  .row-copy small {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: var(--overview-muted);
    line-height: 1.5;
  }
  .row-result {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .row-result > strong {
    font-size: 12px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .row-actions {
    grid-column: 2 / -1;
    display: flex;
    justify-content: flex-end;
  }
  .row-actions button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #946056;
    background: #fff;
    border: 1px solid #eee3e0;
    border-radius: 6px;
    min-height: 30px;
    padding: 5px 8px;
    font-size: 11px;
  }
  .row-actions button:hover {
    background: #fff6f3;
  }
  .row-actions svg {
    width: 12px;
    height: 12px;
  }
  @media (max-width: 380px) {
    .data-row {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .order-mark,
    .product-placeholder,
    .product-row img {
      display: none;
    }
    .row-actions {
      grid-column: 1 / -1;
    }
  }
`;
const badgeTones = {
  warning: ['#93611b', '#fff5df'],
  info: ['#3b6596', '#edf3fa'],
  success: ['#387351', '#edf6f0'],
  danger: ['#a44137', '#fdf0ee'],
  neutral: ['#68717d', '#f1f3f5'],
};
export const StatusBadge = styled.span<{ $tone: StatusTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 7px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  color: ${({ $tone }) => badgeTones[$tone][0]};
  background: ${({ $tone }) => badgeTones[$tone][1]};
`;
export const OverviewEmpty = styled.div`
  padding: 32px 16px;
  display: grid;
  justify-items: center;
  text-align: center;
  > span {
    color: #9aa2ab;
    margin-bottom: 10px;
  }
  strong {
    font-size: 14px;
    font-weight: 600;
  }
  p {
    max-width: 320px;
    margin: 8px 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--overview-muted);
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 6px;
    border: 1px solid var(--overview-line);
    padding: 9px 12px;
    background: #fff;
    border-radius: 7px;
    font-size: 12px;
    color: var(--overview-accent);
  }
`;
export const OverviewPagination = styled.footer`
  padding: 14px 20px;
  border-top: 1px solid #edf0f2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  > span {
    color: var(--overview-muted);
    font-size: 11px;
  }
  > div {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid var(--overview-line);
    border-radius: 7px;
    min-height: 36px;
    padding: 8px 10px;
    background: #fff;
    color: #545e69;
    font-size: 11px;
  }
  button:hover {
    background: #f6f7f9;
  }
  button svg {
    width: 12px;
    height: 12px;
  }
`;
export const BottomInsight = styled.section`
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--overview-line);
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  > span {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 10px;
    background: #fff8f2;
    color: var(--overview-accent);
  }
  > div {
    flex: 1;
    min-width: 0;
  }
  small {
    display: block;
    font-size: 11px;
    color: var(--overview-muted);
    margin-bottom: 5px;
  }
  strong {
    display: block;
    font-size: 14px;
    font-weight: 650;
  }
  p {
    margin: 5px 0 0;
    color: var(--overview-muted);
    font-size: 12px;
    line-height: 1.6;
  }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 10px 12px;
    border: 1px solid var(--overview-line);
    border-radius: 8px;
    background: #fff;
    font-size: 12px;
    color: var(--overview-accent);
  }
  button svg {
    width: 14px;
    height: 14px;
  }
  @media (max-width: 680px) {
    flex-wrap: wrap;
    button {
      width: 100%;
    }
  }
`;
