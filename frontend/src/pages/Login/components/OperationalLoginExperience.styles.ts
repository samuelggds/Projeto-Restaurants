import styled from 'styled-components';

export const OperationalAuthLayout = styled.main`
  --bg: #fdfcf9;
  --text: #1f1e1a;
  --muted: #72706b;
  --line: #efece6;
  --accent: #e85a2b;
  width: 100%;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 680px minmax(0, 1fr);
  overflow-x: clip;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  box-sizing: border-box;
  *, *::before, *::after { box-sizing: border-box; }

  @media (max-width: 968px) {
    display: flex;
    flex-direction: column;
  }
`;

export const Hero = styled.section`
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: #17120f;
  @media (max-width: 968px) {
    width: 100%;
    min-height: 320px;
    height: 320px;
    flex: 0 0 320px;
  }
`;

export const HeroImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
`;

export const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(0,0,0,.06);
  @media (max-width: 968px) {
    background: linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.75));
  }
`;

export const HeroBranding = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 64px;
  text-align: center;
  color: #fff;

  @media (max-width: 968px) {
    height: 290px;
    justify-content: flex-end;
    gap: 12px;
    padding: 0 24px 24px;
  }
`;

export const RestaurantMark = styled.div`
  width: 100px;
  height: 100px;
  flex: 0 0 100px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #151515;
  color: #fff;
  font-family: 'Gabarito','Inter',sans-serif;
  font-size: 34px;
  font-weight: 800;

  img { width: 100%; height: 100%; object-fit: cover; }

  @media (max-width: 968px) {
    width: 72px;
    height: 72px;
    flex-basis: 72px;
    border-width: 2px;
    border-color: rgba(255,255,255,.2);
    font-family: 'Inter',sans-serif;
    font-size: 24px;
  }
`;

export const HeroNameGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  @media (max-width: 968px) { gap: 6px; }
`;

export const RestaurantName = styled.h2`
  margin: 0;
  color: #fff;
  font-family: 'Gabarito','Inter',sans-serif;
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  @media (max-width: 968px) {
    font-family: 'Inter',sans-serif;
    font-size: 24px;
  }
`;

export const AccessBadge = styled.span`
  padding: 6px 16px;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 100px;
  background: rgba(255,255,255,.1);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .96px;
  text-transform: uppercase;
  @media (max-width: 968px) {
    padding: 4px 12px;
    font-size: 11px;
    letter-spacing: .88px;
  }
`;

export const HeroDescription = styled.p`
  width: 400px;
  max-width: 100%;
  margin: 0;
  color: rgba(255,255,255,.56);
  font-size: 16px;
  line-height: 1.5;
  @media (max-width: 968px) { display: none; }
`;

export const MobileSpacer = styled.div`
  display: none;
  @media (max-width: 968px) {
    display: block;
    height: 40px;
    flex: 0 0 40px;
    background: var(--bg);
  }
`;

export const FormPanel = styled.section`
  min-height: 100dvh;
  padding: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  @media (max-width: 968px) {
    min-height: 0;
    padding: 20px 24px 40px;
    align-items: flex-start;
  }
`;

export const FormCard = styled.div`
  width: min(420px,100%);
  display: flex;
  flex-direction: column;
  gap: 32px;
  @media (max-width: 968px) {
    width: 100%;
    gap: 20px;
  }
`;

export const HeadingGroup = styled.header`
  display: flex;
  flex-direction: column;
  gap: 8px;
  h1, p { margin: 0; }
  h1 {
    font-family: 'Gabarito','Inter',sans-serif;
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
  }
  p { color: var(--muted); font-size: 15px; line-height: 1.4; }
  @media (max-width: 968px) {
    gap: 6px;
    h1 { font-family: 'Inter',sans-serif; font-size: 22px; }
    p { font-size: 14px; }
  }
`;

export const Feedback = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(239,68,68,.28);
  border-radius: 12px;
  background: rgba(239,68,68,.07);
  color: #b42318;
  font-size: 13px;
  &[data-type='success'] {
    border-color: rgba(16,185,129,.3);
    background: rgba(16,185,129,.08);
    color: #087d58;
  }
  svg { width: 17px; height: 17px; flex: 0 0 17px; }
`;

export const ResendButton = styled.button`
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
`;

export const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 32px;
  @media (max-width: 968px) { gap: 20px; }
`;

export const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  @media (max-width: 968px) { gap: 14px; }
`;

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  > label { font-size: 13px; font-weight: 600; }
  @media (max-width: 968px) { gap: 6px; }
`;

export const InputShell = styled.div`
  height: 50px;
  display: grid;
  grid-template-columns: 18px minmax(0,1fr) 18px;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  color: var(--muted);

  > svg { width: 18px; height: 18px; }
  > input {
    min-width: 0;
    width: 100%;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 15px;
  }
  > input::placeholder { color: #b0ada6; opacity: 1; }
  &:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(232,90,43,.08);
  }
`;

export const PasswordToggle = styled.button`
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  display: grid;
  place-items: center;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  svg { width: 18px; height: 18px; }
`;

export const OptionsRow = styled.div`
  min-height: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const RememberLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  input {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--accent);
  }
`;

export const ForgotButton = styled.button`
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

export const PrimaryButton = styled.button`
  min-height: 46px;
  padding: 14px 24px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #fff;
  box-shadow: 0 10px 14px rgba(16,24,39,.14);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: .55; cursor: progress; }
`;

export const HomeIndicator = styled.div`
  display: none;
  @media (max-width: 968px) {
    width: 100%;
    height: 29px;
    flex: 0 0 29px;
    display: flex;
    justify-content: center;
    padding-top: 12px;
    background: var(--bg);
    span {
      width: 120px;
      height: 5px;
      border-radius: 100px;
      background: #d1cece;
    }
  }
`;
