import styled from 'styled-components';
import { ingredientImageStyles } from './AdminIngredientImage.styles';

export const ProductGrid = styled.div`
  position: relative;
  overflow: visible;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 1320px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  @media (max-width: 1060px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 760px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 10px;
  }
`;
export const ProductGroups = styled.div`
  display: grid;
  gap: 24px;
  overflow: visible;
  > section {
    position: relative;
    display: grid;
    gap: 10px;
    overflow: visible;
  }
`;
export const ProductCategoryTitle = styled.h2`
  margin: 0;
  padding-left: 10px;
  border-left: 3px solid var(--a);
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 16px;
  color: #2a2622;
  span {
    color: var(--muted);
    font-size: 11px;
    font-weight: 500;
  }
`;
export const EmptyCatalog = styled.p`
  margin: 0;
  color: var(--muted);
  text-align: center;
  padding: 28px;
  border: 1px dashed var(--border);
  border-radius: 12px;
`;
export const Product = styled.article`
  position: relative;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: visible;
  background: #fff;
  img {
    width: 100%;
    aspect-ratio: 4 / 3;
    height: auto;
    object-fit: cover;
    border-radius: 7px 7px 0 0;
  }
  div {
    padding: 12px;
    display: grid;
    gap: 7px;
  }
  b {
    font-size: 14px;
    line-height: 1.25;
  }
  span {
    font-size: 10px;
    color: var(--muted);
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  footer strong {
    color: var(--a);
    font-size: 13px;
  }
  footer button {
    border: 0;
    background: transparent;
    color: var(--a);
    cursor: pointer;
  }
  footer .product-actions {
    position: relative;
    display: block;
    padding: 0;
  }
  footer .product-menu-trigger {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    color: #4f4a45;
  }
  footer .product-menu-trigger:hover {
    background: #f4eee8;
  }
  footer .product-menu {
    position: absolute;
    right: 0;
    bottom: 42px;
    z-index: 80;
    width: 170px;
    padding: 6px;
    display: grid;
    gap: 2px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 14px 34px rgba(45, 31, 20, 0.18);
  }
  footer .product-menu button {
    width: 100%;
    padding: 10px;
    border-radius: 7px;
    text-align: left;
    color: #332f2b;
  }
  footer .product-menu button:hover {
    background: #f8f3ee;
  }
  footer .product-menu button.danger {
    color: #b42318;
  }
  @media (max-width: 480px) {
    width: min(100%, 350px);
    img {
      height: 70px;
    }
    div {
      padding: 7px 8px;
    }
    footer strong {
      font-size: 13px;
    }
  }
`;
export const SettingSection = styled.div`
  display: grid;
  gap: 22px;
  animation: section-enter 240ms ease both;
  @keyframes section-enter {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
export const ToggleRows = styled.div`
  display: grid;
  .toggle-row {
    min-height: 78px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 4px 2px;
    transition:
      padding 160ms ease,
      background 160ms ease;
  }
  .toggle-row:hover {
    padding-left: 8px;
    padding-right: 8px;
    background: #fcfaf7;
  }
  .toggle-row div {
    display: grid;
    gap: 4px;
  }
  .toggle-row span {
    font-size: 11px;
    color: var(--muted);
  }
  .toggle-row input {
    margin-left: auto;
    appearance: none;
    width: 44px;
    height: 24px;
    border-radius: 999px;
    background: #d9d4cf;
    position: relative;
    cursor: pointer;
    transition: background 180ms ease;
  }
  .toggle-row input::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    left: 3px;
    top: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 5px #0002;
    transition: transform 180ms ease;
  }
  .toggle-row input:checked {
    background: var(--a);
  }
  .toggle-row input:checked::after {
    transform: translateX(20px);
  }
  .toggle-row input:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 18%, transparent);
    outline-offset: 2px;
  }
`;
export const DayRow = styled.div`
  min-height: 59px;
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: 150px 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  input {
    height: 46px;
    border: 1px solid #ded7cf;
    border-radius: 11px;
    background: #fcfbf9;
    padding: 0 12px;
    outline: 0;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background 180ms ease;
  }
  input:focus {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }
  input:disabled {
    background: #f1efec;
    color: #a29c96;
    cursor: not-allowed;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr 1fr;
    b {
      grid-column: 1/-1;
    }
    .separator {
      display: none;
    }
  }
