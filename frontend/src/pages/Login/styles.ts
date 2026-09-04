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
  successText: '#087d58',
  errorText: '#b42318',
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
  successText: '#6ee7b7',
  errorText: '#fca5a5',
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
    padding: calc(1.35rem + env(safe-area-inset-top, 0px)) clamp(1.15rem, 5vw, 1.6rem)
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
    padding: 0 clamp(0.75rem, 3.5vw, 1.1rem) calc(1.4rem + env(safe-area-inset-bottom, 0px));
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

export const LoginBannerSection = styled(BannerSection)`
  flex-basis: 56%;
  padding: clamp(2.25rem, 4.6vw, 5rem);
  justify-content: flex-end;
  border-right: 0;
  background:
    radial-gradient(
      circle at 12% 12%,
      color-mix(in srgb, ${(props) => props.theme.categoryAccent} 42%, transparent),
      transparent 34%
    ),
    linear-gradient(
      145deg,
      ${(props) => props.theme.categoryDeep} 0%,
      color-mix(in srgb, ${(props) => props.theme.categoryDeep} 74%, #111820) 58%,
      #111820 100%
    );

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(4, 7, 8, 0.04) 0%,
        rgba(4, 7, 8, 0.18) 42%,
        rgba(4, 7, 8, 0.76) 100%
      ),
      linear-gradient(
        90deg,
        color-mix(in srgb, ${(props) => props.theme.categoryDeep} 58%, transparent) 0%,
        rgba(5, 8, 9, 0.12) 68%,
        transparent 100%
      );
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0.16;
    background-image:
      radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.22) 0 1px, transparent 1.5px),
      radial-gradient(circle at 82% 24%, rgba(255, 255, 255, 0.16) 0 1px, transparent 1.5px);
    background-size:
      44px 44px,
      62px 62px;
    -webkit-mask-image: linear-gradient(145deg, #000 0%, transparent 64%);
    mask-image: linear-gradient(145deg, #000 0%, transparent 64%);
  }

  &[data-has-cover='false']::before {
    background:
      radial-gradient(
        circle at 86% 18%,
        color-mix(in srgb, ${(props) => props.theme.categoryAccent} 34%, transparent),
        transparent 32%
      ),
      linear-gradient(135deg, rgba(5, 8, 9, 0.08), rgba(5, 8, 9, 0.5));
  }

  @media (max-width: 968px) {
    flex-basis: auto;
    height: clamp(230px, 34dvh, 330px);
    padding: calc(1rem + env(safe-area-inset-top, 0px)) clamp(0.85rem, 4vw, 1.25rem)
      clamp(2.65rem, 8vw, 3.4rem);
    border-radius: 0 0 clamp(28px, 8vw, 42px) clamp(28px, 8vw, 42px);

    &[data-has-cover='true']::before {
      background:
        linear-gradient(
          180deg,
          rgba(4, 7, 8, 0.12) 0%,
          rgba(4, 7, 8, 0.56) 42%,
          rgba(4, 7, 8, 0.84) 100%
        ),
        linear-gradient(
          90deg,
          color-mix(in srgb, ${(props) => props.theme.categoryDeep} 48%, transparent) 0%,
          transparent 100%
        );
    }
  }

  @media (max-width: 968px) and (orientation: landscape) {
    height: clamp(190px, 58dvh, 260px);
    padding-bottom: 2.4rem;
  }
`;

export const LoginHeroPanel = styled.div`
  position: relative;
  z-index: 2;
  width: min(100%, 620px);
  padding: 0;
  box-sizing: border-box;
  border: 0;
  color: #fff;
  background: transparent;
  box-shadow: none;

  @media (max-width: 968px) {
    width: min(100%, 620px);
    padding: 0;
  }
`;

export const LoginCategoryBadge = styled.div`
  position: relative;
  z-index: 1;
  width: fit-content;
  margin-bottom: 1.15rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.72rem;
  color: rgba(255, 255, 255, 0.94);
  background: transparent;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);

  @media (max-width: 968px) {
    margin-bottom: 0.72rem;
    padding: 0;
  }
`;

