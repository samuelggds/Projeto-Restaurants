import styled from 'styled-components';

export const Page = styled.div`
  min-width: 0;
  display: grid;
  gap: 18px;
`;

export const Validation = styled.div`
  border: 1px solid #efb8ae;
  border-radius: 14px;
  padding: 14px 16px;
  color: #8d2d24;
  background: #fff5f2;
  font-size: 11px;
  line-height: 1.45;
  b {
    display: block;
    margin-bottom: 4px;
  }
  ul {
    margin: 0;
    padding-left: 17px;
  }
`;

export const Hero = styled.section`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  padding: 26px;
  border: 1px solid #27414f;
  border-radius: 20px;
  color: #fff;
  background:
    radial-gradient(circle at 88% 18%, #e7653561, transparent 31%),
    linear-gradient(130deg, #142733, #223c49 58%, #654033);
  box-shadow: 0 18px 38px #2e1d1517;
  &::after {
    content: '';
    position: absolute;
    right: -38px;
    bottom: -88px;
    width: 210px;
    height: 210px;
    border: 1px solid #ffffff1b;
    border-radius: 50%;
  }
  .copy,
  .status {
    position: relative;
    z-index: 1;
  }
  .eyebrow {
    color: #ff9b6c;
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
    max-width: 720px;
    margin: 0;
    color: #dbe5ea;
    font-size: 13px;
    line-height: 1.55;
  }
  .status {
    min-width: 150px;
    border: 1px solid #ffffff26;
    border-radius: 16px;
    padding: 15px;
    background: #ffffff12;
    backdrop-filter: blur(8px);
  }
  .status span,
  .status b {
    display: block;
  }
  .status span {
    color: #cdd9df;
    font-size: 10px;
  }
  .status b {
    margin-top: 4px;
    font-size: 16px;
  }
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
    padding: 21px;
    .status {
      min-width: 0;
    }
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.section`
  min-width: 0;
  border: 1px solid #e8ded5;
  border-radius: 18px;
  padding: 22px;
  background: #fff;
  box-shadow: 0 12px 28px #35211409;
  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 17px;
  }
  h3,
  p {
    margin: 0;
  }
  h3 {
    font-size: 17px;
  }
  header p {
    margin-top: 4px;
    color: #766d66;
    font-size: 11px;
    line-height: 1.45;
  }
  @media (max-width: 520px) {
    padding: 16px;
    > header {
      align-items: stretch;
      flex-direction: column;
    }
  }
`;

export const ToggleList = styled.div`
  display: grid;
  gap: 9px;
  .row {
    min-height: 66px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    border: 1px solid #eee5dd;
    border-radius: 13px;
    padding: 12px 14px;
    background: #fdfcfb;
  }
  .row b,
  .row span {
    display: block;
  }
  .row b {
    color: #29241f;
    font-size: 12px;
  }
  .row span {
    margin-top: 3px;
    color: #7f746c;
    font-size: 10px;
    line-height: 1.35;
  }
  input[type='checkbox'] {
    width: 20px;
    height: 20px;
    accent-color: var(--a);
  }
