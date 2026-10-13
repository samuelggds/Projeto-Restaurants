import styled from 'styled-components';

export const Panel = styled.section`
  margin-top: 12px;
  padding: 14px;
  display: grid;
  gap: 12px;
  border: 1px solid #dfe6e1;
  border-radius: 14px;
  background: #fbfcfb;
  .head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    div { display: grid; gap: 3px; }
    strong { color: #17231d; font-size: 13px; }
    small { color: #6d7872; font-size: 10px; line-height: 1.4; }
    b { color: #17231d; font-size: 13px; white-space: nowrap; }
  }
  &[data-compact='true'] {
    margin: 0; padding: 0; border: 0; border-radius: 0; background: transparent; gap: 8px;
    .head strong { font-size: 11px; font-weight: 550; }
    .head b { font-size: 12px; }
  }
  .compact-payment-hint { color: #7b897f; font-size: 9px; line-height: 1.5; }
`;

export const Methods = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  button {
    min-height: 62px;
    padding: 10px;
    display: grid;
    justify-items: start;
    gap: 4px;
    border: 1px solid #dfe5e1;
    border-radius: 11px;
    color: #26322c;
    background: #fff;
    cursor: pointer;
    text-align: left;
    &:hover { border-color: #aebcb4; }
    &.active { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08); }
    &:disabled { cursor: not-allowed; opacity: .6; }
    &:focus-visible { outline: 2px solid #22573f; outline-offset: 2px; }
    svg { width: 18px; height: 18px; }
    strong { font-size: 11px; }
    small { color: #76817b; font-size: 9px; }
  }
  @media (max-width: 620px) { grid-template-columns: 1fr; }
  &[data-compact='true'] {
    grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px;
    button { min-width: 0; min-height: 52px; padding: 8px 3px; justify-items: center; align-content: center; text-align: center; border-radius: 6px; gap: 5px; }
    button svg { width: 14px; height: 14px; color: #809286; }
    button strong { font-size: 10px; font-weight: 500; }
    button.active { border-color: #204e39; background: #eaf4ee; box-shadow: none; color: #204e39; }
    button.active svg { color: #204e39; }
  }
`;

export const TerminalSelect = styled.label`
  display: grid;
  gap: 5px;
  color: #5f6b64;
  font-size: 10px;
  font-weight: 700;
  select { width: 100%; min-width: 0; height: 40px; padding: 0 10px; border: 1px solid #dce2de; border-radius: 9px; background: #fff; }
  small { font-weight: 400; line-height: 1.5; }
`;

export const PixBox = styled.div`
  padding: 14px;
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 14px;
  align-items: center;
  border: 1px solid #cae9e3;
  border-radius: 12px;
  background: #f3fbf9;
  > svg { width: 108px; height: 108px; padding: 7px; background: #fff; border-radius: 8px; }
  div { min-width: 0; display: grid; gap: 7px; }
  strong { font-size: 12px; }
  small { color: #63716a; line-height: 1.4; }
  @media (max-width: 520px) { grid-template-columns: 1fr; justify-items: center; div { text-align: center; } }
`;

export const Status = styled.div<{ $paid?: boolean }>`
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  color: ${({ $paid }) => ($paid ? '#166534' : '#7c5b14')};
  background: ${({ $paid }) => ($paid ? '#effaf2' : '#fff8e8')};
  font-size: 10px;
  font-weight: 700;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  button {
    min-height: 38px;
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid #dce3df;
    border-radius: 10px;
    color: #243029;
    background: #fff;
    font-weight: 800;
    font-size: 10px;
    cursor: pointer;
    &.primary { color: #fff; border-color: #2563eb; background: #2563eb; }
    &.cash { color: #164e2e; border-color: #b9dfc7; background: #effaf3; }
    &:disabled { cursor: not-allowed; opacity: .55; }
    &:focus-visible { outline: 2px solid #22573f; outline-offset: 2px; }
  }
  &[data-compact='true'] {
    button { width: 100%; min-height: 39px; border-radius: 6px; font-size: 11px; font-weight: 500; }
    button.cash, button.primary { color: #fff; background: #ff4b4b; border-color: #ff4b4b; }
    button svg { width: 14px; height: 14px; padding: 0; background: transparent; }
  }
  @media (max-width: 600px) { &[data-compact='true'] button { min-height: 44px; } }
`;

export const Error = styled.div`
  color: #b42318;
  font-size: 10px;
  line-height: 1.4;
`;
