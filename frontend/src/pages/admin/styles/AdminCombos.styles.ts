import styled from 'styled-components';

export const Workspace = styled.section`
  display: grid;
  gap: 18px;
`;

export const Feedback = styled.div<{ $tone: 'error' | 'success' }>`
  padding: 14px 16px;
  border-radius: 10px;
  color: ${({ $tone }) => ($tone === 'error' ? '#a33' : '#067647')};
  background: ${({ $tone }) => ($tone === 'error' ? '#fff1f0' : '#ecfdf3')};
  font-size: 13px;
  line-height: 1.5;
`;

export const Hero = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  padding: 22px;
  border: 1px solid #e7e8ec;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff 0%, #fff7f1 100%);

  h2 {
    margin: 0 0 6px;
    font-size: 24px;
  }
  p {
    margin: 0;
    color: #68707b;
    max-width: 700px;
    line-height: 1.5;
  }
  button {
    border: 0;
    border-radius: 12px;
    padding: 12px 16px;
    cursor: pointer;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--brand, #d64d08);
    color: #fff;
    white-space: nowrap;
  }

  @media (max-width: 700px) {
    align-items: stretch;
    flex-direction: column;
    button {
      justify-content: center;
      width: 100%;
    }
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.article`
  overflow: hidden;
  border: 1px solid #e8e9ed;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(30, 34, 45, 0.06);

  .image {
    aspect-ratio: 16 / 10;
    background: #f4f5f7;
    position: relative;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .placeholder {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      color: #9aa0aa;
    }
    .status {
      position: absolute;
      left: 12px;
      top: 12px;
      padding: 6px 9px;
      border-radius: 999px;
      background: rgba(17, 24, 39, 0.84);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      backdrop-filter: blur(8px);
    }
  }
  .body {
    padding: 16px;
    display: grid;
    gap: 10px;
  }
  h3 {
    margin: 0;
    font-size: 18px;
  }
  p {
    margin: 0;
    color: #737985;
    line-height: 1.45;
    min-height: 40px;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
  }
  .price {
    font-size: 19px;
    font-weight: 900;
    color: #17191f;
  }
  .groups {
    color: #737985;
    font-size: 12px;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }
  button {
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    padding: 10px 12px;
    background: #fff;
    cursor: pointer;
    font-weight: 800;
  }
  button.primary {
    background: #17191f;
    color: #fff;
    border-color: #17191f;
  }
  button.danger {
    color: #b42318;
  }
`;

export const Empty = styled.div`
  border: 1px dashed #cfd3da;
  border-radius: 18px;
  padding: 42px 24px;
  text-align: center;
  background: #fafbfc;
  h3 {
    margin: 10px 0 6px;
  }
  p {
    margin: 0 auto;
    color: #747b86;
    max-width: 560px;
    line-height: 1.5;
  }
`;

export const Overlay = styled.div<{ $brand: string }>`
  --brand: ${({ $brand }) => $brand};
  position: fixed;
  inset: 0;
  /* Keep the modal above the admin assistant, below confirmation dialogs. */
  z-index: 9400;
  display: grid;
  background: #fbfaf8;
  color: #2e2925;
`;

export const Editor = styled.form`
  width: 100%;
  height: 100%;
  height: 100dvh;
  min-width: 0;
  min-height: 0;
  background: #fbfaf8;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  font: inherit;

  .head {
    background: #fff;
    border-bottom: 1px solid #e6ded7;
    padding: 20px 32px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }
  .head-kicker {
    display: block;
    margin-bottom: 6px;
    color: var(--brand);
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.08em;
  }
  .head h2 {
    margin: 0;
    font-size: 22px;
  }
  .head p {
    margin: 3px 0 0;
    color: #737985;
    font-size: 13px;
  }
  .close {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 1px solid #e6ded7;
    background: #fcfbf9;
    border-radius: 10px;
    width: 44px;
    height: 44px;
    cursor: pointer;
  }
  .content {
    min-width: 0;
    min-height: 0;
    margin: 0;
    border: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 24px 32px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
    align-content: start;
    align-items: start;
    gap: 20px;
  }
  .content > .combo-guide,
  .content > .feedback,
  .content > .section:last-child {
    grid-column: 1 / -1;
  }
  .section {
    min-width: 0;
    border: 1px solid #e6ded7;
    border-radius: 14px;
    padding: 20px;
    display: grid;
    gap: 16px;
    background: #fff;
  }
  .section > header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
  }
  .section h3 {
    margin: 0;
    font-size: 17px;
  }
  .section header p {
    margin: 4px 0 0;
    color: #767d88;
    font-size: 13px;
    line-height: 1.4;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  label {
    min-width: 0;
    display: grid;
    gap: 6px;
    font-size: 12px;
    font-weight: 800;
    color: #514943;
  }
  input,
  textarea,
  select {
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    padding: 11px 12px;
    background: #fff;
    font: inherit;
    color: #17191f;
  }
  textarea {
    min-height: 90px;
    resize: vertical;
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  .feedback:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--brand) 35%, transparent);
    outline-offset: 2px;
  }
  input[type='checkbox'] {
    accent-color: var(--brand);
  }
  .quantity-field {
    width: 80px;
    font-size: 10px;
  }
  .quantity-field input {
    min-height: 44px;
    padding: 8px;
    text-align: center;
  }
  .product-warning {
    color: #a33;
    font-size: 10px;
    font-weight: 750;
  }
  .photo {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 16px;
    align-items: start;
  }
  .photo-preview {
    aspect-ratio: 1;
    border-radius: 14px;
    overflow: hidden;
    background: #f2f3f5;
    border: 1px dashed #cdd1d8;
    display: grid;
    place-items: center;
    color: #8b919b;
  }
  .photo-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .photo-actions {
    display: grid;
    gap: 8px;
  }
  .photo-actions button,
  .add-group,
  .add-option {
    border: 1px solid #dfe2e7;
    border-radius: 10px;
    padding: 10px 12px;
    background: #fff;
    cursor: pointer;
    font-weight: 800;
    display: inline-flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
  }
  .photo-actions button.ai {
    background: #17191f;
    color: #fff;
    border-color: #17191f;
  }
  .hint {
    padding: 10px 12px;
    border-radius: 10px;
    background: #f7f8fa;
    color: #6e7580;
    font-size: 12px;
    line-height: 1.45;
  }
  .group {
    border: 1px solid #e8e9ed;
    border-radius: 14px;
    padding: 14px;
    display: grid;
    gap: 12px;
    background: #fcfcfd;
  }
  .group-head {
    display: grid;
    grid-template-columns: 1fr 105px 105px auto;
    gap: 8px;
    align-items: end;
  }
  .option {
    display: grid;
    grid-template-columns: minmax(170px, 1fr) 90px 80px 80px 80px auto auto;
    gap: 8px;
    align-items: end;
    padding: 10px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid #eceef1;
  }
  .option .fixed {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 10px;
    white-space: nowrap;
  }
  .option .fixed input {
    width: auto;
  }
  .icon-button {
    border: 0;
    background: transparent;
    color: #a33;
    cursor: pointer;
    padding: 10px;
  }
  .footer {
    background: #fff;
    border-top: 1px solid #e6ded7;
    padding: 14px 32px max(14px, env(safe-area-inset-bottom));
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: flex-end;
  }
  .footer-summary {
    display: grid;
    gap: 3px;
    margin-right: auto;
  }
  .footer-summary span {
    font-size: 11px;
    color: #7a7067;
  }
  .footer-summary strong {
    color: var(--brand);
    font-size: 20px;
    font-weight: 850;
  }
  .footer button {
    min-height: 44px;
    border-radius: 9px;
    padding: 11px 16px;
    font-weight: 800;
    cursor: pointer;
  }
  .footer .secondary {
    background: #fff;
    border: 1px solid #dfe2e7;
  }
  .footer .save {
    background: var(--brand, #d64d08);
    border: 1px solid var(--brand, #d64d08);
    color: #fff;
  }
  .feedback {
    padding: 11px 13px;
    border-radius: 11px;
    font-size: 13px;
  }
  .feedback.error {
    background: #fff1f0;
    color: #a33;
  }
  .feedback.success {
    background: #ecfdf3;
    color: #067647;
  }

  .combo-guide {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px 15px;
    border: 1px solid #f1dccf;
    border-radius: 14px;
    background: #fff8f3;
    color: #5b463a;
  }
  .combo-guide svg {
    flex: 0 0 auto;
    margin-top: 2px;
  }
  .combo-guide strong {
    display: block;
    margin-bottom: 4px;
    color: #2d2723;
  }
  .combo-guide p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
  }

  .step {
    display: inline-flex;
    margin-bottom: 6px;
    padding: 4px 7px;
    border-radius: 999px;
    background: #fff2e8;
    color: #b84f1c;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  label > small {
    color: #7a8089;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.35;
  }

  .toggle-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .toggle-card {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 12px;
    border: 1px solid #e4e6ea;
    border-radius: 12px;
    background: #fafbfc;
  }
  .toggle-card input {
    width: auto;
    margin-top: 2px;
  }
  .toggle-card span {
    display: grid;
    gap: 2px;
  }
  .toggle-card b {
    font-size: 12px;
    color: #262a30;
  }
  .toggle-card small {
    color: #7b818a;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.35;
  }

  .product-picker {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: end;
  }
  .add-selected-product {
    min-height: 44px;
    border: 0;
    border-radius: 11px;
    padding: 0 14px;
    background: var(--brand, #d64d08);
    color: #fff;
    font-weight: 900;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    justify-content: center;
  }
  .add-selected-product:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .selected-products {
    display: grid;
    gap: 8px;
    border: 1px solid #e7e9ed;
    border-radius: 13px;
    padding: 12px;
    background: #fafbfc;
  }
  .selected-products-head {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #16794b;
    font-size: 12px;
    margin-bottom: 2px;
  }
  .selected-product {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto auto;
    gap: 10px;
    align-items: center;
    padding: 9px;
    border: 1px solid #eceef1;
    border-radius: 11px;
    background: #fff;
  }
  .selected-product-image {
    width: 48px;
    height: 48px;
    border-radius: 9px;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: #f1f2f4;
    color: #8c929c;
  }
  .selected-product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .selected-product-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .selected-product-copy b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }
  .selected-product-copy small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #7d838c;
    font-size: 11px;
  }
  .selected-product-price {
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
  }
  .selected-product > button {
    min-width: 44px;
    min-height: 44px;
    display: grid;
    place-items: center;
    border: 1px solid #efd5cf;
    border-radius: 8px;
    background: #fff8f6;
    color: #b42318;
    cursor: pointer;
    padding: 8px;
  }

  .empty-products {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    padding: 12px;
    border: 1px dashed #d9dce2;
    border-radius: 11px;
    background: #fafbfc;
    color: #6f7680;
    font-size: 12px;
    line-height: 1.45;
  }

  .photo-empty {
    display: grid;
    gap: 6px;
    justify-items: center;
    color: #969ca5;
    font-size: 12px;
    font-weight: 700;
  }
  .hint b {
    color: #40454c;
  }

  @media (max-width: 1000px) {
    .content {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 760px) {
    .head {
      padding: 16px;
    }
    .head h2 {
      font-size: 20px;
    }
    .content {
      padding: 16px;
    }
    .section {
      padding: 14px;
    }
    .grid2,
    .photo,
    .toggle-grid,
    .product-picker {
      grid-template-columns: 1fr;
    }
    .photo-preview {
      max-width: 240px;
      width: 100%;
    }
    .group-head {
      grid-template-columns: 1fr 1fr;
    }
    .group-head > label:first-child {
      grid-column: 1 / -1;
    }
    .option {
      grid-template-columns: 1fr 1fr;
    }
    .option > label:first-child {
      grid-column: 1 / -1;
    }
    .option .fixed {
      align-self: center;
    }
    .selected-product {
      grid-template-columns: 44px minmax(0, 1fr) auto;
    }
    .selected-product-price,
    .quantity-field {
      grid-column: 2 / 3;
    }
    .selected-product > button {
      grid-column: 3;
      grid-row: 1 / span 2;
    }
    .footer {
      padding: 12px 16px max(12px, env(safe-area-inset-bottom));
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .footer-summary {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
  }
`;