`;

export const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  label {
    display: grid;
    gap: 7px;
    color: #39332e;
    font-size: 11px;
    font-weight: 800;
  }
  input,
  select {
    width: 100%;
    height: 46px;
    border: 1px solid #ddd4cc;
    border-radius: 11px;
    padding: 0 12px;
    outline: 0;
    background: #fcfbfa;
    color: #25211d;
    font: inherit;
  }
  input:focus,
  select:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 11%, transparent);
  }
  small {
    color: #81776f;
    font-weight: 500;
    line-height: 1.35;
  }
  .field-error {
    color: #b5342c;
    font-weight: 700;
  }
  [aria-invalid='true'] {
    border-color: #d95d50;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const Windows = styled.div`
  display: grid;
  gap: 10px;
  .window {
    border: 1px solid #eadfd6;
    border-radius: 14px;
    padding: 14px;
    background: #fffaf7;
  }
  .window.invalid {
    border-color: #e7a89e;
    background: #fff7f5;
  }
  .window-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 11px;
    font-size: 11px;
    font-weight: 850;
  }
  .days {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 11px;
  }
  .days button {
    width: 34px;
    height: 31px;
    border: 1px solid #dfd3ca;
    border-radius: 9px;
    color: #665c54;
    background: #fff;
    font: inherit;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
  .days button.active {
    border-color: var(--a);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 8%, #fff);
  }
  .times {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }
  .times input {
    width: 100%;
    height: 42px;
    border: 1px solid #ddd4cc;
    border-radius: 10px;
    padding: 0 10px;
    background: #fff;
  }
  .window-error {
    display: block;
    margin-top: 8px;
    color: #a83b31;
    font-size: 10px;
    font-weight: 700;
  }
  @media (max-width: 390px) {
    .times {
      grid-template-columns: 1fr;
    }
  }
`;

export const Button = styled.button<{ $danger?: boolean }>`
  min-height: 38px;
  border: 1px solid ${({ $danger }) => ($danger ? '#efc1bc' : '#e3d4c8')};
  border-radius: 10px;
  padding: 0 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: ${({ $danger }) => ($danger ? '#b5342c' : 'var(--a)')};
  background: ${({ $danger }) => ($danger ? '#fff6f4' : '#fff')};
  font: inherit;
  font-size: 11px;
  font-weight: 850;
  cursor: pointer;
  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const SessionList = styled.div`
  display: grid;
  gap: 10px;
`;

export const SessionCard = styled.article`
  border: 1px solid #e8ded5;
  border-radius: 15px;
  padding: 16px;
  background: linear-gradient(145deg, #fff, #fdfaf7);
  .top,
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  h4,
  p {
    margin: 0;
  }
  h4 {
    font-size: 14px;
  }
  .badge {
    border-radius: 999px;
    padding: 5px 8px;
    color: #176b39;
    background: #eaf7ef;
    font-size: 9px;
    font-weight: 900;
  }
  .numbers {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 13px 0;
  }
  .numbers div {
    border-radius: 10px;
    padding: 9px;
    background: #f6f2ee;
  }
  .numbers span,
  .numbers b {
    display: block;
  }
  .numbers span {
    color: #80756d;
    font-size: 9px;
  }
  .numbers b {
    margin-top: 3px;
    font-size: 12px;
  }
  .meta {
    color: #7d736b;
    font-size: 10px;
  }
  @media (max-width: 520px) {
    .numbers {
      grid-template-columns: 1fr;
    }
    .actions {
      align-items: stretch;
      flex-direction: column;
    }
    .top {
      align-items: flex-start;
      flex-direction: column;
    }
    .actions > div {
      display: grid;
      gap: 7px;
    }
    .actions > div button {
      width: 100%;
    }
  }
`;

export const Detail = styled.section`
  display: grid;
  gap: 12px;
  margin-top: 14px;
  border-top: 1px solid #eee3db;
  padding-top: 14px;
  .detail-section {
    display: grid;
    gap: 7px;
  }
  .detail-section h5 {
    margin: 0;
    font-size: 11px;
  }
  .item,
  .payment {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    border: 1px solid #eee5de;
    border-radius: 10px;
    padding: 9px 10px;
    background: #fff;
    font-size: 10px;
  }
  .item span,
  .payment span {
    color: #7b7068;
  }
  .payment-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }
  @media (max-width: 520px) {
    .item,
    .payment {
      grid-template-columns: 1fr;
    }
    .payment-actions,
    .payment-actions button {
      width: 100%;
    }
  }
`;

export const Empty = styled.div`
  border: 1px dashed #ded4cc;
  border-radius: 14px;
  padding: 26px;
  color: #796f67;
  background: #fdfbf9;
  text-align: center;
  font-size: 11px;
`;
