import styled from 'styled-components';

export const ProductOptionConfiguration = styled.section`
  margin: 0 14px 14px;
  overflow: hidden;
  border: 1px solid #ddd6cf;
  border-radius: 13px;
  background: #fff;
  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 13px;
    color: #fff;
    background: #2a3a43;
  }
  > header > div {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  > header b,
  > header span,
  > header small {
    font-size: 11px;
  }
  > header span,
  > header small {
    color: rgba(255, 255, 255, 0.7);
  }
  .configured-option-list {
    display: grid;
    gap: 10px;
    padding: 11px;
    background: #f7f5f2;
  }
  .configured-option-list > article {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(210px, 0.8fr) minmax(250px, 1.2fr);
    gap: 11px 13px;
    padding: 12px;
    border: 1px solid #e2dbd4;
    border-radius: 11px;
    background: #fff;
  }
  .configured-option-title {
    grid-column: 1 / -1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 9px;
    border-bottom: 1px solid #eee8e2;
  }
  .configured-option-title > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .configured-option-title b {
    font-size: 12px;
  }
  .configured-option-title small {
    color: var(--muted);
    font-size: 10px;
  }
  .active-option-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #176a39;
    font-size: 11px;
    font-weight: 800;
  }
  .pricing-mode {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .advanced-question {
    grid-column: 1 / -1;
    color: #5d554e;
    font-size: 10px;
    font-weight: 850;
  }
  .pricing-mode button {
    min-width: 0;
    min-height: 50px;
    display: grid;
    gap: 2px;
    padding: 7px 9px;
    border: 1px solid #dfd8d1;
    border-radius: 9px;
    color: #514943;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }
  .pricing-mode button.active {
    border-color: var(--a);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, #fff);
  }
  .pricing-mode b,
  .pricing-mode small {
    font-size: 10px;
  }
  .pricing-mode small {
    color: var(--muted);
  }
  .option-price-field {
    min-width: 0;
    display: grid;
    gap: 5px;
    color: #514943;
    font-size: 10px;
    font-weight: 800;
  }
  .option-price-field > span {
    height: 50px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 7px;
    padding: 0 10px;
    border: 1px solid #ddd4cc;
    border-radius: 9px;
    color: #71675f;
    background: #fff;
    font-size: 11px;
  }
  .option-price-field input {
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    font-weight: 800;
  }
  .option-behavior {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
  }
  .option-behavior > label {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    gap: 7px;
    padding: 9px;
    border: 1px solid #e5ded7;
    border-radius: 9px;
    background: #faf9f7;
  }
  .option-behavior span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .option-behavior b,
  .option-behavior small {
    font-size: 10px;
  }
  .option-behavior small {
    color: var(--muted);
    line-height: 1.3;
  }
  .quantity-rules {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 120px));
    gap: 8px;
    padding: 10px;
    border: 1px solid #dfd9d2;
    border-radius: 9px;
    background: #faf8f5;
  }
  .quantity-rules label {
    display: grid;
    gap: 4px;
    color: #615850;
    font-size: 10px;
    font-weight: 800;
  }
  .quantity-rules input {
    width: 100%;
    height: 36px;
    border: 1px solid #dcd4cc;
    border-radius: 8px;
    padding: 0 8px;
    background: #fff;
  }
  @media (max-width: 720px) {
    .configured-option-list > article {
      grid-template-columns: 1fr;
    }
    .configured-option-title,
    .option-behavior,
    .quantity-rules {
      grid-column: 1;
    }
    .option-behavior {
      grid-template-columns: 1fr;
    }
  }
`;

export const ProductConfigurationLayout = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(310px, 350px);
  gap: 18px;
  align-items: start;
  .configuration-groups {
    min-width: 0;
    display: grid;
    gap: 12px;
  }
  .configuration-preview {
    min-width: 0;
    position: sticky;
    top: 84px;
  }
  .configuration-preview > aside {
    width: 100%;
  }
  .configuration-list {
    gap: 8px;
  }
  .configuration-list > article > header {
    grid-template-columns: auto minmax(125px, 1fr) 72px minmax(120px, 0.9fr) auto auto;
    gap: 9px;
    padding: 10px 12px;
    background: #fff;
  }
  .configuration-list .group-complete > header {
    background: #fff;
  }
  .configuration-list .group-number {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 8%, white);
  }
  .configuration-list .group-copy {
    min-width: 0;
  }
  .configuration-list .group-copy > b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .configuration-list .group-kicker,
  .configuration-list .group-summary {
    display: none;
  }
  .group-selection-summary {
    display: grid;
    gap: 2px;
  }
  .group-selection-summary small {
    color: #847b73;
    font-size: 8px;
  }
  .group-selection-summary span {
    color: #3f3934;
    font-size: 8px;
    white-space: nowrap;
  }
  .group-option-preview {
    min-width: 0;
    display: flex;
    gap: 4px;
    overflow: hidden;
  }
  .group-option-preview span {
    overflow: hidden;
    max-width: 74px;
    padding: 5px 7px;
    border: 1px solid #e8e1da;
    border-radius: 5px;
    color: #615a54;
    background: #fff;
    font-size: 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .configuration-list .group-state {
    min-height: 26px;
    border-radius: 5px;
    padding: 0 7px;
    font-size: 8px;
  }
  .configuration-list .group-order-actions {
    display: none;
  }
  .configuration-list .edit-group {
    min-height: 30px;
  }
  .configuration-list .remove-group {
    width: 30px;
    height: 30px;
  }
  @media (max-width: 980px) {
    grid-template-columns: minmax(0, 1fr) minmax(290px, 320px);
    .configuration-list > article > header {
      grid-template-columns: auto minmax(120px, 1fr) 65px auto auto;
    }
    .group-option-preview {
      display: none;
    }
  }
  @media (max-width: 880px) {
    grid-template-columns: 1fr;
    .configuration-preview {
      position: static;
    }
    .configuration-list > article > header {
      grid-template-columns: auto minmax(0, 1fr) auto;
    }
    .group-selection-summary,
    .configuration-list .group-state {
      display: none;
    }
  }
`;
