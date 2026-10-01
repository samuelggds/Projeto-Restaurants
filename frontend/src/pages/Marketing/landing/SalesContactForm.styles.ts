import styled from 'styled-components';

export const Card = styled.div`
  position:relative;
  z-index:2;
  min-width:0;
  padding:30px;
  border-radius:32px;
  background:#fff9f3;
  color:#211e1c;
  box-shadow:0 24px 56px -12px rgba(50,25,15,.18);

  h3{
    margin:0 0 6px;
    font-family:'Manrope','Inter',sans-serif;
    font-size:24px;
    line-height:1.25;
    font-weight:800;
  }

  @media(max-width:600px){padding:22px;border-radius:24px}
`;

export const Intro = styled.p`
  margin:0 0 20px;
  color:#746b65;
  font-size:12px;
  line-height:1.45;
`;

export const Form = styled.form`
  position:relative;
  input,select,textarea,button{font:inherit}
  input:not([type='checkbox']),select,textarea{
    width:100%;min-width:0;min-height:48px;padding:12px 14px;
    border:1px solid #e9ded6;border-radius:10px;outline:0;
    background:#fff;color:#211e1c;font-size:13px;line-height:1.45;
    transition:border-color .15s ease,box-shadow .15s ease;
  }
  input::placeholder,textarea::placeholder{color:#9a918b;opacity:1}
  textarea{min-height:88px;resize:vertical}
  input:focus,select:focus,textarea:focus{border-color:#f45b2a;box-shadow:0 0 0 3px rgba(244,91,42,.10)}
  input[type='checkbox']{width:18px;height:18px;flex:0 0 18px;margin:1px 0 0;accent-color:#f45b2a}
  [aria-invalid='true']{border-color:#c84f2b}
`;

export const Fields = styled.fieldset`
  display:grid;gap:14px;min-width:0;margin:0;padding:0;border:0;
  &:disabled{opacity:.7}
`;

export const Grid = styled.div`
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;
  @media(max-width:600px){grid-template-columns:1fr}
`;

export const Field = styled.label`
  display:grid;gap:7px;min-width:0;color:#3d3733;font-size:12px;font-weight:700;line-height:1.4;
  span{font-weight:400;color:#746b65}
`;

export const Channels = styled.fieldset`
  min-width:0;margin:0;padding:0;border:0;
  legend{margin:0 0 8px;padding:0;color:#3d3733;font-size:12px;font-weight:700}
  >div{display:flex;flex-wrap:wrap;gap:8px}
  label{display:flex;align-items:center;gap:7px;min-height:40px;padding:8px 11px;border:1px solid #e9ded6;border-radius:10px;background:#fff;color:#746b65;font-size:12px;cursor:pointer}
  label:has(input:checked){border-color:#f45b2a;background:#fff1e5;color:#d94618}
`;

export const OptionalMessage = styled.details`
  summary{width:max-content;max-width:100%;color:#3d3733;font-size:12px;font-weight:700;cursor:pointer}
  summary span{color:#746b65;font-weight:400}
  &[open] summary{margin-bottom:9px}
`;

export const Consent = styled.label`
  display:flex;align-items:flex-start;gap:9px;color:#746b65;font-size:9px;line-height:1.45;cursor:pointer;
`;

export const Submit = styled.button`
  min-height:52px;width:100%;padding:0 22px;border:1px solid #f45b2a;border-radius:999px;
  background:#f45b2a;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;
  cursor:pointer;font-size:14px!important;font-weight:700!important;
  &:hover:not(:disabled){background:#df4f20}
  &:disabled{cursor:wait;opacity:.7}
`;

export const ErrorMessage = styled.p`
  margin:0;padding:11px 13px;border:1px solid #edc4b7;border-radius:10px;background:#fff2ed;color:#8a382b;font-size:12px;line-height:1.5;
`;
export const ChannelError = styled.p`
  margin:8px 0 0;color:#8a382b;font-size:11px;line-height:1.4;
`;
export const Honeypot = styled.div`
  position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;
`;
export const Success = styled.div`
  padding:34px 0;outline:none;
  >svg{display:block;margin-bottom:20px;color:#248c5a}
  h3{font-size:24px}
  p{margin:10px 0 0;color:#746b65;font-size:14px;line-height:1.6}
`;
