import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Workspace = styled.div`
  min-width: 0;
  display: grid;
  gap: 18px;
`;

export const TabPanel = styled.div`
  min-width: 0;
  display: grid;
  gap: 18px;
`;

export const Hero = styled.section`
  position: relative;
  overflow: hidden;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 26px 28px;
  border-radius: 20px;
  color: #fff;
  background:
    radial-gradient(circle at 90% 3%, rgba(255, 137, 79, 0.35), transparent 34%),
    linear-gradient(126deg, #172732 0%, #253943 58%, #6b3d2d 100%);
  box-shadow: 0 20px 42px rgba(30, 33, 35, 0.14);

  &::after {
    content: '';
    position: absolute;
    right: -75px;
    bottom: -115px;
    width: 220px;
    height: 220px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
  }

  .hero-icon {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 16px;
    color: #ff8a54;
    background: rgba(255, 255, 255, 0.08);
  }

  .hero-icon svg {
    width: 27px;
    height: 27px;
  }

  .eyebrow {
    color: #ff9a6d;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.11em;
  }

  h2 {
    margin: 5px 0 4px;
    color: #fff;
    font-size: clamp(22px, 2.3vw, 30px);
    line-height: 1.12;
  }

  p {
    max-width: 610px;
    margin: 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    line-height: 1.55;
  }

  dl {
    z-index: 1;
    display: flex;
    gap: 8px;
    margin: 0;
  }

  dl div {
    min-width: 92px;
    padding: 12px 13px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.07);
  }

  dt {
    color: rgba(255, 255, 255, 0.6);
    font-size: 9px;
  }

  dd {
    margin: 4px 0 0;
    color: #fff;
    font-size: 21px;
    font-weight: 900;
  }

  @media (max-width: 860px) {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 22px;

    dl {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    dl div {
      min-width: 0;
    }
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    padding: 20px 17px;

    .hero-icon {
      display: none;
    }

    dl {
      gap: 6px;
    }

    dl div {
      padding: 10px 8px;
    }

    dt {
      font-size: 8px;
    }

    dd {
      font-size: 18px;
    }
  }
`;

export const Tabs = styled.div`
  width: fit-content;
  max-width: 100%;
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding: 5px;
  border: 1px solid #e7dfd7;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(42, 31, 23, 0.04);
  scrollbar-width: thin;

  button {
    height: 42px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    border: 0;
    border-radius: 10px;
    padding: 0 17px;
    color: #6d645d;
    background: transparent;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }

  button svg {
    width: 17px;
  }

  button.active {
    color: #fff;
    background: var(--a);
    box-shadow: 0 6px 15px color-mix(in srgb, var(--a) 28%, transparent);
  }

  @media (max-width: 520px) {
    width: 100%;

    button {
      min-width: max-content;
      flex: 1;
      justify-content: center;
      padding-inline: 13px;
    }
  }
`;

export const LoadState = styled.div<{ $tone?: 'error' | 'loading' }>`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 15px;
  border: 1px solid ${({ $tone }) => ($tone === 'error' ? '#efb5b5' : '#e3ddd6')};
  border-radius: 12px;
  color: ${({ $tone }) => ($tone === 'error' ? '#991b1b' : '#514941')};
  background: ${({ $tone }) => ($tone === 'error' ? '#fff4f4' : '#fff')};
  font-size: 12px;
  font-weight: 700;

  svg {
    flex: 0 0 auto;
    width: 18px;
  }

  .spin {
    animation: ${spin} 0.9s linear infinite;
  }

  button {
    margin-left: auto;
    border: 0;
    color: var(--a);
    background: transparent;
    font-weight: 850;
  }
`;

export const Panel = styled.section`
  min-width: 0;
  padding: 23px;
  border: 1px solid #e9e2db;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(49, 36, 27, 0.045);

  @media (max-width: 600px) {
    padding: 17px 14px;
  }
`;

