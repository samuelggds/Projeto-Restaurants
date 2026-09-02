import styled from 'styled-components';

export const IngredientWorkflowHint = styled.div`
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid #f0dfcc;
  border-radius: 7px;
  color: #6f6258;
  background: #fffaf4;
  font-size: 10px;
  > svg {
    width: 15px;
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
  transition: 160ms ease;
  > svg {
    width: 27px;
    color: var(--a);
  }
  &:hover {
    border-color: var(--a);
    color: var(--a);
    background: #fff;
  }
  @media (max-width: 480px) {
    width: min(100%, 350px);
    min-height: 160px;
    aspect-ratio: auto;
  }
`;

export const CategoryWorkspace = styled.div`
  display: grid;
  gap: 18px;
`;
