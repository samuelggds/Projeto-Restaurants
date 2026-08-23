import styled from 'styled-components';

export const Page = styled.div<{ $primary: string }>`
  --config-primary: ${({ $primary }) => $primary || '#d64d08'};
  position: fixed;
  inset: 0;
  z-index: 600;
  width: 100%;
  min-width: 0;
  height: 100dvh;
  min-height: 100svh;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scroll-padding-top: calc(90px + env(safe-area-inset-top, 0px));
  scroll-padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  background:
    radial-gradient(
      circle at 8% 0%,
      color-mix(in srgb, var(--config-primary) 9%, transparent),
      transparent 27rem
    ),
    #f8f6f3;
  color: #211d19;
  font-family: inherit;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  @supports not (height: 100dvh) {
    height: 100vh;
  }
`;

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 5;
  padding-top: env(safe-area-inset-top, 0px);
  border-bottom: 1px solid #e8e0d8;
  background: rgba(255, 253, 250, 0.94);
  backdrop-filter: blur(18px);
`;

export const HeaderInner = styled.div`
  width: min(1180px, calc(100% - 40px));
  min-height: 74px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  button {
    border: 0;
    background: transparent;
    color: #302a25;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 10px 0;
    font-weight: 750;
    cursor: pointer;
  }

  span {
    color: #81776e;
    font-size: 13px;
  }

  @media (max-width: 620px) {
    width: calc(100% - 28px);
    min-height: 60px;
    span {
      display: none;
    }
  }
`;

export const Layout = styled.main`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 30px 0 48px;
  display: grid;
  grid-template-columns: minmax(280px, 0.82fr) minmax(460px, 1.18fr);
  gap: 34px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding-top: 18px;
    padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px));
  }

  @media (max-width: 620px) {
    width: 100%;
    padding: 0 0 14px;
    gap: 0;
  }
`;

export const ProductSummary = styled.aside`
  position: sticky;
  top: 104px;
  overflow: hidden;
  border: 1px solid #e7ddd4;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 18px 52px rgba(70, 45, 24, 0.09);

  img {
    width: 100%;
    height: clamp(250px, 34vw, 420px);
    object-fit: cover;
    display: block;
  }

  > div {
    padding: 24px 25px 27px;
  }

  small {
    display: block;
    margin-bottom: 9px;
    color: var(--config-primary);
    font-weight: 850;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(25px, 3vw, 34px);
    line-height: 1.08;
    letter-spacing: -0.035em;
  }

  p {
    margin: 13px 0 19px;
    color: #6f665e;
    line-height: 1.55;
  }

  strong {
    color: var(--config-primary);
    font-size: 23px;
  }

  @media (max-width: 900px) {
    position: static;
    display: grid;
    grid-template-columns: minmax(210px, 0.75fr) 1fr;
    img {
      height: 100%;
      min-height: 260px;
    }
  }

  @media (max-width: 620px) {
    display: block;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    img {
      height: 210px;
      min-height: 0;
    }
    > div {
      padding: 20px 18px 22px;
    }
    h1 {
      font-size: 27px;
    }
  }

  @media (max-width: 900px) and (max-height: 540px) and (orientation: landscape) {
    display: grid;
    grid-template-columns: minmax(138px, 34vw) minmax(0, 1fr);

    img {
      height: 100%;
      min-height: 150px;
      max-height: 190px;
    }

    > div {
      padding: 15px 17px;
    }

    h1 {
      font-size: 23px;
    }

    p {
      margin: 8px 0 11px;
      font-size: 13px;
      line-height: 1.4;
    }

    strong {
      font-size: 19px;
    }
  }
`;

export const Form = styled.form`
  min-width: 0;
  display: grid;
  gap: 16px;

  @media (max-width: 620px) {
    padding: 18px 14px 0;
    border-top: 1px solid #eee5dd;
  }

  @media (max-width: 900px) and (max-height: 540px) and (orientation: landscape) {
    padding-top: 14px;
  }
`;

export const Intro = styled.div`
  padding: 4px 2px 3px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;

  h2 {
    margin: 0 0 6px;
    font-size: 25px;
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: #746b63;
    font-size: 14px;
  }

  @media (max-width: 540px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
`;

export const Progress = styled.div<{ $value: number }>`
  width: 190px;
  flex: 0 0 auto;

  div {
    height: 7px;
    border-radius: 999px;
    background: #e9e1da;
    overflow: hidden;
  }

  div::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $value }) => `${Math.max(0, Math.min(100, $value))}%`};
    border-radius: inherit;
    background: var(--config-primary);
    transition: width 180ms ease;
  }

  small {
    display: block;
    margin-top: 7px;
    color: #6e655d;
    text-align: right;
    font-size: 11px;
    font-weight: 700;
  }

  @media (max-width: 540px) {
    width: 100%;
    small {
      text-align: left;
    }
  }
`;

export const Group = styled.fieldset<{ $error?: boolean }>`
  min-width: 0;
  margin: 0;
  padding: 20px;
  border: 1px solid ${({ $error }) => ($error ? '#dc6860' : '#e6ddd5')};
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 8px 25px rgba(71, 46, 26, 0.045);

  @media (max-width: 620px) {
    padding: 17px 14px;
    border-radius: 16px;
  }