export const PanelHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;

  > div:first-child {
    min-width: 0;
    display: flex;
    gap: 12px;
  }

  .heading-icon {
    flex: 0 0 auto;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, white);
  }

  .heading-icon svg {
    width: 20px;
  }

  h3 {
    margin: 0;
    font-size: 17px;
  }

  p {
    margin: 4px 0 0;
    color: #756e68;
    font-size: 11px;
    line-height: 1.45;
  }

  @media (max-width: 620px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const EditorGrid = styled.form`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(250px, 0.65fr);
  gap: 20px;

  .fields {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px;
  }

  .full {
    grid-column: 1 / -1;
  }

  .inline-fields {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 10px;
  }

  @media (max-width: 870px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 560px) {
    .fields,
    .inline-fields {
      grid-template-columns: 1fr;
    }
  }
`;

export const Field = styled.label`
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 7px;
  color: #423b35;
  font-size: 11px;
  font-weight: 850;

  > span {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  small {
    color: #8d857e;
    font-weight: 500;
  }

  input,
  select,
  textarea {
    min-width: 0;
    width: 100%;
    border: 1px solid #ded7cf;
    border-radius: 11px;
    color: #241f1b;
    background: #fcfbfa;
    outline: 0;
    font-weight: 450;
    transition: 170ms ease;
  }

  input,
  select {
    height: 46px;
    padding: 0 12px;
  }

  textarea {
    min-height: 92px;
    resize: vertical;
    padding: 12px;
    line-height: 1.45;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 10%, transparent);
  }
`;

export const SwitchRow = styled.label`
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border: 1px solid #e6dfd8;
  border-radius: 11px;
  color: #403933;
  background: #fcfbfa;
  font-size: 11px;
  font-weight: 850;

  input {
    appearance: none;
    flex: 0 0 auto;
    width: 42px;
    height: 23px;
    position: relative;
    border: 0;
    border-radius: 999px;
    background: #d6d1cc;
  }

  input::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 5px #0002;
    transition: transform 160ms ease;
  }

  input:checked {
    background: var(--a);
  }

  input:checked::after {
    transform: translateX(19px);
  }
`;

export const PreviewCard = styled.aside`
  min-width: 0;
  align-self: stretch;
  display: grid;
  align-content: start;
  gap: 13px;
  padding: 17px;
  border: 1px solid #eee3da;
  border-radius: 15px;
  background:
    radial-gradient(
      circle at 100% 0,
      color-mix(in srgb, var(--a) 9%, transparent),
      transparent 42%
    ),
    #fffcf9;

  > small {
    color: var(--a);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  .product-preview {
    overflow: hidden;
    border: 1px solid #e8dfd7;
    border-radius: 13px;
    background: #fff;
  }

  .preview-image {
    height: 108px;
    position: relative;
    overflow: hidden;
    display: grid;
    place-items: center;
    color: #8d837b;
    background: #f2eee9;
  }

  .preview-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-badge {
    position: absolute;
    left: 9px;
    top: 9px;
    max-width: calc(100% - 18px);
    overflow: hidden;
    padding: 6px 9px;
    border-radius: 999px;
    color: #fff;
    background: #d84522;
    font-size: 9px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
    box-shadow: 0 5px 13px rgba(155, 45, 20, 0.24);
  }

  .preview-copy {
    display: grid;
    gap: 8px;
    padding: 13px;
  }

  .preview-copy b {
    overflow-wrap: anywhere;
  }

  .prices {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
  }

  .old-price {
    color: #8b837c;
    font-size: 11px;
    text-decoration: line-through;
  }

  .new-price {
    color: var(--a);
    font-size: 18px;
    font-weight: 900;
  }

  .preview-help {
    margin: 0;
    color: #7b736c;
    font-size: 10px;
    line-height: 1.45;
  }
`;

export const CouponPreview = styled(PreviewCard)`
  .coupon-ticket {
    position: relative;
    overflow: hidden;
    display: grid;
    gap: 12px;
    padding: 18px;
    border: 1px dashed color-mix(in srgb, var(--a) 50%, #ded7cf);
    border-radius: 14px;
    background: #fff;
  }

  .coupon-ticket::before,
  .coupon-ticket::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 17px;
    height: 17px;
    border: 1px solid #eee3da;
    border-radius: 50%;
    background: #fffcf9;
    transform: translateY(-50%);
  }

  .coupon-ticket::before {
    left: -10px;
  }

  .coupon-ticket::after {
    right: -10px;
  }

  .coupon-top,
  .coupon-value {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  .coupon-code {
    color: var(--a);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  .coupon-value strong {
    color: var(--a);
    font-size: 22px;
  }

  .coupon-ticket p {
    margin: 0;
    color: #716961;
    font-size: 10px;
    line-height: 1.45;
  }
`;

export const FormActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;

  button {
    min-height: 43px;
    border-radius: 10px;
    padding: 0 17px;
    font-size: 11px;
    font-weight: 850;
  }

  .secondary {
    border: 1px solid #ded7cf;
    color: #514941;
    background: #fff;
  }

  .primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    color: #fff;
    background: var(--a);
    box-shadow: 0 7px 16px color-mix(in srgb, var(--a) 24%, transparent);
  }

  .primary svg {
    width: 16px;
  }

  button:disabled {
    opacity: 0.58;
    cursor: wait;
  }

  @media (max-width: 520px) {
    flex-direction: column-reverse;

    button {
      width: 100%;
    }
  }
