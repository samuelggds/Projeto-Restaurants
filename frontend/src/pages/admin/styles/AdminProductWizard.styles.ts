import styled from 'styled-components';
import { ProductFormSection } from './AdminProductFormExperience.styles';

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
  .customization-overview {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(230px, 0.72fr) minmax(0, 1.5fr);
    align-items: center;
    gap: 24px;
    padding: 16px 18px;
    border-top: 1px solid #e4ddd6;
    border-bottom: 1px solid #e4ddd6;
    background: #f8f6f3;
  }
  .customization-overview > header {
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  .customization-overview > header small,
  .customization-start > header small,
  .customization-actions > div > small {
    color: var(--a);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.07em;
  }
  .customization-overview h4,
  .customization-start h4 {
    margin: 0;
    color: #312c28;
    font-size: 15px;
  }
  .customization-overview p,
  .customization-start p {
    margin: 0;
    color: #726a63;
    font-size: 11px;
    line-height: 1.5;
  }
  .customization-steps {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .customization-steps > li {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 9px;
    padding: 7px 12px;
    color: #817971;
  }
  .customization-steps > li + li {
    border-left: 1px solid #ded6cf;
  }
  .customization-steps i {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 1px solid #d8d0c9;
    border-radius: 50%;
    color: #766e67;
    background: #fff;
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }
  .customization-steps i svg {
    width: 15px;
  }
  .customization-steps > li > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .customization-steps b {
    color: #5d554e;
    font-size: 11px;
  }
  .customization-steps small {
    overflow-wrap: anywhere;
    color: #8a827a;
    font-size: 10px;
    line-height: 1.35;
  }
  .customization-steps > li.active i {
    border-color: var(--a);
    color: #fff;
    background: var(--a);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }
  .customization-steps > li.active b {
    color: #312c28;
  }
  .customization-steps > li.complete i {
    border-color: #2e8050;
    color: #fff;
    background: #2e8050;
  }
  .customization-steps > li.complete b {
    color: #225f3d;
  }
  .customization-start {
    min-width: 0;
    display: grid;
    gap: 15px;
    padding: 18px;
    border: 1px solid #ded7d0;
    border-radius: 8px;
    background: #fff;
  }
  .customization-start > header {
    display: grid;
    gap: 4px;
  }
  .customization-start-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 2px;
  }
  .customization-start-footer > span {
    color: #7a726b;
    font-size: 10px;
  }
  .customization-start-footer > button {
    min-height: 34px;
    border: 1px solid #d9d0c8;
    border-radius: 7px;
    padding: 0 11px;
    color: #554c45;
    background: #fff;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
  .customization-prerequisite {
    border-style: solid;
    border-color: #e2c89c;
    background: #fffaf0;
  }
  .customization-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 2px 0;
  }
  .customization-actions > div {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .customization-actions b {
    font-size: 13px;
  }
  .customization-actions span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
  @media (max-width: 600px) {
    .customization-overview {
      grid-template-columns: 1fr;
      gap: 14px;
      padding: 15px;
    }
    .customization-steps {
      grid-template-columns: 1fr;
    }
    .customization-steps > li {
      padding: 8px 0;
    }
    .customization-steps > li + li {
      border-top: 1px solid #ded6cf;
      border-left: 0;
    }
    .customization-start {
      padding: 14px;
    }
    .customization-start-footer {
      align-items: stretch;
      flex-direction: column;
    }
    .customization-start-footer > button {
      width: 100%;
    }
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
