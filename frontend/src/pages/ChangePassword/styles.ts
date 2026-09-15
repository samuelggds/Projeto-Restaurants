import styled from 'styled-components';

export const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background:
    radial-gradient(circle at 85% 8%, rgba(239, 109, 24, 0.11), transparent 26rem),
    linear-gradient(180deg, #f8f7f5 0%, #f3f4f6 100%);
  color: #17181a;

  @media (max-width: 680px) {
    padding: 18px 12px;
    place-items: start center;
  }
`;

export const Shell = styled.section`
  width: min(1040px, 100%);
  display: grid;
  grid-template-columns: minmax(300px, 0.82fr) minmax(0, 1.18fr);
  overflow: hidden;
  border: 1px solid #e4e5e8;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 28px 80px rgba(31, 29, 27, 0.11);

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 480px) {
    border-radius: 20px;
  }
`;

export const Aside = styled.aside`
  min-height: 650px;
  padding: 38px;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 10% 10%, rgba(255, 126, 50, 0.18), transparent 20rem),
    #1b1c1f;
  color: #fff;

  .aside-copy {
    margin: auto 0;
  }

  .eyebrow {
    color: #ff9a59;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.14em;
  }

  h2 {
    max-width: 360px;
    margin: 10px 0 14px;
    font-size: clamp(28px, 4vw, 40px);
    line-height: 1.05;
    letter-spacing: -0.045em;
  }

  p {
    max-width: 370px;
    margin: 0;
    color: #b9bdc4;
    line-height: 1.65;
  }

  .security-points {
    display: grid;
    gap: 10px;
  }

  .security-points span {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #dfe2e7;
    font-size: 13px;
  }

  .security-points svg {
    width: 17px;
    height: 17px;
    color: #ff8a3d;
  }

  @media (max-width: 820px) {
    min-height: auto;
    padding: 26px;
    .aside-copy { margin: 38px 0 30px; }
    .security-points { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  @media (max-width: 620px) {
    .security-points { grid-template-columns: 1fr; }
  }
`;

export const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.04em;

  img {
    width: 40px;
    height: 36px;
    object-fit: contain;
  }

  span {
    display: inline-flex;
  }

  strong {
    color: #ff7a28;
    font: inherit;
  }
`;

export const Card = styled.div`
  padding: clamp(34px, 5vw, 58px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #fff;

  @media (max-width: 480px) {
    padding: 28px 20px;
  }
`;

export const Icon = styled.div`
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  color: #d85c0b;
  background: #fff0e6;
`;

export const Eyebrow = styled.span`
  margin-top: 20px;
  color: #ef6d18;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
`;

export const Title = styled.h1`
  margin: 7px 0 9px;
  color: #161719;
  font-size: clamp(29px, 4vw, 39px);
  line-height: 1.08;
  letter-spacing: -0.045em;
`;

export const Description = styled.p`
  margin: 0 0 28px;
  color: #6f757d;
  line-height: 1.6;
`;

export const Form = styled.form`
  display: grid;
  gap: 17px;
`;

export const Field = styled.label`
  display: grid;
  gap: 8px;
  color: #30343a;
  font-size: 13px;
  font-weight: 800;
`;

export const Input = styled.input`
  width: 100%;
  height: 50px;
  border: 1px solid #dfe2e6;
  border-radius: 12px;
  padding: 0 14px;
  background: #fbfbfc;
  color: #17181a;
  font: inherit;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;

  &:focus-visible {
    outline: 0;
    border-color: #ff8a3d;
    background: #fff;
    box-shadow: 0 0 0 4px rgba(255, 116, 31, 0.1);
  }

  &:disabled {
    opacity: 0.65;
  }
`;

export const RequirementsCard = styled.div`
  padding: 14px 16px;
  border: 1px solid #eceef0;
  border-radius: 14px;
  background: #f8f9fa;
`;

export const ErrorMessage = styled.div`
  border: 1px solid #f3c2b3;
  border-radius: 12px;
  padding: 12px 14px;
  background: #fff3ef;
  color: #9a3d20;
  line-height: 1.45;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;

  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: 1fr;

    > button {
      width: 100%;
      justify-content: center;
    }
  }
`;

export const PrimaryButton = styled.button`
  min-height: 50px;
  flex: 1 1 220px;
  border: 0;
  border-radius: 12px;
  padding: 0 18px;
  font: inherit;
  font-weight: 850;
  color: #fff;
  background: #17181a;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(23, 24, 26, 0.14);

  &:hover:not(:disabled) {
    background: #2c2e32;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
`;

export const SecondaryButton = styled.button`
  min-height: 50px;
  border: 1px solid #dfe2e6;
  border-radius: 12px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font: inherit;
  font-weight: 800;
  color: #535860;
  background: #fff;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #f7f7f8;
  }
`;
