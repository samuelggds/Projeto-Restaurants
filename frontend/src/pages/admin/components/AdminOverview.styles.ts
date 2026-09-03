import styled from 'styled-components';

type StatusTone = 'warning' | 'info' | 'success' | 'danger' | 'neutral';

export const OverviewRoot = styled.div`
  display: grid;
  gap: 20px;

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
`;

export const Hero = styled.section`
  position: relative;
  min-height: 226px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 30px;
  color: #fff;
  background:
    radial-gradient(
      circle at 88% 18%,
      color-mix(in srgb, var(--a) 42%, transparent),
      transparent 32%
    ),
    linear-gradient(118deg, #142722 0%, #17342c 52%, #54362b 100%);
  box-shadow: 0 24px 58px rgba(27, 38, 33, 0.16);
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(250px, 0.6fr);
  gap: 32px;
  isolation: isolate;

  &::before,
  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 50%;
  }

  &::before {
    width: 270px;
    height: 270px;
    right: -78px;
    bottom: -178px;
  }

  &::after {
    width: 180px;
    height: 180px;
    right: -30px;
    bottom: -136px;
  }

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  @media (max-width: 560px) {
    min-height: 0;
    padding: 23px 20px;
    border-radius: 8px;
  }
`;

export const HeroCopy = styled.div`
  align-self: center;

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #ff9a68;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .eyebrow svg {
    width: 15px;
    height: 15px;
  }

  h2 {
    max-width: 620px;
    margin: 12px 0 0;
    font-size: clamp(27px, 3vw, 39px);
    line-height: 1.04;
    letter-spacing: 0;
  }

  p {
    max-width: 650px;
    margin: 12px 0 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.55;
  }

  .hero-status {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 23px;
  }

  .hero-status span {
    min-height: 31px;
    padding: 0 11px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.83);
    background: rgba(255, 255, 255, 0.06);
    font-size: 10px;
    font-weight: 700;
  }

  .hero-status svg {
    width: 13px;
    height: 13px;
    color: #ff9664;
  }

  @media (max-width: 480px) {
    h2 {
      font-size: 28px;
    }

    p {
      font-size: 13px;
    }
  }
`;

export const HeroAside = styled.aside`
  min-width: 0;
  align-self: stretch;
  padding-left: 27px;
  border-left: 1px solid rgba(255, 255, 255, 0.13);
  display: flex;
  flex-direction: column;
  justify-content: center;

  > small {
    color: rgba(255, 255, 255, 0.55);
    font-size: 10px;
    font-weight: 700;
    text-transform: capitalize;
  }

  > strong {
    margin-top: 6px;
    overflow: hidden;
    color: #fff;
    font-size: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > div {
    display: grid;
    gap: 8px;
    margin-top: 20px;
  }

  button {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 11px;
    color: #fff;
    background: rgba(255, 255, 255, 0.07);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 750;
    transition:
      background 160ms ease,
      border-color 160ms ease,
      transform 160ms ease;
  }

  button.primary {
    border-color: var(--a);
    background: var(--a);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--a) 30%, transparent);
  }

  button:hover {
    border-color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.13);
    transform: translateY(-1px);
  }

  button.primary:hover {
    border-color: color-mix(in srgb, var(--a) 82%, #fff);
    background: color-mix(in srgb, var(--a) 88%, #251812);
  }

  button svg {
    width: 15px;
    height: 15px;
  }

  @media (max-width: 820px) {
    padding: 20px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.13);
    border-left: 0;

    > div {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 420px) {
    > div {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }

    button:hover {
      transform: none;
    }
  }
`;

export const Metrics = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 460px) {
    gap: 9px;
  }
