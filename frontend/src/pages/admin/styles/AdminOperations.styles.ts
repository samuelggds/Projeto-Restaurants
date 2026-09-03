import styled from 'styled-components';

export const DataList = styled.div`
  display: grid;
  .data-row {
    min-height: 66px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }
  .data-row img {
    width: 46px;
    height: 46px;
    border-radius: 9px;
    object-fit: cover;
  }
  .data-row div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .data-row span,
  .data-row small {
    font-size: 10px;
    color: var(--muted);
  }
  .data-row strong {
    margin-left: auto;
    white-space: nowrap;
  }
  .data-row > button {
    margin-left: auto;
    border: 1px solid var(--a);
    border-radius: 7px;
    background: #fff;
    color: var(--a);
    height: 34px;
    padding: 0 10px;
  }
  .category-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 9px;
    min-width: 200px;
  }
  .category-actions button {
    width: 92px;
    height: 34px;
    border: 1px solid var(--a);
    border-radius: 8px;
    background: #fff;
    color: var(--a);
    transition:
      background 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }
  .category-actions button:hover:not(:disabled) {
    background: #fff3ed;
    transform: translateY(-1px);
  }
  .category-actions .category-delete {
    border-color: #e7aaa3;
    color: #b23b32;
  }
  .category-actions .category-delete:hover:not(:disabled) {
    background: #fff1ef;
  }
  .category-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  @media (max-width: 560px) {
    .data-row {
      min-height: 62px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
    }
    .category-actions {
      width: auto;
      min-width: auto;
      margin-left: auto;
      gap: 6px;
    }
    .category-actions button {
      width: 74px;
      height: 32px;
      padding: 0 6px;
      border-radius: 9px;
      font-size: 11px;
    }
  }
`;
export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 15px;
  input,
  select {
    height: 42px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    padding: 0 11px;
    outline: none;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease;
  }
  input:focus,
  select:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 11%, transparent);
  }
  input {
    min-width: 0;
    flex: 1;
  }
  button {
    height: 42px;
    border: 0;
    border-radius: 8px;
    background: var(--a);
    color: #fff;
    padding: 0 14px;
  }
  @media (max-width: 520px) {
    display: grid;
    grid-template-columns: 1fr;
    input,
    select,
    button {
      width: 100%;
    }
  }
`;
