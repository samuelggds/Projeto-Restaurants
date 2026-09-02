import styled from 'styled-components';

export const Workspace = styled.section`
  min-width: 0;
  display: grid;
  gap: 18px;
  color: #1f1d1b;
`;

export const MethodBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  .back {
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #ded7cf;
    border-radius: 7px;
    padding: 0 12px;
    color: #4f4944;
    background: #fff;
    font-size: 10px;
    font-weight: 750;
  }
  .back svg {
    width: 14px;
  }
  .methods {
    display: inline-flex;
    padding: 4px;
    border: 1px solid #e3dcd5;
    border-radius: 8px;
    background: #f8f6f3;
  }
  .methods button {
    min-height: 34px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    border-radius: 6px;
    padding: 0 11px;
    color: #6a625c;
    background: transparent;
    font-size: 10px;
    font-weight: 750;
  }
  .methods button.active {
    color: var(--a);
    background: #fff;
    box-shadow: 0 3px 10px rgba(48, 35, 25, 0.08);
  }
  .methods svg {
    width: 15px;
  }
  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;
    .back {
      align-self: flex-start;
    }
    .methods {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
`;

export const StepBanner = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid #e5ded7;
  border-radius: 8px;
  background: #fff;
  .step-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
  }
  .step-icon svg {
    width: 20px;
  }
  > div:not(.step-icon):not(.step-track) {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  small {
    color: var(--a);
    font-size: 9px;
    font-weight: 850;
  }
  b {
    font-size: 12px;
  }
  span {
    color: #736b64;
    font-size: 10px;
  }
  .step-track {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .step-track i {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border: 1px solid #dcd4cd;
    border-radius: 50%;
    color: #796f67;
    background: #fff;
    font-size: 9px;
    font-style: normal;
    font-weight: 800;
  }
  .step-track i.active,
  .step-track i.done {
    border-color: var(--a);
    color: #fff;
    background: var(--a);
  }
  .step-track em {
    width: 28px;
    height: 1px;
    background: #ded7d0;
  }
  @media (max-width: 620px) {
    grid-template-columns: auto minmax(0, 1fr);
    .step-track {
      grid-column: 1 / -1;
      justify-self: stretch;
    }
    .step-track em {
      flex: 1;
    }
  }
`;

export const ImportGrid = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(300px, 0.92fr) minmax(360px, 1.08fr);
  gap: 18px;
  align-items: stretch;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const SourceCard = styled.form`
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 18px;
  padding: 22px;
  border: 1px solid #e5ded7;
  border-radius: 8px;
  background: #fff;
  h3,
  p {
    margin: 0;
  }
  h3 {
    font-size: 14px;
  }
  p {
    color: #766f68;
    font-size: 10px;
    line-height: 1.5;
  }
  .ifood-mark {
    justify-self: center;
    padding: 13px 0 5px;
    color: #ea1d2c;
    font-size: 37px;
    font-weight: 950;
    letter-spacing: -0.08em;
  }
  label {
    display: grid;
    gap: 7px;
    color: #413c38;
    font-size: 10px;
    font-weight: 800;
  }
  .url-field {
    height: 44px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 0 11px;
    border: 1px solid #ded7cf;
    border-radius: 8px;
    background: #fff;
  }
  .url-field:focus-within {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 10%, transparent);
  }
  .url-field svg {
    width: 15px;
    color: #716a63;
  }
  .url-field input {
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    font-size: 10px;
  }
  .security-note {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 9px;
    padding: 12px;
    border: 1px solid #ebe4dd;
    border-radius: 8px;
    background: #faf9f7;
  }
  .security-note svg {
    width: 17px;
    color: #38604f;
  }
  .security-note span {
    display: grid;
    gap: 3px;
  }
  .security-note b,
  .security-note small {
    font-size: 9px;
  }
  .security-note small {
    color: #746d66;
    line-height: 1.45;
  }
  .submit-import {
    justify-self: center;
    min-width: 190px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 7px;
    color: #fff;
    background: var(--a);
    font-size: 10px;
    font-weight: 850;
  }
  .submit-import svg {
    width: 15px;
  }
  .submit-import:disabled {
    opacity: 0.55;
  }
`;

export const ResultCard = styled.section`
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 17px;
  padding: 22px;
  border: 1px solid #e5ded7;
  border-radius: 8px;
  background: #fff;
  > header h3,
  > header p {
    margin: 0;
  }
  > header h3 {
    font-size: 14px;
  }
  > header p {
    margin-top: 5px;
    color: #766f68;
    font-size: 10px;
  }
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  article {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 13px;
    border: 1px solid #e9e3dd;
    border-radius: 8px;
    background: #fefdfc;
  }
  article > span {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: #26734b;
    background: #edf8f0;
  }
  article:first-child > span {
    color: #6f48c5;
    background: #f2edfc;
  }
  svg {
    width: 18px;
  }
  article > div {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  strong {
    font-size: 18px;
  }
  b,
  small {
    font-size: 9px;
  }
  small {
    color: #7c756e;
  }
  @media (max-width: 440px) {
    grid-template-columns: 1fr;
  }
`;

export const ImportNotice = styled.div<{ $tone?: 'error' | 'success' }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  padding: 12px;
  border: 1px solid
    ${({ $tone }) => ($tone === 'error' ? '#efbbb7' : $tone === 'success' ? '#b9ddc3' : '#ecd9c3')};
  border-radius: 8px;
  color: ${({ $tone }) => ($tone === 'error' ? '#922d26' : $tone === 'success' ? '#21643b' : '#79511e')};
  background: ${({ $tone }) => ($tone === 'error' ? '#fff3f2' : $tone === 'success' ? '#f1faf3' : '#fff9f1')};
  > svg {
    width: 17px;
  }
  > span {
    display: grid;
    gap: 3px;
  }
  b,
  small {
    font-size: 9px;
  }
  small {
    color: inherit;
    opacity: 0.78;
    line-height: 1.45;
  }
`;

export const CreatedList = styled.div`
  overflow: hidden;
  border: 1px solid #e9e3dd;
  border-radius: 8px;
  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #faf8f5;
  }
  > header b,
  > header span {
    font-size: 9px;
  }
  > header span {
    color: #766f68;
  }
  ul {
    max-height: 184px;
    overflow-y: auto;
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    min-height: 37px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-top: 1px solid #eee8e2;
    font-size: 10px;
  }
  li svg {
    width: 14px;
    color: #26804b;
  }
