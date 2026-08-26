import styled from 'styled-components';

export const ProductGrid = styled.div`
  position: relative;
  overflow: visible;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 13px;
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
  border-radius: 12px;
  overflow: visible;
  background: #fff;
  img {
    width: 100%;
    height: 78px;
    object-fit: cover;
    border-radius: 11px 11px 0 0;
  }
  div {
    padding: 7px 9px;
    display: grid;
    gap: 3px;
  }
  b {
    font-size: 13px;
    line-height: 1.25;
  }
  span {
    font-size: 9px;
    color: var(--muted);
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  footer strong {
    color: var(--a);
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
  display: inline-flex;
  gap: 5px;
  padding: 5px;
  margin-bottom: 22px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(42, 31, 23, 0.04);
  button {
    border: 0;
    border-radius: 9px;
    padding: 11px 17px;
    background: transparent;
    color: var(--muted);
    font-weight: 800;
    cursor: pointer;
    transition: 160ms ease;
  }
  button:hover:not(.primary) {
    background: #faf6f1;
    color: #322c27;
  }
  button.primary {
    background: var(--a);
    color: #fff;
    box-shadow: 0 5px 12px color-mix(in srgb, var(--a) 30%, transparent);
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
  width: min(100%, 1060px);
  display: grid;
  gap: 18px;
  min-width: 0;
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
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(48, 35, 25, 0.045);
  > header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 15px;
  }
  h3 {
    margin: 0;
    font-size: 17px;
  }
  header p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 11px;
  }
  .ingredient-filters {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .ingredient-search {
    height: 42px;
    min-width: min(260px, 32vw);
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    border: 1px solid #ded7cf;
    border-radius: 10px;
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
    height: 42px;
    border: 1px solid #ded7cf;
    border-radius: 10px;
    padding: 0 11px;
    background: #fcfbfa;
  }
  .ingredient-list {
    display: grid;
    gap: 16px;
  }
  .ingredient-category-group {
    min-width: 0;
    display: grid;
    gap: 8px;
  }
  .ingredient-category-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 2px;
  }
  .ingredient-category-heading b {
    color: #39322d;
    font-size: 12px;
  }
  .ingredient-category-heading span {
    padding: 4px 8px;
    border-radius: 99px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 8%, white);
    font-size: 9px;
    font-weight: 800;
  }
  .ingredient-category-items {
    display: grid;
    gap: 8px;
  }
  article {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 13px;
    padding: 12px;
    border: 1px solid #eee7e0;
    border-radius: 13px;
    background: #fefdfc;
    transition: 160ms ease;
  }
  article:hover {
    border-color: #ddd1c7;
    transform: translateY(-1px);
    box-shadow: 0 7px 17px rgba(54, 39, 29, 0.045);
  }
  article.inactive {
    background: #fafafa;
    opacity: 0.74;
  }
  .ingredient-avatar {
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, white);
    font-weight: 900;
  }
  .ingredient-copy {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
  .ingredient-copy b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ingredient-badges {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
  }
  .ingredient-copy span {
    flex: 0 0 auto;
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
    color: #6b4c3a;
    background: #f5eee8;
  }
  .unavailable {
    color: #6b7280;
    background: #eceff1;
  }
  article > strong {
    color: var(--a);
    font-size: 14px;
    white-space: nowrap;
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
  @media (max-width: 750px) {
    > header {
      align-items: stretch;
      flex-direction: column;
    }
    .ingredient-search {
      min-width: 0;
      flex: 1;
    }
    article {
      grid-template-columns: auto minmax(0, 1fr) auto;
    }
    .ingredient-actions {
      grid-column: 2 / -1;
      justify-content: flex-start;
    }
    .ingredient-edit-fields {
      grid-column: 2 / -1;
    }
  }
  @media (max-width: 480px) {
    padding: 16px;
    .ingredient-filters {
      flex-direction: column;
    }
    .ingredient-copy {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }
    .ingredient-edit-fields {
      grid-template-columns: 1fr;
    }
    .ingredient-actions .status-button {
      flex: 1;
    }
  }
`;
