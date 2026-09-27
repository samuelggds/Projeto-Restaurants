import styled from 'styled-components';

export const CustomerAuthLayout = styled.main`
  --auth-primary: #e85a2b;
  --auth-bg: #fdfcf9;
  --auth-surface: #ffffff;
  --auth-text: #1f1e1a;
  --auth-muted: #72706b;
  --auth-placeholder: #b0ada6;
  --auth-border: #efece6;
  --auth-control-border: #d0d5dd;

  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 47.222222% 52.777778%;
  overflow-x: hidden;
  background: var(--auth-bg);
  color: var(--auth-text);
  font-family: 'Inter', system-ui, sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button,
  input {
    font: inherit;
  }

  @media (max-width: 900px) {
    display: block;
  }
`;

export const Hero = styled.section`
  position: relative;
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--auth-primary) 38%, transparent), transparent 36%),
    linear-gradient(150deg, #3b2419 0%, #17110e 58%, #080706 100%);

  @media (max-width: 900px) {
    min-height: 0;
    height: 320px;
  }
`;

export const HeroImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: var(--hero-image-opacity, 0);
  transition: opacity 180ms ease;
`;

export const HeroSkeleton = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      105deg,
      rgba(255, 255, 255, 0.03) 20%,
      rgba(255, 255, 255, 0.1) 36%,
      rgba(255, 255, 255, 0.03) 52%
    ),
    #2c211b;
  background-size: 220% 100%;
  animation: auth-image-loading 1.4s linear infinite;

  @keyframes auth-image-loading {
    to {
      background-position-x: -220%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.82) 100%);

  @media (max-width: 900px) {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.75) 100%);
  }
`;

export const HeroBranding = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  text-align: center;

  @media (max-width: 1100px) and (min-width: 901px) {
    padding: 40px;
  }

  @media (max-width: 900px) {
    min-height: 0;
    height: 290px;
    padding: 24px;
    justify-content: flex-end;
    gap: 12px;
  }
`;

export const RestaurantMark = styled.div`
  position: relative;
  width: 100px;
  height: 100px;
  flex: 0 0 100px;
  overflow: hidden;
  border: 3px solid #fff;
  border-radius: 50%;
  background: color-mix(in srgb, var(--auth-primary) 70%, #fff);
  color: #fff;
  display: grid;
  place-items: center;
  font-family: 'Gabarito', 'Inter', sans-serif;
  font-size: 38px;
  line-height: 1;
  font-weight: 800;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .logo-skeleton {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.12);
  }

  @media (max-width: 900px) {
    width: 72px;
    height: 72px;
    flex-basis: 72px;
    border-width: 2px;
    font-size: 28px;
  }
`;

export const HeroNameGroup = styled.div`
  display: grid;
  justify-items: center;
  gap: 12px;

  @media (max-width: 900px) {
    gap: 6px;
  }
`;

export const RestaurantName = styled.h1`
  max-width: 520px;
  margin: 0;
  color: #fff;
  font-family: 'Gabarito', 'Inter', sans-serif;
  font-size: 36px;
  line-height: 1.1;
  font-weight: 800;
  overflow-wrap: anywhere;

  @media (max-width: 900px) {
    max-width: 330px;
    font-family: 'Inter', sans-serif;
    font-size: 24px;
    line-height: 1.2;
    font-weight: 800;
  }
`;

export const AccessBadge = styled.span`
  min-height: 26px;
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.96px;
  text-transform: uppercase;

  @media (max-width: 900px) {
    min-height: 23px;
    padding: 4px 12px;
    border-color: rgba(255, 255, 255, 0.27);
    background: rgba(255, 255, 255, 0.13);
    font-size: 11px;
    letter-spacing: 0.88px;
  }
`;

export const HeroDescription = styled.p`
  width: min(400px, 100%);
  margin: 0;
  color: rgba(255, 255, 255, 0.56);
  font-size: 16px;
  line-height: 1.5;
  font-weight: 400;

  @media (max-width: 900px) {
    display: none;
  }
`;

export const FormPanel = styled.section`
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 80px;
  background: var(--auth-bg);
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 1200px) and (min-width: 901px) {
    padding: 48px;
  }

  @media (max-width: 900px) {
    position: relative;
    z-index: 3;
    min-height: 0;
    margin-top: -40px;
    padding: 28px 24px 40px;
    border-radius: 28px 28px 0 0;
    align-items: flex-start;
  }

  @media (max-width: 359px) {
    padding-inline: 16px;
  }
`;

export const FormCard = styled.div`
  width: 420px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;

  @media (max-width: 900px) {
    width: 100%;
    gap: 20px;
  }
`;

export const HeadingGroup = styled.div`
  display: grid;
  gap: 8px;

  h2 {
    margin: 0;
    color: var(--auth-text);
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 32px;
    line-height: 1.1;
    font-weight: 800;
  }

  p {
    margin: 0;
    color: var(--auth-muted);
    font-size: 15px;
    line-height: 1.4;
  }

  @media (max-width: 900px) {
    gap: 6px;

    h2 {
      font-family: 'Inter', sans-serif;
      font-size: 22px;
      line-height: 1.2;
    }

    p {
      font-size: 14px;
    }
  }
