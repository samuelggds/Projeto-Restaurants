import styled from 'styled-components';

// ── Cart drawer
export const CartOverlay = styled.button<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(15, 12, 10, 0.6);
  backdrop-filter: blur(6px);
  border: 0;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    opacity 0.28s,
    visibility 0.28s;
  will-change: ${({ $open }) => ($open ? 'opacity' : 'auto')};
  cursor: default;
`;

export const CartDrawer = styled.aside<{ $open: boolean }>`
  position: fixed;
  right: 0;
  top: 0;
  z-index: 70;
  width: min(520px, 100%);
  height: 100dvh;
  background: #f4f6f3;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow-x: hidden;
  overflow-y: hidden;
  overscroll-behavior: contain;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translate3d(${({ $open }) => ($open ? '0' : '100%')}, 0, 0);
  transition:
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease,
    visibility 0s linear ${({ $open }) => ($open ? '0s' : '0.32s')};
  box-shadow: ${({ $open }) => ($open ? '-24px 0 80px rgba(20, 31, 26, 0.24)' : 'none')};
  will-change: ${({ $open }) => ($open ? 'transform, opacity' : 'auto')};
  contain: layout paint;
`;

export const CartHead = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--home-border);
  background: #fff;
  color: var(--home-text);

  .cart-heading {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cart-mark {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: #fff;
    background: var(--home-primary);

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .cart-title {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  h2 {
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0;
    color: var(--home-text);
  }

  small {
    color: var(--home-primary);
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .cart-count {
    padding: 6px 9px;
    border-radius: 6px;
    color: #53605a;
    background: #eef2ee;
    font-size: 11px;
    font-weight: 800;
  }

  > button {
    width: 36px;
    height: 36px;
    border: 1px solid var(--home-border);
    border-radius: 50%;
    background: #f7f9f7;
    color: var(--home-text);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.18s;
    svg {
      width: 18px;
      height: 18px;
    }
    &:hover {
      background: #edf1ed;
    }
  }

  @media (max-width: 420px) {
    padding: 14px 12px;

    .cart-mark {
      width: 38px;
      height: 38px;
    }

    h2 {
      font-size: 20px;
    }
  }
`;

export const CartBody = styled.div`
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--home-border) transparent;
`;

export const CartItems = styled.div`
  width: 100%;
  padding: 18px 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--home-border);
    border-radius: 2px;
  }
`;

export const CartItemRow = styled.div`
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 14px;
  padding: 10px;
  background: #fff;
  border: 1px solid var(--home-border);
  border-radius: 8px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(70, 45, 20, 0.08);
  }

  img {
    width: 76px;
    height: 76px;
    border-radius: 6px;
    object-fit: cover;
  }
`;

export const CartItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  strong {
    font-size: 14px;
    font-weight: 700;
    display: block;
    color: #191816;
    line-height: 1.3;
  }

  .item-price {
    color: #d64d08;
    font-weight: 800;
    font-size: 15px;
  }
  .item-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
  }

  .item-options {
    display: grid;
    gap: 2px;
    margin-top: 8px;
  }

  .item-options small,
  .item-observation {
    color: #756d65;
    font-size: 11px;
    line-height: 1.4;
  }

  .item-options b {
    color: #4e4741;
  }

  .item-observation {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: 7px;
    background: #f7f3ee;
  }
`;

export const CartQty = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  background: #f5f0ea;
  border-radius: 8px;
  width: fit-content;
  overflow: hidden;

  button {
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: #191816;
    transition: background 0.15s;
    &:hover {
      background: var(--home-border);
    }
    svg {
      width: 15px;
      height: 15px;
    }
  }

  b {
    font-size: 14px;
    font-weight: 700;
    min-width: 28px;
    text-align: center;
    color: #191816;
  }
`;

export const CartEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: min(470px, 62dvh);
  gap: 12px;
  color: var(--home-muted);
  text-align: center;

  .icon {
    width: 58px;
    height: 58px;
    background: color-mix(in srgb, var(--home-primary) 9%, #fff);
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: var(--home-primary);

    svg {
      width: 25px;
      height: 25px;
    }
  }

  strong {
    font-size: 16px;
    font-weight: 700;
    color: #191816;
  }

  p {
    font-size: 13px;
    margin: 0;
    max-width: 240px;
    line-height: 1.5;
  }

  > button {
    min-height: 42px;
    margin-top: 4px;
    padding: 0 15px;
    border: 1px solid var(--home-border);
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--home-text);
    background: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

export const CartFoot = styled.div`
  width: 100%;
  padding: 16px 20px max(18px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--home-border);
  background: #fff;
  box-shadow: 0 -12px 30px rgba(20, 31, 26, 0.07);

  .cart-checkout-area {
    width: 100%;
  }

  &:empty {
    display: none;
  }
`;

export const CartOptions = styled.div`
  width: 100%;
  padding: 8px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  > * {
    flex: 0 0 auto;
    width: 100%;
  }
`;

export const CartSummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--home-muted);
  margin-bottom: 6px;
