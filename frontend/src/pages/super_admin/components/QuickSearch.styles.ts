import styled from 'styled-components';

export const SearchField = styled.div`
  display: grid;
  gap: 9px;
  min-width: 0;
  padding: 22px 0 18px;
  label {
    font-size: 12px;
    font-weight: 750;
    color: var(--ink, #1c3028);
  }
  .input-wrap {
    position: relative;
    min-width: 0;
  }
  .input-wrap > svg {
    position: absolute;
    left: 15px;
    top: 16px;
    color: #607860;
    pointer-events: none;
  }
  input {
    display: block;
    width: 100%;
    min-width: 0;
    min-height: 52px;
    border: 1px solid #ccd8c7;
    border-radius: 14px;
    background: #f8faf5;
    color: var(--ink, #1c3028);
    padding: 13px 14px 13px 44px;
    font: inherit;
    font-size: 16px;
    line-height: 1.5;
  }
  input::placeholder {
    color: #68746b;
  }
  input:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 2px;
  }
`;

export const ResultsSummary = styled.p`
  margin: 0 0 12px;
  color: var(--muted, #637169);
  font-size: 12px;
  line-height: 1.7;
`;

export const ResultList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 0 8px;
  display: grid;
  gap: 8px;
  min-width: 0;
  li {
    min-width: 0;
  }
`;

export const ResultButton = styled.button`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  min-height: 82px;
  padding: 13px;
  border: 1px solid var(--border, #dfe5dd);
  border-radius: 14px;
  background: #fffefb;
  text-align: left;
  color: var(--ink, #1c3028);
  font: inherit;
  cursor: pointer;
  .result-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: #edf2e6;
    color: #476047;
  }
  .result-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .result-category {
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.035em;
    color: #586e51;
  }
  strong {
    font-size: 14px;
    font-weight: 750;
    line-height: 1.45;
  }
  .result-description {
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted, #637169);
  }
  > svg {
    color: #667b5d;
  }
  @media (hover: hover) {
    &:hover {
      background: #f2f6eb;
      border-color: #a3b79a;
    }
  }
  &:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 2px;
  }
  @media (max-width: 380px) {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 9px;
    padding: 11px;
    .result-icon {
      width: 32px;
      height: 36px;
      border-radius: 10px;
    }
    > svg {
      display: none;
    }
  }
`;

export const SearchHint = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 30px 15px;
  min-width: 0;
  border-radius: 16px;
  background: #f5f7f0;
  text-align: center;
  > svg {
    color: #607652;
    margin-bottom: 2px;
  }
  h3 {
    margin: 0;
    color: var(--ink, #1c3028);
    font-size: 15px;
    line-height: 1.4;
  }
  p {
    margin: 0;
    max-width: 370px;
    color: var(--muted, #637169);
    font-size: 13px;
    line-height: 1.7;
  }
`;
