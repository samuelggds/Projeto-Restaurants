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

  .cart-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .clear-cart-inline {
    flex: 0 0 auto;
    padding: 4px 0;
    border: 0;
    background: transparent;
    color: #ef4444;
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    cursor: pointer;
    transition:
      color 160ms ease,
      transform 160ms ease;
  }

  .clear-cart-inline:hover {
    color: #dc2626;
  }

  .clear-cart-inline:active {
    transform: scale(.96);
  }

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

    .cart-title-row {
      gap: 12px;
    }

    .clear-cart-inline {
      font-size: 13px;
      line-height: 16px;
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
    gap: 24px;
  }

  .cart-summary-column > h2 {
    margin: 0;
    color: #1a1a2e;
    font-size: 32px;
    line-height: 40px;
    font-weight: 400;
  }

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 16px;
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
  border: 1px solid #eaeae6;
  border-radius: 6px;
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
    border-radius: 6px;
    background: #fafaf8;
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .info b {
    color: #1a1a2e;
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
  }

  .info small {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #6d6d80;
    font-size: 13px;
    line-height: 16px;
  }

  .side {
    display: grid;
    justify-items: end;
    gap: 8px;
  }

  .price {
    color: #1a1a2e;
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
      border-radius: 6px;
    }

    .info b {
      font-size: 14px;
      line-height: 18px;
    }

    .info small {
      font-size: 11px;
      line-height: 14px;
    }

    .price {
      font-size: 13px;
      line-height: 16px;
    }
  }
`;

export const QuantityControl = styled.div`
  display: inline-flex;
  align-items: center;

  && [data-quantity-stepper] {
    width: 73px;
    height: 31px;
    flex: 0 0 73px;
    padding: 0 8px;
    grid-template-columns: 10px minmax(5px, 1fr) 10px;
    gap: 16px;
    border-radius: 8px;
    background: #fafaf8;
    color: #1a1a2e;
  }

  && [data-quantity-stepper] button {
    width: 10px;
    max-width: 10px;
    height: 15px;
    color: #1a1a2e;
  }

  && [data-quantity-stepper] button > span {
    font-size: 14px;
    font-weight: 700;
  }

  && [data-quantity-stepper] > strong {
    color: #1a1a2e;
    font-size: 12px;
    line-height: 15px;
    font-weight: 700;
  }

  @media (max-width: 759px) {
    && [data-quantity-stepper] {
      width: 61px;
      height: 27px;
      flex-basis: 61px;
      padding: 0 6px;
      grid-template-columns: 10px 5px 10px;
      gap: 12px;
      background: #fafaf8;
    }

    && [data-quantity-stepper] button {
      width: 10px;
      max-width: 10px;
      height: 15px;
    }

    && [data-quantity-stepper] button > span {
      font-size: 13px;
    }
  }
`;
export const AddMoreButton = styled.button`
  width: 100%;
  min-height: 50px;
  margin-top: 24px;
  padding: 16px;
  border: 1px dashed #ff4b4b;
  border-radius: 6px;
  background: transparent;
  color: #ff4b4b;
  font-size: 14px;
  line-height: 18px;
  font-weight: 700;

  @media (max-width: 759px) {
    min-height: 44px;
    margin-top: 16px;
    padding: 14px;
    font-size: 13px;
    line-height: 16px;
  }
`;


export const CartSummaryPanel = styled.section`
  width: 100%;
  padding: 24px;
  border: 1px solid #eaeae6;
  border-radius: 8px;
  background: #fff;
  display: grid;
  gap: 20px;

  .submit-block {
    display: grid;
    gap: 12px;
  }

  @media (max-width: 980px) {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    gap: 16px;

    .submit-block {
      gap: 8px;
    }
  }
`;

export const CouponRow = styled.div`
  width: 100%;
  min-height: 51px;
  padding: 10px 12px 10px 14px;
  border: 1px solid #eaeae6;
  border-radius: 6px;
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
    color: #e85a2b;
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
  }

  input::placeholder {
    color: #6d6d80;
    opacity: 1;
  }

  button {
    min-width: 74px;
    min-height: 31px;
    padding: 0 16px;
    border: 0;
    border-radius: 4px;
    background: #1a1a2e;
    color: #fff;
    font-size: 12px;
    line-height: 15px;
    font-weight: 700;
  }

  button:disabled {
    opacity: 0.45;
  }

  @media (max-width: 759px) {
    min-height: 46px;

    input {
      font-size: 13px;
      line-height: 16px;
    }

    button {
      min-width: 66px;
      min-height: 26px;
      padding: 0 14px;
      font-size: 11px;
      line-height: 14px;
    }
  }
