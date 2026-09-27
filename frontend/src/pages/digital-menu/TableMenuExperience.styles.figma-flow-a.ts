import styled from 'styled-components';

export const FlowPage = styled.section`
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 48px 80px 64px;

  @media (max-width: 1100px) and (min-width: 760px) {
    padding-inline: 40px;
  }

  @media (max-width: 759px) {
    padding: 20px;
  }

  @media (max-width: 359px) {
    padding-inline: 14px;
  }
`;

export const FlowTitle = styled.header`
  margin-bottom: 24px;

  h1 {
    margin: 0;
    color: var(--text);
    font-size: 32px;
    line-height: 40px;
    font-weight: 500;
    letter-spacing: -0.4px;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 20px;
  }

  @media (max-width: 759px) {
    margin-bottom: 16px;

    h1 {
      font-size: 24px;
      line-height: 30px;
    }

    p {
      font-size: 12px;
    }

    &.cart-title p {
      display: none;
    }
  }
`;

export const CartDesktopLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 48px;
  align-items: start;

  > div:last-child {
    display: grid;
    gap: 14px;
  }

  .cart-summary-column > h2 {
    margin: 0;
    color: var(--text);
    font-size: 24px;
    line-height: 30px;
    font-weight: 400;
  }

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const FlowCard = styled.section`
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;
`;

export const CartLines = styled.div`
  display: grid;
  gap: 16px;
`;

export const CartLine = styled.article<{ $hasImage?: boolean }>`
  min-height: 96px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  display: grid;
  grid-template-columns: ${({ $hasImage }) =>
    $hasImage ? '64px minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto'};
  gap: 16px;
  align-items: center;

  .image {
    width: 64px;
    height: 64px;
    overflow: hidden;
    border-radius: 12px;
    background: var(--background);
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .info b {
    color: var(--text);
    font-size: 15px;
    line-height: 19px;
    font-weight: 700;
  }

  .info small {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 11px;
    line-height: 15px;
  }

  .side {
    display: grid;
    justify-items: end;
    gap: 8px;
  }

  .price {
    color: var(--text);
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    white-space: nowrap;
  }

  @media (max-width: 759px) {
    min-height: 80px;
    padding: 12px;
    grid-template-columns: ${({ $hasImage }) =>
      $hasImage ? '56px minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto'};
    gap: 12px;

    .image {
      width: 56px;
      height: 56px;
    }

    .info b {
      font-size: 14px;
    }

    .info small {
      font-size: 11px;
    }

    .price {
      font-size: 13px;
    }
  }
`;

export const QuantityControl = styled.div`
  width: max-content;
  padding: 8px;
  border-radius: 999px;
  background: var(--background);
  display: inline-grid;
  grid-template-columns: 10px 12px 10px;
  gap: 16px;
  align-items: center;

  button {
    width: 10px;
    height: 10px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text);
    display: grid;
    place-items: center;
  }

  span {
    display: grid;
    place-items: center;
    color: var(--text);
    font-size: 12px;
    font-weight: 700;
  }

  @media (max-width: 759px) {
    padding: 6px;
    gap: 12px;
  }
`;

export const AddMoreButton = styled.button`
  width: 100%;
  min-height: 48px;
  margin-top: 16px;
  border: 1px dashed var(--primary);
  border-radius: 14px;
  background: transparent;
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
`;

export const CouponRow = styled.div`
  width: 100%;
  min-height: 50px;
  padding: 10px 12px 10px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;

  input {
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font-size: 13px;
  }

  input::placeholder {
    color: var(--muted);
    opacity: 1;
  }

  button {
    min-width: 68px;
    min-height: 30px;
    padding: 0 14px;
    border: 0;
    border-radius: 8px;
    background: var(--text);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }

  button:disabled {
    opacity: 0.45;
  }
`;

