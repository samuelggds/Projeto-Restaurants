import styled from 'styled-components';

export const CreateForm = styled.form`
  display: grid;
  gap: 16px;
  width: 100%;
  max-width: none;
`;

export const Step = styled.section`
  padding: 20px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 15px;
  border: 1px solid #e1e7e3;
  border-radius: 18px;
  background: #fff;
  > span {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #234d38;
    color: #fff;
    font-size: 13px;
    font-weight: 900;
  }
  h3 {
    margin: 0;
    font-size: 17px;
  }
  p {
    margin: 4px 0 14px;
    color: #75827a;
    font-size: 12px;
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    > span {
      width: 34px;
      height: 34px;
    }
  }
`;

export const ChoiceRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  button {
    min-height: 46px;
    padding: 0 15px;
    display: flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #dbe3de;
    border-radius: 12px;
    background: #fff;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }
  button.active {
    border-color: #79a98b;
    background: #eef8f1;
    color: #265f3e;
  }
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  label {
    color: #647169;
    font-size: 11px;
    font-weight: 800;
  }
  input {
    width: 100%;
    height: 46px;
    margin-top: 5px;
    padding: 0 12px;
    border: 1px solid #dce4df;
    border-radius: 10px;
    outline: 0;
    font-size: 13px;
  }
  .wide {
    grid-column: span 2;
  }
  @media (max-width: 800px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    .wide {
      grid-column: auto;
    }
    input {
      font-size: 16px;
    }
  }
`;

export const PaymentRow = styled(ChoiceRow)`
  margin-top: 20px;
  @media (max-width: 520px) {
    margin-top: 18px;
  }
`;

export const CategoryList = styled.div`
  display: grid;
  gap: 22px;
`;

export const Category = styled.div``;

export const CategoryHeader = styled.div`
  margin-bottom: 10px;
  strong,
  small {
    display: block;
  }
  strong {
    font-size: 15px;
  }
  small {
    margin-top: 2px;
    color: #78857d;
    font-size: 11px;
  }
`;

export const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 1250px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const ProductCard = styled.div<{ $disabled?: boolean }>`
  min-height: 108px;
  padding: 10px;
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid #e1e7e3;
  border-radius: 14px;
  background: #fff;
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  .copy b,
  .copy small,
  .copy em {
    display: block;
  }
  .copy b {
    font-size: 13px;
  }
  .copy small {
    margin-top: 3px;
    color: #66746c;
    font-size: 11px;
  }
  .copy em {
    margin-top: 5px;
    color: #4f785e;
    font-size: 10px;
    font-style: normal;
  }
  @media (max-width: 420px) {
    grid-template-columns: 70px minmax(0, 1fr);
    > div:last-child {
      grid-column: 1/-1;
      justify-self: end;
    }
  }
`;

export const ProductImage = styled.div`
  width: 82px;
  height: 82px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #f0f4f1;
  color: #93a098;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    width: 24px;
  }
  @media (max-width: 420px) {
    width: 70px;
    height: 70px;
  }
`;

export const Quantity = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  button {
    width: 36px;
    height: 36px;
    border: 1px solid #d8e2dc;
    border-radius: 10px;
    background: #f8fbf9;
    font-size: 18px;
    font-weight: 900;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.35;
  }
  strong {
    min-width: 18px;
    font-size: 13px;
    text-align: center;
  }
`;

export const Review = styled.div`
  position: sticky;
  bottom: 12px;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  border-radius: 17px;
  background: #153729;
  color: #fff;
  box-shadow: 0 18px 45px rgba(21, 55, 41, 0.24);
  small,
  strong,
  p {
    display: block;
  }
  small {
    font-size: 10px;
    opacity: 0.7;
  }
  strong {
    font-size: 22px;
  }
  p {
    margin: 3px 0 0;
    font-size: 10px;
    opacity: 0.7;
  }
  button {
    min-height: 46px;
    padding: 0 17px;
    display: flex;
    align-items: center;
    gap: 7px;
    border: 0;
    border-radius: 12px;
    background: var(--brand);
    color: #fff;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
  }
  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
    button {
      justify-content: center;
    }
  }
`;