`;
export const QrPanel = styled.div`
  border: 1px dashed var(--a);
  border-radius: 12px;
  background: #fff7f1;
  padding: 22px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 15px;
  span {
    color: var(--muted);
    font-size: 11px;
  }
  .code {
    font-size: 32px;
    letter-spacing: 0.2em;
    color: var(--a);
  }
  button {
    grid-column: 1/-1;
    justify-self: start;
    height: 40px;
    border: 0;
    border-radius: 8px;
    background: var(--a);
    color: #fff;
    padding: 0 14px;
  }
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
    text-align: center;
    .code {
      justify-self: center;
    }
    button {
      justify-self: stretch;
    }
  }
`;
export const CatalogTabs = styled.div`
  width: 100%;
  display: flex;
  gap: 34px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
  button {
    position: relative;
    border: 0;
    padding: 0 2px 14px;
    background: transparent;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: 160ms ease;
  }
  button:hover:not(.primary) {
    color: #322c27;
  }
  button.primary {
    color: var(--a);
  }
  button.primary::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: -1px;
    left: 0;
    height: 2px;
    background: var(--a);
  }
  @media (max-width: 480px) {
    gap: 20px;
    overflow-x: auto;
    button {
      flex: 0 0 auto;
    }
  }
`;
export const IngredientPanel = styled.div`
  max-width: 900px;
  padding: 26px;
  h2 {
    margin: 0 0 5px;
  }
  > p {
    margin: 0 0 22px;
    color: var(--muted);
  }
  .ingredient-form {
    display: grid;
    grid-template-columns: 1.4fr 0.7fr auto;
    gap: 10px;
    padding: 14px;
    border-radius: 12px;
    background: #fff7f1;
  }
  input {
    height: 42px;
    min-width: 0;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    padding: 0 11px;
    background: #fff;
  }
  .ingredient-form button {
    border: 0;
    border-radius: 9px;
    padding: 0 16px;
    background: var(--a);
    color: #fff;
    font-weight: 700;
  }
  .ingredient-row {
    padding: 14px 0;
  }
  .ingredient-price {
    color: var(--a);
    font-weight: 800;
  }
  @media (max-width: 600px) {
    .ingredient-form {
      grid-template-columns: 1fr;
    }
    .ingredient-form button {
      height: 42px;
    }
  }
`;
export const IngredientWorkspace = styled.div`
  width: 100%;
  display: grid;
  gap: 14px;
  min-width: 0;
`;

export const IngredientPageHeader = styled.header`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 2px 2px 4px;
  h2 {
    margin: 0;
    color: #28231f;
    font-size: 23px;
  }
  p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 11px;
  }
  > button {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 8px;
    padding: 0 15px;
    color: #fff;
    background: var(--a);
    font-size: 11px;
    font-weight: 850;
    cursor: pointer;
    white-space: nowrap;
  }
  > button svg {
    width: 15px;
  }
  > button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 25%, transparent);
    outline-offset: 2px;
  }
  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
    > button {
      align-self: flex-start;
    }
  }
