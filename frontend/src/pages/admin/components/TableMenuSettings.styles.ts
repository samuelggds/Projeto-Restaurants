import styled, { createGlobalStyle, keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Hero = styled.section`
  position: relative;
  overflow: hidden;
  border: 1px solid #263f4e;
  border-radius: 20px;
  padding: 26px;
  color: #fff;
  background:
    radial-gradient(circle at 90% 18%, #d95d3052, transparent 31%),
    linear-gradient(128deg, #142733, #243b49 62%, #54382f);
  box-shadow: 0 18px 38px #2e1d1517;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  &::after {
    content: '';
    position: absolute;
    right: -48px;
    bottom: -84px;
    width: 210px;
    height: 210px;
    border: 1px solid #ffffff1c;
    border-radius: 50%;
  }
  .copy {
    position: relative;
    z-index: 1;
    max-width: 700px;
  }
  .eyebrow {
    color: #ff9a68;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.13em;
  }
  h2 {
    margin: 7px 0;
    font-size: clamp(23px, 3vw, 31px);
    line-height: 1.08;
  }
  p {
    margin: 0;
    color: #d7e0e5;
    font-size: 13px;
    line-height: 1.55;
  }
  .icon {
    position: relative;
    z-index: 1;
    width: 78px;
    height: 78px;
    border: 1px solid #ffffff29;
    border-radius: 22px;
    color: #ff8a51;
    background: #ffffff12;
    display: grid;
    place-items: center;
    box-shadow: inset 0 1px #ffffff1c;
  }
  .icon svg {
    width: 37px;
    height: 37px;
  }
  @media (max-width: 620px) {
    padding: 21px;
    grid-template-columns: minmax(0, 1fr) 54px;
    gap: 14px;
    .icon {
      width: 54px;
      height: 54px;
      border-radius: 16px;
    }
    .icon svg {
      width: 27px;
      height: 27px;
    }
  }
  @media (max-width: 410px) {
    grid-template-columns: 1fr;
    .icon {
      display: none;
    }
  }
`;

export const SetupGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr);
  gap: 18px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const CreateCard = styled.section`
  border: 1px solid var(--border);
  border-radius: 17px;
  padding: 22px;
  background: #fff;
  box-shadow: 0 12px 28px #3320130a;
  display: grid;
  align-content: start;
  gap: 16px;
  header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  header > span {
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    border-radius: 13px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, #fff);
    display: grid;
    place-items: center;
  }
  h3,
  p {
    margin: 0;
  }
  h3 {
    font-size: 17px;
  }
  p {
    margin-top: 4px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }
  form {
    display: grid;
    gap: 9px;
  }
  label {
    font-size: 11px;
    font-weight: 800;
  }
  .form-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 9px;
  }
  input {
    min-width: 0;
    height: 46px;
    border: 1px solid #ddd4cc;
    border-radius: 11px;
    padding: 0 13px;
    outline: none;
    background: #fcfbfa;
    font: inherit;
  }
  input:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 12%, transparent);
  }
  .hint {
    color: #806d61;
    font-size: 10px;
  }
  @media (max-width: 480px) {
    padding: 18px;
    .form-row {
      grid-template-columns: 1fr;
    }
  }
`;

export const PrimaryButton = styled.button`
  min-height: 46px;
  border: 0;
  border-radius: 11px;
  padding: 0 17px;
  color: #fff;
  background: var(--a);
  font: inherit;
  font-size: 12px;
  font-weight: 850;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--a) 20%, transparent);
  &:hover:not(:disabled) {
    filter: brightness(0.96);
    transform: translateY(-1px);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
    box-shadow: none;
  }
  .spin {
    animation: ${spin} 0.8s linear infinite;
  }
`;

export const GuideCard = styled.section`
  border: 1px solid #eadcd2;
  border-radius: 17px;
  padding: 22px;
  background: linear-gradient(145deg, #fffdfb, #fff7f1);
  display: grid;
  gap: 14px;
  h3,
  p {
    margin: 0;
  }
  h3 {
    font-size: 16px;
  }
  > p {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }
  li {
    display: grid;
    grid-template-columns: 27px minmax(0, 1fr);
    align-items: start;
    gap: 9px;
    color: #514840;
    font-size: 11px;
    line-height: 1.45;
  }
  li > span {
    width: 27px;
    height: 27px;
    border-radius: 9px;
    color: var(--a);
    background: #fff;
    box-shadow: 0 3px 9px #5f321211;
    display: grid;
    place-items: center;
    font-weight: 900;
  }
  li b {
    display: block;
    margin-bottom: 1px;
    color: #27221e;
  }
`;

