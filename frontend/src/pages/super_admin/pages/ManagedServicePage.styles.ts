import styled from 'styled-components';

export const Page = styled.section`
  display: grid;
  gap: 18px;
`;
export const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  article { padding: 16px; display: flex; gap: 12px; align-items: center; border: 1px solid #e8e7e4; border-radius: 12px; background: #fff; }
  article > span { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 10px; color: #fff; background: #FF4B4B; }
  svg { width: 19px; }
  small { display: block; color: #8a827b; font-size: 9px; font-weight: 850; letter-spacing: .06em; }
  strong { display: block; margin-top: 2px; color: #27231f; font-size: 23px; }
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;
export const Toolbar = styled.div`
  padding: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  border: 1px solid #e8e7e4;
  border-radius: 12px;
  background: #fff;
  .tabs { display: flex; gap: 5px; }
  .tabs button, .refresh { min-height: 40px; padding: 0 11px; border: 0; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; color: #655e58; background: #f7f6f4; font-weight: 750; }
  .tabs button.active { color: #fff; background: #FF4B4B; }
  .tabs span { min-width: 19px; height: 19px; padding: 0 5px; display: grid; place-items: center; border-radius: 99px; background: rgba(255,255,255,.22); font-size: 9px; }
  label { min-width: 220px; flex: 1; height: 40px; padding: 0 10px; display: flex; align-items: center; gap: 7px; border: 1px solid #e4e0dc; border-radius: 8px; }
  label svg { width: 16px; color: #918981; }
  input { width: 100%; border: 0; outline: 0; font: inherit; font-size: 12px; }
  .refresh { background: #fff; border: 1px solid #e4e0dc; }
  @media (max-width: 820px) { flex-wrap: wrap; label { order: 3; min-width: 100%; } .tabs { flex: 1; overflow-x: auto; } }
`;
export const Alert = styled.div`
  padding: 12px 14px; border: 1px solid #fecaca; border-radius: 10px; color: #991b1b; background: #fff1f2; font-size: 12px;
`;
export const List = styled.div`
  display: grid;
  gap: 12px;
`;
export const Card = styled.article`
  padding: 18px;
  display: grid;
  gap: 14px;
  border: 1px solid #e8e7e4;
  border-radius: 12px;
  background: #fff;
  .identity { display: flex; gap: 10px; align-items: center; }
  .store { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 9px; color: #FF4B4B; background: #fff0f0; }
  h3 { margin: 0; color: #29241f; font-size: 16px; }
  p { margin: 3px 0 0; color: #847b74; font-size: 11px; }
  small { color: #FF4B4B; font-size: 9px; font-weight: 900; letter-spacing: .06em; }
  .notes { display: grid; gap: 6px; color: #655d57; font-size: 10px; font-weight: 800; }
  textarea { width: 100%; padding: 10px; border: 1px solid #ddd8d4; border-radius: 8px; resize: vertical; font: inherit; font-size: 12px; line-height: 1.45; }
`;
export const CardHead = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  @media (max-width: 620px) { flex-direction: column; }
`;
export const Status = styled.span`
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 99px;
  color: #8a451b;
  background: #fff7ed;
  font-size: 9px;
  font-weight: 850;
  &[data-status="CONCLUIDA"] { color: #166534; background: #f0fdf4; }
  &[data-status="EM_IMPLANTACAO"], &[data-status="EM_EXECUCAO"] { color: #1d4ed8; background: #eff6ff; }
  &[data-status="CANCELADA"] { color: #7f1d1d; background: #fef2f2; }
`;
export const Stats = styled.div`
  display: flex; flex-wrap: wrap; gap: 7px;
  span { padding: 6px 8px; border-radius: 7px; color: #766e68; background: #f7f5f3; font-size: 10px; }
  b { color: #362f2a; }
`;
export const Description = styled.p`
  margin: 0 !important; max-width: 900px; white-space: pre-wrap; color: #5f5751 !important; font-size: 12px !important; line-height: 1.55;
`;
export const Actions = styled.div`
  display: flex; justify-content: flex-end; gap: 8px;
  select, button { min-height: 40px; padding: 0 11px; border: 1px solid #ddd8d4; border-radius: 8px; background: #fff; color: #4d4641; font: inherit; font-size: 11px; font-weight: 750; }
  button { display: inline-flex; align-items: center; gap: 6px; border-color: #FF4B4B; color: #fff; background: #FF4B4B; }
  button:disabled, select:disabled { opacity: .6; }
  svg { width: 15px; }
  @media (max-width: 560px) { flex-direction: column; select, button { width: 100%; justify-content: center; } }
`;
export const Empty = styled.div`
  min-height: 240px; display: grid; place-items: center; align-content: center; gap: 7px; color: #8b837c; border: 1px dashed #ddd8d4; border-radius: 12px; background: #fff;
  svg { width: 28px; }
`;
