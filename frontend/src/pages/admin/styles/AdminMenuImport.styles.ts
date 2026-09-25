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


export const AiImageOption = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 15px 16px;
  border: 1px solid #e7dfd6;
  border-radius: 12px;
  background: linear-gradient(135deg, #fffdfb 0%, #faf7f4 100%);

  .ai-option-icon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
  }

  .ai-option-icon svg {
    width: 19px;
  }

  .ai-option-copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .ai-option-copy > small {
    color: var(--a);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.06em;
  }

  .ai-option-copy > b {
    font-size: 11px;
  }

  .ai-option-copy > p {
    margin: 0;
    color: #746d66;
    font-size: 9px;
    line-height: 1.45;
  }

  .ai-switch {
    display: grid;
    justify-items: center;
    gap: 4px;
    cursor: pointer;
  }

  .ai-switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .ai-switch > span {
    position: relative;
    width: 42px;
    height: 24px;
    border-radius: 999px;
    background: #d9d4ce;
    transition: 160ms ease;
  }

  .ai-switch > span::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.16);
    transition: 160ms ease;
  }

  .ai-switch input:checked + span {
    background: var(--a);
  }

  .ai-switch input:checked + span::after {
    transform: translateX(18px);
  }

  .ai-switch em {
    color: #7b736c;
    font-size: 8px;
    font-style: normal;
    font-weight: 800;
  }

  @media (max-width: 620px) {
    grid-template-columns: auto minmax(0, 1fr);

    .ai-switch {
      grid-column: 1 / -1;
      grid-template-columns: auto auto;
      justify-self: start;
      align-items: center;
    }
  }
`;

export const ImageBatchCard = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 15px 16px;
  border: 1px solid #d9d4f0;
  border-radius: 12px;
  background: linear-gradient(135deg, #fbf9ff 0%, #f4f1fb 100%);

  .batch-icon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #ece7f8;
  }

  .batch-copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .batch-copy small {
    color: #6b4ca3;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.06em;
  }

  .batch-copy b {
    font-size: 11px;
  }

  .batch-copy p {
    margin: 0;
    color: #6e6677;
    font-size: 9px;
    line-height: 1.45;
  }

  button {
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 13px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: #6b4ca3;
    font-size: 9px;
    font-weight: 850;
  }

  button svg {
    width: 14px;
  }

  @media (max-width: 620px) {
    grid-template-columns: auto minmax(0, 1fr);

    button {
      grid-column: 1 / -1;
      width: 100%;
    }
  }
`;

export const ReviewWorkspace = styled.div`
  min-width: 0;
  display: grid;
  gap: 14px;
`;