`;

export const SummaryCard = styled(FlowCard)`
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  display: grid;
  gap: 12px;

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    color: #6d6d80;
    font-size: 14px;
    line-height: 18px;
  }

  .row strong {
    color: #1a1a2e;
    font-weight: 400;
  }

  .divider {
    height: 1px;
    background: #eaeae6;
  }

  .total {
    color: #1a1a2e;
    font-size: 18px;
    line-height: 23px;
    font-weight: 700;
  }

  .total strong {
    color: #ff4b4b;
    font-size: 22px;
    line-height: 28px;
    font-weight: 400;
  }

  .discount,
  .discount strong {
    color: #10b981;
  }

  @media (max-width: 759px) {
    padding: 16px;
    border: 1px solid #eaeae6;
    border-radius: 6px;
    background: #fff;
    gap: 12px;

    .row {
      font-size: 13px;
      line-height: 16px;
    }

    .total {
      font-size: 16px;
      line-height: 20px;
    }

    .total strong {
      font-size: 20px;
      line-height: 25px;
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

export const CartSubmitAction = styled(PrimaryAction)`
  min-height: 64px;
  padding: 16px 24px;
  border-radius: 6px;
  background: #ff4b4b;
  box-shadow: 0 4px 6px rgba(255, 75, 75, 0.13);

  .action-copy {
    gap: 4px;
  }

  .action-copy b {
    font-size: 16px;
    line-height: 20px;
  }

  .action-copy small {
    font-size: 11px;
    line-height: 14px;
  }

  @media (max-width: 759px) {
    min-height: 62px;
    padding: 14px 16px;

    .action-copy {
      gap: 2px;
    }

    .action-copy b {
      font-size: 15px;
      line-height: 19px;
    }

    .action-copy small {
      font-size: 10px;
      line-height: 13px;
    }
  }
`;

export const CartHelperText = styled.p`
  margin: 0;
  color: #6d6d80;
  font-size: 12px;
  line-height: 15px;
  font-weight: 400;
  text-align: center;

  @media (max-width: 759px) {
    font-size: 11px;
    line-height: 14px;
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
  width: min(560px, 100%);
  margin: 8px auto 0;
  padding: 36px;
  display: grid;
  gap: 16px;
  box-shadow: 0 12px 16px rgba(0, 0, 0, 0.04);
  transform-origin: 50% 18%;
  animation: confirmation-card-enter 460ms cubic-bezier(.22, 1, .36, 1) both;

  @keyframes confirmation-card-enter {
    from {
      opacity: 0;
      transform: translate3d(0, 18px, 0) scale(.985);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @media (max-width: 759px) {
    width: 100%;
    margin: 0;
    padding: 24px 0 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    gap: 20px;
  }

  @media (max-width: 359px) {
    width: 100%;
    margin-inline: 0;
    padding-inline: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const SuccessHero = styled.section`
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 8px;

  > * {
    animation: confirmation-rise 420ms cubic-bezier(.22, 1, .36, 1) both;
  }

  > .ring {
    animation-delay: 90ms;
  }

  > h1 {
    animation-delay: 170ms;
  }

  > p {
    animation-delay: 230ms;
  }

  @keyframes confirmation-rise {
    from {
      opacity: 0;
      transform: translate3d(0, 12px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  .ring {
    width: 72px;
    height: 72px;
    border-radius: 48px;
    background: #ecfdf5;
    display: grid;
    place-items: center;
    position: relative;
  }

  .ring::after {
    content: '';
    position: absolute;
    inset: 9px;
    border-radius: 999px;
    border: 2px solid rgba(16, 185, 129, .22);
    animation: success-ring-pulse 1.35s ease-out 260ms 1 both;
  }

  .check {
    width: 44px;
    height: 44px;
    border-radius: 22px;
    background: #10b981;
    color: #fff;
    display: grid;
    place-items: center;
    animation: success-check-pop 520ms cubic-bezier(.34, 1.56, .64, 1) 160ms both;
  }

  .check svg {
    animation: success-check-draw 420ms ease-out 310ms both;
  }

  @keyframes success-check-pop {
    0% {
      opacity: 0;
      transform: scale(.55) rotate(-7deg);
    }
    70% {
      opacity: 1;
      transform: scale(1.08) rotate(2deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes success-check-draw {
    from {
      opacity: 0;
      transform: scale(.6);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes success-ring-pulse {
    from {
      opacity: .8;
      transform: scale(.72);
    }
    to {
      opacity: 0;
      transform: scale(1.55);
    }
  }

  h1 {
    margin: 6px 0 0;
    color: var(--text);
    font-size: 30px;
    line-height: 36px;
    font-weight: 500;
  }

  p {
    max-width: 360px;
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 18px;
  }

  @media (prefers-reduced-motion: reduce) {
    > *,
    .check,
    .check svg,
    .ring::after {
      animation: none;
    }
  }

  @media (max-width: 759px) {
    .ring {
      width: 80px;
      height: 80px;
    }

    .check {
      width: 48px;
      height: 48px;
      border-radius: 24px;
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
  min-height: 52px;
  padding: 16px;
  border-radius: 6px;
  background: var(--background);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  animation: confirmation-block-enter 400ms cubic-bezier(.22, 1, .36, 1) 280ms both;

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
    border-radius: 6px;
    animation: confirmation-block-enter 420ms cubic-bezier(.22, 1, .36, 1) 350ms both;
  }

  @keyframes confirmation-block-enter {
    from {
      opacity: 0;
      transform: translate3d(0, 14px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @media (max-width: 759px) {
    padding: 16px;

    &.confirmation-timeline {
      padding: 20px;
      border-radius: 6px;
    }
  }
`;

export const Timeline = styled.div`
  display: grid;
  gap: 24px;

  .confirmation-timeline & {
    gap: 16px;
  }

  @media (max-width: 759px) {
    gap: 16px;

    .confirmation-timeline & {
      gap: 16px;
    }
  }
`;

export const TimelineStep = styled.div<{ $active: boolean; $current?: boolean }>`
  min-height: 20px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  opacity: ${({ $active, $current }) => ($active || $current ? 1 : 0.72)};
  animation: timeline-step-enter 340ms cubic-bezier(.22, 1, .36, 1) both;

  &:nth-child(1) { animation-delay: 420ms; }
  &:nth-child(2) { animation-delay: 500ms; }
  &:nth-child(3) { animation-delay: 580ms; }

  @keyframes timeline-step-enter {
    from { opacity: 0; transform: translate3d(-8px, 8px, 0); }
    to { opacity: ${({ $active, $current }) => ($active || $current ? 1 : 0.72)}; transform: translate3d(0, 0, 0); }
  }

  .dot {
    width: 20px;
    height: 20px;
    border: 0;
    border-radius: 6px;
    background: #eaeae6;
    color: #6d6d80;
    display: grid;
    place-items: center;
    font-size: 9px;
    font-weight: 700;
  }

  .copy {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 7px;
  }

  b {
    color: #1a1a2e;
    font-size: 13px;
    line-height: 17px;
    font-weight: 500;
  }

  .completed-label,
  .current-label {
    font-size: 11px;
    line-height: 14px;
    font-weight: 700;
  }

  &.confirmation-step.completed { opacity: 1; }
  &.confirmation-step.completed .dot {
    background: #10b981;
    color: #fff;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, .11);
  }

  &.confirmation-step.completed b {
    color: #047857;
    font-weight: 700;
  }

  &.confirmation-step.completed .completed-label {
    color: #059669;
    font-weight: 800;
  }

  &.confirmation-step.current {
    opacity: 1;
  }

  &.confirmation-step.current .dot {
    background: #ff4b4b;
    color: #fff;
    box-shadow: 0 0 0 3px rgba(255, 75, 75, .11);
  }

  &.confirmation-step.current .dot .pulse {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #fff;
  }

  &.confirmation-step.current b {
    color: #d9362b;
    font-weight: 800;
  }

  &.confirmation-step.current .current-label {
    color: #e84229;
    font-weight: 800;
  }

  &.confirmation-step.pending {
    opacity: .72;
  }

  &.confirmation-step.pending .dot {
    background: #e5e7eb;
    color: #6d6d80;
  }

  &.confirmation-step.pending b {
    color: #6d6d80;
    font-weight: 600;
  }

  &.tracking-step {
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
    opacity: 1;
  }

  &.tracking-step .dot {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: #f3f3f1;
    color: #a9a9b4;
  }

  &.tracking-step .copy {
    padding-top: 1px;
    display: grid;
    align-items: start;
    gap: 2px;
  }

  &.tracking-step b {
    color: #1a1a2e;
    font-weight: 700;
  }

  &.tracking-step p {
    color: #6d6d80;
  }

  &.tracking-step.completed .dot {
    background: #ecfdf5;
    color: #10b981;
    box-shadow: none;
  }

  &.tracking-step.completed b {
    color: #1a1a2e;
  }

  &.tracking-step.current .dot {
    background: #fff1f1;
    color: #ff4b4b;
    box-shadow: none;
  }

  &.tracking-step.current b {
    color: #ff4b4b;
  }

  &.tracking-step.pending {
    opacity: .4;
  }

  &.tracking-step.pending .dot {
    background: #eaeae6;
    color: transparent;
  }

  &.tracking-step.pending b {
    color: #1a1a2e;
    font-weight: 400;
  }

  p { margin: 0; color: var(--muted); font-size: 12px; line-height: 16px; }

  @media (prefers-reduced-motion: reduce) { animation: none; }

  @media (max-width: 759px) {
    min-height: 20px;
    b { font-size: 13px; line-height: 16px; }
    .completed-label, .current-label { font-size: 10px; line-height: 13px; }
    p { font-size: 11px; line-height: 14px; }
  }
`

export const ConfirmationActions = styled.div`
  width: 100%;
  padding-top: 6px;
  display: grid;
  gap: 10px;
  animation: confirmation-block-enter 420ms cubic-bezier(.22, 1, .36, 1) 640ms both;

  > button:first-of-type {
    min-height: 48px;
    padding: 14px 16px;
    border-radius: 6px;
    background: #ff4b4b;
    box-shadow: 0 4px 6px rgba(255, 75, 75, 0.13);
    color: #fff;
    font-size: 15px;
    font-weight: 700;
  }

  .pix-action {
    min-height: 48px;
    padding: 14px 16px;
    border: 1px solid #eaeae6;
    border-radius: 6px;
    background: #fff;
    color: #1a1a2e;
    font-size: 14px;
    font-weight: 700;
  }

  .pix-action svg {
    width: 20px;
    height: 20px;
    color: #77b6a8;
    flex: 0 0 20px;
  }

  > p {
    color: #6d6d80;
    font-size: 11px;
    line-height: 14px;
  }

  button {
    transition: transform 180ms cubic-bezier(.22, 1, .36, 1), box-shadow 180ms ease, filter 180ms ease;
  }
  button:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.02); }
  button:active:not(:disabled) { transform: translateY(0) scale(.985); }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    button { transition: none; }
    button:hover:not(:disabled), button:active:not(:disabled) { transform: none; }
  }
`

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
    gap: 16px;

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
  border-radius: 8px;
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

  @media (max-width: 759px) {
    padding: 16px;
    gap: 8px;

    h2 {
      margin-bottom: 6px;
      font-size: 15px;
      line-height: 19px;
    }

    p {
      font-size: 12px;
      line-height: 17px;
    }
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
      margin: 0 0 2px;
      font-size: 20px;
      line-height: 25px;
    }

    .account-total {
      display: none;
    }

    > button {
      margin-top: 12px;
      min-height: 46px;
      border-radius: 6px;
      box-shadow: none;
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
    min-height: 48px;
    padding: 12px;
    border-radius: 6px;
    background: #fff;

    .copy {
      gap: 8px;
    }

    b,
    strong {
      font-size: 13px;
    }
  }
`;

export const TrackingPixAction = styled.button`
  width: 100%;
  min-height: 48px;
  padding: 12px 20px;
  border: 0;
  border-radius: 6px;
  background: #32bcad;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  line-height: 19px;
  font-weight: 700;
  box-shadow: none;

  svg {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    color: currentColor;
  }

  &:hover:not(:disabled) {
    background: #2aa89b;
  }

  &:active:not(:disabled) {
    background: #23988d;
  }

  &:focus-visible {
    outline: 3px solid rgba(50, 188, 173, .28);
    outline-offset: 2px;
  }

  &:disabled {
    background: #e7e7e3;
    color: #8b8b97;
    opacity: 1;
    cursor: not-allowed;
  }

  &:disabled:hover,
  &:disabled:active {
    background: #e7e7e3;
  }

  @media (min-width: 760px) {
    margin-top: 4px;
  }
`;
