import styled from 'styled-components';

export const ProductFormDrawer = styled.form`
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: 100dvh;
  min-width: 0;
  margin: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 28px;
  color: #24201d;
  background:
    radial-gradient(
      circle at 95% 3%,
      color-mix(in srgb, var(--a) 7%, transparent),
      transparent 20%
    ),
    #f7f5f2;
  border-radius: 0;
  box-shadow: none;
  animation: drawer-enter 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
  @keyframes drawer-enter {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 32%, transparent);
    outline-offset: 2px;
  }
  .image-upload-action:has(input:focus-visible) {
    outline: 3px solid color-mix(in srgb, var(--a) 32%, transparent);
    outline-offset: 2px;
  }
  .drawer-header {
    position: sticky;
    z-index: 20;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin: 0 -28px;
    padding: 20px 28px 18px;
    border-bottom: 1px solid rgba(218, 209, 201, 0.82);
    background: rgba(255, 253, 250, 0.94);
    backdrop-filter: blur(16px);
  }
  .drawer-title > span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--a);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.11em;
  }
  .drawer-title > span svg {
    width: 13px;
    height: 13px;
  }
  .drawer-header h2 {
    margin: 4px 0 2px;
    font-size: 26px;
    letter-spacing: 0;
  }
  .drawer-header p {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  .drawer-header > button {
    flex: 0 0 auto;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 1px solid #ddd5cd;
    border-radius: 13px;
    color: #514a44;
    background: #fff;
    cursor: pointer;
    transition:
      color 240ms cubic-bezier(0.22, 1, 0.36, 1),
      border-color 240ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .drawer-header > button:hover {
    color: var(--a);
    border-color: var(--a);
    transform: rotate(3deg);
  }
  .drawer-header svg {
    width: 18px;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    .drawer-header > button {
      transition: none;
    }
  }
  .product-basics-layout {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
    gap: 22px;
    align-items: start;
  }
  .basic-fields {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 15px;
  }
  .basic-fields label > small {
    margin-top: -3px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 500;
    text-align: right;
  }
  .image-studio {
    min-width: 0;
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid #e2d9d1;
    border-radius: 16px;
    background: #faf8f5;
  }
  .image-preview {
    position: relative;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    display: grid;
    place-items: center;
    border: 1px dashed #cfc3b8;
    border-radius: 13px;
    color: #82776e;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.68), rgba(246, 240, 234, 0.76)),
      repeating-linear-gradient(45deg, #f5f0eb 0 8px, #fbf8f5 8px 16px);
  }
  .image-preview > div:not(.preview-caption) {
    display: grid;
    justify-items: center;
    gap: 5px;
  }
  .image-preview > div > svg {
    width: 28px;
    color: var(--a);
  }
  .image-preview > div > b {
    font-size: 11px;
  }
  .image-preview > div > span {
    color: var(--muted);
    font-size: 11px;
  }
  .image-preview > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .preview-caption {
    position: absolute;
    right: 8px;
    bottom: 8px;
    left: 8px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2px 8px;
    padding: 10px 11px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 10px;
    background: rgba(27, 24, 22, 0.78);
    backdrop-filter: blur(9px);
  }
  .preview-caption small {
    grid-column: 1 / -1;
    color: #f2b08d;
    font-size: 11px;
  }
  .preview-caption b {
    overflow: hidden;
    color: #fff;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .preview-caption strong {
    color: #fff;
    font-size: 11px;
    white-space: nowrap;
  }
  .image-upload-action {
    min-height: 48px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border: 1px solid color-mix(in srgb, var(--a) 26%, #ddd3cb);
    border-radius: 11px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, white);
    cursor: pointer;
    transition:
      border-color 280ms cubic-bezier(0.22, 1, 0.36, 1),
      background-color 280ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .image-upload-action:hover {
    border-color: var(--a);
    transform: translateY(-1px);
  }
  .image-upload-action > svg {
    width: 20px;
  }
  .image-upload-action > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .image-upload-action b {
    font-size: 11px;
  }
  .image-upload-action small {
    color: var(--muted);
    font-size: 11px;
  }
  .image-upload-action input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .availability-layout {
    display: grid;
    grid-template-columns: minmax(0, 760px);
    gap: 20px;
    justify-content: center;
  }
  .stock-configuration {
    display: grid;
    align-content: start;
    gap: 12px;
  }
  .field-title {
    color: #4b433d;
    font-size: 11px;
  }
  .stock-mode-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }
  .stock-mode-cards button {
    min-width: 0;
    min-height: 74px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    border: 1px solid #e2dad3;
    border-radius: 12px;
    padding: 11px;
    color: #514943;
    background: #fcfbfa;
    text-align: left;
    cursor: pointer;
  }
  .stock-mode-cards button.active {
    border-color: color-mix(in srgb, var(--a) 45%, #ded7cf);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 6%, white);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 7%, transparent);
  }
  .stock-mode-cards button > svg:first-child {
    width: 20px;
  }
  .stock-mode-cards button > svg:last-child {
    width: 16px;
  }
  .stock-mode-cards span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .stock-mode-cards b {
    font-size: 11px;
  }
  .stock-mode-cards small {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.35;
  }
  .product-review-card {
    overflow: hidden;
    border: 1px solid #ded5cd;
    border-radius: 14px;
    background: #faf8f5;
  }
  .product-review-card > header {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px 14px;
    color: #fff;
    background: linear-gradient(120deg, #1d2d37, #344a56);
  }
  .product-review-card > header > svg {
    width: 18px;
    color: #ff8b58;
  }
  .product-review-card header div {
    display: grid;
    gap: 2px;
  }
  .product-review-card header b {
    font-size: 11px;
  }
  .product-review-card header span {
    color: rgba(255, 255, 255, 0.72);
    font-size: 11px;
  }
  .product-review-card ul {
    list-style: none;
    display: grid;
    gap: 0;
    margin: 0;
    padding: 7px 13px;
  }
  .product-review-card li {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 9px;
    padding: 9px 0;
    border-bottom: 1px solid #ebe4de;
  }
  .product-review-card li:last-child {
    border-bottom: 0;
  }
  .product-review-card li > i {
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: #81756b;
    background: #ece7e2;
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }
  .product-review-card li.complete > i {
    color: #16703a;
    background: #e4f4e9;
  }
  .product-review-card li > i svg {
    width: 13px;
  }
  .product-review-card li > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .product-review-card li b {
    font-size: 11px;
  }
  .product-review-card li small {
    overflow: hidden;
    color: var(--muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .drawer-footer {
    position: sticky;
    z-index: 20;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 0 -28px;
    padding: 14px 28px max(14px, env(safe-area-inset-bottom));
    border-top: 1px solid rgba(213, 202, 193, 0.9);
    background: rgba(255, 253, 250, 0.95);
    box-shadow: 0 -12px 30px rgba(48, 35, 25, 0.07);
    backdrop-filter: blur(16px);
  }
  .footer-summary {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .footer-summary-icon {
    flex: 0 0 auto;
    width: 37px;
    height: 37px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, white);
  }
  .footer-summary-icon svg {
    width: 18px;
  }
  .footer-summary > span:last-child {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .footer-summary b {
    overflow: hidden;
    max-width: 330px;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .footer-summary small {
    color: var(--muted);
    font-size: 11px;
  }
  .footer-actions {
    display: flex;
    gap: 9px;
  }
  .footer-actions button {
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid #ded7cf;
    border-radius: 11px;
    padding: 0 18px;
    background: #fff;
    font-size: 11px;
    font-weight: 850;
    cursor: pointer;
  }
  .footer-actions button svg {
    width: 15px;
    height: 15px;
  }
  .footer-actions .primary {
    min-width: 150px;
    border-color: var(--a);
    color: #fff;
    background: var(--a);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--a) 25%, transparent);
  }
  .drawer-footer button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  @media (max-width: 850px) {
    width: min(100%, 820px);
    .product-basics-layout,
    .availability-layout {
      grid-template-columns: 1fr;
    }
    .image-studio {
      grid-template-columns: minmax(220px, 0.8fr) 1fr;
      align-items: start;
    }
    .image-preview {
      grid-row: 1 / 3;
    }
  }
  @media (max-width: 600px) {
    width: 100%;
    height: 100dvh;
    margin: 0;
    border-radius: 0;
    padding: 0 14px;
    gap: 14px;
    .drawer-header {
      margin: 0 -14px;
      padding: 16px 14px 14px;
    }
    .drawer-header h2 {
      font-size: 21px;
    }
    .drawer-header p {
      display: none;
    }
    .basic-fields {
      grid-template-columns: 1fr;
    }
    .image-studio {
      grid-template-columns: 1fr;
    }
    .image-preview {
      grid-row: auto;
    }
    .stock-mode-cards {
      grid-template-columns: 1fr;
    }
    .drawer-footer {
      margin: 0 -14px;
      padding: 11px 14px;
    }
    .footer-summary {
      display: none;
    }
    .footer-actions {
      width: 100%;
    }
    .footer-actions button {
      flex: 1;
      padding: 0 10px;
    }
  }
`;
export const ProductWizardProgress = styled.nav`
  display: grid;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  .wizard-progress-copy {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #625951;
  }
  .wizard-progress-copy b {
    font-size: 12px;
  }
  .wizard-progress-track {
    position: relative;
    overflow: hidden;
    height: 4px;
    border-radius: 2px;
    background: #e9e1da;
  }
  .wizard-progress-track > i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: var(--a);
    transition: width 320ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .wizard-progress-track > i {
      transition: none;
    }
  }
  > div.complete {
    color: #16703a;
  }
  > div.complete > i {
    background: #e1f3e7;
  }
  > div.current {
    color: var(--a);
  }
  > div.current > i {
    color: #fff;
    background: var(--a);
  }
  > svg {
    width: 15px;
    color: #c5bbb2;
  }
  @media (max-width: 600px) {
    gap: 2px;
    padding: 7px 5px;
    > button {
      min-height: 38px;
      grid-template-columns: 1fr;
      justify-items: center;
      padding: 3px 1px;
    }
    > button > i {
      width: 28px;
      height: 28px;
    }
    > button > span {
      display: none;
    }
    > div {
      justify-content: center;
    }
    > div > span {
      display: none;
    }
    > svg {
      width: 12px;
    }
  }
`;
export const ProductFormError = styled.div`
  position: sticky;
  z-index: 19;
  top: 94px;
  padding: 12px 14px;
  border: 1px solid #efb8b4;
  border-radius: 11px;
  color: #991b1b;
  background: #fff1f0;
  box-shadow: 0 8px 20px rgba(123, 25, 25, 0.08);
  font-size: 12px;
  font-weight: 700;
  @media (max-width: 600px) {
    top: 79px;
  }
`;

