import { css } from 'styled-components';

export const productMobileStyles = css`
  @media (max-width: 480px) {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: 68px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 10px;
    > img,
    > .product-image-fallback {
      width: 68px;
      height: 68px;
      aspect-ratio: 1;
      border-radius: 7px;
    }
    > .product-copy {
      position: relative;
      min-width: 0;
      padding: 0 38px 0 0;
      gap: 3px;
    }
    .product-copy > b {
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .product-copy > span {
      font-size: 11px;
    }
    footer .product-actions {
      position: absolute;
      right: -6px;
      top: 50%;
      transform: translateY(-50%);
    }
    footer .product-menu-trigger {
      width: 44px;
      height: 44px;
    }
    footer .product-menu {
      top: 44px;
      bottom: auto;
      transform-origin: right top;
    }
    footer strong {
      font-size: 13px;
      overflow-wrap: anywhere;
    }
  }
`;
