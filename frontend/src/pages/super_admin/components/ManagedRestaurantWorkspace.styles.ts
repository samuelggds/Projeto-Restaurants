import styled from 'styled-components';

export const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 5000; padding: 20px; display: grid; place-items: center;
  background: rgba(20, 18, 16, .58); backdrop-filter: blur(5px);
  @media (max-width: 700px) { padding: 0; }
`;
export const Dialog = styled.section`
  width: min(1180px, 100%); max-height: calc(100dvh - 40px); overflow: hidden; display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr); border-radius: 18px; background: #f7f6f4; box-shadow: 0 26px 80px rgba(0,0,0,.28);
  @media (max-width: 700px) { width: 100%; height: 100dvh; max-height: none; border-radius: 0; }
`;
export const Header = styled.header`
  padding: 18px 20px; display: flex; justify-content: space-between; gap: 12px; align-items: center; border-bottom: 1px solid #e5e1dd; background: #fff;
  small { color: #FF4B4B; font-size: 9px; font-weight: 900; letter-spacing: .09em; }
  h2 { margin: 2px 0; color: #29231f; font-size: 20px; }
  p { margin: 0; color: #817870; font-size: 11px; }
  > div:last-child { display: flex; gap: 7px; }
  button { width: 38px; height: 38px; border: 1px solid #e1dcd8; border-radius: 9px; display: grid; place-items: center; color: #5f5751; background: #fff; }
  svg { width: 18px; }
`;
export const Tabs = styled.nav`
  padding: 9px 14px; display: flex; gap: 6px; overflow-x: auto; border-bottom: 1px solid #e5e1dd; background: #fff;
  button { flex: 0 0 auto; min-height: 38px; padding: 0 11px; border: 0; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; color: #70665f; background: transparent; font-weight: 750; font-size: 11px; }
  button.active { color: #fff; background: #FF4B4B; }
  svg { width: 15px; }
`;
export const Alert = styled.div<{ $error?: boolean }>`
  margin: 10px 14px 0; padding: 10px 12px; border: 1px solid ${({$error})=>$error?'#fecaca':'#bbf7d0'}; border-radius: 8px;
  color: ${({$error})=>$error?'#991b1b':'#166534'}; background: ${({$error})=>$error?'#fff1f2':'#f0fdf4'}; font-size: 11px;
`;
export const Body = styled.div` min-height: 0; overflow: auto; padding: 14px; `;
export const Split = styled.div` display: grid; grid-template-columns: minmax(260px,.8fr) minmax(360px,1.2fr); gap: 14px; align-items: start; @media(max-width:850px){grid-template-columns:1fr;} `;
export const List = styled.div`
  max-height: 660px; overflow: auto; display: grid; align-content: start; gap: 7px; padding: 14px; border: 1px solid #e5e1dd; border-radius: 12px; background:#fff;
  > button { width:100%; padding:10px; display:flex; justify-content:space-between; gap:10px; text-align:left; border:1px solid #eee9e5; border-radius:8px; background:#fff; }
  > button:hover { border-color:#FFBABA; background:#fffafa; }
  > button span { min-width:0; display:grid; gap:2px; }
  > button b { overflow:hidden; color:#352e2a; font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
  > button small { color:#938980; font-size:9px; }
  > button strong { color:#514944; font-size:11px; white-space:nowrap; }
`;
export const SectionTitle = styled.div`
  margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;
  small{color:#FF4B4B;font-size:9px;font-weight:900;letter-spacing:.08em} h3{margin:2px 0 0;color:#2c2622;font-size:16px}
  >span{min-width:28px;height:28px;display:grid;place-items:center;border-radius:99px;color:#a52c2c;background:#fff0f0;font-size:10px;font-weight:850}
`;
export const Form = styled.form`
  padding:16px; display:grid; gap:12px; border:1px solid #e5e1dd; border-radius:12px; background:#fff;
  &.settings { max-width:900px; margin:0 auto; }
  h3{margin:0;color:#302925;font-size:16px}
  >p.security-note{margin:0;padding:10px;border-radius:8px;color:#7a4d13;background:#fffbeb;font-size:10px;line-height:1.45}
  label{display:grid;gap:5px;color:#625952;font-size:10px;font-weight:800}
  input,select,textarea{width:100%;padding:9px 10px;border:1px solid #ddd7d2;border-radius:7px;background:#fff;color:#302a26;font:inherit;font-size:12px}
  fieldset{margin:0;padding:10px;display:grid;gap:6px;max-height:240px;overflow:auto;border:1px solid #ddd7d2;border-radius:8px}
  legend{padding:0 5px;color:#625952;font-size:10px;font-weight:850}
  label.choice{display:flex;align-items:center;gap:7px;padding:5px;font-weight:650} label.choice input{width:auto}
`;
export const Two = styled.div` display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; @media(max-width:560px){grid-template-columns:1fr;} `;
export const Checks = styled.div` display:flex;gap:14px; label{display:flex;align-items:center;gap:6px;font-size:11px} input{width:auto} `;
export const FormActions = styled.div`
  display:flex;justify-content:flex-end;gap:7px;padding-top:4px;
  button{min-height:40px;padding:0 13px;border:1px solid #ddd7d2;border-radius:8px;background:#fff;color:#554c46;font-weight:800;font-size:11px}
  button.primary{display:inline-flex;align-items:center;gap:6px;border-color:#FF4B4B;color:#fff;background:#FF4B4B} svg{width:15px}
  @media(max-width:520px){flex-direction:column-reverse;button{width:100%;justify-content:center}}
`;
export const Loading = styled.div` min-height:360px;display:grid;place-items:center;align-content:center;gap:8px;color:#837a73; `;
