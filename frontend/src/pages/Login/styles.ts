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
    --mobile-cover-height: clamp(230px, 67vw, 330px);
    --mobile-overlap: 24px;

    flex-direction: column;
    align-items: stretch;
    width: 100%;
    min-height: 100dvh;
    overflow-x: clip;
  }

  @media (max-width: 968px) and (orientation: landscape) {
    --mobile-cover-height: clamp(150px, 42dvh, 205px);
  }
`;

export const TopBar = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 10;

  @media (max-width: 968px) {
    top: calc(0.8rem + env(safe-area-inset-top, 0px));
    right: calc(0.8rem + env(safe-area-inset-right, 0px));
  }
`;

export const ThemeToggleButton = styled.button`
  width: 40px;
  height: 40px;
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px ${(props) => props.theme.shadow};
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => props.theme.border};
  }

  @media (max-width: 968px) {
    background: color-mix(in srgb, ${(props) => props.theme.surface} 94%, transparent);
    backdrop-filter: blur(10px);
    box-shadow: 0 5px 18px rgba(0, 0, 0, 0.14);
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
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(180deg, transparent 24%, rgba(0, 0, 0, 0.08) 46%, rgba(0, 0, 0, 0.82) 100%);
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
      color: rgba(255, 255, 255, 0.94);
    }
  `}

  @media (max-width: 968px) {
    display: flex;
    flex: 0 0 var(--mobile-cover-height);
    width: min(calc(100% - 1rem), 480px);
    height: var(--mobile-cover-height);
    min-height: var(--mobile-cover-height);
    margin: calc(0.5rem + env(safe-area-inset-top, 0px)) auto 0;
    padding: clamp(1rem, 4.6vw, 1.45rem);
    border: none;
    border-radius: clamp(24px, 6vw, 30px);
    justify-content: flex-end;
    align-items: flex-start;
    box-sizing: border-box;
    box-shadow: 0 14px 36px rgba(45, 34, 25, 0.14);
    isolation: isolate;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0) 28%,
        rgba(0, 0, 0, 0.05) 50%,
        rgba(0, 0, 0, 0.74) 100%
      );
      pointer-events: none;
    }

    > p,
    > h1 > span {
      position: relative;
      z-index: 2;
      color: #fff;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.72);
    }

    > h1 {
      max-width: calc(100% - 2.5rem);
      margin: 0 0 0.4rem;
    }

    > h1 > span {
      color: #fff;
      max-width: 100%;
      font-size: clamp(1.6rem, 7.4vw, 2.25rem);
      line-height: 1;
      letter-spacing: -0.045em;
      font-weight: 900;
      overflow-wrap: anywhere;
    }

    > p {
      width: min(100%, 430px);
      max-width: calc(100% - 0.75rem);
      margin: 0;
      padding: 0.1rem 0 0.1rem 0.7rem;
      border-left: 3px solid ${(props) => props.theme.primary};
      font-size: clamp(0.72rem, 2.85vw, 0.88rem);
      line-height: 1.35;
      font-weight: 600;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  @media (max-width: 340px) {
    width: calc(100% - 0.65rem);
    padding-inline: 0.9rem;
    border-radius: 22px;

    > h1 > span {
      font-size: 1.5rem;
    }

    > p {
      font-size: 0.7rem;
    }
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
      flex: 0 0 auto;
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
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  image-rendering: auto;
  opacity: 1;

  @media (max-width: 968px) {
    object-position: center 62%;
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
    flex: 1 0 auto;
    width: min(100%, 496px);
    align-items: stretch;
    padding: 0 0.5rem max(0.5rem, env(safe-area-inset-bottom, 0px));
    margin: calc(var(--mobile-overlap) * -1) auto 0;
    box-sizing: border-box;
    position: relative;
    z-index: 3;
    background: transparent;
  }
`;

export const FormWrapper = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;

  @media (max-width: 968px) {
    width: 100%;
    max-width: none;
    min-height: calc(
      100dvh - var(--mobile-cover-height) - 0.5rem + var(--mobile-overlap) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
    );
    padding: clamp(1.45rem, 5vw, 1.85rem) clamp(1rem, 4.4vw, 1.45rem) clamp(1.2rem, 4vw, 1.55rem);
    border-radius: clamp(24px, 6vw, 30px);
    background: ${(props) => props.theme.surface};
    border: 1px solid ${(props) => props.theme.border};
    box-shadow: 0 14px 38px ${(props) => props.theme.shadow};
    box-sizing: border-box;
  }

  @media (max-width: 968px) and (orientation: landscape) {
    min-height: auto;
  }
`;

export const WelcomeText = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: ${(props) => props.theme.text};
  margin: 0 0 0.5rem 0;

  @media (max-width: 968px) {
    font-size: clamp(1.75rem, 7.2vw, 2.05rem);
    line-height: 1.06;
    margin-bottom: 0.35rem;
  }
`;

export const FormSubtitle = styled.p`
  font-size: 0.95rem;
  color: ${(props) => props.theme.textMuted};
  margin: 0 0 2.5rem 0;

  @media (max-width: 968px) {
    font-size: clamp(0.82rem, 3vw, 0.92rem);
    line-height: 1.45;
    margin-bottom: clamp(1.15rem, 3.8vw, 1.45rem);
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

  @media (max-width: 335px) {
    font-size: 0.72rem;
    gap: 0.35rem;
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

  @media (max-width: 335px) {
    font-size: 0.72rem;
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
    margin-top: 0.9rem;
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
    margin-top: 0.8rem;
    width: 100%;
    overflow: hidden;

    > div,
    > div > div,
    iframe {
      width: 100% !important;
      max-width: 100% !important;
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

  @media (max-width: 968px) {
    max-width: 100%;
    min-height: 44px;
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
    margin: auto 0 0;
    padding-top: 1.3rem;
    font-size: 0.82rem;
  }
`;