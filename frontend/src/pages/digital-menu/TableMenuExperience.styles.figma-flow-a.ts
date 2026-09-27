import styled from 'styled-components';

export const FlowPage = styled.section`
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 42px 52px 72px;

  @media (max-width: 759px) {
    padding: 6px 20px 44px;
  }

  @media (max-width: 359px) {
    padding-inline: 14px;
  }
`;

export const FlowTitle = styled.header`
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: clamp(28px, 3.2vw, 44px);
    line-height: 1.05;
    letter-spacing: -0.03em;
    font-weight: 900;
  }

  p {
    max-width: 720px;
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.45;
  }

  @media (max-width: 759px) {
    margin: 4px 0 16px;

    h1 {
      font-size: 22px;
    }

    p {
      margin-top: 5px;
      font-size: 10px;
    }
  }
`;

export const CartDesktopLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 820px) minmax(320px, 1fr);
  gap: 42px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const FlowCard = styled.section`
  border: 1px solid #e8e9ec;
  border-radius: 18px;
  background: #fff;
`;

export const CartLines = styled.div`
  display: grid;
  gap: 8px;
`;

export const CartLine = styled.article<{ $hasImage?: boolean }>`
  min-height: 86px;
  padding: 10px 12px;
  border: 1px solid #ececf0;
  border-radius: 12px;
  background: #fff;
  display: grid;
  grid-template-columns: ${({ $hasImage }) => ($hasImage ? 'auto minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto')};
  gap: 12px;
  align-items: center;

  .image {
    width: 66px;
    height: 66px;
    overflow: hidden;
    border-radius: 10px;
    background: var(--soft);
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .info b {
    font-size: 14px;
  }

  .info small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.35;
  }

  .side {
    display: grid;
    justify-items: end;
    gap: 8px;
  }

  .price {
    font-size: 13px;
    font-weight: 850;
    white-space: nowrap;
  }

  .remove {
    padding: 0;
    border: 0;
    background: transparent;
    color: #97979e;
  }

  @media (max-width: 759px) {
    min-height: 76px;
    padding: 10px;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;

    .image {
      width: 56px;
      height: 56px;
      border-radius: 9px;
    }

    .info b {
      font-size: 11px;
    }

    .info small {
      font-size: 8px;
    }

    .price {
      font-size: 10px;
    }
  }
`;

export const QuantityControl = styled.div`
  width: max-content;
  display: inline-grid;
  grid-template-columns: 26px 24px 26px;
  border: 1px solid #e2e3e6;
  border-radius: 8px;
  overflow: hidden;

  button {
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    background: #fff;
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  span {
    display: grid;
    place-items: center;
    font-size: 9px;
    font-weight: 850;
  }
`;

export const AddMoreButton = styled.button`
  width: 100%;
  min-height: 46px;
  margin-top: 18px;
  border: 1px solid #e2e3e6;
  border-radius: 11px;
  background: #fff;
  color: var(--primary);
  font-size: 12px;
  font-weight: 850;
`;

export const SummaryCard = styled(FlowCard)`
  padding: 20px;
  display: grid;
  gap: 12px;

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    color: #5f616a;
    font-size: 13px;
  }

  .row strong {
    color: #161616;
  }

  .divider {
    height: 1px;
    background: #ececf0;
  }

  .total {
    color: #111;
    font-size: 16px;
    font-weight: 850;
  }

  .total strong {
    color: var(--primary);
    font-size: 23px;
  }

  @media (max-width: 759px) {
    padding: 16px;
    border-radius: 13px;

    .row {
      font-size: 10px;
    }

    .total {
      font-size: 12px;
    }

    .total strong {
      font-size: 18px;
    }
  }
`;

export const PrimaryAction = styled.button`
  width: 100%;
  min-height: 52px;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 900;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }

  @media (max-width: 759px) {
    min-height: 54px;
    font-size: 12px;
  }
`;

export const SecondaryAction = styled.button`
  width: 100%;
  min-height: 52px;
  padding: 0 18px;
  border: 1px solid #dfe0e4;
  border-radius: 12px;
  background: #fff;
  color: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 850;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }
`;

export const HelperText = styled.p`
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
`;

export const SuccessHero = styled.section`
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 10px;
  padding: 10px 0 22px;

  .ring {
    width: 112px;
    height: 112px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary) 7%, #fff);
    display: grid;
    place-items: center;
  }

  .check {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: #25ad53;
    color: #fff;
    display: grid;
    place-items: center;
  }

  h1 {
    margin: 2px 0 0;
    font-size: 28px;
    font-weight: 900;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  @media (max-width: 759px) {
    padding-top: 12px;

    .ring {
      width: 100px;
      height: 100px;
    }

    .check {
      width: 50px;
      height: 50px;
    }

    h1 {
      font-size: 22px;
    }

    p {
      max-width: 310px;
      font-size: 10px;
    }
  }
`;

