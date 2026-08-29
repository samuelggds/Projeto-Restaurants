import styled from 'styled-components';

export const Manager = styled.div`
  display: grid;
  gap: 18px;
  margin-top: 24px;

  .manager-header,
  .banner-header,
  .header-actions,
  .order-actions,
  .image-actions,
  .status-toggle {
    display: flex;
    align-items: center;
  }

  .manager-header,
  .banner-header {
    justify-content: space-between;
    gap: 16px;
  }

  .manager-header strong {
    display: block;
    color: #26211d;
    font-size: 15px;
  }

  .manager-header small {
    color: var(--muted);
  }

  .add-banner,
  .image-action,
  .icon-action {
    border: 1px solid #ded7cf;
    background: #fff;
    color: #2b2723;
    cursor: pointer;
    transition:
      border-color 180ms ease,
      background 180ms ease,
      transform 180ms ease;
  }

  .add-banner:hover,
  .image-action:hover:not(:disabled),
  .icon-action:hover:not(:disabled) {
    border-color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, #fff);
  }

  .add-banner {
    min-height: 44px;
    border-radius: 12px;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 750;
  }

  .empty-state {
    min-height: 180px;
    border: 1px dashed #cfc4b9;
    border-radius: 16px;
    background: #fcfaf7;
    display: grid;
    place-items: center;
    padding: 30px;
    text-align: center;
    color: #6f675f;
  }

  .empty-state div {
    display: grid;
    justify-items: center;
    gap: 9px;
    max-width: 420px;
  }

  .empty-state svg {
    color: var(--a);
  }

  .empty-state b {
    color: #26211d;
  }
`;

export const BannerCard = styled.article`
  border: 1px solid #e5ded6;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(51, 35, 22, 0.055);
  overflow: hidden;

  .banner-header {
    min-height: 64px;
    padding: 12px 16px 12px 20px;
    border-bottom: 1px solid #eee8e2;
    background: #fcfaf8;
  }

  .banner-header h3 {
    margin: 0;
    font-size: 15px;
  }

  .banner-header p {
    margin: 3px 0 0;
    font-size: 12px;
  }

  .header-actions {
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .order-actions {
    gap: 5px;
  }

  .icon-action {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
  }

  .icon-action.danger {
    color: #a43a31;
  }

  .icon-action:disabled,
  .image-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .status-toggle {
    gap: 7px;
    color: #4f4943;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
  }

  .status-toggle input {
    width: 18px;
    height: 18px;
    accent-color: var(--a);
  }

  .banner-body {
    display: grid;
    grid-template-columns: minmax(320px, 1.08fr) minmax(300px, 0.92fr);
    gap: 22px;
    padding: 20px;
  }

  .visual-column {
    min-width: 0;
  }

  .preview {
    position: relative;
    overflow: hidden;
    width: 100%;
    aspect-ratio: 18 / 7;
    border-radius: 15px;
    background: #211d19;
    color: #fff;
    box-shadow: 0 12px 28px rgba(31, 22, 15, 0.18);
  }

  .preview::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(15, 12, 10, 0.84),
      rgba(15, 12, 10, 0.32) 68%,
      rgba(15, 12, 10, 0.12)
    );
  }

  .preview > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-placeholder {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #d9d1c9;
    background: linear-gradient(145deg, #2b2520, #171412);
  }

  .preview-placeholder span {
    display: grid;
    justify-items: center;
    gap: 7px;
    font-size: 12px;
  }

  .preview-copy {
    position: absolute;
    z-index: 1;
    left: clamp(18px, 4vw, 34px);
    top: 50%;
    transform: translateY(-50%);
    max-width: min(68%, 440px);
  }

  .preview-copy h4 {
    margin: 0;
    font-size: clamp(19px, 2.2vw, 32px);
    line-height: 1.02;
  }

  .preview-copy em {
    display: block;
    color: #ff7a38;
    font-style: normal;
  }

  .preview-copy p {
    margin: 8px 0 0;
    color: rgba(255, 255, 255, 0.88);
    font-size: clamp(10px, 1.1vw, 14px);
    line-height: 1.35;
  }

  .preview-copy .preview-button {
    display: inline-flex;
    margin-top: 12px;
    border-radius: 999px;
    background: var(--a);
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 800;
  }

  .image-actions {
    gap: 9px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  .image-action {
    min-height: 42px;
    border-radius: 11px;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 750;
  }

  .image-action input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
  }

  .image-help {
    display: block;
    margin-top: 8px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .spin {
    animation: promotion-banner-spin 0.9s linear infinite;
  }

  @keyframes promotion-banner-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-content: start;
    gap: 14px;
  }

  .field {
    display: grid;
    gap: 7px;
    color: #39342f;
    font-size: 12px;
    font-weight: 750;
  }

  .field.full {
    grid-column: 1 / -1;
  }

  .field input,
  .field textarea {
    width: 100%;
    border: 1px solid #ded7cf;
    border-radius: 11px;
    background: #fcfbf9;
    color: #1f1c19;
    outline: 0;
    padding: 0 13px;
    font: inherit;
    font-weight: 450;
  }

  .field input {
    height: 46px;
  }

  .field textarea {
    min-height: 92px;
    resize: vertical;
    padding-top: 12px;
    line-height: 1.45;
  }

  .field input:focus,
  .field textarea:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 10%, transparent);
  }

  .field input[aria-invalid='true'],
  .field textarea[aria-invalid='true'] {
    border-color: #bd483c;
    background: #fff8f7;
  }

  .field-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 550;
  }

  .field-error,
  .image-error {
    color: #a43a31;
    font-size: 11px;
    font-weight: 650;
  }

  .image-error {
    display: block;
    margin-top: 8px;
  }

  @media (max-width: 920px) {
    .banner-body {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 580px) {
    .banner-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .header-actions {
      justify-content: flex-start;
    }

    .banner-body {
      padding: 14px;
    }

    .preview {
      aspect-ratio: 4 / 3;
    }

    .preview-copy {
      max-width: 78%;
    }

    .fields {
      grid-template-columns: 1fr;
    }

    .field.full {
      grid-column: auto;
    }
  }
`;