`;

export const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 15px;

  h3 {
    margin: 0 0 5px;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #786f67;
    font-size: 13px;
    line-height: 1.45;
  }

  @media (max-width: 360px) {
    flex-direction: column;
    gap: 10px;
  }
`;

export const Badge = styled.span<{ $required: boolean }>`
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 999px;
  background: ${({ $required }) =>
    $required ? 'color-mix(in srgb, var(--config-primary) 11%, #fff)' : '#f3f0ec'};
  color: ${({ $required }) => ($required ? 'var(--config-primary)' : '#756d65')};
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`;

export const OptionList = styled.div`
  display: grid;
  gap: 9px;
`;

export const Option = styled.label<{ $selected: boolean; $disabled: boolean }>`
  min-height: 58px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid ${({ $selected }) => ($selected ? 'var(--config-primary)' : '#e9e1da')};
  border-radius: 13px;
  background: ${({ $selected }) =>
    $selected ? 'color-mix(in srgb, var(--config-primary) 6%, #fff)' : '#fff'};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 150ms ease;

  &:hover {
    transform: ${({ $disabled }) => ($disabled ? 'none' : 'translateY(-1px)')};
    border-color: ${({ $disabled }) => ($disabled ? '#e9e1da' : 'var(--config-primary)')};
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  i {
    width: 23px;
    height: 23px;
    border: 1.5px solid ${({ $selected }) => ($selected ? 'var(--config-primary)' : '#bdb4ac')};
    border-radius: 7px;
    display: grid;
    place-items: center;
    background: ${({ $selected }) => ($selected ? 'var(--config-primary)' : '#fff')};
    color: #fff;
    font-style: normal;
  }

  input[type='radio'] + i {
    border-radius: 50%;
  }

  b {
    display: block;
    font-size: 14px;
  }

  small {
    color: #81786f;
    font-size: 11px;
  }

  strong {
    color: ${({ $selected }) => ($selected ? 'var(--config-primary)' : '#443c35')};
    font-size: 13px;
    white-space: nowrap;
  }
`;

export const GroupFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 11px;
  color: #81786f;
  font-size: 11px;

  .error {
    color: #ba3932;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 700;
  }
`;

export const Empty = styled.div`
  padding: 24px;
  border: 1px solid #f0c5a6;
  border-radius: 17px;
  background: #fff8f2;
  color: #774225;
  display: flex;
  align-items: flex-start;
  gap: 11px;

  b {
    display: block;
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
  }
`;

export const Observation = styled.label`
  padding: 20px;
  border: 1px solid #e6ddd5;
  border-radius: 19px;
  background: #fff;
  display: grid;
  gap: 10px;

  div {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  b {
    font-size: 16px;
  }

  span,
  small {
    color: #81786f;
    font-size: 11px;
  }

  textarea {
    min-height: 94px;
    resize: vertical;
    padding: 12px 13px;
    border: 1px solid #ded5cc;
    border-radius: 12px;
    outline: 0;
    line-height: 1.45;
  }

  textarea:focus {
    border-color: var(--config-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--config-primary) 11%, transparent);
  }

  @media (max-width: 620px) {
    padding: 17px 14px;
    border-radius: 16px;
  }
`;

export const BottomBar = styled.div`
  position: sticky;
  bottom: 14px;
  z-index: 4;
  margin-top: 3px;
  padding: 13px 14px 13px 17px;
  border: 1px solid #e1d6cd;
  border-radius: 18px;
  background: rgba(255, 253, 250, 0.96);
  backdrop-filter: blur(16px);
  box-shadow: 0 14px 40px rgba(47, 27, 13, 0.16);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  small {
    display: block;
    margin-bottom: 2px;
    color: #81776e;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  strong {
    font-size: 21px;
  }

  button {
    min-width: 260px;
    min-height: 51px;
    padding: 0 20px;
    border: 0;
    border-radius: 13px;
    background: var(--config-primary);
    color: #fff;
    font-weight: 850;
    cursor: pointer;
    box-shadow: 0 8px 22px color-mix(in srgb, var(--config-primary) 25%, transparent);
  }

  button:disabled {
    background: #b9b1aa;
    box-shadow: none;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    position: static;
    bottom: auto;
  }

  @media (max-width: 620px) {
    width: 100%;
    min-width: 0;
    margin: 3px 0 0;
    padding: 11px 14px calc(11px + env(safe-area-inset-bottom));
    border-radius: 16px;
    gap: 10px;

    button {
      min-width: 0;
      flex: 1;
      padding-inline: 12px;
      font-size: 13px;
    }

    strong {
      font-size: 17px;
    }
  }

  @media (max-width: 340px) {
    padding-inline: 11px;

    small {
      font-size: 9px;
    }

    button {
      padding-inline: 9px;
      font-size: 12px;
    }
  }

  @media (max-height: 540px) and (orientation: landscape) {
    position: static;
    bottom: auto;
  }
`;
