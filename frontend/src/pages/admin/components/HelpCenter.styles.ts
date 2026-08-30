import styled from 'styled-components';

export { Preview } from './HelpCenter.preview.styles';

export const Root = styled.section`
  width: min(100%, 1080px);
  display: grid;
  gap: 18px;
`;
export const Hero = styled.header`
  padding: 27px 29px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: linear-gradient(135deg, #fff7f1, #fffdfb 65%);
  box-shadow: 0 12px 35px rgba(79, 47, 23, 0.06);
  span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--a);
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  span svg {
    width: 17px;
  }
  h2 {
    margin: 12px 0 7px;
    font-size: clamp(24px, 3vw, 32px);
  }
  p {
    margin: 0;
    max-width: 720px;
    color: var(--muted);
    line-height: 1.55;
  }
`;
export const Guide = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  article {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: #fff;
    transition:
      box-shadow 180ms ease,
      border-color 180ms ease;
  }
  article.open {
    grid-column: span 2;
    border-color: color-mix(in srgb, var(--a) 34%, var(--border));
    box-shadow: 0 10px 26px rgba(72, 43, 22, 0.07);
  }
  article > button {
    width: 100%;
    min-height: 76px;
    padding: 13px 15px;
    border: 0;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    color: #24201d;
    cursor: pointer;
  }
  article > button:hover {
    background: #fdf9f5;
  }
  i {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--a);
    background: #fff0e6;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }
  i svg {
    width: 19px;
  }
  span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  b {
    font-size: 14px;
  }
  small {
    color: var(--muted);
    font-size: 11px;
  }
  article > button > svg {
    margin-left: auto;
    width: 18px;
    color: var(--muted);
    transition: transform 180ms ease;
  }
  article.open > button > svg {
    transform: rotate(180deg);
  }
  .guide-details {
    padding: 0 19px 20px;
    display: grid;
    grid-template-columns: minmax(250px, 0.68fr) minmax(0, 1.32fr);
    gap: 20px;
    align-items: start;
  }
  ol {
    margin: 0;
    padding: 0;
    display: grid;
    gap: 9px;
    counter-reset: guide-step;
    color: #4b4742;
    font-size: 13px;
    line-height: 1.5;
  }
  li {
    position: relative;
    min-height: 48px;
    padding: 10px 11px 10px 43px;
    list-style: none;
    border: 1px solid #eee2d8;
    border-radius: 10px;
    background: #fffaf6;
    box-shadow: 0 4px 11px rgba(79, 47, 23, 0.035);
  }
  li::before {
    counter-increment: guide-step;
    content: counter(guide-step);
    position: absolute;
    top: 50%;
    left: 11px;
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    transform: translateY(-50%);
    border-radius: 50%;
    background: var(--a);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    box-shadow: 0 3px 8px rgba(184, 69, 19, 0.22);
  }
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
    article.open {
      grid-column: auto;
    }
    .guide-details {
      grid-template-columns: 1fr;
      padding: 0 14px 16px;
    }
  }
