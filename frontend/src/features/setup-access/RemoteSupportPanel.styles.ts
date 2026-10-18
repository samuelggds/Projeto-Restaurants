import styled from 'styled-components';

export const Panel = styled.section`
  --support-accent: #FF4B4B;
  min-width: 0;
  display: grid;
  gap: 0;
  overflow: hidden;
  color: #282521;
  border: 1px solid #e9e4e0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 7px 24px rgba(46, 30, 19, .045);
  font-family: 'Inter', sans-serif;
  @media (max-width: 560px) { border-radius: 12px; }
`;

export const Heading = styled.header`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 20px 22px 18px;
  border-bottom: 1px solid #f1eeea;
  background: linear-gradient(120deg, #fff 65%, #fff5f4 100%);
  > div:nth-child(2) { flex: 1; min-width: 0; }
  h3 { margin: 0 0 5px; font: 800 17px/1.3 'Gabarito', 'Inter', sans-serif; color: #29221e; }
  p { margin: 0; color: #776f69; font-size: 12px; line-height: 1.5; }
  @media (max-width: 560px) { flex-wrap: wrap; padding: 17px; }
`;

export const IconBubble = styled.span`
  display: grid;
  flex: 0 0 41px;
  width: 41px;
  height: 41px;
  place-items: center;
  border-radius: 12px;
  color: var(--support-accent);
  background: #fff0ee;
  svg { width: 21px; height: 21px; }
`;

export const StatusBadge = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  border-radius: 99px;
  padding: 6px 10px;
  color: #756b62;
  background: #f3f2ef;
  font-size: 11px;
  font-weight: 800;
  svg { width: 14px; height: 14px; }
  &[data-state='APPROVED'] { background: #ebf9ef; color: #176c37; }
  &[data-state='PENDING'] { background: #fff5df; color: #986018; }
  @media(max-width: 560px) { margin-left: 53px; }
`;

export const Content = styled.div`
  display: grid;
  gap: 14px;
  padding: 18px 22px 20px;
  @media(max-width: 560px) { padding: 16px; }
`;

export const SecurityNotice = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 13px;
  border: 1px solid #e9e7e1;
  border-radius: 11px;
  background: #fbfaf7;
  > svg { width: 18px; height: 18px; flex: 0 0 18px; color: #77736f; }
  p { margin: 0; color: #615a54; font-size: 11px; line-height: 1.65; }
  strong { color: #302a25; }
`;

export const Feedback = styled.p`
  margin: 0;
  padding: 11px 13px;
  background: #fff1f1;
  color: #a52a2a;
  border: 1px solid #f8c4c4;
  border-radius: 9px;
  font-size: 12px;
`;

export const Muted = styled.p`
  margin: 0;
  font-size: 12px;
  color: #817973;
`;

export const ActiveCard = styled.div`
  display: grid;
  gap: 14px;
  padding: 17px;
  border: 1px solid #eee9e4;
  border-radius: 12px;
  background: #fff;
`;

export const SessionIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  > svg { width: 20px; height: 20px; flex: 0 0 20px; color: var(--support-accent); }
  div { display: grid; gap: 4px; min-width: 0; }
  strong { color: #2f2925; font-size: 13px; }
  span { color: #77706a; font-size: 12px; line-height: 1.55; overflow-wrap: anywhere; }
`;

export const TimeNotice = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 9px;
  color: #8d5c21;
  background: #fff8eb;
  font-size: 12px;
  svg { width: 16px; height: 16px; margin-right: 4px; }
`;

export const Instructions = styled.div`
  display: grid;
  gap: 8px;
  padding: 13px;
  border-radius: 10px;
  background: #f8f7f5;
  h4 { margin: 0; display: inline-flex; align-items: center; gap: 8px; color: #3a302a; font-size: 12px; }
  h4 svg { width: 17px; height: 17px; color: var(--support-accent); }
  ol { display: grid; gap: 7px; margin: 0; padding-left: 19px; }
  li, p { margin: 0; color: #5e5751; font-size: 12px; line-height: 1.55; }
  .safety { color: #8d4c29; border-top: 1px solid #e8e2dc; padding-top: 9px; }
  kbd { display: inline-block; padding: 2px 5px; border: 1px solid #dfd9d3; border-radius: 4px; background: white; color: #3b3733; }
`;

export const Form = styled.form`
  display: grid;
  gap: 13px;
  label { display: grid; gap: 6px; font-size: 12px; font-weight: 750; color: #514942; }
  select, textarea {
    min-width: 0;
    width: 100%;
    min-height: 42px;
    padding: 10px 12px;
    border: 1px solid #ded8d1;
    border-radius: 9px;
    color: #302922;
    background: #fff;
    font: 500 12px/1.5 'Inter', sans-serif;
  }
  textarea { resize: vertical; min-height: 88px; }
  :is(select,textarea):focus-visible { outline: 2px solid var(--support-accent); outline-offset: 2px; }
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  @media (max-width: 560px) { flex-direction: column; }
`;

export const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 13px;
  border: 1px solid ${({ $primary, $danger }) => $primary ? '#FF4B4B' : $danger ? '#f1bab6' : '#e5dfd8'};
  border-radius: 9px;
  color: ${({ $primary, $danger }) => $primary ? '#fff' : $danger ? '#bd3932' : '#5b524a'};
  background: ${({ $primary, $danger }) => $primary ? '#FF4B4B' : $danger ? '#fff7f6' : '#fff'};
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  svg { width: 16px; height: 16px; }
  &:hover:enabled { filter: brightness(.96); }
  &:disabled { opacity: .55; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--support-accent); outline-offset: 2px; }
  @media(max-width:560px) { width:100%; }
`;

export const Empty = styled.div`
  min-height: 96px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px dashed #e9e3dd;
  border-radius: 10px;
  padding: 15px;
  background: #fefdfb;
  svg { flex: 0 0 24px; width: 24px; height: 24px; color: #9b928a; }
  p { margin: 0; color: #817972; font-size: 12px; line-height: 1.5; }
`;

export const Footer = styled.footer`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 13px 22px;
  border-top: 1px solid #f0ece8;
  background: #faf9f7;
  > div { display: grid; gap: 4px; }
  strong { font-size: 11px; color: #574e48; }
  span { color: #8a827a; font-size: 11px; }
  @media(max-width:560px) { padding: 13px 16px; }
`;

export const Refresh = styled.button`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-height: 34px;
  padding: 6px 11px;
  border: 1px solid #e5dfd8;
  border-radius: 8px;
  background: #fff;
  color: #625951;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  svg { width: 15px; height: 15px; }
  &:disabled { opacity: .55; cursor: default; }
  &:focus-visible { outline: 2px solid #FF4B4B; outline-offset: 2px; }
`;
