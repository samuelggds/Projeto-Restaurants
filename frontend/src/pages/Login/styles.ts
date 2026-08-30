import styled from 'styled-components';

export const lightTheme = {
  background: '#f7f2eb',
  surface: '#fffdf9',
  text: '#241a14',
  textMuted: '#7f7066',
  border: '#eadfd4',
  primary: '#e65c00',
  primaryHover: '#cc5200',
  shadow: 'rgba(60, 35, 20, 0.12)',
  success: '#10b981',
};

export const darkTheme = {
  background: '#15110e',
  surface: '#211a15',
  text: '#fffaf5',
  textMuted: '#b5a69a',
  border: '#3a2d24',
  primary: '#ff6b00',
  primaryHover: '#e65c00',
  shadow: 'rgba(0, 0, 0, 0.42)',
  success: '#10b981',
};

export const Container = styled.div`
  position: relative;
  display: flex;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: 'Inter', sans-serif;
  transition:
    background-color 0.25s ease,
    color 0.25s ease;

  @media (max-width: 968px) {
    flex-direction: column;
    overflow-x: clip;
  }
`;

export const TopBar = styled.div`
  position: absolute;
  top: 1.35rem;
  right: 1.35rem;
  z-index: 20;

  @media (max-width: 968px) {
    top: calc(0.8rem + env(safe-area-inset-top, 0px));
    right: calc(0.8rem + env(safe-area-inset-right, 0px));
  }
`;

export const ThemeToggleButton = styled.button`
  width: 42px;
  height: 42px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid ${(props) => props.theme.border};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.theme.text};
  background: color-mix(in srgb, ${(props) => props.theme.surface} 94%, transparent);
  box-shadow: 0 8px 24px ${(props) => props.theme.shadow};
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background: ${(props) => props.theme.surface};
  }

  &:focus-visible {
    outline: 3px solid ${(props) => props.theme.primary}33;
    outline-offset: 2px;
  }

  @media (max-width: 380px) {
    width: 38px;
    height: 38px;
  }
`;

export const BannerSection = styled.section<{ $hasLogo?: boolean }>`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  flex: 1 1 50%;
  min-width: 0;
  min-height: 100vh;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: ${(props) => (props.$hasLogo ? 'flex-end' : 'center')};
  align-items: flex-start;
  background: linear-gradient(
    145deg,
    ${(props) => props.theme.surface} 0%,
    ${(props) => props.theme.background} 100%
  );
  border-right: 1px solid ${(props) => props.theme.border};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: ${(props) =>
      props.$hasLogo
        ? 'linear-gradient(180deg, rgba(0,0,0,0.02) 22%, rgba(0,0,0,0.16) 56%, rgba(0,0,0,0.84) 100%)'
        : 'transparent'};
  }

  @media (max-width: 968px) {
    flex: 0 0 auto;
    width: 100%;
    min-height: 0;
    height: clamp(230px, 34dvh, 330px);
    padding:
      calc(1.35rem + env(safe-area-inset-top, 0px))
      clamp(1.15rem, 5vw, 1.6rem)
      clamp(2.9rem, 8vw, 3.6rem);
    border-right: 0;
    border-bottom: 1px solid ${(props) => props.theme.border};
    border-radius: 0 0 clamp(28px, 8vw, 42px) clamp(28px, 8vw, 42px);
    justify-content: flex-end;

    &::after {
      background: ${(props) =>
        props.$hasLogo
          ? 'linear-gradient(180deg, rgba(0,0,0,0.02) 18%, rgba(0,0,0,0.10) 46%, rgba(0,0,0,0.80) 100%)'
          : 'transparent'};
    }
  }

  @media (max-width: 968px) and (orientation: landscape) {
    height: clamp(180px, 56dvh, 250px);
    padding-bottom: 2.5rem;
  }
`;

export const BrandTitle = styled.h1`
  position: static;
  z-index: auto;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: min(100%, 680px);
  font-size: clamp(2.6rem, 5vw, 4.8rem);
  line-height: 0.98;
  letter-spacing: -0.05em;
  font-weight: 900;
  color: ${(props) => props.theme.text};

  ${BannerSection}[data-has-cover='true'] & {
    color: #fff;
    text-shadow: 0 3px 18px rgba(0, 0, 0, 0.68);
  }

  > span,
  > svg {
    position: relative;
    z-index: 2;
  }

  > span {
    color: inherit;
  }

  @media (max-width: 968px) {
    margin-bottom: 0.48rem;
    gap: 0.55rem;
    font-size: clamp(1.9rem, 8.5vw, 2.65rem);
    line-height: 1;
    letter-spacing: -0.045em;

    > svg {
      width: 26px;
      height: 26px;
      flex: 0 0 auto;
    }
  }

  @media (max-width: 340px) {
    font-size: 1.72rem;
  }
`;

export const RestaurantLogo = styled.img`
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center center;
  image-rendering: auto;
  opacity: 1;
`;

export const BrandSubtitle = styled.p`
  position: relative;
  z-index: 2;
  max-width: 560px;
  margin: 0;
  padding-left: 1rem;
  border-left: 4px solid ${(props) => props.theme.primary};
  color: ${(props) => props.theme.textMuted};
  font-size: clamp(1rem, 1.3vw, 1.16rem);
  line-height: 1.6;
  font-weight: 600;

  ${BannerSection}[data-has-cover='true'] & {
    color: rgba(255, 255, 255, 0.94);
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
  }

  @media (max-width: 968px) {
    max-width: min(92%, 500px);
    padding-left: 0.75rem;
    border-left-width: 3px;
    font-size: clamp(0.78rem, 3.1vw, 0.94rem);
    line-height: 1.4;
    color: ${(props) => props.theme.textMuted};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;

    ${BannerSection}[data-has-cover='true'] & {
      color: rgba(255, 255, 255, 0.94);
    }
  }
`;