`;

export const PhotoLayout = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(260px, 0.74fr) minmax(430px, 1.26fr);
  gap: 18px;
  align-items: start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const PhotoSource = styled.section`
  min-width: 0;
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e5ded7;
  border-radius: 8px;
  background: #fff;
  h3 {
    margin: 0;
    font-size: 11px;
  }
  .photo-preview,
  .photo-picker {
    overflow: hidden;
    aspect-ratio: 4 / 3;
    border-radius: 7px;
  }
  .photo-preview {
    background: #f1ede8;
  }
  .photo-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .photo-picker {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 7px;
    border: 1px dashed color-mix(in srgb, var(--a) 38%, #dcd3ca);
    color: #5e5751;
    background: #fdfbf9;
    text-align: center;
  }
  .photo-picker svg {
    width: 28px;
    color: var(--a);
  }
  .photo-picker b,
  .photo-picker span,
  .photo-picker small {
    font-size: 9px;
  }
  .photo-picker span,
  .photo-picker small {
    color: #7a726b;
  }
  .photo-picker input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  .photo-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }
  .photo-actions label,
  .photo-actions button {
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid #ded7cf;
    border-radius: 7px;
    color: #4f4944;
    background: #fff;
    font-size: 9px;
    font-weight: 750;
  }
  .photo-actions button {
    color: #b03b32;
  }
  .photo-actions svg {
    width: 13px;
  }
  .photo-actions input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
`;

export const AnalysisCard = styled.section`
  min-width: 0;
  display: grid;
  gap: 15px;
  padding: 18px;
  border: 1px solid #e5ded7;
  border-radius: 8px;
  background: #fff;
  > header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  > header svg {
    width: 17px;
    color: var(--a);
  }
  > header h3 {
    margin: 0;
    font-size: 12px;
  }
  .analysis-stages {
    display: grid;
  }
  .analysis-stages div {
    position: relative;
    min-height: 52px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 9px;
  }
  .analysis-stages div:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 22px;
    bottom: 0;
    left: 8px;
    width: 1px;
    background: #ded8d1;
  }
  .analysis-stages i {
    z-index: 1;
    width: 17px;
    height: 17px;
    display: grid;
    place-items: center;
    border: 1px solid #d8d0c9;
    border-radius: 50%;
    color: #9a9189;
    background: #fff;
    font-size: 8px;
    font-style: normal;
  }
  .analysis-stages .done i {
    border-color: #2b9a57;
    color: #fff;
    background: #2b9a57;
  }
  .analysis-stages .active i {
    border-color: var(--a);
    color: #fff;
    background: var(--a);
  }
  .analysis-stages span {
    display: grid;
    gap: 3px;
  }
  .analysis-stages b,
  .analysis-stages small {
    font-size: 9px;
  }
  .analysis-stages small {
    color: #7a736c;
  }
  .analyze-photo {
    justify-self: end;
    min-width: 180px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 7px;
    color: #fff;
    background: var(--a);
    font-size: 10px;
    font-weight: 850;
  }
  .analyze-photo svg {
    width: 15px;
  }
  .analyze-photo:disabled {
    opacity: 0.55;
  }
`;