export const ReviewSummary = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
  gap: 18px;
  align-items: center;
  padding: 18px;
  border: 1px solid #e5ded7;
  border-radius: 12px;
  background: linear-gradient(135deg, #fff 0%, #fbf8f5 100%);

  .review-title {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .review-kicker {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--a);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.06em;
  }

  .review-kicker svg {
    width: 13px;
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 18px;
    line-height: 1.2;
  }

  p {
    max-width: 620px;
    color: #746d66;
    font-size: 10px;
    line-height: 1.5;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const ReviewGuidance = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 13px 14px;
  border: 1px solid #d8e4de;
  border-radius: 10px;
  color: #285b43;
  background: #f4faf6;

  > svg {
    width: 17px;
  }

  > span {
    display: grid;
    gap: 3px;
  }

  b {
    font-size: 10px;
  }

  small {
    color: #587265;
    font-size: 9px;
    line-height: 1.45;
  }
`;

export const ReviewList = styled.div`
  display: grid;
  gap: 12px;
`;

export const ReviewItem = styled.article<{ $attention: boolean; $muted: boolean }>`
  min-width: 0;
  overflow: hidden;
  border: 1px solid
    ${({ $attention }) => ($attention ? '#e9c5a4' : '#e7e1da')};
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(53, 38, 27, 0.045);
  opacity: ${({ $muted }) => ($muted ? 0.62 : 1)};
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;

  &:focus-within {
    border-color: color-mix(in srgb, var(--a) 52%, #d9d0c8);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 8%, transparent);
  }
`;

export const ReviewItemHeader = styled.header`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(150px, 190px);
  align-items: center;
  gap: 12px;
  padding: 14px 15px;
  border-bottom: 1px solid #eee8e2;
  background: #fdfcfb;

  .item-select {
    position: relative;
    display: inline-grid;
    place-items: center;
    cursor: pointer;
  }

  .item-select input {
    position: absolute;
    opacity: 0;
  }

  .item-select > span {
    width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    border: 1px solid #d8d0c8;
    border-radius: 7px;
    color: transparent;
    background: #fff;
  }

  .item-select input:checked + span {
    border-color: var(--a);
    color: #fff;
    background: var(--a);
  }

  .item-select svg {
    width: 13px;
  }

  .item-identity {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
  }

  .item-thumb {
    width: 42px;
    height: 42px;
    overflow: hidden;
    display: grid;
    place-items: center;
    border: 1px solid #e6dfd7;
    border-radius: 10px;
    color: #8c837b;
    background: #f4f1ed;
  }

  .item-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item-thumb svg {
    width: 18px;
  }

  .item-identity > div:last-child {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .item-identity small {
    color: #998f86;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 0.07em;
  }

  .item-identity strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-identity span {
    color: #7a726b;
    font-size: 8px;
  }

  .action-field {
    display: grid;
    gap: 4px;
  }

  .action-field > span {
    color: #7c746d;
    font-size: 8px;
    font-weight: 800;
  }

  select {
    width: 100%;
    min-height: 37px;
    padding: 0 30px 0 10px;
    border: 1px solid #dcd4cc;
    border-radius: 8px;
    outline: 0;
    color: #38332f;
    background: #fff;
    font-size: 9px;
    font-weight: 750;
  }

  select:focus {
    border-color: var(--a);
  }

  @media (max-width: 680px) {
    grid-template-columns: auto minmax(0, 1fr);

    .action-field {
      grid-column: 2;
      width: 100%;
    }
  }
`;

export const ReviewForm = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) minmax(250px, 1.8fr) minmax(140px, 0.8fr) minmax(110px, 0.55fr);
  gap: 11px;
  padding: 15px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr 1fr;

    .description {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }

  @media (max-width: 580px) {
    grid-template-columns: 1fr;

    .description {
      grid-column: auto;
      grid-row: auto;
    }
  }
`;

export const ReviewField = styled.label<{ $attention?: boolean }>`
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 5px;

  > span {
    color: #615a54;
    font-size: 8px;
    font-weight: 850;
  }

  input,
  textarea {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    border: 1px solid
      ${({ $attention }) => ($attention ? '#e1b387' : '#ddd5ce')};
    border-radius: 8px;
    outline: 0;
    color: #282522;
    background: ${({ $attention }) => ($attention ? '#fffaf5' : '#fff')};
    font: inherit;
    font-size: 10px;
  }

  input {
    height: 39px;
    padding: 0 10px;
  }

  textarea {
    min-height: 58px;
    resize: vertical;
    padding: 9px 10px;
    line-height: 1.4;
  }

  input:focus,
  textarea:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 8%, transparent);
  }

  small {
    color: ${({ $attention }) => ($attention ? '#9a5f2d' : '#817970')};
    font-size: 7px;
    line-height: 1.35;
  }

  .price-input {
    min-width: 0;
    height: 39px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    overflow: hidden;
    border: 1px solid
      ${({ $attention }) => ($attention ? '#e1b387' : '#ddd5ce')};
    border-radius: 8px;
    background: ${({ $attention }) => ($attention ? '#fffaf5' : '#fff')};
  }

  .price-input:focus-within {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 8%, transparent);
  }

  .price-input b {
    padding-left: 10px;
    color: #6f665e;
    font-size: 9px;
  }

  .price-input input {
    height: 100%;
    border: 0;
    box-shadow: none;
  }
`;

export const DuplicateWarning = styled.div`
  margin: 0 15px 15px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid #edc8a7;
  border-radius: 9px;
  color: #875125;
  background: #fff8f1;

  > svg {
    width: 16px;
  }

  > span {
    display: grid;
    gap: 3px;
  }

  b {
    font-size: 9px;
  }

  small {
    color: #91643f;
    font-size: 8px;
    line-height: 1.45;
  }
`;

export const PublishBar = styled.div`
  position: sticky;
  bottom: 12px;
  z-index: 6;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #d8d0c8;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 40px rgba(49, 35, 24, 0.14);
  backdrop-filter: blur(10px);

  > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  small {
    color: var(--a);
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 0.06em;
  }

  b {
    font-size: 11px;
  }

  p {
    margin: 0;
    color: #7a726b;
    font-size: 8px;
  }

  button {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 15px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: var(--a);
    font-size: 9px;
    font-weight: 850;
    box-shadow: 0 8px 18px color-mix(in srgb, var(--a) 20%, transparent);
  }

  button svg {
    width: 14px;
  }

  button:disabled {
    opacity: 0.5;
    box-shadow: none;
  }

  @media (max-width: 620px) {
    position: static;
    grid-template-columns: 1fr;

    button {
      width: 100%;
    }
  }
`;
