import styled from 'styled-components';

export const ProductSelector = styled.fieldset`
  min-width: 0;
  margin: 0 14px 14px;
  padding: 14px;
  border: 1px solid #e6ded7;
  border-radius: 12px;
  background: #fff;

  > legend {
    max-width: 100%;
    padding: 0 6px;
    color: #39342f;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.8;
  }
  .selection-count {
    display: inline-block;
    margin-left: 8px;
    padding: 1px 8px;
    border-radius: 6px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 8%, white);
    font-size: 10px;
    white-space: nowrap;
  }
  .product-selector-hint {
    margin: 0 0 14px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }
  .half-half-product-picker > label {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  .product-picker-label {
    color: #514943;
    font-size: 11px;
    font-weight: 800;
  }
  .product-picker-control {
    position: relative;
    min-width: 0;
  }
  .product-picker-control > svg {
    position: absolute;
    top: 50%;
    left: 13px;
    width: 16px;
    height: 16px;
    transform: translateY(-50%);
    color: var(--a);
    pointer-events: none;
  }
  .product-picker-control > svg:last-child {
    right: 13px;
    left: auto;
    color: #847b73;
  }
  select {
    appearance: none;
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 10px 38px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    color: #514943;
    background: #fcfbf9;
    font: inherit;
    font-size: 12px;
    text-overflow: ellipsis;
    cursor: pointer;
  }
  select:disabled {
    color: #847b73;
    background: #f5f2ef;
    cursor: not-allowed;
  }
  .half-half-product-list {
    display: grid;
    gap: 8px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
  }
  .half-half-product-list:empty {
    display: none;
  }
  .half-half-product-card {
    min-width: 0;
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border: 1px solid #e8e1da;
    border-radius: 10px;
    background: #fff;
  }
  .half-half-product-image {
    position: relative;
    width: 48px;
    height: 48px;
    overflow: hidden;
    border-radius: 8px;
    color: #968b82;
    background: #f2eeea;
  }
  .half-half-product-image > span,
  .half-half-product-image > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .half-half-product-image > span {
    display: grid;
    place-items: center;
  }
  .half-half-product-image > img {
    object-fit: cover;
  }
  .half-half-product-image svg {
    width: 18px;
    height: 18px;
  }
  .half-half-product-copy {
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  .half-half-product-copy > b {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    color: #2e2925;
    font-size: 13px;
    font-weight: 750;
    line-height: 1.4;
  }
  .half-half-product-price {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 3px 8px;
  }
  .half-half-product-price > strong {
    color: var(--a);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }
  .half-half-product-copy small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.4;
  }
  .half-half-product-remove {
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 11px;
    border: 1px solid #efd5cf;
    border-radius: 8px;
    color: #a53d2d;
    background: #fff8f6;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }
  .half-half-product-remove svg {
    width: 15px;
    height: 15px;
  }
  .half-half-product-remove:hover {
    border-color: #dca99e;
    background: #fcece7;
  }
  button:focus-visible,
  select:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 35%, transparent);
    outline-offset: 2px;
  }
  .product-selector-empty {
    margin-top: 14px;
    padding: 16px;
    border: 1px dashed #ded7cf;
    border-radius: 9px;
    color: var(--muted);
    background: #fcfbf9;
    font-size: 11px;
    line-height: 1.5;
    text-align: center;
  }
  @media (max-width: 600px) {
    padding: 10px;
    .half-half-product-card {
      grid-template-columns: 40px minmax(0, 1fr) auto;
      gap: 8px;
      padding: 8px;
    }
    .half-half-product-image {
      width: 40px;
      height: 40px;
    }
    .half-half-product-remove {
      padding: 0;
    }
    .half-half-product-remove > span {
      display: none;
    }
  }
`;
