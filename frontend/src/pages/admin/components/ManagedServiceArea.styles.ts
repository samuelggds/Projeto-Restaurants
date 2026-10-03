import styled from 'styled-components';

export const Shell = styled.section`
  display: grid;
  gap: 18px;
  max-width: 1180px;
`;

export const Hero = styled.header`
  padding: 22px;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 16px;
  border: 1px solid #ece8e4;
  border-radius: 14px;
  background: #fff;

  .icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    color: #fff;
    background: #FF4B4B;
  }
  .icon svg { width: 25px; }
  small { color: #8b8179; font-size: 10px; font-weight: 850; letter-spacing: .08em; }
  h2 { margin: 2px 0 3px; color: #251f1c; font-size: 22px; }
  p { margin: 0; color: #716761; font-size: 13px; }
  button {
    min-height: 42px;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #e6dfda;
    border-radius: 9px;
    background: #fff;
    color: #403934;
    font-weight: 750;
  }

  @media (max-width: 680px) {
    grid-template-columns: 48px 1fr;
    padding: 16px;
    button { grid-column: 1 / -1; justify-content: center; }
  }
`;

export const Alert = styled.div<{ $error?: boolean }>`
  padding: 12px 14px;
  border: 1px solid ${({ $error }) => ($error ? '#fecaca' : '#bbf7d0')};
  border-radius: 10px;
  color: ${({ $error }) => ($error ? '#991b1b' : '#166534')};
  background: ${({ $error }) => ($error ? '#fff1f2' : '#f0fdf4')};
  font-size: 13px;
  font-weight: 650;
`;

export const Implementation = styled.section`
  padding: 20px;
  border: 1px solid #ece8e4;
  border-radius: 14px;
  background: #fff;
  .head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
  .head > span { display: inline-flex; align-items: center; gap: 8px; color: #2d2825; font-weight: 850; }
  .head svg { width: 18px; color: #FF4B4B; }
  .head b { padding: 6px 10px; border-radius: 999px; color: #9f2e2e; background: #fff0f0; font-size: 11px; }
  > p { max-width: 760px; color: #706760; font-size: 13px; line-height: 1.55; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px; }
  .meta span { padding: 6px 9px; border-radius: 7px; color: #655c56; background: #f7f5f3; font-size: 11px; font-weight: 700; }
  blockquote { margin: 14px 0 0; padding: 12px; border-left: 3px solid #FF4B4B; color: #625a55; background: #fff8f8; font-size: 12px; }
`;

export const Upgrade = styled(Implementation)`
  display: flex;
  gap: 12px;
  svg { color: #FF4B4B; flex: 0 0 auto; }
  strong { color: #2d2825; }
  p { margin: 4px 0 0; }
`;

export const RequestGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(320px, .8fr) minmax(0, 1.2fr);
  gap: 18px;
  align-items: start;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

export const RequestForm = styled.form`
  padding: 20px;
  display: grid;
  gap: 14px;
  border: 1px solid #ece8e4;
  border-radius: 14px;
  background: #fff;
  .eyebrow { display: inline-flex; align-items: center; gap: 6px; color: #FF4B4B; font-size: 10px; font-weight: 900; letter-spacing: .07em; }
  .eyebrow svg { width: 15px; }
  h3 { margin: -6px 0 0; color: #28221f; font-size: 18px; }
  > p { margin: -5px 0 3px; color: #756b65; font-size: 12px; line-height: 1.5; }
  label { display: grid; gap: 6px; color: #514944; font-size: 11px; font-weight: 800; }
  input, select, textarea {
    width: 100%;
    border: 1px solid #ded8d3;
    border-radius: 8px;
    padding: 10px 11px;
    color: #292421;
    background: #fff;
    font: inherit;
    font-size: 13px;
  }
  textarea { resize: vertical; line-height: 1.45; }
  > button {
    min-height: 44px;
    border: 0;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    background: #FF4B4B;
    font-weight: 850;
  }
  button:disabled { opacity: .65; }
`;

export const History = styled.section`
  padding: 20px;
  display: grid;
  gap: 12px;
  border: 1px solid #ece8e4;
  border-radius: 14px;
  background: #fff;
  .history-head { display: flex; justify-content: space-between; align-items: center; }
  .history-head small { color: #928880; font-size: 9px; font-weight: 900; letter-spacing: .08em; }
  .history-head h3 { margin: 2px 0 0; font-size: 18px; color: #29231f; }
  .history-head > span { min-width: 30px; height: 30px; display: grid; place-items: center; border-radius: 99px; background: #fff0f0; color: #b72e2e; font-weight: 850; font-size: 12px; }
  article { padding: 14px; border: 1px solid #eee9e5; border-radius: 10px; }
  .request-head { display: flex; justify-content: space-between; gap: 12px; }
  .request-head b { color: #332c28; font-size: 13px; }
  .request-head span { flex: 0 0 auto; padding: 4px 7px; border-radius: 99px; color: #7c3d13; background: #fff7ed; font-size: 9px; font-weight: 850; }
  .request-head span[data-status="CONCLUIDA"] { color: #166534; background: #f0fdf4; }
  article > small { display: block; margin-top: 4px; color: #9a9088; font-size: 10px; }
  article > p { margin: 9px 0 0; color: #665d57; font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
  blockquote { margin: 11px 0 0; padding: 10px; display: grid; gap: 3px; border-left: 3px solid #FF4B4B; background: #fff7f7; color: #5d554f; font-size: 11px; }
  .empty { min-height: 190px; display: grid; place-items: center; align-content: center; gap: 5px; color: #8c827b; text-align: center; }
  .empty svg { width: 28px; }
  .empty p { margin: 0; font-size: 11px; }
`;

export const PremiumNote = styled(Upgrade)`
  border-color: #ffd7d7;
  background: #fffafa;
`;

export const State = styled.div`
  min-height: 260px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: #756c66;
  .spin { animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export const spinCss = '';
