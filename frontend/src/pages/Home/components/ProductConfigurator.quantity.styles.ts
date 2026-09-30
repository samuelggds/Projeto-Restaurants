import styled from 'styled-components';

export const ProductQuantity = styled.div`
  display: grid;
  grid-template-columns: 38px 30px 38px;
  align-items: center;
  border: 1px solid #ded5cc;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;

  button {
    width: 38px;
    min-width: 38px;
    height: 48px;
    min-height: 48px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: #fff;
    color: var(--config-primary);
    box-shadow: none;
    display: grid;
    place-items: center;
  }

  button:disabled {
    color: #c9c0b8;
    background: #faf9f8;
  }

  strong {
    min-width: 30px;
    text-align: center;
    font-size: 14px;
  }

  @media (max-width: 620px) {
    grid-template-columns: 36px 28px 36px;

    button {
      width: 36px;
      min-width: 36px;
      height: 46px;
      min-height: 46px;
    }
  }
`;

export const TableMenuConfiguratorScope = styled.div`
  display: contents;
`;