`;
export const SettingsGroup = styled.section`
  grid-column: span 2;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  transition:
    box-shadow 180ms ease,
    border-color 180ms ease;
  &.open {
    border-color: color-mix(in srgb, var(--a) 34%, var(--border));
    box-shadow: 0 10px 26px rgba(72, 43, 22, 0.07);
  }
  > button {
    width: 100%;
    min-height: 76px;
    padding: 13px 15px;
    border: 0;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    color: #24201d;
    cursor: pointer;
  }
  > button:hover {
    background: #fdf9f5;
  }
  > button i {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--a);
    background: #fff0e6;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }
  > button i svg {
    width: 19px;
  }
  > button span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  > button b {
    font-size: 14px;
  }
  > button small {
    color: var(--muted);
    font-size: 11px;
  }
  > button > svg {
    margin-left: auto;
    width: 18px;
    color: var(--muted);
    transition: transform 180ms ease;
  }
  &.open > button > svg {
    transform: rotate(180deg);
  }
  .settings-guides {
    padding: 0 12px 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .settings-guides-intro {
    grid-column: 1/-1;
    margin: 0;
    padding: 2px 3px 5px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }
  .settings-guide-item > button {
    min-height: 68px;
    padding: 12px 13px;
  }
  .settings-guide-item > button i {
    width: 34px;
    height: 34px;
    border-radius: 10px;
  }
  .settings-guide-item > button i svg {
    width: 17px;
  }
  .settings-guide-item.open {
    grid-column: 1/-1;
  }
  @media (max-width: 650px) {
    grid-column: auto;
    .settings-guides {
      grid-template-columns: 1fr;
      padding: 0 10px 12px;
    }
    .settings-guides-intro {
      grid-column: auto;
    }
    .settings-guide-item.open {
      grid-column: auto;
    }
  }
`;

export const ReportCard = styled.section`
  padding: 25px 28px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: #fff;
  box-shadow: 0 12px 35px rgba(79, 47, 23, 0.05);
  .heading {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    margin-bottom: 19px;
  }
  .refresh-issues {
    min-height: 34px;
    padding: 0 11px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    background: #fff;
    color: #493e38;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .heading .refresh-issues:first-of-type {
    margin-left: auto;
  }
  .heading > i {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--a);
  }
  .heading svg {
    width: 21px;
  }
  h2 {
    margin: 0 0 4px;
    font-size: 19px;
  }
  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }
  form {
    display: grid;
    grid-template-columns: minmax(190px, 0.45fr) minmax(0, 1fr);
    gap: 15px;
  }
  label {
    display: grid;
    gap: 7px;
    color: #3a3530;
    font-size: 12px;
    font-weight: 700;
  }
  select,
  textarea {
    width: 100%;
    border: 1px solid #ded7cf;
    border-radius: 10px;
    background: #fcfbf9;
    color: #25211e;
    padding: 11px 12px;
    outline: 0;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  textarea {
    min-height: 92px;
    resize: vertical;
    line-height: 1.45;
  }
  select:focus,
  textarea:focus {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }
  footer {
    grid-column: 1/-1;
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  footer span {
    font-size: 12px;
    font-weight: 700;
  }
  .success {
    color: #18743a;
  }
  .error {
    color: #b42318;
  }
  footer button {
    margin-left: auto;
    min-height: 42px;
    padding: 0 15px;
    border: 0;
    border-radius: 10px;
    background: var(--a);
    color: #fff;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    box-shadow: 0 8px 16px color-mix(in srgb, var(--a) 18%, transparent);
    cursor: pointer;
  }
  footer button:disabled {
    opacity: 0.55;
    box-shadow: none;
    cursor: not-allowed;
  }
  footer svg {
    width: 17px;
  }
  .employee-issue {
    display: grid;
    gap: 8px;
    padding: 12px;
    margin-top: 10px;
    border: 1px solid #eadfd7;
    border-radius: 10px;
    background: #fffaf7;
  }
  .employee-issue b {
    color: #493e38;
    font-size: 13px;
  }
  .employee-issue pre {
    margin: 0;
    white-space: pre-wrap;
    color: #655b54;
    font: inherit;
    font-size: 12px;
    line-height: 1.45;
  }
  .issue-response {
    padding: 9px;
    border-radius: 8px;
    background: #f1f8f3;
    color: #275c39;
  }
  .issue-reply {
    font-size: 12px;
  }
  .employee-issue .delete-issue {
    color: #a62b24;
    background: #fff;
    border: 1px solid #e9bcb8;
    box-shadow: none;
  }
  .employee-issue footer {
    justify-content: flex-end;
  }
  .employee-issue footer button {
    margin-left: 0;
    padding: 8px 10px;
    font-size: 12px;
  }
  .platform-conversation {
    display: grid;
    gap: 10px;
    max-height: 340px;
    margin: 0 0 18px;
    padding: 14px;
    overflow-y: auto;
    border: 1px solid #e5ded7;
    border-radius: 14px;
    background: #faf8f5;
  }
  .platform-conversation article {
    width: min(78%, 720px);
    padding: 11px 13px;
    border: 1px solid #e2d9d1;
    border-radius: 13px 13px 13px 4px;
    background: #fff;
    box-shadow: 0 5px 14px rgba(60, 43, 29, 0.05);
  }
  .platform-conversation article.from-admin {
    justify-self: end;
    border-color: color-mix(in srgb, var(--a) 25%, #e2d9d1);
    border-radius: 13px 13px 4px 13px;
    background: color-mix(in srgb, var(--a) 7%, #fff);
  }
  .platform-conversation article header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 5px;
  }
  .platform-conversation article b {
    color: #40372f;
    font-size: 12px;
  }
  .platform-conversation article time {
    color: #887d73;
    font-size: 10px;
  }
  .platform-conversation article p {
    color: #514840;
    white-space: pre-wrap;
  }
  .platform-conversation .conversation-status {
    display: inline-flex;
    margin-top: 8px;
    padding: 4px 7px;
    border-radius: 999px;
    background: #e8f5eb;
    color: #24733a;
    font-size: 10px;
    font-weight: 800;
  }
  .platform-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 86px;
    color: #766b62;
  }
  .platform-empty svg {
    width: 25px;
    color: var(--a);
  }
  .platform-empty span {
    display: grid;
    gap: 2px;
  }
  .platform-empty b {
    color: #40372f;
    font-size: 13px;
  }
  .platform-empty small {
    font-size: 11px;
  }
  @media (max-width: 650px) {
    padding: 20px;
    form {
      grid-template-columns: 1fr;
    }
    footer {
      align-items: stretch;
      flex-direction: column;
    }
    footer button {
      margin-left: 0;
      justify-content: center;
    }
    .heading {
      flex-wrap: wrap;
    }
    .heading .refresh-issues:first-of-type {
      margin-left: 0;
    }
    .platform-conversation article {
      width: 94%;
    }
  }
`;
export const Tip = styled.p`
  margin: 0;
  padding: 13px 16px;
  border-radius: 12px;
  color: #635d57;
  background: #f3f0eb;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  svg {
    width: 18px;
    color: var(--a);
    flex: 0 0 auto;
  }
`;