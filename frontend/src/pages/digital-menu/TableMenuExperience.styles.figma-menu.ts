import styled from 'styled-components';


export const FigmaShell = styled.main<{ $primary: string; $fontFamily?: string }>`
  --primary: #ff4b4b;
  --text: #1a1a2e;
  --muted: #6d6d80;
  --line: #eaeae6;
  --surface: #ffffff;
  --background: #fafaf8;
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--background);
  color: var(--text);
  font-family: 'Plus Jakarta Sans', ${({ $fontFamily }) => $fontFamily || 'sans-serif'}, sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button {
    --primary: #ff4b4b;
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  img {
    display: block;
    max-width: 100%;
  }

  .mobile-only {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 759px) {
    .desktop-only {
      display: none !important;
    }

    .mobile-only {
      display: inline;
    }
  }
`;

export const FigmaHeader = styled.header<{ $hasTitle?: boolean }>`
  width: 100%;
  min-height: 72px;
  padding: 18px 48px;
  border-bottom: 1px solid var(--line);
  background: #fff;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 48px;

  .left {
    min-width: 0;
    display: flex;
    align-items: center;
  }

  .mobile-back,
  .context-title {
    display: none;
  }

  nav {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 32px;
  }

  nav button {
    position: relative;
    padding: 0 0 6px;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 14px;
    line-height: 18px;
    font-weight: 500;
  }

  nav button:hover,
  nav button:focus-visible {
    color: var(--primary);
  }

  nav button.active {
    color: var(--primary);
    font-weight: 700;
  }

  nav button.active::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 16px;
    height: 2px;
    border-radius: 1px;
    background: var(--primary);
  }

  .right {
    justify-self: end;
  }

  &.cart-header {
    --primary: #ff4b4b;
  }

  &.cart-header .brand .mark,
  &.cart-header .brand img {
    border-radius: 6px;
  }

  &.cart-header .brand .name b {
    color: #1a1a2e;
    font-weight: 400;
  }

  &.cart-header .brand .name small {
    color: #6d6d80;
  }

  &.cart-header .cart-table-pill {
    border-color: #ff4b4b;
    border-radius: 6px;
    background: #fff1f1;
    color: #ff4b4b;
  }

  @media (max-width: 759px) {
    min-height: 65px;
    padding: 16px 20px;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 12px;

    .left {
      gap: 10px;
    }

    nav {
      display: none;
    }

    .mobile-back {
      width: 40px;
      height: 40px;
      flex: 0 0 40px;
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #1a1a2e;
      display: grid;
      place-items: center;
      transition:
        background-color 160ms ease,
        transform 160ms ease;
    }

    .mobile-back:hover,
    .mobile-back:focus-visible {
      background: #f4f4f1;
    }

    .mobile-back:active {
      transform: scale(.96);
    }

    .mobile-back svg {
      width: 24px;
      height: 24px;
      stroke-width: 2.4;
    }

    &.cart-header .brand {
      display: none;
    }

    &.cart-header .context-title {
      display: grid;
    }

    .context-title {
      min-width: 0;
      display: grid;
      gap: 2px;
      white-space: nowrap;
    }

    .context-title b {
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text);
      font-size: 14px;
      line-height: 18px;
      font-weight: 700;
    }

    .context-title small {
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--muted);
      font-size: 10px;
      line-height: 13px;
      font-weight: 500;
    }

    ${({ $hasTitle }) =>
      $hasTitle
        ? `
      .brand {
        display: none;
      }
    `
        : ''}
  }

  @media (max-width: 359px) {
    padding-inline: 14px;
  }
`;

export const FigmaBrand = styled.div.attrs({ className: 'brand' })`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;

  .mark,
  img {
    width: 36px;
    height: 32px;
    flex: 0 0 36px;
    border-radius: 10px;
    object-fit: cover;
  }

  .mark {
    display: grid;
    place-items: center;
    background: var(--primary);
    color: #fff;
    font-size: 20px;
    line-height: 25px;
    font-weight: 400;
  }

  .name {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .name b {
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    font-size: 16px;
    line-height: 20px;
    font-weight: 400;
  }

  .name small {
    color: var(--muted);
    font-size: 11px;
    line-height: 14px;
    font-weight: 500;
  }

  .mobile-subtitle {
    display: none;
  }

  @media (max-width: 759px) {
    gap: 10px;

    .mark,
    img {
      width: 32px;
      height: 32px;
      flex-basis: 32px;
    }

    .mark {
      font-size: 18px;
      line-height: 23px;
    }

    .name b {
      max-width: 150px;
      font-size: 14px;
      line-height: 18px;
      font-weight: 700;
    }

    .name small {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      line-height: 13px;
    }

    .desktop-subtitle {
      display: none;
    }

    .mobile-subtitle {
      display: block;
    }
  }
`;

export const FigmaTablePill = styled.div`
  min-width: 102px;
  min-height: 32px;
  padding: 8px 16px;
  border: 1px solid var(--primary);
  border-radius: 12px;
  background: color-mix(in srgb, var(--primary) 8%, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--primary);
  font-size: 13px;
  line-height: 16px;
  font-weight: 700;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 759px) {
    min-width: 84px;
    min-height: 26px;
    padding: 6px 12px;
    gap: 4px;
    font-size: 11px;
    line-height: 14px;
  }
`;

export const SectionHeading = styled.header`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  .title {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  h2 {
    margin: 0;
    color: var(--text);
    font-size: 32px;
    line-height: 40px;
    font-weight: 400;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 18px;
    font-weight: 400;
  }

  button {
    flex: 0 0 auto;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary);
    font-size: 12px;
    line-height: 15px;
    font-weight: 700;
  }

  @media (max-width: 759px) {
    h2 {
      font-size: 22px;
      line-height: 28px;
    }

    p {
      display: none;
    }

    button {
      font-size: 12px;
    }
  }
`;

export const EmptyCatalog = styled.div`
  padding: 24px;
  border: 1px dashed var(--line);
  border-radius: 16px;
  background: #fff;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
`;

