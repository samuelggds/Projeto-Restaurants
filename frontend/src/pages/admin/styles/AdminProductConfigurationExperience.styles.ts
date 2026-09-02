import styled from 'styled-components';

export const ProductConfigurationLayout = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 16px;
  align-items: start;
  .configuration-groups {
    min-width: 0;
    display: grid;
    gap: 12px;
  }
  .configuration-preview {
    min-width: 0;
    position: sticky;
    top: 96px;
  }
  .configuration-preview > aside {
    display: grid;
    grid-template-columns: 1fr;
    border-radius: 8px;
    background: #fff;
  }
  .configuration-preview > aside > header {
    grid-column: 1;
    padding: 12px 14px;
    border-bottom: 1px solid #e7e1da;
    color: #2a2622;
    background: #fff;
  }
  .configuration-preview > aside > header > svg {
    color: var(--a);
  }
  .configuration-preview > aside > header span {
    color: #777069;
  }
  .configuration-preview .customer-preview-product {
    border-right: 0;
    border-bottom: 1px solid #e7e1da;
  }
  .configuration-preview .customer-preview-steps {
    overflow: visible;
    display: grid;
    gap: 0;
    padding: 9px 13px 14px;
  }
  .configuration-preview .customer-preview-steps > div {
    min-height: 52px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
    padding: 9px 0;
    border: 0;
    border-bottom: 1px solid #eee8e2;
    border-radius: 0;
    background: transparent;
  }
  .configuration-preview .customer-preview-steps > div:last-child {
    border-bottom: 0;
  }
  .configuration-preview .customer-preview-steps > div.ready {
    background: transparent;
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
    grid-template-columns: minmax(0, 1fr) 250px;
    .configuration-list > article > header {
      grid-template-columns: auto minmax(120px, 1fr) 65px auto auto;
    }
    .group-option-preview {
      display: none;
    }
  }
  @media (max-width: 790px) {
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