export const ProductCustomizationEmpty = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 17px;
  border: 1px dashed #d9cec4;
  border-radius: 13px;
  color: #4f4740;
  background: #fbf8f5;
  > svg {
    flex: 0 0 auto;
    width: 23px;
    color: var(--a);
  }
  b {
    font-size: 12px;
  }
  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
  }
`;

export const ProductSaleModeSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  > button {
    min-width: 0;
    min-height: 82px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 11px;
    padding: 13px 14px;
    border: 1px solid #ded7cf;
    border-radius: 12px;
    color: #514943;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }
  > button.active {
    border-color: color-mix(in srgb, var(--a) 52%, #ded7cf);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, #fff);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 7%, transparent);
  }
  > button > svg:first-child {
    width: 23px;
  }
  > button > svg:last-child {
    width: 17px;
  }
  > button > span {
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  b {
    font-size: 12px;
  }
  small {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
  em {
    color: #766c64;
    font-size: 10px;
    font-style: normal;
    line-height: 1.35;
  }
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;

export const ProductSimpleMode = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid #b9ddc5;
  border-radius: 13px;
  color: #185f37;
  background: #f2faf5;
  > svg {
    flex: 0 0 auto;
    width: 22px;
  }
  > div {
    min-width: 0;
    display: grid;
    gap: 5px;
  }
  b {
    font-size: 12px;
  }
  p {
    margin: 0;
    color: #4e6c5a;
    font-size: 11px;
    line-height: 1.45;
  }
  label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 8px;
    padding: 10px;
    border: 1px solid #e4b9a6;
    border-radius: 9px;
    color: #8b3b22;
    background: #fff7f3;
    font-size: 11px;
    font-weight: 750;
    line-height: 1.4;
  }
`;

