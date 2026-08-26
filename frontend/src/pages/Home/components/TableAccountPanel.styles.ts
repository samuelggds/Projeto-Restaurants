import styled from 'styled-components';

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 730;
  display: flex;
  justify-content: flex-end;
  background: rgba(24, 19, 16, 0.58);
  backdrop-filter: blur(6px);
`;

export const Panel = styled.aside`
  width: min(680px, 100%);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid rgba(255, 255, 255, 0.45);
  background: #fffdf9;
  box-shadow: -24px 0 70px rgba(31, 21, 15, 0.25);

  @media (max-width: 700px) {
    width: 100%;
    border-left: 0;
  }
`;

export const Header = styled.header`
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 13px;
  padding: 20px clamp(15px, 4vw, 26px);
  border-bottom: 1px solid #eadfd4;
  background: linear-gradient(120deg, #1a2c35, #64443a);
  color: #fff;

  .icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.12);
  }

  h2 {
    margin: 0;
    font-size: clamp(19px, 3vw, 25px);
  }

  p {
    margin: 4px 0 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 11px;
  }

  button {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
  }
`;

export const Scroll = styled.div`
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px clamp(13px, 4vw, 25px) 100px;
`;

export const Loading = styled.div`
  min-height: 320px;
  display: grid;
  place-items: center;
  color: #746b64;
  font-size: 13px;
  text-align: center;
`;

export const Alert = styled.div<{ $error?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid ${({ $error }) => ($error ? '#f0c4bd' : '#cce3d2')};
  border-radius: 13px;
  background: ${({ $error }) => ($error ? '#fff3f0' : '#eff9f1')};
  color: ${({ $error }) => ($error ? '#9d3329' : '#286b39')};
  font-size: 12px;
  line-height: 1.4;

  button {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
  }
`;

export const Summary = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) repeat(2, minmax(110px, 0.7fr));
  gap: 10px;
  margin-bottom: 16px;

  article {
    min-width: 0;
    padding: 15px;
    border: 1px solid #e9ded4;
    border-radius: 16px;
    background: #fff;
  }

  article:first-child {
    border-color: color-mix(in srgb, var(--home-primary) 30%, #e9ded4);
    background: color-mix(in srgb, var(--home-primary) 6%, white);
  }

  small,
  strong {
    display: block;
  }

  small {
    color: #81776f;
    font-size: 10px;
    font-weight: 700;
  }

  strong {
    margin-top: 5px;
    color: #211b17;
    font-size: clamp(16px, 3vw, 23px);
  }

  article:first-child strong {
    color: var(--home-primary);
  }

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    article:first-child {
      grid-column: 1 / -1;
    }
  }
`;

export const Card = styled.section`
  margin-top: 13px;
  padding: clamp(14px, 3vw, 18px);
  border: 1px solid #e8ddd2;
  border-radius: 18px;
  background: #fff;

  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 13px;
  }

  h3 {
    margin: 0;
    color: #241e19;
    font-size: 15px;
  }

  header p {
    margin: 4px 0 0;
    color: #7d736b;
    font-size: 11px;
    line-height: 1.4;
  }

  header span {
    flex: 0 0 auto;
    padding: 5px 8px;
    border-radius: 999px;
    background: #f5eee8;
    color: #6d5d52;
    font-size: 10px;
    font-weight: 800;
  }
`;

export const Participants = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;

  span {
    padding: 7px 10px;
    border-radius: 999px;
    background: #f5f1ed;
    color: #514943;
    font-size: 11px;
    font-weight: 700;
  }

  span.current {
    background: color-mix(in srgb, var(--home-primary) 11%, white);
    color: var(--home-primary);
  }
`;

export const Items = styled.div`
  display: grid;
  gap: 7px;
`;

export const Item = styled.label<{ $selectable?: boolean; $selected?: boolean }>`
  min-width: 0;
  display: grid;
  grid-template-columns: ${({ $selectable }) => ($selectable ? '22px ' : '')}minmax (0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid ${({ $selected }) => ($selected ? 'var(--home-primary)' : '#eee5dd')};
  border-radius: 12px;
  background: ${({ $selected }) =>
    $selected ? 'color-mix(in srgb, var(--home-primary) 6%, white)' : '#fffdfb'};
  cursor: ${({ $selectable }) => ($selectable ? 'pointer' : 'default')};

  input {
    width: 17px;
    height: 17px;
    accent-color: var(--home-primary);
  }

  b,
  small {
    display: block;
  }

  b {
    overflow: hidden;
    color: #312a25;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    margin-top: 3px;
    color: #887e75;
    font-size: 9px;
  }

  strong {
    color: #312a25;
    font-size: 12px;
  }
`;

export const Modes = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  button {
    min-height: 64px;
    padding: 11px;
    border: 1px solid #e2d8ce;
    border-radius: 13px;
    background: #fff;
    color: #352e29;
    cursor: pointer;
    font: inherit;
    text-align: left;
  }

  button b,
  button small {
    display: block;
  }

  button b {
    font-size: 11px;
  }

  button small {
    margin-top: 3px;
    color: #847970;
    font-size: 9px;
    line-height: 1.3;
  }

  button[aria-pressed='true'] {
    border-color: var(--home-primary);
    background: color-mix(in srgb, var(--home-primary) 7%, white);
    color: var(--home-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--home-primary) 10%, transparent);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;

  label {
    display: grid;
    gap: 5px;
    color: #625951;
    font-size: 10px;
    font-weight: 800;
  }

  select,
  input[type='number'] {
    width: 100%;
    height: 42px;
    padding: 0 11px;
    border: 1px solid #ddd2c8;
    border-radius: 11px;
    background: #fff;
    color: #2d2723;
    font: inherit;
    font-size: 12px;
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const Fee = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  background: #f7f3ef;
  color: #5f554e;
  font-size: 11px;
  line-height: 1.4;

  input {
    width: 17px;
    height: 17px;
    flex: 0 0 auto;
    accent-color: var(--home-primary);
  }
`;

export const Submit = styled.button`
  width: 100%;
  min-height: 49px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 13px;
  border: 0;
  border-radius: 13px;
  background: var(--home-primary);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 850;

  &:disabled {
    cursor: not-allowed;
    filter: grayscale(0.15);
    opacity: 0.52;
  }
`;

export const PaymentList = styled.div`
  display: grid;
  gap: 7px;

  article {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 9px;
    padding: 10px 11px;
    border: 1px solid #eee4dc;
    border-radius: 11px;
    background: #fffdfb;
  }

  b,
  small {
    display: block;
  }

  b {
    color: #3b332e;
    font-size: 11px;
  }

  small {
    margin-top: 3px;
    color: #887e75;
    font-size: 9px;
  }

  strong {
    color: #342d28;
    font-size: 11px;
  }

  button {
    padding: 7px 9px;
    border: 1px solid #e6bdb6;
    border-radius: 9px;
    background: #fff;
    color: #ac3e34;
    cursor: pointer;
    font: inherit;
    font-size: 9px;
    font-weight: 800;
  }

  @media (max-width: 430px) {
    article {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    article button {
      grid-column: 1 / -1;
    }
  }
`;

export const Empty = styled.p`
  margin: 0;
  padding: 14px;
  border: 1px dashed #e4d8ce;
  border-radius: 12px;
  color: #81766d;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
`;
