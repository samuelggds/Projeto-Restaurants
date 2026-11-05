import { css } from 'styled-components';

/**
 * Desktop adaptation of the customer-provided 390px storefront reference.
 * Scoped to the Home; preserves existing carousels, callbacks, cart targets,
 * WhatsApp portal and product-to-cart animation.
 */
export const homeDesktopVisualStyles = css`
  @media (min-width: 761px) {
    --delivery-bg: #fbfcfd;
    --delivery-surface: #ffffff;
    --delivery-text: #242830;
    --delivery-muted: #626a74;
    --delivery-line: #e6eaef;
    --delivery-primary: #d72b39;
    --home-primary: var(--delivery-primary);
    background: var(--delivery-bg);
    color: var(--delivery-text);

    .home-theme-toggle {
      display: grid;
      place-items: center;
      position: fixed;
      right: max(14px, calc((100vw - 1220px) / 2));
      width: 39px;
      height: 39px;
      z-index: 52;
      padding: 0;
      border: 1px solid var(--delivery-line);
      border-radius: 50%;
      background: var(--delivery-surface);
      box-shadow: 0 3px 12px #00000016;
      color: var(--delivery-text);
      cursor: pointer;
    }
    .home-theme-toggle svg { width: 18px; height: 18px; }

    > .home-topbar {
      background: #f6f8fa;
      color: #65717d;
      border-color: var(--delivery-line);
    }
    > .home-header {
      background: var(--delivery-surface);
      color: var(--delivery-text);
      box-shadow: 0 5px 16px #1824320a;
      border-color: var(--delivery-line);
    }
    .home-header .desktop-fulfillment {
      background: #f3f5f7;
      border: 1px solid #e6eaef;
    }
    .home-header .desktop-fulfillment button {
      border-radius: 8px;
      color: #65717d;
    }
    .home-header .desktop-fulfillment button.active {
      color: #fff;
      background: #d72b39;
      box-shadow: none;
    }
    .home-header .cart {
      background: #d72b39;
      border-radius: 10px;
      min-height: 44px;
    }
    .home-header .account-avatar {
      background: #f4f5f7;
      color: #606a76;
    }
    .home-header .home-inline-search {
      background: #fff;
      border-color: #e4e8ee;
      border-radius: 10px;
      min-height: 44px;
    }
    .home-header .home-inline-search input { height: 42px; color: var(--delivery-text); }
    .home-header .home-inline-search > svg { color: #858e9a; }

    > [aria-label^="Capa de "] {
      height: clamp(235px, 22vw, 310px);
      border-radius: 16px;
      box-shadow: 0 10px 30px #1d222911;
      margin-top: 24px;
    }
    > section[aria-label^="Informações de "] {
      min-height: 90px;
      margin-bottom: 15px;
      gap: 14px 30px;
    }
    > section[aria-label^="Informações de "] .storefront-identity h1 {
      color: var(--delivery-text);
      font-size: clamp(27px, 2.7vw, 36px);
      letter-spacing: -.035em;
    }
    > section[aria-label^="Informações de "] .storefront-category {
      color: #78818d;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: .055em;
    }
    > section[aria-label^="Informações de "] .storefront-facts > span {
      padding: 9px 13px;
      min-height: 54px;
    }
    > section[aria-label^="Informações de "] .storefront-facts strong {
      color: var(--delivery-text);
      font-size: 13px;
    }
    > section[aria-label^="Informações de "] .storefront-facts small {
      font-size: 11px;
      color: var(--delivery-muted);
    }

    > .home-delivery-estimator {
      width: min(1120px, calc(100% - 48px));
      max-width: 1120px;
      margin: 0 auto 28px;
    }
    .home-delivery-estimator .trigger {
      min-height: 56px;
      padding: 13px 18px;
      border: 1px solid var(--delivery-line);
      box-shadow: 0 3px 10px #151b2410;
      border-radius: 12px;
      background: var(--delivery-surface);
      color: var(--delivery-text);
    }
    .home-delivery-estimator .trigger:hover {
      border-color: #ec9ca2;
      box-shadow: 0 7px 20px #b1253420;
    }
    .home-delivery-estimator .body {
      max-width: 810px;
      padding: 22px 24px;
      background: var(--delivery-surface);
      border-color: var(--delivery-line);
      border-radius: 14px;
      box-shadow: 0 12px 32px #1824320f;
    }
    .home-delivery-estimator h3 { font-size: 19px; letter-spacing: -.02em; }
    .home-delivery-estimator .calculate { background: #d72b39; min-height: 48px; }
    .home-delivery-estimator .use-address { background: #d72b39; }

    > .home-promotion-heading {
      width: min(1120px, calc(100% - 48px));
      margin: 12px auto 13px;
    }
    > .home-promotion-heading > span {
      color: #bb2d3b;
      font-size: 11px;
      letter-spacing: .09em;
    }
    > .home-promotion-heading h2 {
      font-size: 27px;
      color: var(--delivery-text);
    }
    > .home-promotion-carousel.after-cover {
      width: min(1120px, calc(100% - 48px));
      height: clamp(250px, 28vw, 335px);
      margin-bottom: 18px;
    }
    > .home-promotion-carousel.after-cover > section { border-radius: 15px; }

    > main#cardapio {
      padding-top: 34px;
      color: var(--delivery-text);
    }
    > main#cardapio .products-section h2 {
      font-size: 23px;
      color: var(--delivery-text);
      letter-spacing: -.025em;
    }
    > main#cardapio .products-section .copy p {
      color: var(--delivery-muted);
      font-size: 12px;
      line-height: 1.5;
    }
    > main#cardapio .products-section .product-label {
      background: #fff0f1;
      color: #b92331;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 10px;
    }
    > main#cardapio .products-section .price del { font-size: 11px; }
    > main#cardapio .products-section .price strong {
      color: var(--delivery-text);
      font-size: 17px;
      letter-spacing: -.02em;
    }
    > main#cardapio .products-section .add {
      min-height: 38px;
      color: #bb2a38;
      background: #fff;
      border: 1px solid #e7a5ae;
      border-radius: 9px;
      font-size: 11px;
      padding: 0 12px;
      transition: background 150ms ease, border-color 150ms ease;
    }
    > main#cardapio .products-section .add:hover {
      background: #fff1f2;
      border-color: #d72b39;
    }
    > main#cardapio .products-section article[data-product-carousel-card] {
      height: 348px;
      min-height: 348px;
      border-color: var(--delivery-line);
      border-radius: 14px;
      background: var(--delivery-surface);
    }
    > main#cardapio .products-section article[data-product-carousel-card] .image {
      flex-basis: 178px;
      height: 178px;
      min-height: 178px;
      background: #f2f4f6;
    }
    > main#cardapio .products-section article[data-product-carousel-card] .copy {
      min-height: 170px;
      padding: 14px;
      background: var(--delivery-surface);
    }
    > main#cardapio .products-section article[data-product-carousel-card] .product-copy h3 {
      font-size: 15px;
      color: var(--delivery-text);
      line-height: 1.4;
    }
    > main#cardapio .products-section article[data-product-carousel-card] .add {
      position: relative;
      z-index: 2;
    }
    > main#cardapio .products-section .product-carousel-section {
      scroll-margin-top: 110px;
    }
    > main#cardapio .benefit-grid article {
      border: 1px solid var(--delivery-line);
      background: var(--delivery-surface);
      border-radius: 14px;
      min-height: 210px;
    }
    > main#cardapio section[aria-label="Informações do restaurante"] {
      border-color: var(--delivery-line);
      background: var(--delivery-surface);
      color: var(--delivery-text);
    }
    > main#cardapio section[aria-label="Reservas de mesas"] {
      background: #f6f7f9;
      border-color: #e6e9ee;
      color: var(--delivery-text);
    }
    > main#cardapio section[aria-label="Reservas de mesas"] .whatsapp {
      background: #fff;
      color: #d82739;
    }

    &.storefront-dark {
      --delivery-bg: #161b23;
      --delivery-surface: #222a34;
      --delivery-text: #eff2f7;
      --delivery-muted: #b6c0cc;
      --delivery-line: #38414d;
      background: var(--delivery-bg);
      color: var(--delivery-text);
    }
    &.storefront-dark > .home-topbar { background: #1d2530; color: #bac3cf; }
    &.storefront-dark > .home-header {
      color: var(--delivery-text);
      background: var(--delivery-surface);
    }
    &.storefront-dark .home-header .home-inline-search {
      background: #28313c;
      border-color: #46505e;
    }
    &.storefront-dark .home-header .home-inline-search input,
    &.storefront-dark .home-header .brand-copy > b { color: #eff2f7; }
    &.storefront-dark .home-header .desktop-fulfillment {
      background: #313b48;
      border-color: #46505e;
    }
    &.storefront-dark .home-header .desktop-fulfillment button:not(.active) { color: #d3d9e3; }
    &.storefront-dark > section[aria-label^="Informações de "] .storefront-category { color: #b6c0cc; }
    &.storefront-dark > .home-promotion-heading > span { color: #ff9ca4; }
    &.storefront-dark > .home-promotion-heading h2 { color: #eff2f7; }
    &.storefront-dark .home-delivery-estimator .trigger,
    &.storefront-dark .home-delivery-estimator .body,
    &.storefront-dark .home-delivery-estimator input {
      color: #eff2f7;
      background: #222a34;
      border-color: #414b5a;
    }
    &.storefront-dark .home-delivery-estimator h3,
    &.storefront-dark .home-delivery-estimator label { color: #eff2f7; }
    &.storefront-dark .home-delivery-estimator .result {
      background: #213c30;
      border-color: #35684e;
    }
    &.storefront-dark .home-delivery-estimator .result strong { color: #eff2f7; }
    &.storefront-dark .home-delivery-estimator .result strong.price { color: #8ef2b6; }
    &.storefront-dark > main#cardapio .products-section article[data-product-carousel-card],
    &.storefront-dark > main#cardapio .products-section article[data-product-carousel-card] .copy {
      background: #222a34;
      border-color: #414b5a;
    }
    &.storefront-dark > main#cardapio .products-section article[data-product-carousel-card] .image {
      background: #2c3643;
    }
    &.storefront-dark > main#cardapio .products-section .product-label {
      background: #39272f;
      color: #ff9ca4;
    }
    &.storefront-dark > main#cardapio .products-section .add {
      background: #28323e;
      color: #ffb1b9;
      border-color: #b5656e;
    }
    &.storefront-dark > main#cardapio .products-section .add:hover { background: #39313d; }
    &.storefront-dark > main#cardapio .benefit-grid article,
    &.storefront-dark > main#cardapio section[aria-label="Informações do restaurante"],
    &.storefront-dark > main#cardapio section[aria-label="Reservas de mesas"] {
      background: #222a34;
      border-color: #414b5a;
      color: #eff2f7;
    }
    &.storefront-dark > main#cardapio section[aria-label="Reservas de mesas"] .actions a {
      background: #2c3541;
      border-color: #46515e;
      color: #f2f4f8;
    }
    &.storefront-dark > main#cardapio section[aria-label="Reservas de mesas"] .actions .whatsapp { color: #ff949c; }
    &.storefront-dark > main#cardapio section[aria-label="Reservas de mesas"] p { color: #b6c0cc; }
    &.storefront-dark > main#cardapio section[aria-label="Reservas de mesas"] .phone {
      background: #28323e;
      color: #eff2f7;
      border-color: #414b5a;
    }
    &.storefront-dark > main#cardapio .social a {
      background: #28323e;
      border-color: #414b5a;
    }

    @media (max-width: 1120px) {
      > main#cardapio .products-section article[data-product-carousel-card] .foot {
        align-items: stretch;
        flex-direction: column;
        gap: 6px;
      }
      > main#cardapio .products-section article[data-product-carousel-card] .add { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      > main#cardapio .products-section .add { transition: none; }
    }
  }
`;
