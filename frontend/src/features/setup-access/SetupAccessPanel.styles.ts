import styled from 'styled-components';

export const Panel = styled.section`
  display: grid;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e7e2dc;
  border-radius: 12px;
  color: #292522;
  font-family: 'Inter', sans-serif;
  header { display: flex; align-items: flex-start; gap: 10px; }
  header > svg { width: 25px; height: 25px; color: #FF4B4B; flex: 0 0 auto; }
  h3 { font-size: 16px; margin: 0 0 5px; }
  p { margin: 0; font-size: 12px; line-height: 1.5; color: #69625a; }
  .error { color: #ad2929; }
  .notice { color: #166534; }
  button { min-height: 36px; border: 1px solid #dbd6d0; border-radius: 8px; padding: 7px 12px; background: #fff; color: #332e29; cursor: pointer; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 7px; }
  button:last-child { background: #FF4B4B; color: #fff; border-color: #FF4B4B; }
  button:disabled { opacity: .55; cursor: default; }
  button svg { width: 16px; height: 16px; }
  label { display: grid; gap: 6px; font-size: 12px; font-weight: 750; }
  select, textarea { padding: 9px 10px; border: 1px solid #ded8d3; border-radius: 8px; background: #fff; font: inherit; font-size: 12px; width: 100%; }
  button:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid #FF4B4B; outline-offset: 2px; }
`;

export const Grant = styled.div`
  padding: 12px;
  display: grid;
  justify-items: start;
  gap: 10px;
  background: #faf9f7;
  border: 1px solid #eee8e2;
  border-radius: 10px;
  strong { font-size: 13px; display: inline-flex; gap: 6px; align-items: center; }
  svg { width: 17px; height: 17px; }
  label { width: 100%; }
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const History = styled.div`
  border-top: 1px solid #e9e4dd;
  padding-top: 10px;
  display: grid;
  gap: 6px;
  .title { display: flex; justify-content: space-between; align-items: center; }
  .title strong { font-size: 12px; }
  .title button { min-height: 28px; width: 28px; padding: 5px; }
  .title button svg { width: 15px; height: 15px; }
`;
