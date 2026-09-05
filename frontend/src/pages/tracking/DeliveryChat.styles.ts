import styled from 'styled-components';

export const Page = styled.main`
  min-height: 100dvh;
  padding: 24px;
  color: #18221d;
  background: #f6f8f6;

  @media (max-width: 640px) {
    padding: 0;
  }
`;

export const Shell = styled.section`
  width: min(860px, 100%);
  min-height: calc(100dvh - 48px);
  margin: 0 auto;
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);

  @media (max-width: 640px) {
    min-height: 100dvh;
    border: 0;
    border-radius: 0;
  }
`;

export const Header = styled.header`
  padding: 18px 20px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid #edf0ed;
  background: rgba(255, 255, 255, 0.96);

  button {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 1px solid #e5e9e6;
    border-radius: 12px;
    color: #18221d;
    background: #fff;
    cursor: pointer;
  }

  .identity {
    min-width: 0;
    display: grid;
    gap: 2px;

    strong {
      overflow: hidden;
      font-size: 15px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      overflow: hidden;
      color: #68746e;
      font-size: 11px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

export const Context = styled.div`
  padding: 12px 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid #edf0ed;
  background: #fbfcfb;

  span {
    padding: 7px 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #e8ece9;
    border-radius: 999px;
    color: #59655f;
    background: #fff;
    font-size: 10px;
    font-weight: 700;
  }
`;

export const Messages = styled.div`
  min-height: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  background:
    radial-gradient(circle at 10% 10%, rgba(219, 234, 254, 0.34), transparent 24%),
    #f8faf8;
`;

export const Message = styled.div<{ $mine: boolean }>`
  max-width: min(74%, 520px);
  padding: 10px 12px;
  align-self: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
  border: 1px solid ${({ $mine }) => ($mine ? 'rgba(37, 99, 235, 0.14)' : '#e7ebe8')};
  border-radius: ${({ $mine }) => ($mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px')};
  color: #18221d;
  background: ${({ $mine }) => ($mine ? '#eaf2ff' : '#fff')};
  box-shadow: 0 5px 16px rgba(15, 23, 42, 0.05);

  b {
    display: block;
    margin-bottom: 4px;
    color: ${({ $mine }) => ($mine ? '#1d4ed8' : '#45524b')};
    font-size: 10px;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  time {
    margin-top: 5px;
    display: block;
    color: #86918b;
    font-size: 9px;
    text-align: right;
  }
`;

export const SystemMessage = styled.div`
  align-self: center;
  max-width: min(92%, 560px);
  padding: 7px 11px;
  border: 1px solid #dbe4df;
  border-radius: 999px;
  background: #f3f8f5;
  color: #53645a;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
`;

export const Empty = styled.div`
  margin: auto;
  max-width: 360px;
  display: grid;
  justify-items: center;
  gap: 8px;
  color: #6b756f;
  text-align: center;

  svg {
    width: 34px;
    height: 34px;
    color: #2563eb;
  }

  strong {
    color: #17231d;
  }

  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }
`;

export const Composer = styled.form`
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  border-top: 1px solid #e9edea;
  background: #fff;

  input {
    min-width: 0;
    height: 44px;
    padding: 0 14px;
    border: 1px solid #dce2de;
    border-radius: 12px;
    outline: none;
    font: inherit;

    &:focus {
      border-color: #93b4fb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
  }

  button {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 12px;
    color: #fff;
    background: #2563eb;
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  }
`;

export const State = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  color: #66736c;
  background: #f6f8f6;
  text-align: center;

  div {
    max-width: 430px;
    display: grid;
    justify-items: center;
    gap: 10px;
  }

  h1 {
    margin: 0;
    color: #17231d;
    font-size: 22px;
  }

  p {
    margin: 0;
    line-height: 1.55;
  }
`;
