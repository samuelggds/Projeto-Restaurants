import styled from 'styled-components';

export const Section = styled.section`
  --ticket-background: #fff;
  --ticket-ink: #aa423d;
  --ticket-border: #f3d1cd;
  --ticket-icon-background: #fff1ef;
  margin: 18px 0;
  max-width: 100%;
  min-width: 0;
  border-radius: 16px;
  background: #faf9f8;
  padding: 16px;

  > header,
  .coupon-dialog > header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  > header > span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #342d2c;
    font-size: 15px;
    font-weight: 750;
  }

  > header svg {
    color: #dc6454;
    width: 18px;
    height: 18px;
  }

  button {
    cursor: pointer;
    font: inherit;
  }

  > header button {
    padding: 4px 0;
    border: none;
    background: transparent;
    color: #bd493e;
    font-size: 12px;
    font-weight: 750;
  }

  .coupon-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .homepage-coupon-list > .coupon-card:nth-child(n + 3) {
    display: none;
  }

  .coupon-card {
    --ticket-background: #fff9f2;
    --ticket-ink: #a35b22;
    --ticket-border: #ead0b0;
    --ticket-icon-background: #ffedd6;
    position: relative;
    box-sizing: border-box;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--ticket-border);
    border-radius: 14px;
    background: var(--ticket-background);
    color: #302c2a;
  }

  .coupon-card--welcome {
    --ticket-background: #fff3f0;
    --ticket-ink: #ba5143;
    --ticket-border: #f2ccc5;
    --ticket-icon-background: #ffe5df;
  }

  .coupon-card--shipping {
    --ticket-background: #effaf4;
    --ticket-ink: #147858;
    --ticket-border: #bde7d1;
    --ticket-icon-background: #d9f2e5;
  }

  .coupon-card--returning {
    --ticket-background: #f4f1fe;
    --ticket-ink: #6954a6;
    --ticket-border: #dcd4f4;
    --ticket-icon-background: #e9e2fa;
  }

  .coupon-main {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .coupon-symbol {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--ticket-icon-background);
    color: var(--ticket-ink);
    flex: 0 0 auto;
    display: grid;
    place-items: center;
  }

  .coupon-symbol svg {
    width: 17px;
    height: 17px;
  }

  .coupon-content {
    display: grid;
    align-content: start;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }

  .coupon-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .coupon-heading b {
    min-width: 0;
    font-size: 13px;
    line-height: 1.35;
    color: #322d2c;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .coupon-kind {
    flex: none;
    padding: 3px 6px;
    border-radius: 999px;
    background: var(--ticket-icon-background);
    color: var(--ticket-ink);
    font-size: 10px;
    line-height: 1.1;
    font-weight: 750;
    white-space: nowrap;
  }

  .coupon-content strong {
    color: var(--ticket-ink);
    font-size: 22px;
    line-height: 1.05;
    font-weight: 850;
  }

  .coupon-content p,
  .coupon-content small {
    min-width: 0;
    margin: 0;
    color: #665f5b;
    font-size: 11px;
    line-height: 1.3;
  }

  .coupon-content p {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .coupon-minimum {
    font-weight: 700;
  }

  .coupon-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px dashed var(--ticket-border);
    min-width: 0;
  }

  .coupon-actions button {
    min-height: 32px;
    box-sizing: border-box;
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 11px;
    line-height: 1.2;
    font-weight: 750;
  }

  .coupon-copy {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    max-width: 72%;
    border: 1px dashed var(--ticket-border);
    background: #fff;
    color: var(--ticket-ink);
  }

  .coupon-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .coupon-copy svg {
    width: 12px;
    height: 12px;
    flex: none;
  }

  .coupon-apply {
    margin-left: auto;
    flex: none;
    border: 1px solid var(--ticket-ink);
    background: var(--ticket-ink);
    color: #fff;
  }

  .coupon-actions button:focus-visible,
  > header button:focus-visible,
  .coupon-dialog > header button:focus-visible {
    outline: 2px solid #262626;
    outline-offset: 2px;
  }

  .coupon-swipe-hint {
    display: none;
  }

  .coupon-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: grid;
    place-items: center;
    padding: 16px;
    background: #0008;
  }

  .coupon-dialog {
    width: min(680px, 100%);
    max-height: 85dvh;
    overflow: auto;
    border-radius: 18px;
    padding: 20px;
    background: #fff;
    box-shadow: 0 16px 60px #0002;
  }

  .coupon-dialog > header button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: #4a4442;
  }

  .coupon-dialog > header button svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 650px) {
    margin: 12px 0;
    padding: 11px 0 10px 10px;
    border-radius: 14px;
    background: #f8f8fa;

    > header {
      margin-right: 10px;
      margin-bottom: 9px;
    }

    > header > span {
      font-size: 12px;
      gap: 6px;
    }

    > header svg {
      width: 15px;
      height: 15px;
    }

    > header button {
      font-size: 11px;
    }

    .homepage-coupon-list {
      display: flex;
      align-items: stretch;
      gap: 8px;
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 2px 12px 5px 1px;
      box-sizing: border-box;
      scroll-snap-type: x mandatory;
      scroll-padding-inline: 1px;
      overscroll-behavior-x: contain;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .homepage-coupon-list::-webkit-scrollbar {
      display: none;
    }

    .homepage-coupon-list:focus-visible {
      outline: 2px solid #272727;
      outline-offset: -2px;
    }

    .homepage-coupon-list > .coupon-card,
    .homepage-coupon-list > .coupon-card:nth-child(n + 3) {
      display: flex;
      flex: 0 0 clamp(234px, 78vw, 274px);
      max-width: calc(100% - 25px);
      min-height: 0;
      scroll-snap-align: start;
    }

    .coupon-card {
      gap: 7px;
      padding: 10px 11px 9px;
      border-radius: 12px;
    }

    .coupon-main {
      gap: 8px;
    }

    .coupon-symbol {
      width: 25px;
      height: 25px;
      border-radius: 8px;
    }

    .coupon-symbol svg {
      width: 14px;
      height: 14px;
    }

    .coupon-content {
      gap: 3px;
    }

    .coupon-heading b {
      font-size: 11px;
    }

    .coupon-kind {
      font-size: 9px;
      padding: 2px 5px;
    }

    .coupon-content strong {
      font-size: 19px;
      line-height: 1;
    }

    .coupon-content p,
    .coupon-content small {
      font-size: 10px;
      line-height: 1.25;
    }

    .coupon-content p {
      -webkit-line-clamp: 1;
    }

    .coupon-actions {
      gap: 6px;
      padding-top: 7px;
    }

    .coupon-actions button {
      min-height: 29px;
      padding: 5px 8px;
      font-size: 10px;
    }

    .coupon-swipe-hint {
      display: block;
      margin: 3px 10px 0 0;
      color: #747074;
      font-size: 10px;
      text-align: right;
    }

    .coupon-backdrop {
      place-items: end center;
      padding: 0;
    }

    .coupon-dialog {
      box-sizing: border-box;
      width: 100%;
      max-height: 85dvh;
      padding: 16px;
      border-radius: 20px 20px 0 0;
    }

    .coupon-dialog .coupon-list {
      display: grid;
      grid-template-columns: 1fr;
      overflow: visible;
      padding: 0;
    }

    .coupon-dialog .coupon-card {
      max-width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-coupon-list {
      scroll-behavior: auto;
    }
  }
`;