export const ProductPresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  > button {
    min-width: 0;
    min-height: 94px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: 11px;
    padding: 14px;
    border: 1px solid #e2dad3;
    border-radius: 8px;
    color: #514943;
    background: #fcfbfa;
    text-align: left;
    cursor: pointer;
  }
  > button:hover {
    border-color: var(--a);
    background: color-mix(in srgb, var(--a) 4%, #fff);
    transform: translateY(-1px);
  }
  > button > i {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    font-size: 12px;
    font-style: normal;
    font-weight: 900;
  }
  > button > span {
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  b {
    font-size: 12px;
  }
  small {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
  em {
    color: #8a5a45;
    font-size: 10px;
    font-style: normal;
    font-weight: 750;
    line-height: 1.35;
  }
  svg {
    width: 14px;
    color: var(--a);
  }
  > button {
    transition:
      border-color 240ms cubic-bezier(0.22, 1, 0.36, 1),
      background-color 240ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    > button {
      transition: none;
    }
  }
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const ProductTemplateLibrary = styled.section`
  overflow: hidden;
  border: 1px solid #d8dfe1;
  border-radius: 13px;
  background: #f8faf9;
  > header {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    color: #fff;
    background: #2a3a43;
  }
  > header > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  > header svg {
    flex: 0 0 auto;
    width: 17px;
    color: #ff9a68;
  }
  > header > div > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  > header b,
  > header small,
  > header > span {
    font-size: 10px;
  }
  > header small,
  > header > span {
    color: rgba(255, 255, 255, 0.7);
  }
  .template-list {
    max-height: 220px;
    overflow-y: auto;
    display: grid;
    gap: 7px;
    padding: 10px 10px 0;
  }
  .template-list article {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border: 1px solid #e0e4e3;
    border-radius: 9px;
    background: #fff;
  }
  .template-list article > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .template-list b,
  .template-list small {
    overflow: hidden;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .template-list small {
    color: var(--muted);
  }
  .template-list button {
    min-height: 32px;
    border: 1px solid color-mix(in srgb, var(--a) 35%, #d9d3cc);
    border-radius: 8px;
    padding: 0 10px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 4%, #fff);
    font-size: 10px;
    font-weight: 850;
    cursor: pointer;
  }
  .template-list .delete-template {
    width: 32px;
    padding: 0;
    color: #b42318;
    border-color: #ecd1ce;
    background: #fff;
  }
  .delete-template svg {
    width: 13px;
  }
  .save-template {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 9px;
    padding: 10px;
  }
  .save-template label {
    min-width: 0;
    display: grid;
    gap: 5px;
    color: #615850;
    font-size: 10px;
    font-weight: 800;
  }
  .save-template input {
    width: 100%;
    height: 38px;
    border: 1px solid #d9d3cc;
    border-radius: 8px;
    padding: 0 10px;
    background: #fff;
  }
  .save-template button {
    min-height: 38px;
    border: 0;
    border-radius: 8px;
    padding: 0 12px;
    color: #fff;
    background: var(--a);
    font-size: 10px;
    font-weight: 850;
    cursor: pointer;
  }
  .save-template button:disabled,
  .template-list button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  @media (max-width: 600px) {
    .save-template {
      grid-template-columns: 1fr;
    }
  }
`;

export const ProductCustomerPreview = styled.aside`
  min-width: 0;
  overflow: hidden;
  border: 1px solid #d7d0c9;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(49, 36, 26, 0.09);
  > header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    padding: 12px 13px;
    border-bottom: 1px solid #e7e0d9;
    color: #302b27;
    background: #fff;
  }
  > header > svg {
    flex: 0 0 auto;
    width: 18px;
    color: var(--a);
  }
  > header > div {
    display: grid;
    gap: 2px;
  }
  > header b {
    font-size: 11px;
  }
  > header span {
    color: #7d756e;
    font-size: 10px;
  }
  > header > em {
    padding: 5px 7px;
    border-radius: 5px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    font-size: 8px;
    font-style: normal;
    font-weight: 900;
  }
  .customer-preview-screen {
    max-height: min(560px, calc(100vh - 330px));
    overflow-y: auto;
    background: #f5f2ee;
    scrollbar-width: thin;
  }
  .customer-preview-cover {
    position: relative;
    overflow: hidden;
    width: 100%;
    aspect-ratio: 16 / 6.6;
    display: grid;
    place-items: center;
    color: var(--a);
    background: #eee8e2;
  }
  .customer-preview-cover > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .customer-preview-cover > svg {
    width: 30px;
  }
  .customer-preview-cover > span {
    position: absolute;
    top: 9px;
    left: 9px;
    padding: 5px 7px;
    border-radius: 5px;
    color: #fff;
    background: rgba(31, 27, 24, 0.82);
    font-size: 8px;
    font-weight: 900;
  }
  .customer-preview-product {
    display: grid;
    gap: 4px;
    padding: 13px 14px 15px;
    border-bottom: 1px solid #e5ddd6;
    background: #fff;
  }
  .customer-preview-product > small {
    color: var(--a);
    font-size: 8px;
    font-weight: 900;
  }
  .customer-preview-product > b {
    overflow-wrap: anywhere;
    color: #2e2925;
    font-size: 16px;
  }
  .customer-preview-product > p {
    display: -webkit-box;
    overflow: hidden;
    margin: 0;
    color: #756d66;
    font-size: 10px;
    line-height: 1.45;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .customer-preview-product > strong {
    margin-top: 3px;
    color: var(--a);
    font-size: 12px;
  }
  .customer-preview-intro {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 13px 13px 8px;
  }
  .customer-preview-intro > div {
    display: grid;
    gap: 2px;
  }
  .customer-preview-intro b {
    font-size: 12px;
  }
  .customer-preview-intro span,
  .customer-preview-intro > small {
    color: #7e766f;
    font-size: 9px;
  }
  .customer-preview-intro > small {
    padding: 4px 6px;
    border-radius: 5px;
    background: #e9e3dd;
    font-weight: 800;
  }
  .customer-preview-steps {
    min-width: 0;
    display: grid;
    gap: 9px;
    padding: 0 10px 12px;
  }
  .customer-preview-steps > section {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #dfd7d0;
    border-radius: 8px;
    background: #fff;
  }
  .customer-preview-steps > section.pending {
    border-color: #e4b99f;
  }
  .customer-preview-steps > section > header {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 11px 7px;
  }
  .customer-preview-steps > section > header > div {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .customer-preview-steps > section > header span {
    color: var(--a);
    font-size: 7px;
    font-weight: 900;
  }
  .customer-preview-steps > section > header b {
    overflow-wrap: anywhere;
    color: #312c28;
    font-size: 11px;
  }
  .customer-preview-steps > section > header p {
    margin: 1px 0 0;
    color: #7a726b;
    font-size: 9px;
    line-height: 1.35;
  }
  .customer-preview-steps > section > header em {
    flex: 0 0 auto;
    padding: 4px 5px;
    border-radius: 4px;
    color: #736b64;
    background: #eeeae6;
    font-size: 7px;
    font-style: normal;
    font-weight: 900;
    text-transform: uppercase;
  }
  .customer-preview-steps > section > header em.required {
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
  }
  .customer-selection-rule {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 0 11px 8px;
    color: #746c65;
    font-size: 8px;
  }
  .customer-selection-rule > span {
    font-weight: 800;
  }
  .customer-option-list {
    display: grid;
    border-top: 1px solid #eee8e2;
  }
  .customer-option-list > div {
    min-width: 0;
    min-height: 40px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-bottom: 1px solid #f0ebe6;
  }
  .customer-option-list > div:last-child {
    border-bottom: 0;
  }
  .customer-option-list > div > i {
    width: 16px;
    height: 16px;
    border: 1.5px solid #aaa19a;
    border-radius: 4px;
  }
  .customer-option-list > div > i.radio {
    border-radius: 50%;
  }
  .customer-option-list > div > span {
    min-width: 0;
    display: grid;
    gap: 1px;
  }
  .customer-option-list b {
    overflow: hidden;
    color: #3b3530;
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .customer-option-list small {
    color: #827a73;
    font-size: 8px;
  }
  .customer-option-list strong {
    color: #5c544d;
    font-size: 8px;
    white-space: nowrap;
  }
  .customer-options-empty {
    margin: 0;
    padding: 10px;
    color: #9a6249;
    background: #fff8f3;
    font-size: 9px;
  }
  .customer-preview-footer {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 2px;
    padding: 10px 12px;
    color: #fff;
    background: var(--a);
    box-shadow: 0 -7px 16px rgba(49, 36, 26, 0.1);
  }
  .customer-preview-footer > span {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .customer-preview-footer svg {
    width: 14px;
  }
  .customer-preview-footer b,
  .customer-preview-footer strong {
    font-size: 10px;
  }
  .customer-preview-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid #e5ddd6;
    background: #fff;
  }
  .customer-preview-note > svg {
    flex: 0 0 auto;
    width: 14px;
    color: var(--a);
  }
  .customer-preview-note > div {
    display: grid;
    gap: 2px;
  }
  .customer-preview-note b {
    font-size: 9px;
  }
  .customer-preview-note small {
    color: #7f776f;
    font-size: 8px;
    line-height: 1.35;
  }
  @media (max-width: 880px) {
    .customer-preview-screen {
      max-height: none;
    }
  }
`;
