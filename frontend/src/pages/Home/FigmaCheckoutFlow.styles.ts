import styled, { keyframes } from 'styled-components';

const softFadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const softFade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const CartLayer = styled.div<{ $primary: string }>`
  --checkout-primary: ${({ $primary }) => $primary || '#e85a2b'};
  --checkout-bg: #fdfcf9;
  --checkout-text: #1f1e1a;
  --checkout-muted: #72706b;
  --checkout-line: #efece6;
  position: fixed;
  inset: 0;
  animation: ${softFade} 220ms ease-out both;
  z-index: 500;
  overflow-y: auto;
  background: var(--checkout-bg);
  color: var(--checkout-text);
  font-family: 'Inter', system-ui, sans-serif;

  *, *::before, *::after { box-sizing: border-box; }
  button, input, textarea { font: inherit; }

  .compat-items-count {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    color: transparent;
    font-size: 1px;
    line-height: 1px;
    white-space: nowrap;
  }

  @media (max-width: 760px) {
    padding-bottom: 84px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const CartDesktopHeader = styled.header`
  height: 80px;
  padding: 0 max(24px, calc((100vw - 1120px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  border-bottom: 1px solid var(--checkout-line);
  background: #fff;

  .brand,
  .account,
  .cart {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .brand {
    min-width: 223px;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
  }

  .logo {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    overflow: hidden;
    border-radius: 12px;
    background: var(--checkout-primary);
    color: #fff;
    display: grid;
    place-items: center;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 800;
  }

  .logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .brand-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .brand-copy b {
    max-width: 180px;
    overflow: hidden;
    color: var(--checkout-text);
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 700;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .brand-copy small {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--checkout-muted);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }

  .brand-copy i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e5484d;
  }

  .brand-copy i.open {
    background: #36b37e;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .account {
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
  }

  .account svg {
    width: 20px;
    height: 20px;
  }

  .cart {
    padding: 10px 16px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border-radius: 10px;
    background: var(--checkout-primary);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }

  .cart svg {
    width: 18px;
    height: 18px;
  }

  .cart i {
    min-width: 20px;
    padding: 2px 6px;
    border-radius: 8px;
    background: var(--checkout-text);
    color: #fff;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
    text-align: center;
  }

  @media (max-width: 1080px) {
    .brand {
      min-width: 0;
    }

    .brand-copy small {
      display: none;
    }

    .account span {
      display: none;
    }
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

export const CartContent = styled.main`
  width: min(1120px, calc(100% - 48px));
  animation: ${softFadeUp} 300ms cubic-bezier(.22,1,.36,1) both;
  min-height: 552px;
  margin: 0 auto;
  padding: 40px 0 80px;
  display: grid;
  grid-template-columns: minmax(0, 700px) 388px;
  align-items: start;
  gap: 32px;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr) 340px;
  }

  @media (max-width: 760px) {
    width: 100%;
    min-height: 0;
    padding: 0 20px 20px;
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const CartItemsColumn = styled.section`
  min-width: 0;
  display: grid;
  gap: 24px;

  @media (max-width: 760px) {
    gap: 16px;
  }
`;

export const CartTitleRow = styled.div`
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  .title-group {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mobile-back {
    display: none;
  }

  h1 {
    margin: 0;
    color: var(--checkout-text);
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 28px;
    font-weight: 800;
    line-height: 34px;
  }

  button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--checkout-primary);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .mobile-title,
  .mobile-clear {
    display: none;
  }

  @media (max-width: 760px) {
    min-height: 64px;
    padding: 0;
    gap: 12px;

    .title-group {
      gap: 8px;
    }

    .mobile-back {
      width: 36px;
      height: 36px;
      padding: 0;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--checkout-text);
      cursor: pointer;
      transition:
        transform 160ms ease,
        background 160ms ease;
    }

    .mobile-back:hover {
      background: #f4f1ec;
    }

    .mobile-back:active {
      transform: scale(.94);
    }

    .mobile-back svg {
      width: 24px;
      height: 24px;
    }

    h1 {
      font-size: 22px;
      line-height: 28px;
    }

    .desktop-title,
    .desktop-clear {
      display: none;
    }

    .mobile-title,
    .mobile-clear {
      display: inline;
    }
  }
`;

export const CartSummarySidebar = styled.aside`
  width: 100%;
  padding: 28px;
  display: grid;
  gap: 20px;
  border: 1px solid var(--checkout-line);
  border-radius: 20px;
  background: #fff;

  h2 {
    margin: 0;
    color: var(--checkout-text);
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 800;
    line-height: 24px;
  }

  .coupon-entry {
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--checkout-line);
    border-radius: 12px;
    background: #fafaf8;
    color: var(--checkout-muted);
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background-color 180ms ease;
  }

  .coupon-entry:focus-within {
    border-color: color-mix(in srgb, var(--checkout-primary) 45%, var(--checkout-line));
    background: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--checkout-primary) 8%, transparent);
  }

  .coupon-entry > svg {
    width: 18px;
    height: 18px;
  }

  .coupon-entry input {
    min-width: 0;
    height: 42px;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--checkout-primary);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: .01em;
    text-transform: uppercase;
  }

  .coupon-entry input::placeholder {
    color: var(--checkout-muted);
    text-transform: none;
  }

  .coupon-entry button {
    min-height: 32px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--checkout-primary);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  .coupon-details {
    min-width: 0;
    animation: coupon-details-in 240ms cubic-bezier(.22,1,.36,1) both;
    transform-origin: top center;
  }

  @keyframes coupon-details-in {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .coupon-entry,
    .coupon-details {
      transition: none;
      animation: none;
    }
  }

  .summary-list {
    display: grid;
    gap: 12px;
  }

  .summary-row,
  .summary-total {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .summary-row {
    color: var(--checkout-muted);
    font-size: 14px;
  }

  .summary-row strong {
    color: var(--checkout-text);
    font-size: 14px;
    font-weight: 600;
  }

  .summary-divider {
    width: 100%;
    height: 1px;
    background: var(--checkout-line);
  }

  .summary-total {
    color: var(--checkout-text);
    font-size: 16px;
    font-weight: 700;
  }

  .summary-total strong {
    color: var(--checkout-primary);
    font-size: 20px;
    font-weight: 800;
  }

  .continue {
    justify-self: start;
    min-height: 46px;
    padding: 0 24px;
    border: 0;
    border-radius: 12px;
    background: linear-gradient(90deg, #ff6a3d, #ff3d1f);
    color: #fff;
    box-shadow: 0 10px 14px rgba(16, 24, 39, 0.14);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 170ms ease,
      box-shadow 170ms ease,
      filter 170ms ease;
  }

  .continue:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 18px rgba(16, 24, 39, 0.16);
    filter: saturate(1.03);
  }

  .continue:active:not(:disabled) {
    transform: translateY(0) scale(.985);
  }

  .continue:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

export const MobileCartSummary = styled.section`
  display: none;

  @media (max-width: 760px) {
    display: grid;
    gap: 10px;
    padding-top: 0;

    .coupon-entry {
      width: 100%;
      min-height: 44px;
      margin-bottom: 8px;
      padding: 0 12px;
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      border: 1px solid var(--checkout-line);
      border-radius: 12px;
      background: #fff;
      color: var(--checkout-muted);
      transition:
        border-color 180ms ease,
        box-shadow 180ms ease,
        transform 180ms ease;
    }

    .coupon-entry:focus-within {
      border-color: color-mix(in srgb, var(--checkout-primary) 45%, var(--checkout-line));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--checkout-primary) 8%, transparent);
      transform: translateY(-1px);
    }

    .coupon-entry > svg {
      width: 18px;
      height: 18px;
    }

    .coupon-entry input {
      min-width: 0;
      height: 42px;
      padding: 0;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--checkout-primary);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: .01em;
      text-transform: uppercase;
    }

    .coupon-entry input::placeholder {
      color: var(--checkout-muted);
      text-transform: none;
    }

    .coupon-entry button {
      min-height: 32px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--checkout-primary);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .coupon-details {
      margin-bottom: 8px;
      animation: coupon-details-mobile-in 260ms cubic-bezier(.22,1,.36,1) both;
      transform-origin: top center;
    }

    @keyframes coupon-details-mobile-in {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(.98);
      }
      70% {
        opacity: 1;
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .coupon-entry,
      .coupon-details {
        transition: none;
        animation: none;
        transform: none;
      }
    }

    .summary-row,
    .summary-total {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .summary-row {
      color: var(--checkout-muted);
      font-size: 14px;
    }

    .summary-row strong {
      color: var(--checkout-text);
      font-size: 14px;
      font-weight: 400;
    }

    .summary-divider {
      width: 100%;
      height: 1px;
      background: var(--checkout-line);
    }

    .summary-total {
      color: var(--checkout-text);
      font-size: 16px;
      font-weight: 700;
    }

    .summary-total strong {
      color: var(--checkout-primary);
      font-size: 18px;
      font-weight: 800;
    }
  }
`;

export const CartDesktopFooter = styled.footer`
  min-height: 356px;
  box-sizing: border-box;
  padding: 64px max(24px, calc((100vw - 1120px) / 2));
  background: #1f1e1a;
  color: #fff;

  .footer-main {
    width: min(1120px, 100%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: 320px 146px 124px 280px;
    justify-content: space-between;
    gap: 36px;
  }

  .platform-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .platform-brand > span {
    width: 32px;
    height: 32px;
    min-width: 32px;
    max-width: 32px;
    min-height: 32px;
    max-height: 32px;
    flex: 0 0 32px;
    overflow: hidden;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: var(--checkout-primary);
    color: #fff;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 800;
  }

  .platform-brand img {
    width: 32px;
    height: 32px;
    max-width: 32px;
    max-height: 32px;
    display: block;
    object-fit: cover;
  }

  .platform-brand strong {
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 800;
  }

  h3 {
    margin: 0 0 16px;
    font-size: 14px;
    font-weight: 700;
  }

  p,
  a {
    margin: 0;
    color: #72706b;
    font-size: 14px;
    line-height: 22px;
    text-decoration: none;
  }

  a:hover,
  a:focus-visible {
    color: #fff;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  section:not(.platform) {
    display: grid;
    align-content: start;
    gap: 16px;
  }

  section:not(.platform) h3 {
    margin-bottom: 0;
  }

  .platform p {
    margin-top: 16px;
  }

  .footer-divider {
    width: min(1120px, 100%);
    height: 1px;
    margin: 48px auto 0;
    background: #343330;
  }

  .footer-bottom {
    width: min(1120px, 100%);
    margin: 44px auto 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    color: #72706b;
    font-size: 13px;
  }

  .legal {
    display: flex;
    gap: 16px;
  }

  .legal a {
    color: inherit;
    font-size: inherit;
  }

  @media (max-width: 1000px) {
    .footer-main {
      grid-template-columns: 1.4fr 1fr 1fr;
    }

    .footer-main section:last-child {
      display: none;
    }
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

export const MobileCartAction = styled.div`
  display: none;

  @media (max-width: 760px) {
    position: fixed;
    z-index: 8;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 12px 20px max(20px, env(safe-area-inset-bottom));
    display: block;
    border-top: 1px solid var(--checkout-line);
    background: #fff;

    button {
      width: 100%;
      min-height: 48px;
      border: 0;
      border-radius: 12px;
      background: linear-gradient(90deg, #ff6a3d, #ff3d1f);
      color: #fff;
      box-shadow: 0 10px 14px rgba(16, 24, 39, 0.14);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition:
        transform 170ms ease,
        box-shadow 170ms ease,
        filter 170ms ease;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 12px 18px rgba(16, 24, 39, 0.16);
      filter: saturate(1.03);
    }

    button:active:not(:disabled) {
      transform: translateY(0) scale(.985);
    }

    button:disabled {
      opacity: .55;
      cursor: not-allowed;
    }
  }
`;

export const CartEmpty = styled.div`
  min-height: 300px;
  display: grid;
  place-items: center;
  color: var(--checkout-muted);
  text-align: center;

  @media (max-width: 760px) {
    min-height: 260px;
  }
`;
