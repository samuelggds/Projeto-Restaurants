import styled from 'styled-components';

export const FilterSummary = styled.div`
  margin: 0 0 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  color: var(--muted);
  font-size: 13px;

  > div {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    margin-left: auto;
  }

  button {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--teal);
    background: #fff;
    font-weight: 750;
  }
`;

export const ActionConfirmation = styled.div`
  margin-bottom: 16px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #b9ddc2;
  border-radius: 8px;
  color: #23653a;
  background: #f0faf3;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;

  svg {
    width: 20px;
    flex: 0 0 auto;
  }
`;
