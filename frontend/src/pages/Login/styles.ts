import styled from 'styled-components';

export const lightTheme = {
  background: '#fdfbf7',
  surface: '#ffffff',
  text: '#2d2219',
  textMuted: '#7c6e65',
  border: '#f1ede4',
  primary: '#e65c00',
  primaryHover: '#cc5200',
  shadow: 'rgba(230, 92, 0, 0.05)',
  success: '#10b981',
};

export const darkTheme = {
  background: '#18130f',
  surface: '#241c16',
  text: '#fdfbf7',
  textMuted: '#a39385',
  border: '#362b22',
  primary: '#ff6b00',
  primaryHover: '#e65c00',
  shadow: 'rgba(0, 0, 0, 0.4)',
  success: '#10b981',
};

export const Container = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100vw;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: 'Inter', sans-serif;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  overflow-x: hidden;
  position: relative;

  @media (max-width: 968px) {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    min-height: 100dvh;
    padding: 0;
  }
`;

export const TopBar = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 10;

  @media (max-width: 968px) {
    top: 0.9rem;
    right: 0.9rem;
  }
`;

export const ThemeToggleButton = styled.button`
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};
  padding: 0.6rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px ${(props) => props.theme.shadow};
  transition: all 0.2s;

  &:hover {
    background: ${(props) => props.theme.border};
  }

  @media (max-width: 968px) {
    width: 38px;
    height: 38px;
    padding: 0;
    background: color-mix(in srgb, ${(props) => props.theme.surface} 92%, transparent);
    backdrop-filter: blur(8px);
  }
`;

export const BannerSection = styled.div<{ $hasLogo?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: ${(props) => (props.$hasLogo ? '0' : '4rem')};
  background: linear-gradient(
    135deg,
    ${(props) => props.theme.surface} 0%,
    ${(props) => props.theme.background} 100%
  );
  border-right: 1px solid ${(props) => props.theme.border};
  position: relative;
  overflow: hidden;

  ${({ $hasLogo, theme }) =>
    $hasLogo &&
    `
    justify-content: flex-end;
    align-items: flex-start;
    padding: 4rem;

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.05) 30%, rgba(0, 0, 0, 0.78) 100%);
      pointer-events: none;
    }

    > h1 > span,
    > p {
      position: relative;
      z-index: 2;
      color: #fff;
      text-shadow: 0 2px 16px rgba(0, 0, 0, 0.65);
    }

    > h1 {
      margin: 0 0 14px;
    }

    > h1 > span {
      display: inline-block;
      max-width: 620px;
      font-size: clamp(2.5rem, 5vw, 4.8rem);
      line-height: 0.98;
      letter-spacing: -0.055em;
      font-weight: 900;
    }

    > p {
      max-width: 540px;
      margin: 0;
      padding: 4px 0 4px 18px;
      border-left: 4px solid ${theme.primary};
      font-size: clamp(1rem, 1.35vw, 1.2rem);
      line-height: 1.65;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }
  `}

  @media (max-width: 968px) {
    display: flex;
    flex: 0 0 auto;
    width: calc(100% - 1.5rem);
    min-height: 205px;
    height: 27vh;
    max-height: 245px;
    margin: 0.75rem 0.75rem 0;
    padding: 1.2rem 1.25rem 1.55rem;
    border: none;
    border-radius: 28px 28px 22px 22px;
    justify-content: flex-end;
    align-items: flex-start;
    box-sizing: border-box;
    box-shadow: 0 14px 36px rgba(45, 34, 25, 0.12);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.08) 16%, rgba(0, 0, 0, 0.72) 100%);
      pointer-events: none;
    }

    > h1,
    > p,
    > h1 > span {
      position: relative;
      z-index: 2;
      color: #fff;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
    }

    > h1 {
      margin: 0 0 0.32rem;
    }

    > h1 > span {
      color: #fff;
      font-size: clamp(1.45rem, 7vw, 2rem);
      line-height: 1.05;
      letter-spacing: -0.04em;
      font-weight: 900;
    }

    > p {
      margin: 0;
      max-width: 94%;
      padding-left: 0.7rem;
      border-left: 3px solid ${(props) => props.theme.primary};
      font-size: 0.74rem;
      line-height: 1.35;
      font-weight: 600;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  @media (max-width: 480px) {
    min-height: 180px;
    height: 24vh;
    max-height: 210px;
    border-radius: 24px 24px 20px 20px;
  }
`;

export const BrandTitle = styled.h1`
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: -1px;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(props) => props.theme.text};

  span {
    color: ${(props) => props.theme.primary};
  }

  @media (max-width: 968px) {
    gap: 0.45rem;

    > svg {
      width: 24px;
      height: 24px;
      color: #fff;
    }
  }
`;

export const RestaurantLogo = styled.img`
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.72;

  @media (max-width: 968px) {
    opacity: 1;
  }
