import styled from 'styled-components';

export const Card = styled.div`
  min-width: 0;
  padding: clamp(22px, 3.2vw, 38px);
  border: 1px solid #e0e5d8;
  border-radius: 22px;
  background: #fcfbf7;
  color: #233f32;
  box-shadow: 0 16px 48px #233f3208;

  h3 {
    margin: 0 0 9px;
    font-size: clamp(23px, 2.2vw, 28px);
    line-height: 1.25;
    letter-spacing: -0.035em;
    font-weight: 600;
  }
`;

export const Intro = styled.p`
  margin: 0 0 25px;
  color: #687064;
  font-size: 14px;
  line-height: 1.65;
`;

export const Form = styled.form`
  position: relative;

  input,
  select,
  textarea,
  button {
    font: inherit;
  }

  input:not([type='checkbox']),
  select,
  textarea {
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: 48px;
    padding: 12px 13px;
    border: 1px solid #dce2d4;
    border-radius: 10px;
    outline: none;
    background: #fffefa;
    color: #233f32;
    font-size: 16px;
    line-height: 1.45;
    transition:
      border-color 150ms,
      box-shadow 150ms;
  }

  input::placeholder,
  textarea::placeholder {
    color: #7d8478;
    opacity: 1;
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }

  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  button:focus-visible,
  summary:focus-visible {
    outline: 3px solid #9bb493;
    outline-offset: 3px;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: #587b5e;
    box-shadow: 0 0 0 3px #587b5e0d;
  }

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin: 1px 0 0;
    accent-color: #233f32;
    cursor: pointer;
  }

  [aria-invalid='true'] {
    border-color: #a74835;
  }
`;

export const Fields = styled.fieldset`
  display: grid;
  gap: 20px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;

  &:disabled {
    opacity: 0.72;
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 16px;

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 17px;
  }
`;

export const Field = styled.label`
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
  color: #354737;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;

  span {
    font-weight: 400;
    color: #687064;
  }
`;

export const Channels = styled.fieldset`
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;

  legend {
    margin-bottom: 11px;
    padding: 0;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
  }

  > div {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }

  label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 10px 13px;
    border: 1px solid #e0e5d8;
    border-radius: 10px;
    background: #fffefa;
    color: #52604e;
    cursor: pointer;
    font-size: 14px;
    line-height: 1.35;
  }

  label:has(input:checked) {
    border-color: #9db190;
    background: #eef3e7;
    color: #233f32;
  }
`;

export const OptionalMessage = styled.details`
  summary {
    width: fit-content;
    color: #53694c;
    cursor: pointer;
    font-size: 14px;
    line-height: 1.6;
  }

  &[open] summary {
    margin-bottom: 12px;
  }
`;

export const Consent = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #687064;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.65;
`;

export const Submit = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 14px 18px;
  border: 1px solid #233f32;
  border-radius: 12px;
  background: #233f32;
  color: #fffefa;
  cursor: pointer;
  font-size: 15px !important;
  font-weight: 600 !important;
  line-height: 1.45;
  transition: background 150ms;

  &:hover:not(:disabled) {
    background: #315540;
  }

  &:disabled {
    cursor: wait;
  }
`;

export const ErrorMessage = styled.p`
  margin: 0 0 18px;
  padding: 12px 14px;
  border: 1px solid #e5c7bc;
  border-radius: 10px;
  background: #fff3ed;
  color: #8a382b;
  font-size: 14px;
  line-height: 1.65;
`;

export const ChannelError = styled.p`
  margin: 9px 0 0;
  color: #8a382b;
  font-size: 13px;
  line-height: 1.5;
`;

export const Honeypot = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

export const Success = styled.div`
  padding: 34px 0;
  outline: none;

  > svg {
    display: block;
    margin-bottom: 22px;
    color: #4c7853;
  }

  p {
    max-width: 360px;
    margin: 12px 0 0;
    color: #687064;
    font-size: 16px;
    line-height: 1.75;
  }
`;
