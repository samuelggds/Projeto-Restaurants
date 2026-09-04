import styled from 'styled-components';

export const Box = styled.section<{ $paid: boolean }>`
  display: grid;
  gap: 11px;
  padding: 13px;
  border: 1px solid ${({ $paid }) => ($paid ? '#b8ddc2' : '#ecd6a5')};
  border-radius: 10px;
  background: ${({ $paid }) => ($paid ? '#f2faf4' : '#fff9e9')};
`;

export const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  > span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #37322e;
    font-size: 12px;
    font-weight: 850;
  }

  > strong {
    color: #191816;
    font-size: 13px;
    font-weight: 850;
  }
`;

export const Status = styled.div<{ $paid: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: ${({ $paid }) => ($paid ? '#176b32' : '#7b5711')};
  font-size: 11px;
  font-weight: 700;
  line-height: 1.45;

  svg {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    margin-top: 1px;
  }
`;

export const PixArea = styled.div`
  display: grid;
  justify-items: center;
  gap: 9px;
  padding: 11px;
  border-radius: 9px;
  background: #fff;

  svg {
    width: 132px;
    height: 132px;
  }

  small {
    color: #716b65;
    text-align: center;
    line-height: 1.4;
  }
`;

export const CopyButton = styled.button`
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid #c9c4bd;
  border-radius: 8px;
  background: #fff;
  color: #38332f;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    border-color: var(--courier-primary);
    color: var(--courier-primary);
  }
`;

export const RefreshButton = styled.button`
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: #fff;
  color: #5c5145;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
`;
