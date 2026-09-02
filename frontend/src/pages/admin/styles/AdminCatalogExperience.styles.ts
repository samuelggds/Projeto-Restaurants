import styled from 'styled-components';

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
  gap: 22px;
  min-width: 0;
  animation: catalog-view-enter 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
  @keyframes catalog-view-enter {
    from {
      opacity: 0;
      transform: translateY(7px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
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
    font-size: 30px;
  }
  p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 14px;
  }
  > button {
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 8px;
    padding: 0 20px;
    color: #fff;
    background: var(--a);
    font-size: 14px;
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

export const IngredientWorkflowHint = styled.div`
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 16px;
  border: 1px solid #f0dfcc;
  border-radius: 7px;
  color: #6f6258;
  background: #fffaf4;
  font-size: 13px;
  > svg {
    width: 16px;
    color: #d97816;
  }
  b {
    color: #8b4d16;
  }
  i {
    color: #c99a71;
    font-style: normal;
  }
  @media (max-width: 560px) {
    overflow-x: auto;
    white-space: nowrap;
  }
`;

export const ProductToolbar = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(180px, 230px) 44px;
  gap: 12px;
  margin-bottom: 24px;
  .product-search {
    min-width: 0;
    height: 44px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 13px;
    border: 1px solid #ded7cf;
    border-radius: 8px;
    background: #fff;
  }
  .product-search svg {
    flex: 0 0 auto;
    width: 17px;
    color: #6f6963;
  }
  .product-search input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 11px;
  }
  select,
  > button {
    height: 44px;
    border: 1px solid #ded7cf;
    border-radius: 8px;
    color: #413c38;
    background: #fff;
  }
  select {
    min-width: 0;
    padding: 0 12px;
    font-size: 11px;
    font-weight: 700;
  }
  > button {
    display: grid;
    place-items: center;
  }
  > button svg {
    width: 17px;
  }
  @media (max-width: 650px) {
    grid-template-columns: minmax(0, 1fr) 44px;
    select {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
`;

export const ProductImageFallback = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  display: grid !important;
  place-items: center;
  padding: 0 !important;
  border-radius: 7px 7px 0 0;
  color: #9d9289;
  background: #f4f1ed;
  > svg {
    width: 28px;
  }
`;

export const NewProductTile = styled.button`
  min-height: 100%;
  aspect-ratio: 4 / 5.15;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  border: 1px dashed color-mix(in srgb, var(--a) 42%, #dfd7cf);
  border-radius: 8px;
  color: #69625c;
  background: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  cursor: pointer;
  transition:
    color 280ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 280ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 320ms cubic-bezier(0.22, 1, 0.36, 1);
  > svg {
    width: 27px;
    color: var(--a);
  }
  &:hover {
    border-color: var(--a);
    color: var(--a);
    background: #fff;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  @media (max-width: 480px) {
    width: min(100%, 350px);
    min-height: 160px;
    aspect-ratio: auto;
  }
`;

export const CategoryWorkspace = styled.div`
  display: grid;
  gap: 22px;
  animation: category-workspace-enter 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
  @keyframes category-workspace-enter {
    from {
      opacity: 0;
      transform: translateY(7px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const CategoryPageHeader = styled.header`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  padding: 10px 2px 2px;

  @media (max-width: 650px) {
    align-items: start;
    flex-direction: column;
    gap: 16px;
  }
`;

export const CategoryTitle = styled.div`
  min-width: 0;

  > span {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
    color: var(--a);
    font-size: 10px;
    font-weight: 850;
    text-transform: uppercase;
  }

  > span svg {
    width: 14px;
    height: 14px;
  }

  h2 {
    margin: 0;
    color: #25211e;
    font-size: 26px;
    line-height: 1.15;
  }

  p {
    max-width: 580px;
    margin: 7px 0 0;
    color: #716a64;
    font-size: 13px;
    line-height: 1.5;
  }
`;

export const CategorySummary = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 5px 2px;

  div {
    display: grid;
    gap: 1px;
  }

  strong {
    color: #2d2824;
    font-size: 20px;
    line-height: 1;
  }

  span {
    color: #827a73;
    font-size: 10px;
  }

  i {
    width: 1px;
    height: 28px;
    background: #ddd5cd;
  }
`;

export const CategoryFeedback = styled.div<{ $tone: 'success' | 'error' }>`
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid ${({ $tone }) => ($tone === 'success' ? '#b9dbc3' : '#efb9b2')};
  border-radius: 7px;
  color: ${({ $tone }) => ($tone === 'success' ? '#236b3a' : '#a3382e')};
  background: ${({ $tone }) => ($tone === 'success' ? '#f1faf3' : '#fff4f2')};
  font-size: 12px;
  font-weight: 700;
`;

export const CategoryCreator = styled.form`
  display: grid;
  grid-template-columns: minmax(180px, 0.55fr) minmax(320px, 1fr);
  align-items: center;
  gap: 26px;
  padding: 17px 0;
  border-top: 1px solid #e5ded7;
  border-bottom: 1px solid #e5ded7;

  > label {
    display: grid;
    gap: 3px;
  }

  > label b {
    color: #302a26;
    font-size: 13px;
  }

  > label span {
    color: #817970;
    font-size: 10px;
    line-height: 1.45;
  }

  .category-create-field {
    min-width: 0;
    height: 46px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    padding-left: 13px;
    border: 1px solid #dcd4cc;
    border-radius: 8px;
    background: #fff;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  .category-create-field:focus-within {
    border-color: var(--a);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }

  .category-create-field > svg {
    width: 17px;
    height: 17px;
    color: #887e75;
  }

  input {
    min-width: 0;
    height: 42px;
    border: 0;
    outline: 0;
    color: #342e29;
    background: transparent;
    font-size: 12px;
  }

  button {
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-right: 3px;
    padding: 0 14px;
    border: 0;
    border-radius: 7px;
    color: #fff;
    background: var(--a);
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }

  button svg {
    width: 15px;
    height: 15px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 11px;
  }

  @media (max-width: 470px) {
    .category-create-field {
      height: auto;
      grid-template-columns: auto minmax(0, 1fr);
      padding: 0 11px;
    }

    button {
      grid-column: 1 / -1;
      width: calc(100% + 22px);
      margin: 0 -11px -1px;
      border-radius: 0 0 7px 7px;
    }
  }
`;

export const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

export const CategoryCard = styled.article`
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e2dbd4;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 7px 20px rgba(50, 37, 27, 0.045);
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease,
    transform 220ms ease;

  &:hover {
    border-color: #d1c5bb;
    box-shadow: 0 11px 27px rgba(50, 37, 27, 0.075);
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const CategoryMedia = styled.div<{ $color: string; $imageCount: number }>`
  position: relative;
  height: 116px;
  display: grid;
  grid-template-columns: ${({ $imageCount }) => ($imageCount >= 2 ? '1.45fr 1fr' : '1fr')};
  grid-template-rows: ${({ $imageCount }) => ($imageCount >= 3 ? '1fr 1fr' : '1fr')};
  gap: ${({ $imageCount }) => ($imageCount >= 2 ? '2px' : '0')};
  overflow: hidden;
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 11%, #f5f1ed)`};

  img {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    object-fit: cover;
  }

  img:first-child:nth-last-child(3) {
    grid-row: 1 / -1;
  }

  .category-media-empty {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 5px;
    color: ${({ $color }) => $color};
    background-image: linear-gradient(
      135deg,
      transparent 0 46%,
      color-mix(in srgb, ${({ $color }) => $color} 9%, transparent) 46% 54%,
      transparent 54% 100%
    );
    background-size: 18px 18px;
  }

  .category-media-empty svg {
    width: 28px;
    height: 28px;
  }

  .category-media-empty span {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .category-product-count {
    position: absolute;
    right: 8px;
    bottom: 8px;
    min-width: 32px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0 8px;
    border: 1px solid rgba(255, 255, 255, 0.55);
    border-radius: 6px;
    color: #fff;
    background: rgba(32, 27, 23, 0.72);
    backdrop-filter: blur(5px);
    font-size: 10px;
    font-weight: 800;
  }

  .category-product-count svg {
    width: 12px;
    height: 12px;
  }
`;

export const CategoryCardBody = styled.div`
  display: grid;
  gap: 15px;
  padding: 14px;

  .category-identity {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .category-icon {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    background: color-mix(in srgb, currentColor 10%, #fff);
  }

  .category-icon svg {
    width: 17px;
    height: 17px;
  }

  .category-identity > div {
    min-width: 0;
  }

  h3 {
    overflow: hidden;
    margin: 0;
    color: #302a26;
    font-size: 14px;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 2px 0 0;
    color: #827a73;
    font-size: 10px;
  }

  .category-card-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 38px;
    gap: 8px;
  }

  button {
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid #ded6cf;
    border-radius: 7px;
    color: #514942;
    background: #fff;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      background 160ms ease;
  }

  button svg {
    width: 14px;
    height: 14px;
  }

  button:hover:not(:disabled) {
    border-color: var(--a);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, #fff);
  }

  .category-delete {
    border-color: #ead2ce;
    color: #b84438;
  }

  .category-delete:hover:not(:disabled) {
    border-color: #cf6256;
    color: #a43127;
    background: #fff3f1;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

export const CategoryEmptyState = styled.div`
  min-height: 240px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  border: 1px dashed #d9d0c8;
  border-radius: 8px;
  color: #81786f;
  background: rgba(255, 255, 255, 0.45);
  text-align: center;

  > svg {
    width: 28px;
    height: 28px;
    color: var(--a);
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: #3f3934;
    font-size: 14px;
  }

  p {
    font-size: 11px;
  }
`;
