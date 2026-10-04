import styled from 'styled-components';

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 5200;
  padding: 24px;
  display: grid;
  place-items: center;
  background: rgba(24, 20, 18, 0.64);
  backdrop-filter: blur(6px);

  @media (max-width: 720px) {
    padding: 0;
  }
`;

export const Panel = styled.form`
  width: min(940px, 100%);
  max-height: calc(100dvh - 48px);
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  overflow: hidden;
  border: 1px solid #e5e1dd;
  border-radius: 18px;
  background: #f8f7f5;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.3);

  @media (max-width: 720px) {
    width: 100%;
    height: 100dvh;
    max-height: none;
    border: 0;
    border-radius: 0;
  }
`;

export const Header = styled.header`
  padding: 18px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid #e8e3df;
  background: #fff;

  small {
    color: #ff4b4b;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  h2 {
    margin: 3px 0 4px;
    color: #2f2925;
    font-size: 19px;
  }

  p {
    margin: 0;
    max-width: 620px;
    color: #837970;
    font-size: 11px;
    line-height: 1.45;
  }

  button {
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 1px solid #e1dcd8;
    border-radius: 9px;
    background: #fff;
    color: #5f5751;
  }

  svg {
    width: 17px;
  }
`;

export const Progress = styled.div`
  padding: 11px 20px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
  border-bottom: 1px solid #e8e3df;
  background: #fff;

  button {
    min-width: 0;
    padding: 9px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #ece7e3;
    border-radius: 9px;
    background: #faf9f8;
    color: #81766e;
    text-align: left;
    font-size: 10px;
    font-weight: 800;
  }

  button.active {
    border-color: #ffaaaa;
    background: #fff1f1;
    color: #a52d2d;
  }

  button.done {
    color: #2f7043;
    background: #f1faf4;
  }

  i {
    width: 22px;
    height: 22px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 99px;
    background: #ebe7e4;
    font-style: normal;
    font-size: 9px;
  }

  .active i {
    color: #fff;
    background: #ff4b4b;
  }

  @media (max-width: 680px) {
    padding: 9px 12px;
    button {
      justify-content: center;
      padding: 8px;
    }
    button span {
      display: none;
    }
  }
`;

export const Body = styled.div`
  min-height: 0;
  overflow: auto;
  padding: 20px;

  @media (max-width: 720px) {
    padding: 14px;
  }
`;

export const Step = styled.section`
  display: grid;
  gap: 16px;

  > header {
    display: grid;
    gap: 4px;
  }

  > header small {
    color: #ff4b4b;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  > header h3 {
    margin: 0;
    color: #302a26;
    font-size: 19px;
  }

  > header p {
    margin: 0;
    color: #857b73;
    font-size: 11px;
    line-height: 1.5;
  }
`;

export const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  label {
    display: grid;
    gap: 5px;
    color: #615850;
    font-size: 10px;
    font-weight: 850;
  }

  label.full {
    grid-column: 1 / -1;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 10px 11px;
    border: 1px solid #dbd5d0;
    border-radius: 8px;
    background: #fff;
    color: #302a26;
    font: inherit;
    font-size: 12px;
  }

  small {
    color: #8f857d;
    font-size: 9px;
    font-weight: 600;
    line-height: 1.4;
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
    label.full {
      grid-column: auto;
    }
  }
`;

export const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  button {
    min-height: 150px;
    padding: 18px;
    display: grid;
    align-content: start;
    gap: 8px;
    border: 1px solid #e4ded9;
    border-radius: 13px;
    background: #fff;
    color: #4d4540;
    text-align: left;
  }

  button.active {
    border: 2px solid #ff4b4b;
    background: #fff5f5;
  }

  svg {
    width: 25px;
    color: #ff4b4b;
  }

  b {
    color: #302925;
    font-size: 13px;
  }

  span {
    color: #837970;
    font-size: 10px;
    line-height: 1.45;
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    button {
      min-height: 0;
    }
  }
`;

export const OptionBox = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e5e0dc;
  border-radius: 12px;
  background: #fff;

  > header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
  }

  h4 {
    margin: 0;
    color: #322b27;
    font-size: 13px;
  }

  p {
    margin: 3px 0 0;
    color: #877d75;
    font-size: 10px;
  }
`;

export const ChoiceList = styled.div`
  max-height: 330px;
  overflow: auto;
  display: grid;
  gap: 7px;

  label {
    padding: 9px 10px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) minmax(90px, 120px);
    align-items: center;
    gap: 9px;
    border: 1px solid #eee9e5;
    border-radius: 8px;
    color: #514943;
    background: #fff;
    font-size: 10px;
  }

  label.no-price {
    grid-template-columns: auto minmax(0, 1fr);
  }

  input[type='checkbox'] {
    width: auto;
  }

  input[type='number'] {
    width: 100%;
    padding: 7px 8px;
    border: 1px solid #ddd7d2;
    border-radius: 7px;
    font-size: 10px;
  }

  b {
    font-size: 11px;
  }

  small {
    display: block;
    margin-top: 2px;
    color: #958b83;
    font-size: 9px;
  }
`;

export const Rules = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  label {
    display: grid;
    gap: 5px;
    color: #625952;
    font-size: 10px;
    font-weight: 800;
  }

  input,
  select {
    width: 100%;
    padding: 9px 10px;
    border: 1px solid #ddd7d2;
    border-radius: 7px;
    background: #fff;
    font: inherit;
    font-size: 11px;
  }

  label.check {
    display: flex;
    align-items: center;
    gap: 7px;
    align-self: end;
    min-height: 36px;
  }

  label.check input {
    width: auto;
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const Review = styled.div`
  display: grid;
  gap: 12px;

  article {
    padding: 14px;
    display: grid;
    gap: 6px;
    border: 1px solid #e6e0dc;
    border-radius: 11px;
    background: #fff;
  }

  small {
    color: #ff4b4b;
    font-size: 9px;
    font-weight: 900;
  }

  b {
    color: #302a26;
    font-size: 13px;
  }

  span,
  p {
    margin: 0;
    color: #7e746c;
    font-size: 10px;
    line-height: 1.45;
  }
`;

export const Error = styled.div`
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  background: #fff1f2;
  font-size: 10px;
`;

export const Footer = styled.footer`
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px solid #e5e1dd;
  background: #fff;

  > div {
    display: flex;
    gap: 8px;
  }

  button {
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid #dcd6d1;
    border-radius: 8px;
    background: #fff;
    color: #574e48;
    font-size: 11px;
    font-weight: 850;
  }

  button.primary {
    border-color: #ff4b4b;
    color: #fff;
    background: #ff4b4b;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (max-width: 520px) {
    padding: 10px 12px;
    > div:last-child {
      flex: 1;
      justify-content: flex-end;
    }
    button {
      padding: 0 11px;
    }
  }
`;
