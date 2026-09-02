import styled from 'styled-components';
import { ProductFormSection } from './AdminProductForm.styles';

export const ProductWizardStepSection = styled(ProductFormSection)`
  .guided-fields {
    width: min(100%, 620px);
    display: grid;
    gap: 16px;
  }
  .guided-price-field {
    width: min(100%, 360px);
  }
  .guided-money-input {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    overflow: hidden;
    border: 1px solid #d8cfc7;
    border-radius: 9px;
    background: #fff;
  }
  .guided-money-input:focus-within {
    border-color: var(--a);
  }
  .guided-money-input > span {
    padding-left: 13px;
    color: #554c45;
    font-size: 13px;
    font-weight: 800;
  }
  .guided-money-input > input {
    border: 0;
  }
  .appearance-card-preview {
    min-width: 0;
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #e2dad3;
    border-radius: 8px;
    background: #fff;
  }
  .appearance-card-preview > img,
  .appearance-card-preview > svg {
    width: 72px;
    height: 72px;
    border-radius: 7px;
    object-fit: cover;
  }
  .appearance-card-preview > svg {
    padding: 19px;
    color: var(--a);
    background: #f6eee8;
  }
  .appearance-card-preview > span {
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  .appearance-card-preview small {
    overflow: hidden;
    color: var(--muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .appearance-card-preview strong {
    color: var(--a);
    font-size: 12px;
  }
  .field-error {
    color: #a3261d !important;
    font-weight: 750 !important;
    text-align: left !important;
  }
  .ingredient-examples {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .ingredient-examples span {
    padding: 6px 9px;
    border: 1px solid #e2dad3;
    border-radius: 8px;
    color: #635950;
    background: #faf8f5;
    font-size: 10px;
    font-weight: 750;
  }
  .review-product-heading {
    min-width: 0;
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 15px;
    border: 1px solid #ddd6cf;
    border-radius: 13px;
    background: #faf8f5;
  }
  .review-product-heading > img,
  .review-product-heading > svg {
    width: 64px;
    height: 64px;
    border-radius: 10px;
    object-fit: cover;
  }
  .review-product-heading > svg {
    padding: 17px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
  }
  .review-product-heading > div {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .review-product-heading h4 {
    overflow-wrap: anywhere;
    margin: 0;
    font-size: 18px;
  }
  .review-product-heading small {
    color: var(--muted);
    font-size: 10px;
  }
  .review-product-heading strong {
    color: var(--a);
    font-size: 12px;
  }
  .review-product-heading > span {
    padding: 7px 9px;
    border-radius: 8px;
    color: #315061;
    background: #e7eff2;
    font-size: 10px;
    font-weight: 850;
  }
  .review-sections {
    display: grid;
    gap: 8px;
  }
  .review-sections > article {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: 10px;
    padding: 12px;
    border: 1px solid #e5ded7;
    border-radius: 11px;
    background: #fff;
  }
  .review-sections > article > svg {
    width: 18px;
    color: #16703a;
  }
  .review-sections article > div {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .review-sections b,
  .review-sections span,
  .review-sections li {
    font-size: 11px;
  }
  .review-sections span,
  .review-sections li {
    color: var(--muted);
  }
  .review-sections ol {
    display: grid;
    gap: 3px;
    margin: 5px 0 0;
    padding-left: 18px;
  }
  .review-sections button,
  .customer-preview-toggle {
    min-height: 34px;
    border: 1px solid #ded7cf;
    border-radius: 8px;
    padding: 0 10px;
    color: var(--a);
    background: #fff;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
  .customer-preview-toggle {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .customer-preview-toggle svg {
    width: 15px;
  }
  .customer-product-preview {
    display: grid;
    gap: 12px;
    padding: 15px;
    border: 1px solid #d9e0e1;
    border-radius: 13px;
    background: #f7faf9;
  }
  .customer-product-preview > div {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .customer-product-preview img,
  .customer-product-preview > div > svg {
    width: 72px;
    height: 72px;
    border-radius: 10px;
    object-fit: cover;
  }
  .customer-product-preview > div > span {
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  .customer-product-preview b,
  .customer-product-preview small,
  .customer-product-preview strong,
  .customer-product-preview li span {
    font-size: 11px;
  }
  .customer-product-preview small,
  .customer-product-preview li span {
    color: var(--muted);
  }
  .customer-product-preview ol {
    display: grid;
    gap: 7px;
    margin: 0;
    padding-left: 20px;
  }
  .advanced-template-settings {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #d8dfe1;
    border-radius: 8px;
    background: #f8faf9;
  }
  .advanced-template-settings > summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    color: #34464f;
    font-size: 11px;
    font-weight: 850;
    list-style: none;
    cursor: pointer;
  }
  .advanced-template-settings > summary::-webkit-details-marker {
    display: none;
  }
  .advanced-template-settings > summary > span {
    color: var(--a);
    font-size: 10px;
  }
  .advanced-template-settings > section {
    border: 0;
    border-top: 1px solid #d8dfe1;
    border-radius: 0;
  }
  .customization-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
  }
  .customization-actions > div {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .customization-actions b {
    font-size: 12px;
  }
  .customization-actions span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
  @media (max-width: 600px) {
    .customization-actions {
      grid-template-columns: 1fr;
    }
    .review-product-heading {
      grid-template-columns: 52px minmax(0, 1fr);
    }
    .review-product-heading > img,
    .review-product-heading > svg {
      width: 52px;
      height: 52px;
    }
    .review-product-heading > span {
      grid-column: 1 / -1;
      justify-self: start;
    }
    .review-sections > article {
      grid-template-columns: auto minmax(0, 1fr);
    }
    .review-sections > article > button {
      grid-column: 2;
      justify-self: start;
    }
  }
`;