export const FormSection = styled.main`
  flex: 1 1 50%;
  min-width: 0;
  min-height: 100vh;
  padding: clamp(2rem, 5vw, 4rem);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.background};

  @media (max-width: 968px) {
    position: relative;
    z-index: 5;
    flex: 1 0 auto;
    width: 100%;
    min-height: 0;
    margin-top: -32px;
    padding:
      0
      clamp(0.75rem, 3.5vw, 1.1rem)
      calc(1.4rem + env(safe-area-inset-bottom, 0px));
    align-items: flex-start;
    background: transparent;
  }

  @media (max-width: 340px) {
    padding-inline: 0.55rem;
  }
`;

export const FormWrapper = styled.div`
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;

  @media (max-width: 968px) {
    width: min(100%, 540px);
    max-width: none;
    margin: 0 auto;
    padding: clamp(1.35rem, 5vw, 1.8rem);
    border: 1px solid ${(props) => props.theme.border};
    border-radius: clamp(24px, 7vw, 32px);
    background: ${(props) => props.theme.surface};
    box-shadow: 0 18px 50px ${(props) => props.theme.shadow};
    box-sizing: border-box;
  }

  @media (max-width: 340px) {
    padding: 1.15rem 0.9rem;
    border-radius: 22px;
  }
`;

export const WelcomeText = styled.h2`
  margin: 0 0 0.45rem;
  color: ${(props) => props.theme.text};
  font-size: 2rem;
  line-height: 1.08;
  font-weight: 900;
  letter-spacing: -0.03em;

  @media (max-width: 968px) {
    font-size: clamp(1.75rem, 7vw, 2.15rem);
  }
`;

export const FormSubtitle = styled.p`
  margin: 0 0 2rem;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.95rem;
  line-height: 1.5;

  @media (max-width: 968px) {
    margin-bottom: 1.4rem;
    font-size: clamp(0.82rem, 3vw, 0.92rem);
  }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.48rem;
`;

export const Label = styled.label`
  color: ${(props) => props.theme.text};
  font-size: 0.84rem;
  font-weight: 800;
`;

export const Input = styled.input`
  width: 100%;
  min-height: 50px;
  padding: 0 0.95rem;
  box-sizing: border-box;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 12px;
  color: ${(props) => props.theme.text};
  background: ${(props) => props.theme.surface};
  font-size: 0.95rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;

  &::placeholder {
    color: ${(props) => props.theme.textMuted};
    opacity: 0.68;
  }

  &:focus {
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 0 0 4px ${(props) => props.theme.primary}16;
  }

  @media (max-width: 380px) {
    min-height: 48px;
    font-size: 0.9rem;
  }
`;

export const PasswordField = styled.div`
  position: relative;
  width: 100%;

  ${Input} {
    padding-right: 3.4rem;
  }
`;

export const PasswordToggleButton = styled.button`
  position: absolute;
  top: 50%;
  right: 0.55rem;
  transform: translateY(-50%);
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.theme.textMuted};
  background: transparent;
  cursor: pointer;

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
  gap: 0.8rem;
  margin-top: 0.05rem;

  @media (max-width: 350px) {
    gap: 0.5rem;
  }
`;

export const CheckboxLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.48rem;
  min-width: 0;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.82rem;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: ${(props) => props.theme.primary};
    cursor: pointer;
  }

  @media (max-width: 350px) {
    gap: 0.35rem;
    font-size: 0.72rem;
  }
`;

export const ForgotLink = styled.button`
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  color: ${(props) => props.theme.primary};
  background: transparent;
  font-size: 0.82rem;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  @media (max-width: 350px) {
    font-size: 0.72rem;
  }
`;

export const Button = styled.button`
  width: 100%;
  min-height: 50px;
  margin-top: 0.25rem;
  padding: 0.75rem 1rem;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: ${(props) => props.theme.primary};
  box-shadow: 0 9px 22px ${(props) => props.theme.primary}30;
  font-size: 0.95rem;
  font-weight: 850;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(0.96);
  }

  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1.15rem;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: lowercase;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid ${(props) => props.theme.border};
  }
`;

export const GoogleButtonContainer = styled.div`
  width: 100%;
  margin-top: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  overflow: hidden;

  > div,
  > div > div,
  iframe {
    max-width: 100% !important;
  }

  @media (max-width: 968px) {
    > div,
    > div > div,
    iframe {
      width: 100% !important;
    }
  }
`;

export const GoogleFallbackButton = styled.button`
  width: 100%;
  min-height: 46px;
  padding: 0.75rem 1rem;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 999px;
  color: ${(props) => props.theme.text};
  background: ${(props) => props.theme.surface};
  box-shadow: 0 5px 16px ${(props) => props.theme.shadow};
  font-size: 0.88rem;
  font-weight: 750;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${(props) => props.theme.primary};
  }

  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
`;

export const GoogleHint = styled.p`
  margin: 0.65rem 0 0;
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  font-size: 0.78rem;
  line-height: 1.45;
`;

export const RegisterText = styled.p`
  margin: 1.45rem 0 0;
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  font-size: 0.86rem;

  a {
    color: ${(props) => props.theme.primary};
    font-weight: 850;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  @media (max-width: 380px) {
    margin-top: 1.2rem;
    font-size: 0.78rem;
  }
`;