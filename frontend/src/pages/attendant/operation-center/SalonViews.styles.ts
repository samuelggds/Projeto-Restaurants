import styled from 'styled-components';

export const CallCard = styled.article`
  padding: 16px;
  display: grid;
  grid-template-columns: 110px 1fr 80px auto;
  gap: 13px;
  align-items: center;
  border: 1px solid #e1e7e3;
  border-radius: 15px;
  background: #fff;
  .table {
    padding: 9px;
    border-radius: 10px;
    background: #eef4f0;
    font-size: 12px;
    font-weight: 900;
    text-align: center;
  }
  strong,
  small {
    display: block;
  }
  strong {
    font-size: 13px;
  }
  small {
    margin-top: 3px;
    color: #76837b;
    font-size: 11px;
  }
  time {
    color: #849088;
    font-size: 11px;
  }
  button {
    min-height: 40px;
    padding: 0 12px;
    border: 0;
    border-radius: 10px;
    background: #244d38;
    color: #fff;
    font-size: 11px;
    font-weight: 850;
    cursor: pointer;
  }
  button.success {
    background: #2f7850;
  }
  @media (max-width: 760px) {
    grid-template-columns: 90px 1fr;
    time {
      display: none;
    }
    button {
      grid-column: 1/-1;
    }
  }
`;

export const TableGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const TableCard = styled.article<{ $attention?: boolean }>`
  padding: 18px;
  border: 1px solid ${({ $attention }) => ($attention ? '#e9c999' : '#e1e7e3')};
  border-radius: 17px;
  background: #fff;
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  header small,
  header strong {
    display: block;
  }
  header small {
    color: #77847c;
    font-size: 10px;
    text-transform: uppercase;
  }
  header strong {
    font-size: 28px;
  }
  header em {
    padding: 7px 9px;
    border-radius: 9px;
    background: #fff4df;
    color: #956015;
    font-size: 10px;
    font-style: normal;
    font-weight: 850;
  }
  > div {
    margin: 14px 0;
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }
  > div span {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #6e7b73;
    font-size: 11px;
  }
  p {
    margin: 0;
    color: #748179;
    font-size: 11px;
    line-height: 1.5;
  }
`;