`;

export const Metric = styled.article`
  min-width: 0;
  min-height: 126px;
  border: 1px solid #e5dfd8;
  border-radius: 8px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 9px 25px rgba(48, 35, 25, 0.045);
  display: flex;
  align-items: flex-start;
  gap: 13px;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--a) 25%, #e5dfd8);
    box-shadow: 0 13px 31px rgba(48, 35, 25, 0.075);
    transform: translateY(-2px);
  }

  .metric-icon {
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    border-radius: 8px;
    display: grid;
    place-items: center;
  }

  .metric-icon svg {
    width: 20px;
    height: 20px;
  }

  .metric-icon.sales {
    color: #1d754b;
    background: #eaf7ef;
  }

  .metric-icon.orders {
    color: #c94d17;
    background: #fff0e8;
  }

  .metric-icon.ticket {
    color: #9b6713;
    background: #fff6df;
  }

  .metric-icon.customers {
    color: #3d659b;
    background: #edf4ff;
  }

  .metric-copy {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .metric-copy > small {
    color: #766f69;
    font-size: 11px;
    font-weight: 700;
  }

  .metric-copy > strong {
    overflow: hidden;
    color: #211f1c;
    font-size: clamp(21px, 2vw, 27px);
    line-height: 1.05;
    letter-spacing: -0.035em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .metric-copy > em,
  .metric-copy > button {
    color: #8b837d;
    font-size: 10px;
    font-style: normal;
    line-height: 1.35;
  }

  .metric-copy > button {
    width: max-content;
    padding: 0;
    border: 0;
    color: color-mix(in srgb, var(--a) 88%, #30261f);
    background: transparent;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 800;
  }

  .metric-copy > button svg {
    width: 12px;
    height: 12px;
  }

  @media (max-width: 560px) {
    min-height: 116px;
    padding: 14px;
    gap: 10px;

    .metric-icon {
      flex-basis: 36px;
      width: 36px;
      height: 36px;
      border-radius: 8px;
    }

    .metric-icon svg {
      width: 18px;
      height: 18px;
    }

    .metric-copy > strong {
      font-size: 20px;
    }
  }

  @media (max-width: 370px) {
    display: grid;

    .metric-icon {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export const AdminGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.28fr) minmax(360px, 0.72fr);
  align-items: start;
  gap: 16px;

  @media (max-width: 1040px) {
    grid-template-columns: 1fr;
  }
`;

export const Panel = styled.section`
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e5dfd8;
  border-radius: 8px;
  padding: 22px;
  background: #fff;
  box-shadow: 0 12px 34px rgba(48, 35, 25, 0.055);

  @media (max-width: 560px) {
    padding: 17px 14px;
    border-radius: 8px;
  }
`;

export const PanelHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .section-icon {
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    border-radius: 8px;
    display: grid;
    place-items: center;
  }

  .section-icon.orders {
    color: #cc501b;
    background: #fff0e8;
  }

  .section-icon.catalog {
    color: #176d5d;
    background: #eaf5f1;
  }

  .section-icon svg {
    width: 20px;
    height: 20px;
  }

  h2 {
    margin: 2px 0 0;
    color: #24211e;
    font-size: 20px;
    letter-spacing: 0;
  }

  small {
    color: #928981;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  > button {
    min-height: 40px;
    padding: 0 12px;
    border: 0;
    border-radius: 10px;
    color: color-mix(in srgb, var(--a) 86%, #2d211b);
    background: color-mix(in srgb, var(--a) 7%, #fff);
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 800;
  }

  > button:hover {
    background: color-mix(in srgb, var(--a) 12%, #fff);
  }

  > button svg {
    width: 13px;
    height: 13px;
  }
`;

export const PanelDescription = styled.p`
  margin: 12px 0 0;
  color: #7b746e;
  font-size: 12px;
  line-height: 1.5;
`;

export const CatalogHealth = styled.div`
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #e1e8e4;
  border-radius: 8px;
  background: #f7faf8;

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #6e7873;
    font-size: 10px;
  }

  > div strong {
    color: #27312d;
    font-size: 13px;
  }

  > small {
    display: block;
    margin-top: 7px;
    color: #79837e;
    font-size: 9px;
  }
`;

export const HealthTrack = styled.div`
  height: 7px;
  overflow: hidden;
  margin-top: 12px;
  border-radius: 999px;
  background: #e3e9e6;

  > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #23815a, #48a874);
    transition: width 260ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    > span {
      transition: none;
    }
  }
`;

export const OverviewFilters = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 158px;
  gap: 8px;
  margin: 18px 0 4px;

  label {
    position: relative;
    min-width: 0;
  }

  label > svg:first-of-type {
    position: absolute;
    left: 12px;
    top: 50%;
    width: 16px;
    height: 16px;
    color: #8a817a;
    pointer-events: none;
    transform: translateY(-50%);
  }

  input,
  select {
    width: 100%;
    height: 44px;
    border: 1px solid #e4ddd6;
    border-radius: 11px;
    outline: 0;
    color: #302c28;
    background: #faf9f7;
    font: inherit;
    font-size: 12px;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease;
  }

  input {
    padding: 0 12px 0 37px;
  }

  select {
    appearance: none;
    padding: 0 32px 0 11px;
  }

  input:focus,
  select:focus {
    border-color: color-mix(in srgb, var(--a) 68%, #d5cdc6);
    background: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 11%, transparent);
  }

  .select-field > svg:last-child {
    position: absolute;
    right: 10px;
    top: 50%;
    width: 14px;
    height: 14px;
    color: #756d66;
    pointer-events: none;
    transform: translateY(-50%);
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const DataList = styled.div`
  min-height: 110px;
  display: grid;

  .data-row {
    min-width: 0;
    min-height: 72px;
    border-bottom: 1px solid #eee9e4;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 11px;
    padding: 9px 2px;
  }

  .order-mark,
  .product-placeholder {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
  }

  .order-mark svg,
  .product-placeholder svg {
    width: 18px;
    height: 18px;
  }

  .order-mark.warning {
    color: #9a6512;
    background: #fff5dd;
  }

  .order-mark.info {
    color: #b94a1b;
    background: #fff0e9;
  }

  .order-mark.success {
    color: #24764d;
    background: #eaf7ef;
  }

  .order-mark.danger {
    color: #a73d35;
    background: #fff0ee;
  }

  .order-mark.neutral,
  .product-placeholder {
    color: #706a65;
    background: #f2f0ed;
  }

  .product-row img {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    object-fit: cover;
    background: #f2efeb;
  }

  .row-copy,
  .row-result {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .row-copy b {
    overflow: hidden;
    color: #2d2925;
    font-size: 12px;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-copy b span {
    color: #b6ada6;
  }

  .row-copy small {
    overflow: hidden;
    color: #847d76;
    font-size: 9px;
    line-height: 1.3;
    text-overflow: ellipsis;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .row-result {
    justify-items: end;
  }

  .row-result > strong {
    color: #292622;
    font-size: 12px;
    white-space: nowrap;
  }

  @media (max-width: 480px) {
    .data-row {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
    }

    .order-mark,
    .product-row > img,
    .product-placeholder {
      display: none;
    }

    .row-copy b,
    .row-result > strong {
      font-size: 11px;
    }
  }
`;

export const StatusBadge = styled.span<{ $tone: StatusTone }>`
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  color: ${({ $tone }) =>
    $tone === 'success'
      ? '#237146'
      : $tone === 'warning'
        ? '#8c5d13'
        : $tone === 'danger'
          ? '#9f3c34'
          : $tone === 'info'
            ? '#ad4519'
            : '#68625d'};
  background: ${({ $tone }) =>
    $tone === 'success'
      ? '#e8f6ed'
      : $tone === 'warning'
        ? '#fff4da'
        : $tone === 'danger'
          ? '#ffefed'
          : $tone === 'info'
            ? '#fff0e8'
            : '#f0eeeb'};
  display: inline-flex;
  align-items: center;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: 0.025em;
  text-transform: uppercase;
`;

export const OverviewEmpty = styled.div`
  min-height: 198px;
  padding: 26px 16px;
  border-bottom: 1px solid #eee9e4;
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;

  > span {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    color: #b64a1b;
    background: #fff0e8;
    display: grid;
    place-items: center;
  }

  > span svg {
    width: 20px;
    height: 20px;
  }

  strong {
    margin-top: 12px;
    color: #302b27;
    font-size: 13px;
  }

  p {
    max-width: 290px;
    margin: 6px 0 0;
    color: #857d76;
    font-size: 10px;
    line-height: 1.45;
  }

  button {
    min-height: 40px;
    margin-top: 13px;
    padding: 0 11px;
    border: 1px solid #e0d8d1;
    border-radius: 9px;
    color: #b3491b;
    background: #fff;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 800;
  }

  button svg {
    width: 12px;
    height: 12px;
  }
`;

export const OverviewPagination = styled.footer`
  min-height: 47px;
  padding-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #88817a;
  font-size: 10px;

  > div {
    display: flex;
    gap: 6px;
  }

  button {
    min-height: 40px;
    padding: 0 9px;
    border: 1px solid #e1d9d2;
    border-radius: 9px;
    color: #ae471b;
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 750;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  button:hover {
    border-color: color-mix(in srgb, var(--a) 48%, #e1d9d2);
    background: color-mix(in srgb, var(--a) 5%, #fff);
    transform: translateY(-1px);
  }

  button svg {
    width: 13px;
    height: 13px;
  }

  @media (max-width: 520px) {
    align-items: flex-start;
    flex-direction: column;

    > div {
      width: 100%;
    }

    button {
      flex: 1;
      min-height: 44px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }

    button:hover {
      transform: none;
    }
  }
`;

export const BottomInsight = styled.section`
  min-height: 94px;
  padding: 18px 20px;
  border: 1px solid #e3ded8;
  border-radius: 8px;
  background: linear-gradient(110deg, #fff 0%, #fffaf6 100%);
  box-shadow: 0 9px 28px rgba(48, 35, 25, 0.045);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;

  > span {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    color: #c04b19;
    background: #fff0e8;
    display: grid;
    place-items: center;
  }

  > span svg {
    width: 20px;
    height: 20px;
  }

  > div {
    min-width: 0;
  }

  small {
    color: #a14925;
    font-size: 8px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 3px;
    color: #292622;
    font-size: 13px;
  }

  p {
    margin: 4px 0 0;
    color: #817a74;
    font-size: 10px;
    line-height: 1.4;
  }

  button {
    min-height: 44px;
    padding: 0 13px;
    border: 1px solid color-mix(in srgb, var(--a) 28%, #e2d9d1);
    border-radius: 10px;
    color: color-mix(in srgb, var(--a) 88%, #2d211b);
    background: #fff;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 800;
  }

  button svg {
    width: 13px;
    height: 13px;
  }

  @media (max-width: 620px) {
    grid-template-columns: auto minmax(0, 1fr);

    button {
      grid-column: 1 / -1;
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 420px) {
    > span {
      display: none;
    }

    grid-template-columns: 1fr;
  }
`;