`;

export const CartTotal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
  font-size: 20px;
  color: var(--home-text);
  margin: 10px 0 14px;
  padding-top: 12px;
  border-top: 2px solid var(--home-border);

  span:last-child {
    color: #d64d08;
  }
`;

/* ── Order type toggle (Entrega / Retirada) */
export const CartSection = styled.div`
  padding: 14px 20px;
  border-top: 1px solid var(--home-border);

  label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--home-muted);
    margin-bottom: 10px;
  }
`;

export const OrderTypeToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f5f0ea;
  border-radius: 12px;
  padding: 3px;
  gap: 3px;
`;

export const OrderTypeBtn = styled.button<{ $active: boolean }>`
  padding: 10px 8px;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition:
    background-color 0.18s,
    color 0.18s,
    box-shadow 0.18s;

  background: ${({ $active }) => ($active ? '#fff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#d64d08' : '#6f6a63')};
  box-shadow: ${({ $active }) => ($active ? '0 2px 8px rgba(70,45,20,0.10)' : 'none')};
`;

export const CartCheckout = styled.button`
  width: 100%;
  height: 56px;
  background: var(--home-primary);
  color: #fff;
  border: 0;
  border-radius: 7px;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  > svg {
    width: 19px;
    height: 19px;
    flex: 0 0 auto;
  }

  > span {
    min-width: 0;
    flex: 1;
    text-align: center;
  }

  .checkout-arrow {
    width: 18px;
  }

  transition:
    transform 0.18s,
    background 0.18s;

  .btn-price {
    margin-left: auto;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.15);
    padding: 4px 10px;
    border-radius: 6px;
  }

  &:hover:not(:disabled) {
    filter: brightness(0.95);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ── Delivery/pickup + payment section inside cart */
export const CartSectionLabel = styled.p`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #8c8781;
  margin: 0 0 8px;
`;

export const DeliveryToggle = styled.div<{ $single?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $single }) => ($single ? '1fr' : '1fr 1fr')};
  background: #f0ece6;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  margin-bottom: 10px;
`;

export const CheckoutUnavailable = styled.p`
  margin: 0 0 10px;
  padding: 12px 14px;
  border: 1px solid #efc9b8;
  border-radius: 12px;
  background: #fff7f2;
  color: #8a3d20;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
`;

export const DeliveryBtn = styled.button<{ $active: boolean }>`
  padding: 11px 8px;
  border: none;
  border-radius: 9px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition:
    background-color 0.2s,
    color 0.2s,
    box-shadow 0.2s;
  background: ${({ $active }) => ($active ? '#fff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#d64d08' : '#6f6a63')};
  box-shadow: ${({ $active }) => ($active ? '0 2px 10px rgba(70,45,20,.12)' : 'none')};

  .btn-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: ${({ $active }) => ($active ? '#fdeee7' : '#e8e3dc')};
    display: grid;
    place-items: center;
    font-size: 14px;
    flex-shrink: 0;
    transition: background 0.2s;
  }
`;

export const PaymentMomentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const PaymentMomentCard = styled.button<{ $active: boolean }>`
  position: relative;
  min-height: 66px;
  padding: 10px 34px 10px 10px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--home-primary)' : '#ddd5ce')};
  border-radius: 11px;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--home-primary) 8%, #fff)' : '#fff'};
  color: ${({ $active }) => ($active ? 'var(--home-primary)' : '#27231f')};
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  text-align: left;
  cursor: pointer;
  font: inherit;
  box-shadow: ${({ $active }) =>
    $active ? '0 7px 18px color-mix(in srgb, var(--home-primary) 14%, transparent)' : 'none'};
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--home-primary) 55%, #ddd5ce);
  }

  .moment-icon {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: ${({ $active }) =>
      $active ? 'color-mix(in srgb, var(--home-primary) 16%, #fff)' : '#f4f1ed'};
    color: ${({ $active }) => ($active ? 'var(--home-primary)' : '#4e4741')};
  }

  .moment-icon.later {
    background: ${({ $active }) =>
      $active ? 'color-mix(in srgb, var(--home-primary) 12%, #fff)' : '#f4f1ed'};
  }

  .moment-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .moment-copy b {
    font-size: 12px;
    line-height: 1.2;
    color: ${({ $active }) => ($active ? 'var(--home-primary)' : '#27231f')};
  }

  .moment-copy small {
    color: #77716b;
    font-size: 9px;
    line-height: 1.3;
  }

  .moment-check {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    border: 1px solid ${({ $active }) => ($active ? 'var(--home-primary)' : '#d3ccc5')};
    display: grid;
    place-items: center;
    background: ${({ $active }) => ($active ? 'var(--home-primary)' : '#fff')};
    color: #fff;
  }
