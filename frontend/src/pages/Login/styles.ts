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
`;

export const TopBar = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 10;
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
    display: none;
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
`;

export const FormWrapper = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
`;

export const WelcomeText = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: ${(props) => props.theme.text};
  margin: 0 0 0.5rem 0;
`;

export const FormSubtitle = styled.p`
  font-size: 0.95rem;
  color: ${(props) => props.theme.textMuted};
  margin: 0 0 2.5rem 0;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.25rem;
`;

export const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${(props) => props.theme.textMuted};
  cursor: pointer;

  input {
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary};
    width: 16px;
    height: 16px;
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

  &:hover {
    color: ${(props) => props.theme.primaryHover};
    text-decoration: underline;
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
`;

export const GoogleButtonContainer = styled.div`
  margin-top: 0.9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
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
`;
