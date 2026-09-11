import styled from 'styled-components';

type ThemeColors = {
  border?: string;
  background?: string;
};

export const Card = styled.section`
  margin-bottom: 22px;
  padding: 22px;
  border: 1px solid ${({ theme }) => (theme.colors as ThemeColors | undefined)?.border || '#e5e7eb'};
  border-radius: 18px;
  background: ${({ theme }) => (theme.colors as ThemeColors | undefined)?.background || '#fff'};

  header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  h3 { margin: 0 0 5px; font-size: 1.05rem; }
  p { margin: 0; line-height: 1.5; opacity: .78; }
  .status { font-size: .82rem; font-weight: 700; padding: 7px 10px; border-radius: 999px; background: rgba(22, 163, 74, .1); }
  .methods { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .method { text-align: left; border: 1px solid #d8dde6; border-radius: 14px; padding: 15px; background: transparent; cursor: pointer; }
  .method.active { border-width: 2px; }
  .method strong { display: block; margin-bottom: 5px; }
  .summary { margin-top: 15px; padding: 13px 14px; border-radius: 12px; background: rgba(15, 23, 42, .04); display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .error { margin-top: 12px; color: #b42318; font-weight: 600; }

  @media (max-width: 680px) {
    padding: 17px;
    .methods { grid-template-columns: 1fr; }
    header { flex-direction: column; }
  }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, .62);
  display: grid;
  place-items: center;
  padding: 18px;
`;

export const Modal = styled.form`
  width: min(520px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  background: #fff;
  border-radius: 20px;
  padding: 22px;
  color: #111827;

  header { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 18px; }
  header h3 { margin: 0; }
  label { display: block; margin: 12px 0; font-weight: 650; font-size: .9rem; }
  input { width: 100%; box-sizing: border-box; margin-top: 6px; min-height: 44px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; }
  .mp-field { min-height: 44px; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 11px 12px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .consent { display: flex; gap: 9px; align-items: flex-start; font-weight: 500; line-height: 1.45; }
  .consent input { width: auto; min-height: 0; margin: 3px 0 0; }
  .security { font-size: .83rem; color: #475569; margin-top: 12px; }
  .error { color: #b42318; font-weight: 600; margin-top: 10px; }
  footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  button { min-height: 42px; border-radius: 10px; padding: 0 15px; border: 1px solid #cbd5e1; cursor: pointer; }
  button.primary { background: #111827; color: #fff; border-color: #111827; }
  button:disabled { opacity: .55; cursor: not-allowed; }

  @media (max-width: 540px) { .row { grid-template-columns: 1fr; } }
`;