import styled from 'styled-components';

export const Panel = styled.section`
  display: grid;
  gap: 12px;
  margin-top: 14px;
  border-top: 1px solid var(--courier-line);
  padding: 20px 0;
  background: transparent;

  .heading {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }
  h2,
  p {
    margin: 0;
  }
  h2 {
    color: var(--courier-ink);
    font-size: 17px;
  }
  .heading p,
  .empty,
  small {
    color: #766e67;
    font-size: 12px;
  }
  .list {
    display: grid;
    gap: 9px;
  }
  .item {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 14px;
    border: 1px solid var(--courier-line);
    border-radius: 7px;
    padding: 14px;
    background: #fafbfa;
  }
  .amount {
    font-size: 18px;
    font-weight: 850;
    color: #27211d;
  }
  .status {
    display: inline-flex;
    margin-top: 6px;
    border-radius: 5px;
    padding: 4px 8px;
    color: #65537f;
    background: #f1edf7;
    font-size: 10px;
    font-weight: 850;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  button {
    min-height: 40px;
    border-radius: 7px;
    padding: 0 12px;
    cursor: pointer;
    font: inherit;
    font-weight: 750;
  }
  .confirm {
    border: 1px solid #287044;
    color: #fff;
    background: #2f8d59;
  }
  .dispute {
    border: 1px solid #dfcfc5;
    color: #6a5042;
    background: #fff;
  }
  .dispute-box {
    grid-column: 1 / -1;
    display: grid;
    gap: 8px;
  }
  textarea {
    min-height: 76px;
    resize: vertical;
    border: 1px solid #ddd3ca;
    border-radius: 7px;
    padding: 10px;
    font: inherit;
  }
  .error {
    color: #9c3023;
    font-size: 12px;
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (max-width: 650px) {
    .item {
      grid-template-columns: 1fr;
    }
    .actions {
      align-items: stretch;
    }
    .actions button {
      flex: 1;
    }
  }
`;