`;

export const IngredientHero = styled.section`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 25px 27px;
  border-radius: 18px;
  color: #fff;
  background:
    radial-gradient(circle at 84% 5%, rgba(255, 126, 65, 0.36), transparent 31%),
    linear-gradient(125deg, #16242e 0%, #213441 58%, #5c382c 100%);
  box-shadow: 0 18px 38px rgba(33, 35, 37, 0.12);
  &::after {
    content: '';
    position: absolute;
    width: 180px;
    height: 180px;
    right: -65px;
    bottom: -95px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 50%;
  }
  .hero-icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 15px;
    color: #ff7a40;
    background: rgba(255, 255, 255, 0.08);
  }
  .hero-icon svg {
    width: 25px;
  }
  span {
    color: #ff9568;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }
  h2 {
    margin: 4px 0;
    color: #fff;
    font-size: clamp(20px, 2.2vw, 28px);
  }
  p {
    max-width: 650px;
    margin: 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    line-height: 1.5;
  }
  dl {
    z-index: 1;
    display: flex;
    gap: 8px;
    margin: 0;
  }
  dl div {
    min-width: 88px;
    padding: 11px 13px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.07);
  }
  dt {
    color: rgba(255, 255, 255, 0.62);
    font-size: 10px;
  }
  dd {
    margin: 3px 0 0;
    color: #fff;
    font-size: 20px;
    font-weight: 900;
  }
  @media (max-width: 700px) {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 20px;
    dl {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 430px) {
    .hero-icon {
      display: none;
    }
    grid-template-columns: 1fr;
  }
`;

export const IngredientGuide = styled.section`
  display: grid;
  gap: 17px;
  padding: 21px 22px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(48, 35, 25, 0.045);
  .guide-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }
  .guide-heading small {
    color: var(--a);
    font-size: 10px;
    font-weight: 900;
  }
  .guide-heading h3 {
    margin: 4px 0 0;
    font-size: 16px;
  }
  .guide-heading button {
    flex: 0 0 auto;
    min-height: 43px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    border-radius: 10px;
    padding: 0 15px;
    color: #fff;
    background: var(--a);
    font-size: 11px;
    font-weight: 850;
    cursor: pointer;
  }
  .guide-heading button svg {
    width: 16px;
  }
  ol {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 9px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    padding: 12px;
    border: 1px solid #e6dfd8;
    border-radius: 11px;
    background: #faf8f5;
  }
  li > i {
    width: 29px;
    height: 29px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    font-size: 10px;
    font-style: normal;
    font-weight: 900;
  }
  li > i svg {
    width: 14px;
  }
  li > svg {
    width: 14px;
    color: #c2b8af;
  }
  li > span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  li b,
  li small {
    font-size: 10px;
  }
  li small {
    color: var(--muted);
    line-height: 1.35;
  }
  @media (max-width: 760px) {
    ol {
      grid-template-columns: 1fr;
    }
    li > svg {
      display: none;
    }
  }
  @media (max-width: 480px) {
    .guide-heading {
      align-items: stretch;
      flex-direction: column;
    }
    .guide-heading button {
      justify-content: center;
    }
  }
`;

export const IngredientForm = styled.form`
  display: grid;
  grid-template-columns: minmax(210px, 1fr) minmax(180px, 0.72fr) minmax(140px, 0.48fr) auto;
  align-items: end;
  gap: 14px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(48, 35, 25, 0.045);
  .form-heading {
    display: flex;
    align-items: center;
    gap: 12px;
    align-self: center;
    grid-column: 1 / -1;
  }
  .form-icon {
    flex: 0 0 auto;
    width: 43px;
    height: 43px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 11%, white);
  }
  .form-icon svg {
    width: 21px;
  }
  h3 {
    margin: 0;
    font-size: 16px;
  }
  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
  label {
    display: grid;
    gap: 7px;
    color: #4b433d;
    font-size: 11px;
    font-weight: 800;
  }
  input,
  button {
    height: 45px;
    border-radius: 10px;
  }
  input {
    min-width: 0;
    width: 100%;
    border: 1px solid #ded7cf;
    padding: 0 12px;
    background: #fcfbfa;
    outline: 0;
  }
  input:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 10%, transparent);
  }
  .money-input {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    border: 1px solid #ded7cf;
    border-radius: 10px;
    background: #fcfbfa;
  }
  .money-input:focus-within {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 10%, transparent);
  }
  .money-input span {
    padding-left: 12px;
    color: var(--a);
    font-size: 12px;
    font-weight: 900;
  }
  .money-input input {
    border: 0;
    box-shadow: none;
  }
  .create-ingredient {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    padding: 0 16px;
    color: #fff;
    background: var(--a);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
  }
  .create-ingredient svg {
    width: 16px;
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  @media (max-width: 1050px) {
    grid-template-columns: 1fr 1fr;
    .create-ingredient {
      width: 100%;
    }
  }
  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    .create-ingredient {
      width: 100%;
    }
  }