export const SummaryCard = styled(FlowCard)`
  padding: 24px;
  display: grid;
  gap: 16px;

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    color: var(--muted);
    font-size: 13px;
  }

  .row strong {
    color: var(--text);
    font-weight: 500;
  }

  .divider {
    height: 1px;
    background: var(--line);
  }

  .total {
    color: var(--text);
    font-size: 18px;
    font-weight: 700;
  }

  .total strong {
    color: var(--primary);
    font-size: 24px;
    font-weight: 700;
  }

  .discount,
  .discount strong {
    color: #10b981;
  }

  @media (max-width: 759px) {
    padding: 16px;
    border-radius: 18px;

    .row {
      font-size: 13px;
    }

    .total {
      font-size: 16px;
    }

    .total strong {
      font-size: 21px;
    }
  }
`;

export const PrimaryAction = styled.button`
  width: 100%;
  min-height: 52px;
  padding: 10px 18px;
  border: 0;
  border-radius: 16px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 6px color-mix(in srgb, var(--primary) 13%, transparent);
  font-size: 15px;
  font-weight: 700;

  .action-copy {
    display: grid;
    justify-items: center;
    gap: 2px;
  }

  .action-copy b {
    font-size: 15px;
    line-height: 19px;
  }

  .action-copy small {
    color: rgba(255, 255, 255, 0.87);
    font-size: 10px;
    line-height: 13px;
    font-weight: 400;
  }

  &:disabled {
    opacity: 0.5;
  }

  @media (max-width: 759px) {
    min-height: 48px;
    font-size: 14px;
  }
`;

export const SecondaryAction = styled.button`
  width: 100%;
  min-height: 50px;
  padding: 0 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;

  &:disabled {
    opacity: 0.5;
  }
`;

export const HelperText = styled.p`
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 16px;
  text-align: center;
`;

export const ConfirmationCard = styled(FlowCard)`
  width: min(640px, 100%);
  margin: 16px auto 0;
  padding: 48px;
  display: grid;
  gap: 24px;
  box-shadow: 0 12px 16px rgba(0, 0, 0, 0.04);

  @media (max-width: 759px) {
    width: calc(100% + 40px);
    margin: -20px -20px 0;
    padding: 24px;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    gap: 20px;
  }

  @media (max-width: 359px) {
    width: calc(100% + 28px);
    margin-inline: -14px;
    padding-inline: 14px;
  }
`;

export const SuccessHero = styled.section`
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 8px;

  .ring {
    width: 96px;
    height: 96px;
    border-radius: 48px;
    background: #ecfdf5;
    display: grid;
    place-items: center;
  }

  .check {
    width: 56px;
    height: 56px;
    border-radius: 28px;
    background: #10b981;
    color: #fff;
    display: grid;
    place-items: center;
  }

  h1 {
    margin: 10px 0 0;
    color: var(--text);
    font-size: 36px;
    line-height: 42px;
    font-weight: 500;
  }

  p {
    max-width: 520px;
    margin: 0;
    color: var(--muted);
    font-size: 15px;
    line-height: 21px;
  }

  @media (max-width: 759px) {
    .ring {
      width: 80px;
      height: 80px;
    }

    .check {
      width: 48px;
      height: 48px;
    }

    h1 {
      margin-top: 6px;
      font-size: 28px;
      line-height: 34px;
    }

    p {
      max-width: 300px;
      font-size: 13px;
      line-height: 18px;
    }
  }
`;

export const OrderSummaryBar = styled(FlowCard)`
  min-height: 56px;
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--background);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  .label {
    display: grid;
    gap: 2px;
  }

  small {
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    color: var(--text);
    font-size: 13px;
  }

  .amount {
    color: var(--text);
    font-size: 16px;
    font-weight: 500;
  }

  @media (max-width: 759px) {
    background: #fff;

    strong {
      display: none;
    }

    .amount {
      font-size: 14px;
    }
  }
`;

export const TimelineCard = styled(FlowCard)`
  padding: 24px;
  border-radius: 18px;

  &.confirmation-timeline {
    padding: 20px;
  }

  @media (max-width: 759px) {
    padding: 16px;

    &.confirmation-timeline {
      padding: 20px;
    }
  }
`;