`;

export const Feedback = styled.div`
  margin-top: -16px;
  padding: 11px 13px;
  border: 1px solid var(--feedback-border, rgba(239, 68, 68, 0.28));
  border-radius: 12px;
  background: var(--feedback-bg, rgba(239, 68, 68, 0.07));
  color: var(--feedback-color, #b42318);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.4;

  svg {
    flex: 0 0 auto;
    margin-top: 1px;
  }

  @media (max-width: 900px) {
    margin-top: -8px;
  }
`;

export const AuthForm = styled.form`
  display: grid;
  gap: 22px;

  @media (max-width: 900px) {
    gap: 20px;
  }
`;

export const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;

  @media (max-width: 900px) {
    gap: 14px;
  }
`;

export const FieldGroup = styled.label`
  display: grid;
  gap: 8px;
  color: var(--auth-text);
  font-size: 13px;
  line-height: 1.2;
  font-weight: 600;

  @media (max-width: 900px) {
    gap: 6px;
  }
`;

export const InputShell = styled.div`
  position: relative;
  height: 50px;
  padding: 0 14px;
  border: 1px solid var(--auth-border);
  border-radius: 12px;
  background: var(--auth-surface);
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  color: var(--auth-muted);
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;

  &:focus-within {
    border-color: var(--auth-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--auth-primary) 12%, transparent);
  }

  svg {
    width: 18px;
    height: 18px;
    stroke-width: 2;
  }

  input {
    min-width: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--auth-text);
    font-size: 15px;
    line-height: 1;
  }

  input::placeholder {
    color: var(--auth-placeholder);
    opacity: 1;
  }

  @media (min-width: 901px) {
    gap: 12px;
  }
`;

export const PasswordToggle = styled.button`
  width: 34px;
  height: 34px;
  margin-right: -8px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--auth-muted);
  display: grid;
  place-items: center;

  &:hover,
  &:focus-visible {
    color: var(--auth-primary);
    background: color-mix(in srgb, var(--auth-primary) 9%, #fff);
    outline: none;
  }
`;

export const OptionsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const RememberLabel = styled.label`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--auth-muted);
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
  white-space: nowrap;

  input {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--auth-primary);
    cursor: pointer;
  }
`;

export const ForgotButton = styled.button`
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--auth-primary);
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    outline: none;
  }
`;

export const PrimaryButton = styled.button`
  width: 100%;
  min-height: 50px;
  padding: 14px 24px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--auth-primary) 82%, #ff8b66),
    color-mix(in srgb, var(--auth-primary) 88%, #d8361d)
  );
  box-shadow: 0 10px 14px rgba(16, 24, 39, 0.14);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 15px;
  line-height: 20px;
  font-weight: 600;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
  }

  &:disabled {
    cursor: progress;
    opacity: 0.7;
  }
`;

export const Divider = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding: 4px 0;
  color: var(--auth-muted);
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;

  &::before,
  &::after {
    content: '';
    height: 1px;
    background: var(--auth-border);
  }
`;

export const GoogleSlot = styled.div`
  position: relative;
  width: 100%;
  height: 50px;

  .google-real-button {
    position: absolute;
    z-index: 2;
    inset: 0;
    width: 100%;
    height: 50px;
    overflow: hidden;
    opacity: 0.001;
  }

  .google-real-button > div,
  .google-real-button iframe {
    max-width: 100% !important;
  }
`;

export const GoogleVisual = styled.div`
  position: absolute;
  z-index: 3;
  inset: 0;
  pointer-events: none;
  border: 1px solid var(--auth-control-border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 10px rgba(16, 24, 39, 0.08);
  color: #101828;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  line-height: 20px;
  font-weight: 600;

  .google-g {
    width: 20px;
    height: 20px;
    border: 0.5px solid #d9d9d9;
    border-radius: 10px;
    background: #fff;
    color: #4285f4;
    display: grid;
    place-items: center;
    font-size: 14px;
    line-height: 1;
    font-weight: 700;
  }
`;

export const GoogleFallback = styled.button`
  width: 100%;
  min-height: 50px;
  padding: 14px 24px;
  border: 1px solid var(--auth-control-border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 10px rgba(16, 24, 39, 0.08);
  color: #101828;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  line-height: 20px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .google-g {
    width: 20px;
    height: 20px;
    border: 0.5px solid #d9d9d9;
    border-radius: 10px;
    background: #fff;
    color: #4285f4;
    display: grid;
    place-items: center;
    font-size: 14px;
    font-weight: 700;
  }
`;

export const GoogleMessage = styled.p`
  margin: -14px 0 0;
  color: #b42318;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
`;

export const RegisterFooter = styled.p`
  margin: 0;
  color: var(--auth-muted);
  text-align: center;
  font-size: 14px;
  line-height: 20px;

  a {
    color: var(--auth-primary);
    font-weight: 700;
    text-decoration: none;
  }

  a:hover,
  a:focus-visible {
    text-decoration: underline;
    outline: none;
  }
`;

export const ResendButton = styled.button`
  width: 100%;
  min-height: 42px;
  margin-top: -14px;
  padding: 10px 14px;
  border: 1px solid var(--auth-border);
  border-radius: 12px;
  background: #fff;
  color: var(--auth-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;
