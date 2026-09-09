import styled from 'styled-components';

export const DrawerBackdrop = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 28, 21, 0.5);
  backdrop-filter: blur(4px);
  z-index: 120;
`;

export const Drawer = styled.aside`
  width: min(580px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8faf9;
  box-shadow: -30px 0 80px rgba(15, 30, 22, 0.2);
`;

export const DrawerHead = styled.header`
  padding: 24px 24px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #e2e8e4;
  background: #fff;
  small,
  strong,
  em {
    display: block;
  }
  small {
    color: #7b8980;
    font-size: 11px;
    text-transform: uppercase;
  }
  strong {
    font-size: 30px;
  }
  em {
    width: max-content;
    margin-top: 6px;
    padding: 6px 9px;
    border-radius: 999px;
    background: #edf8f1;
    color: #34704d;
    font-size: 11px;
    font-style: normal;
    font-weight: 850;
  }
  button {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 12px;
    background: #f3f6f4;
    cursor: pointer;
  }
`;

export const DrawerBody = styled.div`
  padding: 20px;
  display: grid;
  gap: 16px;
  overflow: auto;
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const Info = styled.div`
  padding: 15px;
  border: 1px solid #e2e8e4;
  border-radius: 14px;
  background: #fff;
  small,
  b,
  span {
    display: block;
  }
  small {
    color: #7c8981;
    font-size: 10px;
    font-weight: 850;
    text-transform: uppercase;
  }
  b {
    margin-top: 5px;
    font-size: 14px;
  }
  b.total {
    font-size: 21px;
  }
  b svg {
    width: 16px;
    vertical-align: middle;
  }
  span {
    margin-top: 4px;
    color: #76837b;
    font-size: 11px;
  }
`;

export const ItemBox = styled.div`
  overflow: hidden;
  border: 1px solid #e2e8e4;
  border-radius: 14px;
  background: #fff;
  h3 {
    margin: 0;
    padding: 14px 15px;
    border-bottom: 1px solid #edf1ee;
    font-size: 14px;
  }
  > div {
    padding: 12px 15px;
    border-bottom: 1px solid #edf1ee;
  }
  > div:last-child {
    border-bottom: 0;
  }
  b,
  span {
    display: block;
  }
  b {
    font-size: 13px;
  }
  span {
    margin-top: 3px;
    color: #77847c;
    font-size: 11px;
  }
`;

export const ActionBox = styled.div<{ $warning?: boolean }>`
  padding: 16px;
  border: 1px solid ${({ $warning }) => ($warning ? '#efd3a2' : '#cce4d4')};
  border-radius: 15px;
  background: ${({ $warning }) => ($warning ? '#fff8e9' : '#f0faf3')};
  strong {
    font-size: 14px;
  }
  p {
    color: #6d786f;
    font-size: 12px;
    line-height: 1.5;
  }
  button {
    width: 100%;
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 11px;
    background: #2f6f4a;
    color: #fff;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;