export const Timeline = styled.div`
  display: grid;
  gap: 24px;

  .confirmation-timeline & {
    gap: 20px;
  }

  @media (max-width: 759px) {
    gap: 16px;

    .confirmation-timeline & {
      gap: 16px;
    }
  }
`;

export const TimelineStep = styled.div<{ $active: boolean; $current?: boolean }>`
  min-height: 28px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  opacity: ${({ $active, $current }) => ($active || $current ? 1 : 0.4)};

  .dot {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 14px;
    background: ${({ $active, $current }) =>
      $current
        ? 'color-mix(in srgb, var(--primary) 10%, #fff)'
        : $active
          ? '#ecfdf5'
          : 'var(--line)'};
    color: ${({ $active, $current }) =>
      $current ? 'var(--primary)' : $active ? '#10b981' : 'var(--muted)'};
    display: grid;
    place-items: center;
    font-size: 10px;
    font-weight: 700;
  }

  .copy {
    padding-top: 2px;
    display: grid;
    gap: 2px;
  }

  b {
    color: ${({ $current }) => ($current ? 'var(--primary)' : 'var(--text)')};
    font-size: 14px;
    line-height: 18px;
    font-weight: ${({ $current }) => ($current ? 700 : 500)};
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 16px;
  }

  @media (max-width: 759px) {
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 12px;
    min-height: 24px;

    .dot {
      width: 24px;
      height: 24px;
    }

    b {
      font-size: 13px;
      line-height: 16px;
    }

    p {
      font-size: 11px;
      line-height: 14px;
    }
  }
`;

export const ConfirmationActions = styled.div`
  width: 100%;
  display: grid;
  gap: 10px;
`;

export const TrackingLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 792px) 440px;
  gap: 48px;
  align-items: start;

  .tracking-main {
    display: grid;
    gap: 24px;
  }

  .tracking-title {
    margin: 0 0 8px;
  }

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  @media (max-width: 759px) {
    gap: 20px;

    .tracking-main {
      gap: 16px;
    }

    .tracking-title {
      display: none;
    }
  }
`;

export const StatusCard = styled(FlowCard)`
  padding: 20px;
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, #fff);
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 10px;
  align-items: start;

  .icon {
    width: 10px;
    height: 10px;
    margin-top: 5px;
    border-radius: 5px;
    background: var(--primary);
    color: transparent;
  }

  h2 {
    margin: 0 0 8px;
    color: var(--primary);
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--text);
    font-size: 14px;
    line-height: 20px;
  }

  .icon svg {
    display: none;
  }
`;

export const OrderItemsCard = styled(FlowCard)`
  padding: 24px;
  display: grid;
  gap: 16px;

  h2 {
    margin: 0 0 4px;
    color: var(--text);
    font-size: 32px;
    line-height: 40px;
    font-weight: 500;
  }

  .account-total {
    padding-top: 16px;
    border-top: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .account-total span {
    color: var(--muted);
    font-size: 15px;
  }

  .account-total strong {
    color: var(--primary);
    font-size: 18px;
    font-weight: 500;
  }

  @media (max-width: 759px) {
    padding: 0;
    border: 0;
    background: transparent;
    gap: 8px;

    h2 {
      font-size: 20px;
      line-height: 25px;
    }

    .account-total {
      display: none;
    }
  }
`;

export const OrderItemLine = styled.article`
  min-height: 48px;
  padding: 12px;
  border: 0;
  border-radius: 12px;
  background: var(--background);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;

  .copy {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  b {
    color: var(--text);
    font-size: 14px;
    font-weight: 500;
  }

  small {
    color: var(--muted);
    font-size: 11px;
  }

  strong {
    color: var(--text);
    font-size: 14px;
    white-space: nowrap;
  }

  @media (max-width: 759px) {
    background: #fff;
  }
`;
