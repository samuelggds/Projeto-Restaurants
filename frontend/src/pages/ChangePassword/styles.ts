import styled from 'styled-components';

export const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 15% 15%, rgba(255, 177, 0, 0.22), transparent 34%),
    radial-gradient(circle at 90% 85%, rgba(255, 111, 60, 0.2), transparent 38%),
    #120f0d;
  color: #fff8ef;
`;

export const Card = styled.section`
  width: min(520px, 100%);
  border: 1px solid #3d342d;
  border-radius: 24px;
  padding: clamp(24px, 6vw, 40px);
  background: rgba(31, 26, 22, 0.96);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42);
`;

export const Icon = styled.div`
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: #1b130a;
  background: linear-gradient(135deg, #ffb100, #ff6f3c);
`;

export const Title = styled.h1`
  margin: 20px 0 8px;
  font-size: clamp(28px, 6vw, 38px);
  line-height: 1.1;
`;

export const Description = styled.p`
  margin: 0 0 24px;
  color: #d8cabd;
  line-height: 1.6;
`;

export const Form = styled.form`
  display: grid;
  gap: 16px;
`;

export const Field = styled.label`
  display: grid;
  gap: 8px;
  color: #f7ede4;
  font-weight: 650;
`;

export const Input = styled.input`
  width: 100%;
  height: 48px;
  border: 1px solid #50443a;
  border-radius: 12px;
  padding: 0 14px;
  background: #16120f;
  color: #fff8ef;
  font: inherit;

  &:focus-visible {
    outline: 3px solid rgba(255, 177, 0, 0.3);
    border-color: #ffb100;
  }
`;

export const Policy = styled.p`
  margin: -4px 0 2px;
  color: #bcae9f;
  font-size: 13px;
  line-height: 1.5;
`;

export const ErrorMessage = styled.div`
  border: 1px solid rgba(255, 111, 60, 0.55);
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(255, 111, 60, 0.1);
  color: #ffd8c9;
  line-height: 1.45;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
`;

export const PrimaryButton = styled.button`
  min-height: 48px;
  flex: 1 1 220px;
  border: 0;
  border-radius: 12px;
  padding: 0 18px;
  font: inherit;
  font-weight: 750;
  color: #1b130a;
  background: linear-gradient(135deg, #ffb100, #ff6f3c);
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
`;

export const SecondaryButton = styled.button`
  min-height: 48px;
  border: 1px solid #50443a;
  border-radius: 12px;
  padding: 0 18px;
  font: inherit;
  font-weight: 700;
  color: #fff8ef;
  background: transparent;
  cursor: pointer;
`;
