import styled from 'styled-components';

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