`;

export const IngredientFeedback = styled.div<{ $tone: 'success' | 'error' }>`
  padding: 12px 15px;
  border: 1px solid ${({ $tone }) => ($tone === 'success' ? '#b7ddc0' : '#f1b7b7')};
  border-radius: 11px;
  color: ${({ $tone }) => ($tone === 'success' ? '#166534' : '#991b1b')};
  background: ${({ $tone }) => ($tone === 'success' ? '#f0f9f2' : '#fff1f1')};
  font-size: 12px;
  font-weight: 700;
`;

export const IngredientListPanel = styled.section`
  min-width: 0;
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(48, 35, 25, 0.035);
  h3 {
    margin: 0;
    font-size: 12px;
  }
  .ingredient-categories {
    min-width: 0;
    padding: 4px 13px 4px 0;
    border-right: 1px solid #eee7e0;
  }
  .ingredient-categories h3 {
    margin: 2px 8px 12px;
  }
  .ingredient-categories nav {
    display: grid;
    gap: 6px;
  }
  .ingredient-categories button {
    min-width: 0;
    min-height: 39px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 0 9px;
    color: #5f5750;
    background: transparent;
    font-size: 10px;
    text-align: left;
    cursor: pointer;
  }
  .ingredient-categories button:hover {
    background: #faf7f4;
  }
  .ingredient-categories button.active {
    border-color: color-mix(in srgb, var(--a) 38%, #eee3da);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, white);
  }
  .ingredient-categories button svg {
    width: 15px;
  }
  .ingredient-categories button span {
    overflow: hidden;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ingredient-categories button b {
    color: inherit;
    font-size: 9px;
  }
  .ingredient-library {
    min-width: 0;
    display: grid;
    align-content: start;
    gap: 12px;
  }
  .ingredient-filters {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(180px, 1fr) auto auto auto 38px;
    gap: 7px;
  }
  .ingredient-search {
    height: 38px;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    border: 1px solid #ded7cf;
    border-radius: 7px;
    background: #fcfbfa;
  }
  .ingredient-search svg {
    flex: 0 0 auto;
    width: 16px;
    color: var(--muted);
  }
  .ingredient-search input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
  }
  select {
    min-width: 0;
    height: 38px;
    border: 1px solid #ded7cf;
    border-radius: 7px;
    padding: 0 8px;
    color: #514a44;
    background: #fcfbfa;
    font-size: 9px;
  }
  .view-toggle {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid #ded7cf;
    border-radius: 7px;
    color: #625a53;
    background: #fcfbfa;
    cursor: pointer;
  }
  .view-toggle svg {
    width: 15px;
  }
  .ingredient-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .ingredient-list.list {
    grid-template-columns: 1fr;
  }
  article {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 13px;
    padding: 12px;
    border: 1px solid #eee7e0;
    border-radius: 8px;
    background: #fefdfc;
    transition: 160ms ease;
  }
  article:hover {
    border-color: #ddd1c7;
    box-shadow: 0 5px 14px rgba(54, 39, 29, 0.045);
  }
  article.inactive {
    background: #fafafa;
    opacity: 0.74;
  }
  .ingredient-copy {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .ingredient-copy b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ingredient-copy span {
    justify-self: start;
    padding: 4px 7px;
    border-radius: 99px;
    font-size: 9px;
    font-weight: 900;
  }
  .available {
    color: #166534;
    background: #eaf8ed;
  }
  .category-badge {
    color: #6c4cac;
    background: #f2edfb;
  }
  .unavailable {
    color: #6b7280;
    background: #eceff1;
  }
  .ingredient-state {
    display: grid;
    justify-items: start;
    gap: 3px;
  }
  .ingredient-state strong {
    color: #2e2925;
    font-size: 11px;
    white-space: nowrap;
  }
  .ingredient-state small {
    color: var(--muted);
    font-size: 8px;
    white-space: nowrap;
  }
  .ingredient-state > span {
    padding: 4px 6px;
    border-radius: 5px;
    font-size: 8px;
    font-weight: 850;
  }
  .ingredient-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }
  .ingredient-actions button {
    min-width: 35px;
    height: 35px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e3dcd5;
    border-radius: 9px;
    padding: 0 9px;
    color: #544b44;
    background: #fff;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
  .ingredient-actions svg {
    width: 15px;
  }
  .ingredient-actions .confirm {
    color: #166534;
    border-color: #b7ddc0;
    background: #f0f9f2;
  }
  .ingredient-actions .delete {
    color: #b42318;
  }
  .ingredient-actions button:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  .ingredient-menu-wrap {
    position: relative;
    align-self: start;
  }
  .ingredient-menu-trigger {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 7px;
    color: #4f4944;
    background: transparent;
    cursor: pointer;
  }
  .ingredient-menu-trigger:hover,
  .ingredient-menu-trigger[aria-expanded='true'] {
    background: #f5f0eb;
  }
  .ingredient-menu-trigger svg {
    width: 16px;
  }
  .ingredient-menu {
    position: absolute;
    top: 36px;
    right: 0;
    z-index: 20;
    width: 172px;
    display: grid;
    gap: 2px;
    padding: 5px;
    border: 1px solid #e4ddd6;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 14px 32px rgba(43, 31, 23, 0.16);
  }
  .ingredient-menu button {
    min-height: 34px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 0;
    border-radius: 6px;
    padding: 0 9px;
    color: #413b36;
    background: transparent;
    font-size: 9px;
    font-weight: 750;
    text-align: left;
    cursor: pointer;
  }
  .ingredient-menu button:hover {
    background: #f8f5f2;
  }
  .ingredient-menu button.delete {
    color: #b42318;
  }
  .ingredient-menu button svg {
    width: 14px;
  }
  .ingredient-edit-fields {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(130px, 1fr) minmax(120px, 0.65fr) minmax(105px, 0.45fr);
    gap: 8px;
  }
  .ingredient-edit-fields > input,
  .ingredient-edit-fields .money-input {
    min-width: 0;
    height: 38px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    background: #fff;
  }
  .ingredient-edit-fields > input {
    padding: 0 10px;
  }
  .ingredient-edit-fields .money-input {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
  }
  .ingredient-edit-fields .money-input span {
    padding-left: 9px;
    color: var(--a);
    font-size: 10px;
    font-weight: 900;
  }
  .ingredient-edit-fields .money-input input {
    width: 100%;
    min-width: 0;
    height: 36px;
    border: 0;
    padding: 0 8px;
    background: transparent;
  }
  ${ingredientImageStyles}
  @media (max-width: 1120px) {
    .ingredient-filters {
      grid-template-columns: minmax(180px, 1fr) repeat(2, minmax(110px, auto)) 38px;
    }
    .ingredient-filters select[aria-label='Filtrar ingredientes por status'] {
      display: none;
    }
  }
  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    .ingredient-categories {
      padding: 0 0 12px;
      border-right: 0;
      border-bottom: 1px solid #eee7e0;
    }
    .ingredient-categories nav {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .ingredient-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ingredient-edit-fields {
      grid-column: 2 / -1;
    }
    .ingredient-actions {
      grid-column: 2 / -1;
      justify-content: flex-start;
    }
  }
  @media (max-width: 620px) {
    .ingredient-filters {
      grid-template-columns: minmax(0, 1fr) minmax(125px, auto) 38px;
    }
    .ingredient-filters select[aria-label='Filtrar ingredientes por categoria'] {
      display: none;
    }
    .ingredient-list {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 480px) {
    padding: 11px;
    .ingredient-categories nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ingredient-filters {
      grid-template-columns: minmax(0, 1fr) 38px;
    }
    .ingredient-filters select {
      display: none;
    }
    .ingredient-edit-fields {
      grid-column: 2 / -1;
    }
    .ingredient-edit-fields {
      grid-template-columns: 1fr;
    }
    article {
      grid-template-columns: auto minmax(0, 1fr) auto;
    }
    .ingredient-state {
      grid-column: 2;
    }
    .ingredient-menu-wrap {
      grid-column: 3;
      grid-row: 1;
    }
  }
`;