`;

export const BrandSubtitle = styled.p`
  font-size: 1.1rem;
  line-height: 1.6;
  color: ${(props) => props.theme.textMuted};
  max-width: 480px;
  margin: 0;
`;

export const FormSection = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: ${(props) => props.theme.background};

  @media (max-width: 968px) {
    flex: 1 1 auto;
    width: 100%;
    align-items: flex-start;
    padding: 0 0.75rem 1.25rem;
    margin-top: -0.55rem;
    box-sizing: border-box;
    position: relative;
    z-index: 3;
  }
`;

export const FormWrapper = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;

  @media (max-width: 968px) {
    max-width: 520px;
    padding: 1.55rem 1.25rem 1.35rem;
    border-radius: 24px;
    background: ${(props) => props.theme.surface};
    border: 1px solid ${(props) => props.theme.border};
    box-shadow: 0 14px 38px ${(props) => props.theme.shadow};
    box-sizing: border-box;
  }

  @media (max-width: 480px) {
    padding: 1.35rem 1rem 1.2rem;
    border-radius: 22px;
  }
`;

export const WelcomeText = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: ${(props) => props.theme.text};
  margin: 0 0 0.5rem 0;

  @media (max-width: 968px) {
    font-size: 1.65rem;
    margin-bottom: 0.32rem;
  }
`;

export const FormSubtitle = styled.p`
  font-size: 0.95rem;
  color: ${(props) => props.theme.textMuted};
  margin: 0 0 2.5rem 0;

  @media (max-width: 968px) {
    font-size: 0.84rem;
    margin-bottom: 1.35rem;
  }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (max-width: 968px) {
    gap: 1rem;
  }
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 10px;
  font-size: 0.95rem;
  color: ${(props) => props.theme.text};
  background-color: ${(props) => props.theme.surface};
  transition: all 0.2s ease-in-out;
  box-sizing: border-box;

  &::placeholder {
    color: ${(props) => props.theme.textMuted};
    opacity: 0.6;
  }

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 0 0 4px ${(props) => props.theme.primary}15;
  }

  @media (max-width: 968px) {
    min-height: 48px;
    border-radius: 12px;
  }
`;

export const PasswordField = styled.div`
  position: relative;
  width: 100%;

  ${Input} {
    padding-right: 3rem;
  }
`;

export const PasswordToggleButton = styled.button`
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: ${(props) => props.theme.textMuted};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease;

  &:hover,
  &:focus-visible {
    color: ${(props) => props.theme.primary};
    background: ${(props) => props.theme.border};
    outline: none;
  }
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.25rem;
  gap: 0.75rem;
`;

export const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${(props) => props.theme.textMuted};
  cursor: pointer;
  white-space: nowrap;

  input {
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary};
    width: 16px;
    height: 16px;
  }

  @media (max-width: 420px) {
    font-size: 0.77rem;
  }
`;

export const ForgotLink = styled.button`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${(props) => props.theme.primary};
  text-decoration: none;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${(props) => props.theme.primaryHover};
    text-decoration: underline;
  }

  @media (max-width: 420px) {
    font-size: 0.77rem;
  }
`;

export const Button = styled.button`
  width: 100%;
  padding: 0.85rem;
  background-color: ${(props) => props.theme.primary};
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  margin-top: 0.5rem;
  box-shadow: 0 4px 12px ${(props) => props.theme.primary}20;

  &:hover {
    background-color: ${(props) => props.theme.primaryHover};
  }

  @media (max-width: 968px) {
    min-height: 48px;
    border-radius: 12px;
  }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1rem;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid ${(props) => props.theme.border};
  }

  @media (max-width: 968px) {
    margin-top: 0.85rem;
  }
`;

export const GoogleButtonContainer = styled.div`
  margin-top: 0.9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;

  @media (max-width: 968px) {
    margin-top: 0.75rem;
    width: 100%;

    > div,
    > div > div {
      max-width: 100%;
    }
  }
`;

export const GoogleFallbackButton = styled.button`
  width: 100%;
  max-width: 320px;
  padding: 0.85rem 1rem;
  border-radius: 999px;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.text};
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px ${(props) => props.theme.shadow};

  &:hover:not(:disabled) {
    border-color: ${(props) => props.theme.primary};
  }

  &:disabled {
    cursor: progress;
    opacity: 0.75;
  }
`;

export const GoogleHint = styled.p`
  margin: 0.65rem 0 0;
  text-align: center;
  font-size: 0.82rem;
  color: ${(props) => props.theme.textMuted};
`;

export const RegisterText = styled.p`
  font-size: 0.9rem;
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  margin-top: 2rem;

  a {
    color: ${(props) => props.theme.primary};
    font-weight: 700;
    text-decoration: none;

    &:hover {
      color: ${(props) => props.theme.primaryHover};
      text-decoration: underline;
    }
  }

  @media (max-width: 968px) {
    margin: 1.3rem 0 0;
    font-size: 0.82rem;
  }
`;