export const LoginCategoryIcon = styled.span`
  position: relative;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #fff;
  background: transparent;
  box-shadow: none;
  filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.72));

  svg {
    width: 32px;
    height: 32px;
    stroke-width: 1.9;
  }

  @media (max-width: 968px) {
    width: 32px;
    height: 32px;

    svg {
      width: 26px;
      height: 26px;
    }
  }
`;

export const LoginCategoryCopy = styled.span`
  display: grid;
  gap: 0.18rem;

  small,
  strong {
    display: block;
    color: #fff;
  }

  small {
    color: rgba(255, 255, 255, 0.68);
    font-size: 0.62rem;
    line-height: 1;
    font-weight: 750;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  strong {
    font-size: 0.98rem;
    line-height: 1.15;
    font-weight: 780;
    letter-spacing: -0.01em;
  }

  @media (max-width: 968px) {
    gap: 0.12rem;

    small {
      font-size: 0.54rem;
    }

    strong {
      font-size: 0.82rem;
    }
  }
`;

export const LoginBrandTitle = styled.h1`
  position: relative;
  z-index: 1;
  max-width: 100%;
  margin: 0;
  color: #fff;
  font-size: clamp(2.55rem, 4.3vw, 4.25rem);
  line-height: 0.98;
  font-weight: 900;
  letter-spacing: -0.05em;
  text-wrap: balance;
  text-shadow: 0 4px 28px rgba(0, 0, 0, 0.38);
  overflow-wrap: anywhere;

  @media (max-width: 968px) {
    font-size: clamp(1.72rem, 8.2vw, 2.45rem);
    line-height: 1;
  }
`;

export const LoginHeroCopy = styled.div`
  position: relative;
  z-index: 1;
  max-width: 610px;
  margin-top: 1.1rem;
  padding-top: 0.88rem;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 42px;
    height: 3px;
    border-radius: 999px;
    background: ${(props) => props.theme.categoryAccent};
    box-shadow: 0 4px 14px
      color-mix(in srgb, ${(props) => props.theme.categoryAccent} 45%, transparent);
  }

  strong,
  span {
    display: block;
    color: #fff;
  }

  strong {
    font-size: clamp(0.98rem, 1.22vw, 1.12rem);
    line-height: 1.38;
    font-weight: 750;
  }

  span {
    max-width: 560px;
    margin-top: 0.36rem;
    color: rgba(255, 255, 255, 0.74);
    font-size: clamp(0.78rem, 0.95vw, 0.9rem);
    line-height: 1.5;
    font-weight: 520;
  }

  @media (max-width: 968px) {
    margin-top: 0.65rem;
    padding-top: 0.6rem;

    &::before {
      width: 32px;
      height: 2px;
    }

    strong {
      font-size: clamp(0.78rem, 3.15vw, 0.94rem);
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    span {
      margin-top: 0.18rem;
      font-size: clamp(0.67rem, 2.65vw, 0.79rem);
      line-height: 1.35;
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
    }
  }
`;

export const LoginFormSection = styled(FormSection)`
  position: relative;
  isolation: isolate;
  flex-basis: 44%;
  padding: clamp(2.2rem, 4.5vw, 4.8rem);
  overflow: hidden;
  background-color: ${(props) => props.theme.background};
  background-image:
    linear-gradient(
      color-mix(in srgb, ${(props) => props.theme.border} 54%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, ${(props) => props.theme.border} 54%, transparent) 1px,
      transparent 1px
    );
  background-size: 34px 34px;

  &::before {
    content: '';
    position: absolute;
    z-index: -1;
    width: min(70vw, 560px);
    height: min(70vw, 560px);
    right: -36%;
    top: -22%;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(
      circle,
      color-mix(in srgb, ${(props) => props.theme.categoryAccent} 13%, transparent),
      transparent 68%
    );
  }

  @media (max-width: 968px) {
    margin-top: -32px;
    padding: 0 clamp(0.65rem, 3vw, 1rem) calc(1.4rem + env(safe-area-inset-bottom, 0px));
    overflow: visible;
    background-color: ${(props) => props.theme.background};
  }
`;