`;

export const Feedback = styled.div<{ $tone: 'success' | 'error' }>`
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid ${({ $tone }) => ($tone === 'success' ? '#b9dec1' : '#efb8b8')};
  border-radius: 11px;
  color: ${({ $tone }) => ($tone === 'success' ? '#166534' : '#991b1b')};
  background: ${({ $tone }) => ($tone === 'success' ? '#f0f9f2' : '#fff3f3')};
  font-size: 11px;
  font-weight: 750;
`;

export const ListHeader = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 17px;
  }

  p {
    margin: 4px 0 0;
    color: #766e67;
    font-size: 11px;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  input,
  select {
    min-width: 0;
    height: 42px;
    border: 1px solid #ded7cf;
    border-radius: 10px;
    padding: 0 11px;
    background: #fcfbfa;
    outline: 0;
  }

  input {
    width: min(250px, 30vw);
  }

  @media (max-width: 720px) {
    align-items: stretch;
    flex-direction: column;

    .filters {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    input {
      width: 100%;
    }
  }

  @media (max-width: 440px) {
    .filters {
      grid-template-columns: 1fr;
    }
  }
`;

export const CampaignList = styled.div`
  display: grid;
  gap: 9px;
`;

export const CampaignCard = styled.article`
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 13px;
  border: 1px solid #ebe4dd;
  border-radius: 14px;
  background: #fefdfc;

  .campaign-image,
  .campaign-icon {
    width: 48px;
    height: 48px;
    overflow: hidden;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
  }

  .campaign-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .campaign-icon svg {
    width: 21px;
  }

  .campaign-copy {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .campaign-title,
  .campaign-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
  }

  .campaign-title b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .campaign-meta {
    color: #746d66;
    font-size: 10px;
  }

  .campaign-meta strong {
    color: var(--a);
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  .actions button {
    min-width: 36px;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2dad3;
    border-radius: 9px;
    padding: 0 10px;
    color: #514941;
    background: #fff;
    font-size: 10px;
    font-weight: 850;
  }

  .actions button svg {
    width: 15px;
  }

  .actions .danger {
    color: #b42318;
  }

  .actions button:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  @media (max-width: 720px) {
    grid-template-columns: auto minmax(0, 1fr);

    .actions {
      grid-column: 2 / -1;
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }

  @media (max-width: 440px) {
    .campaign-image,
    .campaign-icon {
      width: 42px;
      height: 42px;
    }

    .actions .action-label {
      flex: 1;
    }
  }
`;

export const Status = styled.span<{ $tone: 'active' | 'scheduled' | 'inactive' | 'expired' }>`
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 999px;
  color: ${({ $tone }) =>
    $tone === 'active'
      ? '#166534'
      : $tone === 'scheduled'
        ? '#895900'
        : $tone === 'expired'
          ? '#991b1b'
          : '#5d6267'};
  background: ${({ $tone }) =>
    $tone === 'active'
      ? '#eaf8ed'
      : $tone === 'scheduled'
        ? '#fff5d8'
        : $tone === 'expired'
          ? '#fff0f0'
          : '#eceff1'};
  font-size: 9px;
  font-weight: 900;
`;

export const EmptyState = styled.div`
  min-height: 150px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 24px;
  border: 1px dashed #ded7cf;
  border-radius: 14px;
  color: #77706a;
  text-align: center;

  svg {
    width: 28px;
    color: var(--a);
  }

  b {
    color: #3d3732;
  }

  p {
    max-width: 410px;
    margin: 0;
    font-size: 11px;
    line-height: 1.45;
  }
`;

export const LoyaltyFlow = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;

  article {
    min-width: 0;
    position: relative;
    display: grid;
    align-content: start;
    gap: 7px;
    padding: 15px;
    border: 1px solid #e9e2db;
    border-radius: 14px;
    background: #fff;
  }

  article:not(:last-child)::after {
    content: '→';
    position: absolute;
    right: -10px;
    top: 50%;
    z-index: 2;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--a);
    background: #f9f8f5;
    font-weight: 900;
    transform: translateY(-50%);
  }

  span {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: #fff;
    background: var(--a);
    font-size: 11px;
    font-weight: 900;
  }

  b {
    font-size: 12px;
  }

  p {
    margin: 0;
    color: #776f68;
    font-size: 10px;
    line-height: 1.45;
  }

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    article:nth-child(2)::after {
      display: none;
    }
  }

  @media (max-width: 440px) {
    grid-template-columns: 1fr;

    article::after {
      display: none !important;
    }
  }
`;
