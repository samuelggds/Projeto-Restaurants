import styled from 'styled-components';

export const SupportLayout = styled.div`
  min-height: 620px;
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 14px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const SupportList = styled.div`
  display: grid;
  gap: 8px;
  button {
    padding: 12px;
    display: flex;
    justify-content: space-between;
    gap: 9px;
    border: 1px solid #e2e8e4;
    border-radius: 12px;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }
  button.active {
    border-color: #78a98a;
    background: #f1f9f3;
  }
  b,
  small {
    display: block;
  }
  b {
    font-size: 12px;
  }
  small {
    max-width: 260px;
    margin-top: 3px;
    overflow: hidden;
    color: #75827a;
    font-size: 11px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  em {
    color: #4f785e;
    font-size: 10px;
    font-style: normal;
  }
`;

export const Chat = styled.div`
  height: 430px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  border-radius: 13px;
  background: #f6f8f7;
`;

export const Bubble = styled.div<{ $staff?: boolean }>`
  max-width: 82%;
  align-self: ${({ $staff }) => ($staff ? 'flex-end' : 'flex-start')};
  padding: 10px 12px;
  border: 1px solid ${({ $staff }) => ($staff ? '#c2dfcb' : '#e1e7e3')};
  border-radius: 13px;
  background: ${({ $staff }) => ($staff ? '#dff2e5' : '#fff')};
  b {
    color: #66756c;
    font-size: 10px;
  }
  p {
    margin: 4px 0;
    font-size: 12px;
    line-height: 1.5;
  }
  time {
    color: #849087;
    font-size: 9px;
  }
`;

export const Resolved = styled.div`
  padding: 8px 11px;
  align-self: center;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 20px;
  background: #e8f5ec;
  color: #397351;
  font-size: 11px;
`;

export const Composer = styled.form`
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 46px;
  gap: 8px;
  textarea {
    min-height: 70px;
    padding: 10px;
    resize: none;
    border: 1px solid #dce4df;
    border-radius: 12px;
    outline: 0;
    font: inherit;
    font-size: 13px;
  }
  button {
    border: 0;
    border-radius: 12px;
    background: #244d38;
    color: #fff;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
  }
`;