export const Notice = styled.div<{ $tone?: 'error' | 'success' }>`
  border: 1px solid ${(p) => (p.$tone === 'error' ? '#efbeb8' : '#b8dec2')};
  border-radius: 11px;
  padding: 11px 12px;
  color: ${(p) => (p.$tone === 'error' ? '#9d2b23' : '#176d31')};
  background: ${(p) => (p.$tone === 'error' ? '#fff3f1' : '#f1faf3')};
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11px;
  line-height: 1.45;
  svg {
    width: 17px;
    flex: 0 0 17px;
  }
`;

export const TablesPanel = styled.section`
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 22px;
  background: #fff;
  box-shadow: 0 14px 32px #3320130a;
  display: grid;
  gap: 18px;
  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  h3,
  p {
    margin: 0;
  }
  h3 {
    font-size: 18px;
  }
  header p {
    margin-top: 4px;
    color: var(--muted);
    font-size: 11px;
  }
  @media (max-width: 650px) {
    padding: 17px;
    > header {
      display: grid;
    }
    > header button {
      width: 100%;
    }
  }
`;

export const TableMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  div {
    min-width: 0;
    border: 1px solid #eee4dc;
    border-radius: 12px;
    padding: 12px 13px;
    background: #fdfbf9;
    display: grid;
    gap: 3px;
  }
  small {
    color: var(--muted);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  b {
    font-size: 20px;
  }
  @media (max-width: 480px) {
    gap: 6px;
    div {
      padding: 10px;
    }
    small {
      font-size: 8px;
    }
    b {
      font-size: 17px;
    }
  }
`;

export const TableGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 13px;
  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;

export const TableCard = styled.article`
  min-width: 0;
  border: 1px solid #e9ddd5;
  border-radius: 15px;
  padding: 15px;
  background: linear-gradient(145deg, #fff, #fdfaf8);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 82px;
  gap: 14px;
  align-items: center;
  box-shadow: 0 8px 20px #3c26100a;
  .info {
    min-width: 0;
    display: grid;
    gap: 6px;
  }
  h4,
  p {
    margin: 0;
  }
  h4 {
    font-size: 17px;
  }
  p {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.4;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .badge {
    min-height: 23px;
    border-radius: 999px;
    padding: 0 8px;
    color: #28723a;
    background: #eaf8ed;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 9px;
    font-weight: 800;
  }
  .badge.open {
    color: #9a491e;
    background: #fff0e7;
  }
  .badge.off {
    color: #7b7070;
    background: #eeeae8;
  }
  footer {
    grid-column: 1/-1;
    border-top: 1px solid #eee5df;
    padding-top: 11px;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  footer button {
    flex: 1 1 115px;
  }
  @media (max-width: 360px) {
    grid-template-columns: minmax(0, 1fr) 68px;
  }
`;

export const QrThumb = styled.div`
  width: 82px;
  height: 82px;
  border: 1px solid #e9ddd5;
  border-radius: 12px;
  padding: 7px;
  background: #fff;
  display: grid;
  place-items: center;
  svg {
    width: 100%;
    height: 100%;
  }
  &.missing {
    color: #a85a34;
    background: #fff5ef;
  }
  @media (max-width: 360px) {
    width: 68px;
    height: 68px;
  }
`;

export const SecondaryButton = styled.button`
  min-height: 38px;
  border: 1px solid #ded2c9;
  border-radius: 9px;
  padding: 0 11px;
  color: #3d332d;
  background: #fff;
  font: inherit;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: #d6a78e;
    color: var(--a);
    background: #fffaf7;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
`;

export const DeleteButton = styled.button`
  min-height: 38px;
  border: 1px solid #edc5bd;
  border-radius: 9px;
  padding: 0 11px;
  color: #ad4536;
  background: #fff8f6;
  font: inherit;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: #d88475;
    background: #fff0ec;
  }
  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }
`;

export const EmptyState = styled.div`
  min-height: 160px;
  border: 1px dashed #dfd1c7;
  border-radius: 14px;
  padding: 22px;
  color: var(--muted);
  background: #fdfbf9;
  text-align: center;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 7px;
  svg {
    width: 29px;
    color: var(--a);
  }
  .spin {
    animation: ${spin} 0.8s linear infinite;
  }
  b {
    color: #28221e;
    font-size: 14px;
  }
  span {
    max-width: 380px;
    font-size: 11px;
    line-height: 1.45;
  }
`;

export const DialogBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
  padding: 18px;
  background: #15232cc9;
  backdrop-filter: blur(7px);
  display: grid;
  place-items: center;
`;

export const QrDialog = styled.section`
  position: relative;
  width: min(450px, 100%);
  max-height: calc(100dvh - 36px);
  overflow-y: auto;
  border: 1px solid #e8dbd2;
  border-radius: 22px;
  padding: 27px;
  background: #fff;
  box-shadow: 0 30px 90px #0006;
  text-align: center;
  display: grid;
  justify-items: center;
  gap: 9px;
  .close {
    position: absolute;
    right: 12px;
    top: 12px;
    width: 36px;
    height: 36px;
    border: 1px solid #e5d9d1;
    border-radius: 10px;
    background: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .eyebrow {
    color: var(--a);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.12em;
  }
  h2,
  p {
    margin: 0;
  }
  h2 {
    padding: 0 38px;
    font-size: 23px;
  }
  p {
    max-width: 340px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }
  .qr-large {
    width: min(260px, 78vw);
    aspect-ratio: 1;
    margin: 8px 0;
    border: 1px solid #e9ddd5;
    border-radius: 18px;
    padding: 17px;
    background: #fff;
    display: grid;
    place-items: center;
  }
  .qr-large svg {
    width: 100%;
    height: 100%;
  }
  .dialog-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  @media (max-width: 420px) {
    padding: 24px 17px 17px;
    border-radius: 18px;
    .dialog-actions {
      grid-template-columns: 1fr;
    }
  }
`;

export const DeleteDialog = styled(QrDialog)`
  width: min(430px, 100%);

  .delete-icon {
    display: grid;
    width: 54px;
    height: 54px;
    place-items: center;
    border-radius: 16px;
    background: #fff0ec;
    color: #b64a3a;
  }

  .delete-icon svg {
    width: 25px;
    height: 25px;
  }

  h2 {
    margin: 0;
  }

  p {
    max-width: 340px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.55;
  }

  .dialog-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 7px;
  }

  @media (max-width: 450px) {
    .dialog-actions {
      width: 100%;
      flex-direction: column;

      button {
        width: 100%;
      }
    }
  }
`;

export const TablePrintGlobalStyle = createGlobalStyle`
  @media print {
    @page {
      size: A4 portrait;
      margin: 6mm;
    }

    html,
    body.admin-table-qr-printing {
      width: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }

    body.admin-table-qr-printing > *:not([data-admin-table-qr-print]) {
      display: none !important;
    }

    body.admin-table-qr-printing > [data-admin-table-qr-print] {
      display: block !important;
      position: static !important;
      width: 100%;
      margin: 0 !important;
      padding: 0 !important;
    }
  }
`;

export const PrintSheet = styled.section`
  display: none;
  @media print {
    width: 100%;
    margin: 0;
    padding: 0;
    background: #fff;

    article {
      box-sizing: border-box;
      width: 100%;
      height: 280mm;
      margin: 0;
      padding: 8mm;
      break-inside: avoid-page;
      break-after: page;
      page-break-inside: avoid;
      page-break-after: always;
      border: 0.6mm solid #353535;
      border-radius: 5mm;
      text-align: center;
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr) auto;
      justify-items: center;
      align-items: center;
      gap: 2.5mm;
    }

    article:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    h2,
    h3,
    p {
      margin: 0;
    }

    h2 {
      font-size: 21pt;
      line-height: 1.1;
    }

    h3 {
      font-size: 32pt;
      line-height: 1;
    }

    p {
      font-size: 14pt;
      font-weight: 650;
      line-height: 1.25;
    }

    .print-shield {
      width: 10mm;
      height: 10mm;
      color: #202020;
      stroke-width: 1.8;
    }

    .print-qr {
      width: min(172mm, 100%);
      height: min(172mm, 100%);
      padding: 3mm;
      background: #fff;
      display: grid;
      place-items: center;
    }

    .print-qr svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  }
`;
