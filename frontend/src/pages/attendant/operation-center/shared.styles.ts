import styled from 'styled-components';

export const SectionTitle = styled.div`
  margin-bottom: 16px;
  h2 {
    margin: 0;
    font-size: 24px;
  }
  p {
    margin: 5px 0 0;
    color: #718078;
    font-size: 14px;
  }
`;

export const Guide = styled.div`
  margin: 18px 0 22px;
  padding: 16px 18px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border: 1px solid #dfe8e2;
  border-radius: 16px;
  background: linear-gradient(135deg, #f4faf6, #fff);
  > svg {
    width: 21px;
    flex: none;
    color: #357553;
  }
  strong {
    display: block;
    font-size: 14px;
  }
  p {
    margin: 4px 0 0;
    color: #66766c;
    font-size: 13px;
    line-height: 1.5;
  }
`;

export const Panel = styled.section`
  min-width: 0;
  padding: 18px;
  border: 1px solid #e1e7e3;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 7px 24px rgba(30, 50, 40, 0.04);
`;

export const PanelHead = styled.header`
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  > div {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  > div > svg {
    width: 20px;
    color: #3b7354;
  }
  strong,
  small {
    display: block;
  }
  strong {
    font-size: 14px;
  }
  small {
    margin-top: 2px;
    color: #79867e;
    font-size: 11px;
  }
`;

export const TextButton = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: #376e50;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
`;

export const MiniRow = styled.div`
  padding: 13px 5px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  border-top: 1px solid #edf0ee;
  .badge {
    padding: 7px 9px;
    border-radius: 9px;
    background: #eef4f0;
    font-size: 11px;
    font-weight: 900;
  }
  b,
  small {
    display: block;
  }
  b {
    font-size: 13px;
  }
  small {
    margin-top: 2px;
    color: #76837b;
    font-size: 11px;
  }
  time {
    color: #8a958f;
    font-size: 11px;
  }
`;

export const Empty = styled.div`
  min-height: 170px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #7d8a82;
  text-align: center;
  svg {
    width: 28px;
    margin-bottom: 9px;
    color: #8fa096;
  }
  b {
    color: #536159;
    font-size: 15px;
  }
  span {
    max-width: 360px;
    margin-top: 5px;
    font-size: 12px;
    line-height: 1.5;
  }
`;

export const Toolbar = styled.div`
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

export const SearchBox = styled.label`
  min-width: 320px;
  min-height: 48px;
  padding: 0 14px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #dce4df;
  border-radius: 13px;
  background: #fff;
  svg {
    width: 18px;
    color: #7c8981;
  }
  input {
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 14px;
  }
  @media (max-width: 600px) {
    min-width: 100%;
    input {
      font-size: 16px;
    }
  }
`;

export const Filters = styled.div`
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  button {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid #dfe5e1;
    border-radius: 11px;
    background: #fff;
    color: #66736c;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }
  button.active {
    border-color: #244d38;
    background: #244d38;
    color: #fff;
  }
`;

export const DayFilters = styled.div`
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  button {
    min-height: 38px;
    padding: 0 12px;
    border: 1px solid #dfe5e1;
    border-radius: 999px;
    background: #fff;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }
  button.active {
    background: #edf8f1;
    border-color: #79a98b;
    color: #265f3e;
  }
  button.active.old {
    background: #fff3df;
    border-color: #e4bd78;
    color: #8b5b13;
  }
  span {
    margin-left: auto;
    color: #748179;
    font-size: 12px;
  }
  @media (max-width: 600px) {
    span {
      width: 100%;
      margin-left: 0;
    }
  }
`;

export const List = styled.div`
  display: grid;
  gap: 11px;
`;

export const OrderCard = styled.article<{ $attention?: boolean }>`
  padding: 16px 18px;
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) 100px auto;
  gap: 14px;
  align-items: center;
  border: 1px solid ${({ $attention }) => ($attention ? '#e8c69a' : '#e1e7e3')};
  border-radius: 16px;
  background: #fff;
  .status strong,
  .status em,
  .copy b,
  .copy small {
    display: block;
  }
  .status strong {
    font-size: 16px;
  }
  .status em {
    margin-top: 3px;
    color: #4f785e;
    font-size: 11px;
    font-style: normal;
  }
  .status em.old {
    color: #a06417;
  }
  .copy b {
    font-size: 14px;
  }
  .copy small {
    margin-top: 4px;
    overflow: hidden;
    color: #77847c;
    font-size: 12px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .time {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #7d8982;
    font-size: 12px;
  }
  > button {
    min-height: 42px;
    padding: 0 13px;
    display: flex;
    align-items: center;
    gap: 5px;
    border: 1px solid #d8e2dc;
    border-radius: 11px;
    background: #f8fbf9;
    color: #315e45;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }
  @media (max-width: 760px) {
    grid-template-columns: 90px 1fr;
    padding: 15px;
    .time {
      display: none;
    }
    .copy small {
      white-space: normal;
    }
    > button {
      grid-column: 1/-1;
      justify-content: center;
    }
  }
`;

export const Pagination = styled.div`
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  button {
    min-height: 42px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #d8e2dc;
    border-radius: 11px;
    background: #fff;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  span {
    font-size: 12px;
    color: #68766e;
  }
  @media (max-width: 560px) {
    flex-direction: column;
    button {
      width: 100%;
      justify-content: center;
    }
  }
`;
