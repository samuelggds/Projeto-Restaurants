import styled from 'styled-components';

export const ProductOptionGroupList = styled.div`
  display: grid;
  gap: 17px;
  > article {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #e3dcd5;
    border-radius: 8px;
    background: #fdfcfb;
    box-shadow: 0 7px 20px rgba(38, 29, 23, 0.035);
  }
  > article.group-complete {
    border-color: color-mix(in srgb, #20804a 42%, #e3dcd5);
  }
  > article > header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid #eee8e2;
    background: #faf7f4;
  }
  .group-complete > header {
    background: linear-gradient(90deg, #f4faf6, #faf7f4 58%);
  }
  .group-number {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: #fff;
    background: #263640;
    font-size: 11px;
    font-weight: 900;
  }
  header b {
    display: block;
    font-size: 12px;
  }
  header span {
    color: var(--muted);
    font-size: 11px;
  }
  .group-kicker {
    display: block;
    margin-bottom: 3px;
    color: var(--a);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.07em;
  }
  header .group-summary {
    display: block;
    margin-top: 3px;
    color: #76574a;
    font-size: 11px;
    line-height: 1.35;
  }
  .group-state {
    min-height: 29px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 0 9px;
    color: #7b5b4b;
    background: #efe8e2;
    font-size: 11px;
    font-weight: 850;
    white-space: nowrap;
  }
  .group-state svg {
    width: 14px;
  }
  .group-complete .group-state {
    color: #176a39;
    background: #ddf0e3;
  }
  .remove-group {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 1px solid #ead5d3;
    border-radius: 9px;
    color: #b42318;
    background: #fff;
    cursor: pointer;
  }
  .remove-group svg {
    width: 15px;
  }
  .group-tools,
  .group-order-actions {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .edit-group {
    min-height: 34px;
    border: 1px solid color-mix(in srgb, var(--a) 35%, #ded7cf);
    border-radius: 8px;
    padding: 0 11px;
    color: var(--a);
    background: #fff;
    font-size: 10px;
    font-weight: 850;
    cursor: pointer;
  }
  .edit-group[aria-expanded='true'] {
    color: #fff;
    background: var(--a);
  }
  .group-order-actions button {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 1px solid #ded7cf;
    border-radius: 8px;
    color: #655c54;
    background: #fff;
    cursor: pointer;
  }
  .group-order-actions button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .group-order-actions svg {
    width: 14px;
  }
  .group-options > legend {
    width: calc(100% - 12px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .group-options > legend > button {
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid color-mix(in srgb, var(--a) 35%, #ded7cf);
    border-radius: 8px;
    padding: 0 9px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 4%, #fff);
    font-size: 10px;
    font-weight: 850;
    cursor: pointer;
  }
  .group-options > legend > button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .group-options > legend svg {
    width: 12px;
  }
  .group-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 16px;
  }
  .group-editor {
    padding-bottom: 2px;
    background: #fff;
    animation: reveal-group-editor 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .group-editor-intro {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 14px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid #ece5de;
  }
  .group-editor-intro > i {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: var(--a);
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }
  .group-editor-intro > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .group-editor-intro b {
    color: #3d3732;
    font-size: 12px;
  }
  .group-editor-intro small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.4;
  }
  .guided-step-heading {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    margin: 16px 14px 0;
    padding: 12px;
    border: 1px solid #e2dad3;
    border-radius: 8px;
    background: #f8f6f3;
  }
  .guided-step-heading > i {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: #34464f;
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }
  .guided-step-heading > span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .guided-step-heading b {
    color: #342f2b;
    font-size: 12px;
  }
  .guided-step-heading small {
    color: #716860;
    font-size: 10px;
    line-height: 1.45;
  }
  .guided-step-heading > em {
    justify-self: end;
    padding: 5px 7px;
    border-radius: 5px;
    color: #216440;
    background: #e4f2e8;
    font-size: 9px;
    font-style: normal;
    font-weight: 850;
    white-space: nowrap;
  }
  .guided-step-heading > em.pending {
    color: #8b4b2e;
    background: #f9e9df;
  }
  .group-fields small {
    color: var(--muted);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.35;
  }
  .choice-mode-field {
    min-width: 0;
    display: grid;
    gap: 7px;
    margin: 12px 14px;
  }
  .choice-mode-field > b {
    color: #514943;
    font-size: 11px;
  }
  .choice-mode-field > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .choice-mode-field button {
    min-width: 0;
    min-height: 62px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 9px;
    padding: 9px 11px;
    border: 1px solid #ded7cf;
    border-radius: 11px;
    color: #514943;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }
  .choice-mode-field button.active {
    border-color: color-mix(in srgb, var(--a) 45%, #ded7cf);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 6%, white);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 7%, transparent);
  }
  .choice-mode-field button > i {
    width: 29px;
    height: 29px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }
  .choice-mode-field button > span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .choice-mode-field button b {
    font-size: 11px;
  }
  .choice-mode-field button small {
    color: var(--muted);
    font-size: 11px;
  }
  .legacy-category-warning {
    display: grid;
    gap: 3px;
    margin: 0 14px 12px;
    padding: 10px 12px;
    border: 1px solid #edc58f;
    border-radius: 10px;
    color: #7a4915;
    background: #fff8e8;
  }
  .legacy-category-warning b {
    font-size: 11px;
  }
  .legacy-category-warning span {
    font-size: 11px;
    line-height: 1.45;
  }
  .category-change-confirm {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 9px;
    margin: 0 14px 12px;
    padding: 11px 12px;
    border: 1px solid #e8b995;
    border-radius: 10px;
    background: #fff7f0;
  }
  .category-change-confirm > div {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .category-change-confirm b {
    font-size: 11px;
  }
  .category-change-confirm span {
    color: #73584a;
    font-size: 11px;
    line-height: 1.4;
  }
  .category-change-confirm button {
    min-height: 34px;
    border: 1px solid #ded2c8;
    border-radius: 8px;
    padding: 0 10px;
    color: #4b423b;
    background: #fff;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }
  .category-change-confirm .confirm-category-change {
    border-color: #b94d2c;
    color: #fff;
    background: #b94d2c;
  }
  .required-choice {
    display: grid;
    gap: 8px;
    margin: 0 14px 12px;
  }
  .required-choice > b {
    color: #514943;
    font-size: 11px;
  }
  .required-choice > div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .required-choice button {
    min-width: 0;
    display: grid;
    gap: 3px;
    padding: 10px 11px;
    border: 1px solid #ded7cf;
    border-radius: 8px;
    color: #514943;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }
  .required-choice button.active {
    border-color: color-mix(in srgb, var(--a) 45%, #ded7cf);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 6%, white);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 7%, transparent);
  }
  .required-choice button b,
  .required-choice button small {
    font-size: 10px;
  }
  .required-choice button small {
    color: var(--muted);
    line-height: 1.35;
  }
  .advanced-settings {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #ded7cf;
    border-radius: 8px;
    background: #faf9f7;
  }
  .advanced-settings > summary {
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 12px;
    color: #5a514a;
    font-size: 10px;
    font-weight: 850;
    list-style: none;
    cursor: pointer;
  }
  .advanced-settings > summary::-webkit-details-marker {
    display: none;
  }
  .advanced-settings > summary::after {
    content: '+';
    color: var(--a);
    font-size: 18px;
    font-weight: 500;
  }
  .advanced-settings[open] > summary::after {
    content: '−';
  }
  .advanced-settings[open] > summary {
    border-bottom: 1px solid #e5ded7;
    background: #f5f2ee;
  }
  .group-limits {
    margin: 0 14px 12px;
  }
  .group-limits .group-rules {
    grid-template-columns: minmax(180px, 1fr) auto auto;
    padding: 12px;
  }
  .option-settings {
    margin: 0 14px 14px;
  }
  .option-settings > section {
    margin: 0;
    border: 0;
    border-radius: 0;
  }
  .group-rules {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) auto auto auto;
    align-items: end;
    gap: 10px;
    padding: 0 14px 14px;
  }
  .rule-heading {
    min-width: 0;
    display: grid;
    align-self: center;
    gap: 3px;
  }
  .rule-heading b {
    font-size: 11px;
  }
  .rule-heading span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
  .group-rules label {
    display: grid;
    gap: 5px;
    color: #514943;
    font-size: 11px;
    font-weight: 800;
  }
  .group-rules input[type='number'] {
    width: 78px;
    height: 36px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    padding: 0 9px;
    background: #fff;
  }
  .required-toggle {
    min-height: 36px;
    display: flex !important;
    flex-direction: row;
    align-items: center;
    gap: 7px !important;
    padding: 0 11px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    background: #fff;
  }
  .customer-rule-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 14px 12px;
    padding: 10px 12px;
    border: 1px solid #d9e2e4;
    border-radius: 10px;
    color: #4b5c64;
    background: #f4f8f8;
    font-size: 11px;
    line-height: 1.45;
  }
  .customer-rule-summary > svg {
    flex: 0 0 auto;
    width: 17px;
    color: #26728a;
  }
  .required-toggle input {
    accent-color: var(--a);
  }
  .required-toggle[data-required='true'] {
    border-color: color-mix(in srgb, var(--a) 35%, #ded7cf);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 6%, white);
  }
  .group-options {
    min-width: 0;
    margin: 0 14px 14px;
    padding: 11px;
    border: 1px solid #e6ded7;
    border-radius: 11px;
  }
  .group-options legend {
    padding: 0 5px;
    color: #554d47;
    font-size: 11px;
    font-weight: 900;
  }
  .group-options-hint {
    margin: 0 0 10px;
    padding: 8px 10px;
    border-radius: 8px;
    color: #6e594d;
    background: #f8f2ed;
    font-size: 11px;
    line-height: 1.45;
  }
  .source-category-section {
    display: grid;
    gap: 7px;
    padding-top: 3px;
  }
  .source-category-section + .source-category-section {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #ece5de;
  }
  .source-category-section > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .source-category-section > header b {
    color: #4d443d;
    font-size: 11px;
  }
  .source-category-section > header span {
    color: var(--muted);
    font-size: 11px;
  }
  .source-category-section > div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }
  .source-category-empty {
    padding: 13px;
    border: 1px dashed #d9cec4;
    border-radius: 9px;
    color: var(--muted);
    background: #fbf9f7;
    text-align: center;
    font-size: 11px;
  }
  .group-options label {
    min-width: 0;
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 9px;
    border: 1px solid #e8e1da;
    border-radius: 9px;
    background: #fff;
    cursor: pointer;
  }
  .group-options label.selected {
    border-color: color-mix(in srgb, var(--a) 45%, #e8e1da);
    background: color-mix(in srgb, var(--a) 6%, white);
  }
  .group-options label.inactive {
    opacity: 0.55;
  }
  .group-options input {
    accent-color: var(--a);
  }
  .ingredient-option-thumb {
    position: relative;
    overflow: hidden;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    font-size: 9px;
    font-weight: 900;
  }
  .ingredient-option-thumb > span {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .ingredient-option-thumb > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .group-options span {
    min-width: 0;
  }
  .group-options b {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
  }
  .group-options small {
    color: var(--muted);
    font-size: 11px;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 35%, transparent);
    outline-offset: 2px;
  }
  @media (max-width: 800px) {
    .group-rules {
      grid-template-columns: 1fr 1fr;
      align-items: stretch;
    }
    .group-limits .group-rules {
      grid-template-columns: 1fr;
    }
    .group-limits .group-rules input[type='number'] {
      width: 100%;
    }
    .rule-heading {
      grid-column: 1 / -1;
    }
    .required-toggle {
      min-width: 0;
    }
  }
  @media (max-width: 600px) {
    > article > header {
      grid-template-columns: auto minmax(0, 1fr) auto;
      padding: 12px;
    }
    .group-state {
      grid-column: 2;
      justify-self: start;
    }
    .group-tools {
      grid-column: 1 / -1;
      justify-content: flex-end;
      padding-top: 8px;
      border-top: 1px solid #ebe4de;
    }
    .group-fields {
      grid-template-columns: 1fr;
    }
    .guided-step-heading {
      grid-template-columns: auto minmax(0, 1fr);
    }
    .guided-step-heading > em {
      grid-column: 2;
      justify-self: start;
    }
    .choice-mode-field > div {
      grid-template-columns: 1fr;
    }
    .required-choice > div {
      grid-template-columns: 1fr;
    }
    .group-rules {
      grid-template-columns: 1fr 1fr;
      align-items: stretch;
    }
    .required-toggle {
      grid-column: 1 / -1;
      width: 100%;
      margin: 0;
    }
    .source-category-section > div {
      grid-template-columns: 1fr;
    }
    .category-change-confirm {
      grid-template-columns: 1fr 1fr;
    }
    .category-change-confirm > div {
      grid-column: 1 / -1;
    }
    .category-change-confirm button {
      width: 100%;
    }
    .group-options > legend {
      align-items: flex-start;
      flex-direction: column;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .group-editor {
      animation: none;
    }
  }
  @keyframes reveal-group-editor {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const ProductAdvancedConfiguration = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  &.composition-only {
    grid-template-columns: 1fr;
  }
  > .portion-settings {
    min-width: 0;
    grid-column: 1 / -1;
    overflow: hidden;
    border: 1px solid #dfd8d1;
    border-radius: 8px;
    background: #faf9f7;
  }
  > .portion-settings > summary {
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 14px;
    color: #514943;
    font-size: 11px;
    font-weight: 850;
    list-style: none;
    cursor: pointer;
  }
  > .portion-settings > summary::-webkit-details-marker {
    display: none;
  }
  > .portion-settings > summary > span {
    color: var(--a);
    font-size: 10px;
  }
  > .portion-settings > section {
    border: 0;
    border-top: 1px solid #dfd8d1;
    border-radius: 0;
  }
  .composition-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }
  .composition-toolbar > label {
    min-width: 0;
    height: 42px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    border: 1px solid #ddd6cf;
    border-radius: 9px;
    background: #fff;
  }
  .composition-toolbar svg {
    width: 15px;
    color: #746a62;
  }
  .composition-toolbar input {
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
  }
  .composition-toolbar > button {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 9px;
    padding: 0 12px;
    color: #fff;
    background: var(--a);
    font-size: 10px;
    font-weight: 850;
    cursor: pointer;
  }
  > section,
  > .portion-settings > section {
    min-width: 0;
    align-content: start;
    display: grid;
    gap: 12px;
    padding: 15px;
    border: 1px solid #dfd8d1;
    border-radius: 13px;
    background: #faf9f7;
  }
  > section > header,
  > .portion-settings > section > header {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  > section > header > div,
  > .portion-settings > section > header > div {
    min-width: 0;
  }
  > section > header small,
  > .portion-settings > section > header small {
    color: var(--a);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }
  > section > header h4,
  > .portion-settings > section > header h4 {
    margin: 3px 0;
    font-size: 14px;
  }
  > section > header p,
  > .portion-settings > section > header p {
    margin: 0;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.4;
  }
  > section > header > span,
  > .portion-settings > section > header > span {
    flex: 0 0 auto;
    padding: 5px 7px;
    border-radius: 8px;
    color: #665d55;
    background: #ece7e2;
    font-size: 10px;
    font-weight: 800;
  }
  .advanced-empty {
    padding: 13px;
    border: 1px dashed #d9cec4;
    border-radius: 9px;
    color: var(--muted);
    background: #fff;
    font-size: 10px;
    line-height: 1.4;
  }
  .composition-catalog {
    max-height: 390px;
    overflow-y: auto;
    display: grid;
    gap: 9px;
    padding-right: 3px;
  }
  .composition-catalog fieldset {
    min-width: 0;
    margin: 0;
    padding: 9px;
    border: 1px solid #e2dcd5;
    border-radius: 9px;
    background: #fff;
  }
  .composition-catalog legend {
    padding: 0 5px;
    color: #665c54;
    font-size: 10px;
    font-weight: 850;
  }
  .composition-catalog fieldset > div {
    display: grid;
    gap: 6px;
  }
  .composition-catalog fieldset > div > div {
    min-width: 0;
    display: grid;
    gap: 6px;
    padding: 8px;
    border: 1px solid #ebe5df;
    border-radius: 8px;
  }
  .composition-catalog fieldset > div > div.selected {
    border-color: #b8dac3;
    background: #f5fbf7;
  }
  .composition-catalog label {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .ingredient-option-thumb {
    position: relative;
    overflow: hidden;
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    font-size: 9px;
    font-weight: 900;
  }
  .ingredient-option-thumb > span {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .ingredient-option-thumb > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .composition-catalog label > span {
    min-width: 0;
    display: grid;
    gap: 1px;
  }
  .composition-catalog b {
    overflow: hidden;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .composition-catalog label small {
    color: var(--muted);
    font-size: 9px;
    letter-spacing: 0;
  }
  .composition-catalog .removable-toggle {
    padding-left: 22px;
    color: #745b4d;
    font-size: 9px;
    font-weight: 750;
  }
  .feature-switch {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--a);
    font-size: 10px;
    font-weight: 850;
  }
  .feature-switch:has(input:disabled) {
    opacity: 0.45;
  }
  .portion-admin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }
  .portion-admin-grid label > small {
    color: var(--muted);
    font-size: 9px;
    line-height: 1.35;
  }
  .portion-observation-toggle {
    grid-column: 1 / -1;
    display: flex;
    align-items: flex-start;
    gap: 7px;
    padding: 9px;
    border: 1px solid #e1dad3;
    border-radius: 9px;
    color: #615850;
    background: #fff;
    font-size: 10px;
    font-weight: 750;
    line-height: 1.4;
  }
  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
  @media (max-width: 560px) {
    .composition-toolbar {
      grid-template-columns: 1fr;
    }
    .composition-toolbar > button {
      justify-content: center;
    }
  }
`;