export const LoginFormWrapper = styled(FormWrapper)`
  max-width: 490px;
  padding: clamp(1.75rem, 3.2vw, 2.6rem);
  box-sizing: border-box;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: clamp(24px, 2.3vw, 32px);
  background: color-mix(in srgb, ${(props) => props.theme.surface} 97%, transparent);
  box-shadow:
    0 28px 80px ${(props) => props.theme.shadow},
    inset 0 1px 0 color-mix(in srgb, ${(props) => props.theme.surface} 92%, #fff);

  @media (max-width: 968px) {
    width: min(100%, 560px);
    max-width: none;
    padding: clamp(1.3rem, 5vw, 1.85rem);
    border-radius: clamp(24px, 7vw, 32px);
    box-shadow: 0 18px 50px ${(props) => props.theme.shadow};
  }

  @media (max-width: 340px) {
    padding: 1.12rem 0.88rem;
    border-radius: 22px;
  }
`;

export const LoginAccessBadge = styled.div`
  width: fit-content;
  margin-bottom: 1rem;
  padding: 0.42rem 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid
    color-mix(in srgb, ${(props) => props.theme.primary} 24%, ${(props) => props.theme.border});
  border-radius: 999px;
  color: ${(props) => props.theme.primaryReadable};
  background: ${(props) => props.theme.surface};
  font-size: 0.7rem;
  line-height: 1;
  font-weight: 850;
  letter-spacing: 0.055em;
  text-transform: uppercase;

  svg {
    width: 15px;
    height: 15px;
    stroke-width: 2.35;
  }

  @media (max-width: 380px) {
    margin-bottom: 0.78rem;
    font-size: 0.64rem;
  }
`;

export const LoginInputField = styled.div`
  position: relative;
  width: 100%;

  ${Input} {
    padding-left: 3rem;
    background: color-mix(
      in srgb,
      ${(props) => props.theme.surface} 88%,
      ${(props) => props.theme.background}
    );
  }

  &[data-password='true'] ${Input} {
    padding-right: 3.4rem;
  }
`;

export const LoginInputIcon = styled.span`
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 0.92rem;
  transform: translateY(-50%);
  display: inline-flex;
  color: ${(props) => props.theme.textMuted};
  pointer-events: none;

  svg {
    width: 18px;
    height: 18px;
    stroke-width: 2;
  }

  ${LoginInputField}:focus-within & {
    color: ${(props) => props.theme.primaryReadable};
  }
`;

export const LoginForgotLink = styled(ForgotLink)`
  color: ${(props) => props.theme.primaryReadable};
`;

export const LoginRegisterText = styled(RegisterText)`
  a {
    color: ${(props) => props.theme.primaryReadable};
  }
`;

export const LoginSubmitButton = styled(Button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  color: ${(props) => props.theme.primaryText};
  box-shadow: 0 12px 28px color-mix(in srgb, ${(props) => props.theme.primary} 32%, transparent);

  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.2s ease;
  }

  &:hover:not(:disabled) svg {
    transform: translateX(3px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    svg {
      transition: none;
    }
  }
`;

export const LoginFeedback = styled.div<{ $type: 'success' | 'error' }>`
  margin-bottom: 0.65rem;
  padding: 0.78rem 0.9rem;
  display: flex;
  align-items: flex-start;
  gap: 0.58rem;
  border: 1px solid
    ${(props) =>
      props.$type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.26)'};
  border-radius: 12px;
  color: ${(props) =>
    props.$type === 'success' ? props.theme.successText : props.theme.errorText};
  background: ${(props) =>
    props.$type === 'success' ? 'rgba(16, 185, 129, 0.09)' : 'rgba(239, 68, 68, 0.075)'};
  font-size: 0.83rem;
  line-height: 1.45;
  font-weight: 650;

  svg {
    flex: 0 0 auto;
    margin-top: 1px;
  }
`;

export const LoginSecurityNote = styled.p`
  margin: 1.15rem 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  font-size: 0.7rem;
  line-height: 1.35;
  font-weight: 650;

  svg {
    width: 14px;
    height: 14px;
    color: ${(props) => props.theme.success};
    stroke-width: 2.35;
  }
`;