`;

export const PaymentMethodPanel = styled.div`
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #e6ded7;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(38, 31, 25, 0.04);

  .payment-method-heading {
    display: grid;
    gap: 2px;
    margin-bottom: 8px;
  }

  .payment-method-heading b {
    color: #2a2622;
    font-size: 12px;
  }

  .payment-method-heading small {
    color: #827b74;
    font-size: 9px;
  }
`;

export const PaymentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  background: transparent;
  margin-bottom: 0;

  @media (max-width: 420px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const PaymentCard = styled.button<{ $active: boolean; $color: string }>`
  min-height: 78px;
  padding: 9px;
  border: 1px solid ${({ $active, $color }) => ($active ? $color : '#e2dbd4')};
  border-radius: 10px;
  background: ${({ $active, $color }) =>
    $active ? `color-mix(in srgb, ${$color} 8%, #fff)` : '#fff'};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(40, 32, 25, 0.06);
  }

  .pm-badge {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: ${({ $active, $color }) =>
      $active ? `color-mix(in srgb, ${$color} 18%, #fff)` : '#f4f1ed'};
    color: ${({ $active, $color }) => ($active ? $color : '#332f2b')};
    margin-bottom: 2px;
  }

  .pm-name {
    color: #27231f;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
  }

  .pm-desc {
    color: #7c756f;
    font-size: 9px;
    line-height: 1.3;
  }
`;

export const SavedPaymentChooser = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 10px;
  > button,
  > a {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #fff;
    color: var(--text);
    padding: 11px 13px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
    text-decoration: none;
    transition:
      border-color 0.2s,
      transform 0.2s,
      background 0.2s,
      box-shadow 0.2s;
  }
  > button:hover,
  > a:hover {
    transform: translateY(-1px);
    border-color: var(--primary);
  }
  > button.active {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 7%, white);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent);
  }
  span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  small {
    color: var(--muted);
  }
  > a.add {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    min-height: 66px;
    padding: 11px 12px;
    border-color: #e6ded7;
    border-radius: 14px;
    background: #fbfaf8;
    color: #27231f;
    box-shadow: 0 6px 18px rgba(38, 31, 25, 0.05);
  }
  > a.add:hover {
    border-color: color-mix(in srgb, var(--primary) 45%, #e6ded7);
    background: #fff;
    box-shadow: 0 10px 24px rgba(38, 31, 25, 0.09);
  }
  .add-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--primary) 10%, #f5f1ed);
    color: var(--primary);
  }
  .add-copy {
    min-width: 0;
    gap: 3px;
  }
  .add-copy b {
    color: #27231f;
    font-size: 12px;
    line-height: 1.25;
  }
  .add-copy small {
    overflow: hidden;
    font-size: 10px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .add-arrow {
    color: #9b938c;
    transition:
      color 0.2s,
      transform 0.2s;
  }
  > a.add:hover .add-arrow {
    color: var(--primary);
    transform: translateX(2px);
  }
`;
export const CardAccountNotice = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px 12px;
  margin: 4px 0 12px;
  padding: 14px;
  border: 1px solid #d9d0ff;
  border-radius: 14px;
  background: linear-gradient(135deg, #f8f6ff, #fff);
  color: #292342;
  animation: cardNoticeIn 0.28s ease-out both;
  @keyframes cardNoticeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .notice-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    background: #ebe7ff;
    color: #5842c3;
  }
  .notice-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .notice-copy b {
    font-size: 13px;
  }
  .notice-copy span {
    color: #686178;
    font-size: 11px;
    line-height: 1.45;
  }
  .notice-actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  button {
    min-height: 38px;
    border: 1px solid #d9d0ff;
    border-radius: 10px;
    background: #fff;
    color: #4a3a9b;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    transition:
      transform 0.18s,
      box-shadow 0.18s;
  }
  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(73, 53, 159, 0.12);
  }
  button.primary {
    border-color: #5943c7;
    background: #5943c7;
    color: #fff;
  }
  button.guest {
    grid-column: 1 / -1;
    border-color: #cdc4f5;
    background: #f1eeff;
    color: #392985;
  }
  @media (max-width: 360px) {
    .notice-actions {
      grid-template-columns: 1fr;
    }
    button.guest {
      grid-column: auto;
    }
  }
`;
