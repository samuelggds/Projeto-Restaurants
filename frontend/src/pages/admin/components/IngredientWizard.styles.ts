import styled from 'styled-components';

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 130;
  display: grid;
  place-items: center;
  padding: clamp(12px, 2vw, 28px);
  background: rgba(18, 20, 21, 0.64);
  animation: ingredient-overlay-enter 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
  @keyframes ingredient-overlay-enter {
    from {
      background: rgba(18, 20, 21, 0);
    }
    to {
      background: rgba(18, 20, 21, 0.64);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Dialog = styled.form`
  width: min(100%, 1120px);
  height: min(760px, calc(100dvh - 40px));
  max-height: calc(100dvh - 24px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  color: #28231f;
  background: #fbfaf8;
  box-shadow: 0 30px 90px rgba(20, 17, 15, 0.3);
  transform-origin: center;
  animation: ingredient-dialog-enter 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
  @keyframes ingredient-dialog-enter {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  button,
  input,
  select {
    font: inherit;
  }
  button:focus-visible,
  input:focus-visible,
  h3:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 32%, transparent);
    outline-offset: 2px;
  }
  .wizard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 24px;
    border-bottom: 1px solid #e1dad3;
    background: #fff;
  }
  .wizard-header h2 {
    min-width: 0;
    margin: 0;
    font-size: 18px;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .header-actions small {
    color: #756d66;
    font-size: 12px;
    font-weight: 800;
  }
  .header-actions button {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
  }
  .header-actions button:hover {
    background: #f6f2ee;
  }
  .header-actions button svg {
    width: 19px;
  }
  > nav {
    display: flex;
    gap: 4px;
    padding: 0 24px;
  }
  > nav span {
    height: 4px;
    flex: 1;
    border-radius: 99px;
    background: #e8e0d9;
  }
  > nav span.active {
    background: var(--a);
  }
  .wizard-error {
    margin: 14px 24px 0;
    padding: 12px 14px;
    border: 1px solid #edb7b2;
    border-radius: 9px;
    color: #9b241c;
    background: #fff2f1;
    font-size: 13px;
    font-weight: 750;
  }
  > main {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: stretch;
    gap: 32px;
    padding: 30px 32px;
  }
  > main.success-main {
    grid-template-columns: minmax(0, 1fr);
  }
  .wizard-stage {
    min-width: 0;
    align-self: start;
  }
  .wizard-stage > section {
    display: grid;
    gap: 20px;
  }
  .step-heading h3 {
    margin: 0 0 8px;
    font-size: 24px;
  }
  .step-heading p,
  .default-price-note {
    margin: 0;
    color: #766d65;
    font-size: 14px;
    line-height: 1.55;
  }
  .wizard-aside {
    min-width: 0;
    display: grid;
    align-content: start;
    gap: 20px;
    padding: 26px 22px;
    border-left: 1px solid #ebe4dd;
    border-radius: 8px;
    background: linear-gradient(180deg, #fafbf9 0%, #f8faf7 100%);
  }
  .aside-intro {
    display: grid;
    gap: 9px;
    padding-bottom: 18px;
    border-bottom: 1px solid #e6ebe5;
  }
  .aside-intro > svg {
    width: 38px;
    height: 38px;
    padding: 9px;
    border-radius: 50%;
    color: #fff;
    background: #24a148;
  }
  .aside-intro h3,
  .aside-intro p {
    margin: 0;
  }
  .aside-intro h3 {
    max-width: 210px;
    font-size: 17px;
    line-height: 1.3;
  }
  .aside-intro p {
    color: #6f746f;
    font-size: 12px;
    line-height: 1.5;
  }
  .aside-benefits {
    display: grid;
    gap: 15px;
  }
  .aside-benefits > div {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 10px;
  }
  .aside-benefits > div > span {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }
  .aside-benefits > div > span.green {
    color: #26944d;
    background: #eaf7ed;
  }
  .aside-benefits > div > span.orange {
    color: #ef5b24;
    background: #fff0e8;
  }
  .aside-benefits > div > span.blue {
    color: #3478f6;
    background: #edf3ff;
  }
  .aside-benefits svg {
    width: 15px;
  }
  .aside-benefits p,
  .aside-tip p {
    min-width: 0;
    display: grid;
    gap: 3px;
    margin: 0;
  }
  .aside-benefits b,
  .aside-benefits small,
  .aside-tip b,
  .aside-tip small {
    font-size: 11px;
  }
  .aside-benefits small,
  .aside-tip small {
    color: #6f746f;
    line-height: 1.45;
  }
  .aside-tip {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    padding: 13px;
    border-radius: 8px;
    color: #255bc1;
    background: #eaf3ff;
  }
  .aside-tip > svg {
    width: 17px;
  }
  .category-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .category-options button {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    padding: 11px;
    border: 1px solid #ded7d0;
    border-radius: 10px;
    color: #4f4842;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }
  .category-options button.active {
    border-color: var(--a);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, white);
  }
  .category-options button > svg {
    width: 18px;
  }
  .category-options button > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .category-options b,
  .category-options small {
    overflow: hidden;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .category-options small {
    color: #81776f;
  }
  .locked-category {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 13px;
    border: 1px solid #b8dac3;
    border-radius: 8px;
    color: #176a39;
    background: #f3faf5;
  }
  .locked-category > svg {
    width: 18px;
  }
  .locked-category > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .locked-category b,
  .locked-category small {
    font-size: 10px;
  }
  .locked-category small {
    color: #587261;
  }
  .new-category-action {
    justify-self: start;
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid color-mix(in srgb, var(--a) 35%, #ddd6cf);
    border-radius: 9px;
    padding: 0 11px;
    color: var(--a);
    background: #fff;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }
  .new-category-action svg {
    width: 15px;
  }
  .search-with-category {
    justify-self: start;
    min-height: 36px;
    border: 0;
    padding: 0;
    color: var(--a);
    background: transparent;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }
  .new-category-field,
  .primary-field {
    min-width: 0;
    display: grid;
    gap: 6px;
    color: #5d554e;
    font-size: 12px;
    font-weight: 850;
  }
  .new-category-field input,
  .primary-field > input,
  .primary-field > select,
  .money-field {
    width: 100%;
    height: 48px;
    border: 1px solid #dcd4cd;
    border-radius: 9px;
    padding: 0 11px;
    background: #fff;
  }
  .primary-field > select {
    cursor: pointer;
  }
  .new-category-field small,
  .primary-field > small {
    color: #81776f;
    font-size: 11px;
    font-weight: 500;
  }
  .price-choice {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }
  .price-choice button {
    min-height: 50px;
    border: 1px solid #ddd5ce;
    border-radius: 9px;
    color: #4d4640;
    background: #fff;
    font-weight: 800;
    cursor: pointer;
  }
  .price-choice button.active {
    border-color: var(--a);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, white);
  }
  .image-loading {
    min-height: 250px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 8px;
    color: #5f5750;
    text-align: center;
  }
  .image-loading svg,
  .spin {
    animation: ingredient-image-spin 850ms linear infinite;
  }
  .image-loading svg {
    width: 34px;
    color: var(--a);
  }
  .image-loading b {
    font-size: 14px;
  }
  .image-loading span {
    color: var(--muted);
    font-size: 12px;
  }
  @keyframes ingredient-image-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .image-search-error {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 12px;
    border: 1px solid #e5d4bd;
    border-radius: 9px;
    color: #6d4b20;
    background: #fff9ef;
  }
  .image-search-error > svg {
    width: 20px;
  }
  .image-search-error > span {
    display: grid;
    gap: 3px;
  }
  .image-search-error b,
  .image-search-error small {
    font-size: 10px;
  }
  .image-search-error small {
    color: #7d6b56;
  }
  .recommended-image {
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    border: 1px solid #ded7d0;
    border-radius: 10px;
    background: #fff;
  }
  .recommended-image > img {
    width: 100%;
    height: 190px;
    grid-column: 1 / -1;
    object-fit: cover;
    background: #f2eee9;
  }
  .recommended-image > div {
    min-width: 0;
    display: grid;
    gap: 3px;
    padding: 0 0 12px 13px;
  }
  .recommended-image > div b {
    font-size: 15px;
  }
  .recommended-image > div small,
  .recommended-image > div a {
    color: #7b7168;
    font-size: 11px;
  }
  .recommended-image > div a {
    text-decoration: underline;
  }
  .recommended-image > button {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0 12px 12px 0;
    border: 1px solid var(--a);
    border-radius: 8px;
    padding: 0 11px;
    color: var(--a);
    background: #fff;
    font-size: 11px;
    font-weight: 850;
    cursor: pointer;
  }
  .recommended-image > button.selected {
    color: #fff;
    background: var(--a);
  }
  .recommended-image > button svg {
    width: 14px;
  }
  .other-images {
    display: grid;
    gap: 7px;
  }
  .other-images > span {
    color: #625a53;
    font-size: 11px;
    font-weight: 800;
  }
  .other-images > div {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .other-images button {
    position: relative;
    overflow: hidden;
    width: 78px;
    height: 78px;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 0;
    background: #eee8e2;
    cursor: pointer;
  }
  .other-images button.previewing {
    border-color: var(--a);
  }
  .other-images button img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .other-images button > svg {
    position: absolute;
    right: 3px;
    bottom: 3px;
    width: 17px;
    height: 17px;
    padding: 3px;
    border-radius: 50%;
    color: #fff;
    background: #26834e;
  }
  .image-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .image-actions button,
  .image-actions label {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid #ddd5ce;
    border-radius: 8px;
    padding: 0 10px;
    color: #514943;
    background: #fff;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }
  .image-actions svg {
    width: 14px;
  }
  .image-actions input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .pexels-credit {
    justify-self: start;
    color: #776e66;
    font-size: 11px;
    text-decoration: underline;
  }
  .money-field {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    color: #766d65;
  }
  .money-field input {
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
  }
  .price-example {
    display: grid;
    gap: 7px;
    padding: 13px;
    border: 1px solid #dce2df;
    border-radius: 10px;
    background: #f6faf8;
  }
  .price-example span,
  .price-example strong {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 11px;
  }
  .price-example strong {
    padding-top: 7px;
    border-top: 1px solid #dce2df;
    color: #176a39;
  }
  .ingredient-summary {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 17px;
    border: 1px solid #ded7d0;
    border-radius: 12px;
    background: #fff;
  }
  .ingredient-summary > span {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
  }
  .ingredient-summary > span img {
    width: 100%;
    height: 100%;
    border-radius: inherit;
    object-fit: cover;
  }
  .ingredient-summary svg {
    width: 23px;
  }
  .ingredient-summary h4,
  .ingredient-summary p {
    margin: 0;
  }
  .ingredient-summary h4 {
    margin-bottom: 5px;
    font-size: 17px;
  }
  .ingredient-summary p {
    color: #766d65;
    font-size: 11px;
    line-height: 1.6;
  }
  .success-step {
    justify-items: center;
    padding: 32px 0;
    text-align: center;
  }
  .success-step > svg {
    width: 48px;
    height: 48px;
    color: #25824c;
  }
  .success-step h3,
  .success-step p {
    margin: 0;
  }
  .success-step p {
    color: #756c64;
    font-size: 11px;
  }
  .success-step > div {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .success-step .ingredient-summary {
    width: min(100%, 440px);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    text-align: left;
  }
  .success-step .ingredient-summary > span {
    font-weight: 900;
  }
  .success-step .ingredient-summary > strong {
    color: #29241f;
    font-size: 12px;
  }
  .success-step button,
  > footer button {
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid #ddd6cf;
    border-radius: 9px;
    padding: 0 18px;
    background: #fff;
    font-size: 13px;
    font-weight: 850;
    cursor: pointer;
  }
  .success-step button svg,
  > footer button svg {
    width: 15px;
  }
  .success-step .primary,
  > footer .primary {
    border-color: var(--a, #ef5b24);
    color: #fff;
    background: var(--a, #ef5b24);
  }
  > footer {
    position: relative;
    z-index: 2;
    width: 100%;
    min-height: 72px;
    flex: 0 0 auto;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 13px 24px max(13px, env(safe-area-inset-bottom));
    border-top: 1px solid #e1dad3;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 -8px 22px rgba(48, 35, 25, 0.05);
  }
  > footer .primary {
    min-width: 140px;
    box-shadow: 0 7px 16px color-mix(in srgb, var(--a, #ef5b24) 20%, transparent);
  }
  > footer button:disabled {
    color: #8c837b;
    background: #f4f1ee;
    opacity: 1;
    cursor: not-allowed;
  }
  > footer .primary:disabled {
    color: #fff;
    background: var(--a, #ef5b24);
    opacity: 0.6;
  }
  @media (max-width: 560px) {
    width: 100%;
    max-height: 100dvh;
    min-height: 100dvh;
    border-radius: 0;
    .wizard-header,
    > main,
    > footer {
      padding-right: 14px;
      padding-left: 14px;
    }
    > nav {
      padding-right: 14px;
      padding-left: 14px;
    }
    > main {
      display: block;
    }
    .wizard-aside {
      display: none;
    }
    .success-step > div {
      width: 100%;
      display: grid;
    }
    .recommended-image > img {
      height: min(28dvh, 190px);
    }
    .other-images > div {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .other-images button {
      width: auto;
      height: auto;
      aspect-ratio: 1;
    }
    .image-actions {
      display: grid;
    }
    > footer button {
      flex: 1;
      padding: 0 9px;
    }
  }
  @media (max-width: 800px) {
    > main {
      display: block;
    }
    .wizard-aside {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
