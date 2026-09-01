import styled from 'styled-components';

export const KitchenCardActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;

  .action:only-child {
    grid-column: 1 / -1;
  }

  .reprint {
    min-height: 38px;
    border: 1px solid #d8dce0;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #3d4a54;
    background: #f8fafb;
    font-size: 10px;
    font-weight: 750;
  }

  .reprint:hover:not(:disabled) {
    border-color: #aeb8c1;
    background: #fff;
  }

  .reprint:disabled {
    cursor: wait;
    opacity: 0.62;
  }

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;