export const OrderSummaryBar = styled(FlowCard)`
  min-height: 72px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  .label {
    display: grid;
    gap: 4px;
  }

  small {
    color: var(--muted);
    font-size: 11px;
  }

  strong {
    font-size: 21px;
  }

  .amount {
    color: var(--primary);
    font-size: 22px;
    font-weight: 900;
  }

  @media (max-width: 759px) {
    min-height: 58px;
    padding: 12px 16px;
    border-radius: 12px;

    small {
      font-size: 9px;
    }

    strong {
      font-size: 12px;
    }

    .amount {
      font-size: 16px;
    }
  }
`;

export const TimelineCard = styled(FlowCard)`
  padding: 20px;

  @media (max-width: 759px) {
    padding: 16px;
    border-radius: 13px;
  }
`;

export const Timeline = styled.div`
  display: grid;
`;

export const TimelineStep = styled.div<{ $active: boolean; $current?: boolean }>`
  position: relative;
  min-height: 64px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 14px;
  align-items: start;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 16px;
    top: 34px;
    width: 2px;
    height: 31px;
    background: ${({ $active }) => ($active ? 'var(--primary)' : '#e2e3e6')};
  }

  .dot {
    position: relative;
    z-index: 1;
    width: 34px;
    height: 34px;
    border: 2px solid ${({ $active }) => ($active ? 'var(--primary)' : '#dfe0e4')};
    border-radius: 50%;
    background: ${({ $active }) => ($active ? 'var(--primary)' : '#fff')};
    color: ${({ $active }) => ($active ? '#fff' : '#999ba3')};
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 900;
  }

  .copy {
    padding-top: 4px;
    display: grid;
    gap: 4px;
  }

  b {
    color: ${({ $active }) => ($active ? '#171717' : '#8d8f97')};
    font-size: 14px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.35;
  }

  @media (max-width: 759px) {
    min-height: 44px;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 12px;

    &:not(:last-child)::after {
      left: 11px;
      top: 24px;
      height: 21px;
    }

    .dot {
      width: 24px;
      height: 24px;
      border-width: 1.5px;
      font-size: 8px;
    }

    .copy {
      padding-top: 1px;
    }

    b {
      font-size: 10px;
    }

    p {
      font-size: 8px;
    }
  }
`;

export const ConfirmationActions = styled.div`
  width: min(620px, 100%);
  margin: 28px auto 0;
  display: grid;
  gap: 12px;

  @media (max-width: 759px) {
    margin-top: 18px;
  }
`;

export const TrackingLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 680px) minmax(0, 604px);
  gap: 52px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const StatusCard = styled(FlowCard)`
  min-height: 152px;
  padding: 24px;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 18px;
  align-items: center;

  .icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--primary) 8%, #fff);
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  h2 {
    margin: 0 0 6px;
    font-size: 24px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  @media (max-width: 759px) {
    min-height: 114px;
    padding: 18px;
    grid-template-columns: 54px minmax(0, 1fr);
    gap: 16px;
    border-radius: 14px;

    .icon {
      width: 54px;
      height: 54px;
      border-radius: 14px;
    }

    h2 {
      font-size: 18px;
    }

    p {
      font-size: 10px;
    }
  }
`;

export const OrderItemsCard = styled(FlowCard)`
  padding: 28px;

  h2 {
    margin: 0 0 20px;
    font-size: 24px;
  }

  @media (max-width: 759px) {
    padding: 16px;
    border-radius: 14px;

    h2 {
      margin-bottom: 10px;
      font-size: 18px;
    }
  }
`;

export const OrderItemLine = styled.article`
  min-height: 86px;
  padding: 12px;
  border: 1px solid #ececf0;
  border-radius: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-items: center;

  & + & {
    margin-top: 12px;
  }

  .image {
    width: 62px;
    height: 62px;
    overflow: hidden;
    border-radius: 10px;
    background: var(--soft);
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  b {
    font-size: 14px;
  }

  small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.35;
  }

  strong {
    font-size: 13px;
    white-space: nowrap;
  }

  @media (max-width: 759px) {
    min-height: 76px;
    padding: 10px;
    gap: 10px;

    .image {
      width: 56px;
      height: 56px;
    }

    b {
      font-size: 11px;
    }

    small {
      font-size: 8px;
    }

    strong {
      font-size: 10px;
    }
  }
`;

