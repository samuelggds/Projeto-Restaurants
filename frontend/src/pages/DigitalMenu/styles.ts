import styled, { createGlobalStyle } from "styled-components";

export const GlobalMenuStyle = createGlobalStyle`
  :root {
    --dm-bg: #111315;
    --dm-bg-soft: #1a1d20;
    --dm-card: rgba(35, 39, 44, 0.86);
    --dm-card-solid: #25292d;
    --dm-line: rgba(248, 236, 215, 0.2);
    --dm-text: #f8f1e4;
    --dm-muted: #cab9a4;
    --dm-brand: #f3a15d;
    --dm-brand-2: #d47344;
    --dm-warm: #ffd089;
    --dm-danger: #ef8f7a;
    --dm-light-bg: #eef1f6;
    --dm-light-surface: #ffffff;
    --dm-light-text: #171b26;
    --dm-light-muted: #6f7586;
    --dm-purple: #3f64ff;
  }

  body {
    font-family: "Sora", "Segoe UI", sans-serif;
    color: var(--dm-light-text);
    background: var(--dm-light-bg);
  }

  * {
    box-sizing: border-box;
  }

  @keyframes riseIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulseDot {
    0% {
      transform: scale(1);
      opacity: 0.65;
    }

    100% {
      transform: scale(1.3);
      opacity: 1;
    }
  }

  @keyframes detailFadeIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes detailImageReveal {
    from {
      opacity: 0;
      transform: scale(1.03);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes detailBodyRise {
    from {
      opacity: 0;
      transform: translateY(18px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes detailFadeOut {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  @keyframes detailBodyDown {
    from {
      opacity: 1;
      transform: translateY(0);
    }

    to {
      opacity: 0;
      transform: translateY(18px);
    }
  }

  @keyframes detailImageHide {
    from {
      opacity: 1;
      transform: scale(1);
    }

    to {
      opacity: 0;
      transform: scale(1.02);
    }
  }

  @keyframes pinPreviewFloatIn {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.985);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes pinPreviewIdentityIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes drawerPanelIn {
    from {
      opacity: 0.72;
      transform: translateX(36px) scale(0.986);
    }

    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  @keyframes drawerHeaderRise {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes drawerContentRise {
    from {
      opacity: 0;
      transform: translateY(14px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes cartLineIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  @keyframes addToCartPulse {
    0% {
      transform: translateY(0) scale(1);
      box-shadow: 0 0 0 rgba(58, 21, 65, 0);
    }

    55% {
      transform: translateY(-1px) scale(1.03);
      box-shadow: 0 10px 18px rgba(58, 21, 65, 0.22);
    }

    100% {
      transform: translateY(0) scale(1);
      box-shadow: 0 0 0 rgba(58, 21, 65, 0);
    }
  }

  @keyframes flowStepIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes flowDotPulse {
    0% {
      box-shadow: 0 0 0 0 rgba(125, 47, 121, 0.35);
      transform: scale(1);
    }

    70% {
      box-shadow: 0 0 0 8px rgba(125, 47, 121, 0);
      transform: scale(1.04);
    }

    100% {
      box-shadow: 0 0 0 0 rgba(125, 47, 121, 0);
      transform: scale(1);
    }
  }

  @keyframes flowTrailSweep {
    0% {
      background-position: 0% 0%;
    }

    100% {
      background-position: 0% 100%;
    }
  }

  @keyframes paymentSuccessPulse {
    0% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.22);
      transform: scale(1);
    }

    70% {
      box-shadow: 0 0 0 16px rgba(34, 197, 94, 0);
      transform: scale(1.03);
    }

    100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      transform: scale(1);
    }
  }

  @keyframes paymentCheckDraw {
    from {
      stroke-dashoffset: 48;
    }

    to {
      stroke-dashoffset: 0;
    }
  }

  @keyframes paymentRingAppear {
    from {
      opacity: 0;
      transform: scale(0.82);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

export const Page = styled.main`
  min-height: 100vh;
  width: 100%;
  color: var(--dm-light-text);
`;

export const PaymentSuccessWrap = styled.section`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1rem;
  background:
    linear-gradient(145deg, #4f67df 0%, #546ee8 54%, #4a62d7 100%),
    radial-gradient(circle at 0% 80%, rgba(44, 58, 128, 0.24), transparent 44%),
    radial-gradient(
      circle at 95% 20%,
      rgba(255, 255, 255, 0.08),
      transparent 38%
    );
`;

export const PaymentSuccessFrame = styled.div`
  width: min(420px, 100%);
  display: grid;
  gap: 0.7rem;
  justify-items: center;
  animation: riseIn 0.34s ease;
`;

export const PaymentSuccessBrand = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 7vw, 3rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #1fbe63;
`;

export const PaymentSuccessCard = styled.div`
  width: 100%;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: clamp(1.2rem, 4vw, 1.75rem) clamp(1rem, 4vw, 1.6rem);
  display: grid;
  justify-items: center;
  gap: 0.95rem;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.2);
`;

export const PaymentSuccessIconRing = styled.div`
  width: 92px;
  height: 92px;
  border-radius: 999px;
  border: 3px solid #18b467;
  color: #18b467;
  display: grid;
  place-items: center;
  animation:
    paymentRingAppear 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    paymentSuccessPulse 1.8s ease-out 0.48s infinite;

  svg {
    overflow: visible;
  }

  svg * {
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: paymentCheckDraw 0.58s ease 0.24s forwards;
  }
`;

export const PaymentSuccessTitle = styled.h2`
  margin: 0;
  font-size: clamp(1.7rem, 6vw, 2.3rem);
  line-height: 1;
  font-weight: 900;
  color: #111827;
  letter-spacing: -0.01em;
`;

export const PaymentSuccessText = styled.p`
  margin: 0;
  text-align: center;
  color: #111827;
  font-size: 1rem;
`;

export const PaymentSuccessMeta = styled.p`
  margin: 0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.8rem;
  line-height: 1.45;
`;

export const PaymentSuccessAction = styled.button`
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 999px;
  background: #0fb8ab;
  color: #ffffff;
  font-weight: 800;
  font-size: 1.12rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.03);
    box-shadow: 0 14px 26px rgba(15, 184, 171, 0.36);
  }
`;

export const PinGateWrap = styled.section`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.2rem;
  background:
    radial-gradient(
      circle at 16% -5%,
      rgba(90, 39, 87, 0.14),
      rgba(90, 39, 87, 0) 42%
    ),
    radial-gradient(
      circle at 92% 12%,
      rgba(243, 161, 93, 0.2),
      rgba(243, 161, 93, 0) 34%
    ),
    var(--dm-light-bg);
`;

export const PinGateCard = styled.div`
  width: min(560px, 100%);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: var(--dm-light-surface);
  box-shadow: 0 18px 36px rgba(48, 22, 53, 0.1);
  padding: clamp(1rem, 3vw, 1.65rem);
  animation: riseIn 0.3s ease;

  h1 {
    margin: 0.7rem 0 0.4rem;
    font-family: "Space Grotesk", "Sora", sans-serif;
    font-size: clamp(1.4rem, 5vw, 2rem);
    line-height: 1.08;
    color: #2b1531;
  }

  p {
    margin: 0;
    color: var(--dm-light-muted);
    font-size: 0.96rem;
    line-height: 1.55;
  }

  form {
    margin-top: 1rem;
    display: grid;
    gap: 0.65rem;
  }
`;

export const PinInput = styled.input`
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(90, 39, 87, 0.24);
  background: #ffffff;
  color: var(--dm-light-text);
  padding: 0.8rem 0.9rem;
  font-size: 1.1rem;
  letter-spacing: 0.28em;
  text-align: center;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus {
    border-color: rgba(90, 39, 87, 0.52);
    box-shadow: 0 0 0 4px rgba(90, 39, 87, 0.12);
  }
`;

export const PinError = styled.p`
  margin: 0;
  color: #ab3d31;
  font-size: 0.86rem;
`;

export const PinSubmitButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 12px;
  margin-top: 0.1rem;
  padding: 0.84rem 0.95rem;
  background: linear-gradient(135deg, #5a2757, #7d2f79);
  color: #ffffff;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.02);
    box-shadow: 0 12px 22px rgba(72, 30, 77, 0.26);
  }

  &:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

export const PinPreviewHeader = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
  animation: pinPreviewFloatIn 0.36s cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: both;
`;

export const PinPreviewCover = styled.div`
  height: 120px;
  background: ${({ $image }) =>
    $image
      ? `url(${$image}) center / cover`
      : "linear-gradient(135deg, #262a33, #4c556b)"};
  animation: detailImageReveal 0.42s cubic-bezier(0.22, 1, 0.36, 1);
`;

export const PinPreviewIdentity = styled.div`
  margin-top: -30px;
  padding: 0 0.85rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.62rem;
  animation: pinPreviewIdentityIn 0.34s cubic-bezier(0.22, 1, 0.36, 1);
  animation-delay: 0.08s;
  animation-fill-mode: both;

  strong {
    display: block;
    font-size: 1.02rem;
    line-height: 1.2;
    color: #221026;
  }

  span {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.78rem;
    color: #7a7a84;
  }
`;

export const PinPreviewLogoWrap = styled.div`
  width: 62px;
  height: 62px;
  border-radius: 999px;
  border: 2px solid #ffffff;
  box-shadow: 0 8px 18px rgba(30, 10, 35, 0.2);
  background: #ffffff;
  padding: 3px;
  flex-shrink: 0;
  animation: pinPreviewFloatIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  animation-delay: 0.1s;
  animation-fill-mode: both;
`;

export const PinPreviewLogoImage = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: ${({ $image }) =>
    $image
      ? `url(${$image}) center / cover`
      : "linear-gradient(135deg, #c3b084, #837149)"};
`;

export const Hero = styled.section`
  max-width: 1220px;
  margin: 0 auto;
  padding: clamp(1rem, 3vw, 2rem);
  padding-top: clamp(1.2rem, 4vw, 2.4rem);
`;

export const HeroCard = styled.div`
  border: 1px solid var(--dm-line);
  border-radius: 14px;
  background:
    linear-gradient(160deg, rgba(35, 39, 44, 0.96), rgba(28, 31, 35, 0.86)),
    var(--dm-card-solid);
  box-shadow: 0 30px 50px rgba(0, 0, 0, 0.34);
  padding: clamp(1rem, 3vw, 1.6rem);
  position: relative;
  overflow: hidden;
  animation: riseIn 0.45s ease;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 120px;
    clip-path: polygon(100% 0, 0 0, 100% 100%);
    background: linear-gradient(
      145deg,
      rgba(243, 161, 93, 0.24),
      rgba(212, 115, 68, 0.14)
    );
    pointer-events: none;
  }
`;

export const HeroTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

export const BrandPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 8px;
  padding: 0.44rem 0.8rem;
  border: 1px solid rgba(243, 161, 93, 0.45);
  background: rgba(46, 37, 31, 0.72);
  color: var(--dm-brand);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const LivePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 8px;
  padding: 0.4rem 0.68rem;
  border: 1px solid rgba(255, 208, 137, 0.36);
  color: #ffe0b6;
  background: rgba(61, 44, 34, 0.62);
  font-size: 0.75rem;
  font-weight: 700;

  span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #f9bf76;
    animation: pulseDot 0.9s ease-in-out infinite alternate;
  }
`;

export const HeroTitle = styled.h1`
  margin: 0.85rem 0 0.3rem;
  font-family: "Space Grotesk", "Sora", sans-serif;
  font-size: clamp(1.75rem, 6vw, 3rem);
  line-height: 1.02;
  letter-spacing: -0.02em;
  max-width: 20ch;
`;

export const HeroText = styled.p`
  margin: 0;
  color: var(--dm-muted);
  max-width: 74ch;
  font-size: clamp(0.94rem, 2.3vw, 1.04rem);
  line-height: 1.58;
`;

export const TableCallout = styled.div`
  margin-top: 0.85rem;
  width: fit-content;
  border: 1px solid rgba(90, 39, 87, 0.35);
  background: linear-gradient(
    135deg,
    rgba(90, 39, 87, 0.1),
    rgba(90, 39, 87, 0.18)
  );
  color: #4b2453;
  border-radius: 10px;
  padding: 0.5rem 0.85rem;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  strong {
    font-family: "Space Grotesk", "Sora", sans-serif;
    font-size: 1.05rem;
    margin-left: 0.3rem;
    color: #2f1034;
  }
`;

export const SetupRow = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;

  input {
    flex: 1;
    min-width: 210px;
    border-radius: 10px;
    border: 1px solid var(--dm-line);
    background: rgba(32, 35, 39, 0.92);
    color: var(--dm-text);
    padding: 0.75rem 0.95rem;
    font-size: 0.94rem;
    outline: none;
  }
`;

export const HeroStats = styled.div`
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroStatCard = styled.div`
  border: 1px solid var(--dm-line);
  background: linear-gradient(
    180deg,
    rgba(43, 47, 53, 0.94),
    rgba(31, 34, 39, 0.88)
  );
  border-radius: 10px;
  padding: 0.72rem 0.8rem;
  min-height: 70px;
  display: grid;
  gap: 0.26rem;

  strong {
    font-family: "Space Grotesk", "Sora", sans-serif;
    font-size: clamp(1.02rem, 2.8vw, 1.25rem);
    color: #fff3df;
    line-height: 1;
  }

  span {
    font-size: 0.74rem;
    color: var(--dm-muted);
    line-height: 1.35;
  }
`;

export const ActionButton = styled.button`
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, var(--dm-brand), var(--dm-brand-2));
  color: #2b180c;
  font-weight: 800;
  cursor: pointer;
  transition: filter 0.18s ease;

  &:hover {
    filter: brightness(1.06);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Section = styled.section`
  max-width: 980px;
  margin: 0 auto;
  padding: 1rem 0.45rem 6.5rem;
`;

export const ProfileHeaderSection = styled.section`
  background: var(--dm-light-surface);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
`;

export const ProfileCover = styled.div`
  height: 220px;
  background: ${({ $image }) =>
    $image
      ? `url(${$image}) center / cover`
      : "linear-gradient(135deg, #20232c, #353b4f)"};
`;

export const ProfileInfoCard = styled.div`
  position: relative;
  display: flex;
  gap: 0.85rem;
  padding: 0.7rem 0.9rem 0.95rem;
  min-height: 96px;
`;

export const ProfileLogoWrap = styled.div`
  margin-top: -54px;
  width: 106px;
  height: 106px;
  border-radius: 999px;
  padding: 5px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
`;

export const ProfileLogoImage = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: ${({ $image }) =>
    $image
      ? `url(${$image}) center / cover`
      : "linear-gradient(135deg, #c3b084, #837149)"};
`;

export const ProfileIdentity = styled.div`
  display: grid;
  gap: 0.25rem;
  align-content: start;

  h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 600;
    color: #22232b;
  }
`;

export const TableNumberBadge = styled.div`
  width: fit-content;
  margin-top: 0.15rem;
  border-radius: 999px;
  border: 1px solid rgba(90, 39, 87, 0.38);
  background: linear-gradient(
    135deg,
    rgba(90, 39, 87, 0.14),
    rgba(66, 27, 73, 0.2)
  );
  color: #4b1f4f;
  font-size: 0.86rem;
  font-weight: 700;
  padding: 0.28rem 0.72rem;
  letter-spacing: 0.01em;

  strong {
    margin-left: 0.3rem;
    font-size: 1.02rem;
    color: #2f0e35;
  }
`;

export const ProfileActionsRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  button,
  a {
    border: none;
    background: transparent;
    color: #121216;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    text-decoration: none;
  }
`;

export const ProfileRateText = styled.span`
  color: #b08b2e;
  font-size: 0.98rem;
  font-weight: 700;
`;

export const MobileTopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 22;
  height: 74px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  background: #1a1b1f;
  color: #f6f6f6;
  padding: 0 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

export const MobileBrand = styled.div`
  display: grid;
  gap: 0.1rem;

  strong {
    font-size: 1.05rem;
    font-weight: 700;
    color: #ffffff;
  }
`;

export const MobileTableNumberBadge = styled.div`
  width: fit-content;
  margin-top: 0.1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 208, 137, 0.42);
  background: rgba(255, 208, 137, 0.15);
  color: #ffe3b8;
  padding: 0.16rem 0.52rem;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;

  strong {
    margin-left: 0.26rem;
    color: #fff7eb;
    font-size: 0.86rem;
  }
`;

export const MobileActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;

  button {
    border: none;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: #efefef;
    display: grid;
    place-items: center;
  }
`;

export const CategoryCircleRail = styled.div`
  position: sticky;
  top: 74px;
  z-index: 16;
  display: flex;
  gap: 0.95rem;
  overflow-x: auto;
  padding: 0.95rem 0.8rem 0.72rem;
  background: var(--dm-light-bg);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const CategoryCircleButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ $active }) => ($active ? "var(--dm-purple)" : "#8a8a92")};
  min-width: 88px;
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};

  span {
    line-height: 1.25;
    text-align: center;
  }
`;

export const CategoryCircleThumb = styled.div`
  width: 78px;
  height: 78px;
  border-radius: 999px;
  border: 2px solid rgba(90, 39, 87, 0.35);
  background: ${({ $image }) =>
    $image
      ? `url(${$image}) center / cover`
      : "linear-gradient(135deg, #2f3240, #4f5568)"};
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
`;

export const MenuCategoryBlock = styled.section`
  margin-bottom: 1.15rem;
`;

export const MenuCategoryHeader = styled.h2`
  margin: 0 0 0.58rem;
  padding: 0 0.5rem;
  color: var(--dm-purple);
  font-size: 2rem;
  font-weight: 700;
`;

export const MenuList = styled.div`
  display: grid;
  gap: 0.55rem;
`;

export const MenuItemCard = styled.article`
  position: relative;
  background: var(--dm-light-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
  min-height: 158px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.24s ease,
    border-color 0.24s ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-2px);
    border-color: rgba(90, 39, 87, 0.24);
    box-shadow: 0 10px 24px rgba(39, 19, 44, 0.12);
  }
`;

export const MenuItemText = styled.div`
  padding: 0.78rem 0.85rem 0.75rem;
  display: grid;
  align-content: space-between;
  gap: 0.5rem;

  h3 {
    margin: 0;
    font-size: 1.02rem;
    line-height: 1.3;
    color: #1f1f24;
  }

  p {
    margin: 0;
    color: var(--dm-light-muted);
    font-size: 0.88rem;
    line-height: 1.46;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

export const MenuItemBottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.52rem;
`;

export const MenuItemRatingRow = styled.div`
  margin-top: -0.1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
`;

export const MenuItemRatingStars = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
`;

export const MenuItemRatingText = styled.span`
  font-size: 0.73rem;
  font-weight: 700;
  color: #7b7786;
  letter-spacing: 0.01em;
`;

export const MenuItemImageWrap = styled.div`
  position: relative;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
`;

export const MenuItemImage = styled.div`
  width: 100%;
  height: 100%;
  min-height: 158px;
  background: ${({ $image }) =>
    $image
      ? `url(${$image}) center / cover`
      : "linear-gradient(135deg, #b9bcc8, #d9dce5)"};
`;

export const ScrollTopButton = styled.button`
  position: fixed;
  right: 1rem;
  bottom: 5rem;
  border: none;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: var(--dm-purple);
  color: #ffffff;
  box-shadow: 0 12px 26px rgba(60, 17, 66, 0.35);
  display: grid;
  place-items: center;
  z-index: 28;
`;

export const CategoryBar = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.4rem;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(243, 161, 93, 0.3);
    border-radius: 999px;
  }
`;

export const CategoryChip = styled.button`
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(243, 161, 93, 0.78)" : "var(--dm-line)"};
  border-radius: 10px;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(180deg, rgba(243, 161, 93, 0.34), rgba(212, 115, 68, 0.34))"
      : "rgba(34, 38, 43, 0.88)"};
  color: ${({ $active }) => ($active ? "#fff2df" : "var(--dm-muted)")};
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.52rem 0.85rem;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;

  small {
    display: inline-grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    border-radius: 6px;
    font-size: 0.7rem;
    background: ${({ $active }) =>
      $active ? "rgba(57, 43, 34, 0.46)" : "rgba(243, 161, 93, 0.2)"};
    color: ${({ $active }) => ($active ? "#ffefda" : "#ffd7ab")};
  }
`;

export const Grid = styled.div`
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(245px, 1fr));
  gap: 0.8rem;
`;

export const ProductCard = styled.article`
  background: linear-gradient(
    180deg,
    rgba(39, 43, 48, 0.95),
    rgba(30, 33, 38, 0.96)
  );
  border: 1px solid var(--dm-line);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
  animation: riseIn 0.45s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(243, 161, 93, 0.52);
  }
`;

export const ProductImage = styled.div`
  height: 150px;
  background: ${({ $image }) =>
    $image
      ? `linear-gradient(180deg, rgba(20, 16, 13, 0.08), rgba(20, 16, 13, 0.58)), url(${$image}) center / cover`
      : "linear-gradient(130deg, #5a3f31, #3c2e26)"};
  border-bottom: 1px solid var(--dm-line);
`;

export const ProductBody = styled.div`
  padding: 0.85rem;
  display: grid;
  gap: 0.62rem;

  h3 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.3;
  }

  p {
    margin: 0;
    color: var(--dm-muted);
    font-size: 0.86rem;
    line-height: 1.48;
    min-height: 40px;
  }
`;

export const ProductCategory = styled.span`
  display: inline-flex;
  width: fit-content;
  border-radius: 6px;
  padding: 0.24rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffe8c8;
  border: 1px solid rgba(243, 161, 93, 0.34);
  background: rgba(243, 161, 93, 0.14);
`;

export const ProductMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
`;

export const Price = styled.strong`
  color: var(--dm-purple);
  font-size: 1rem;
`;

export const AddButton = styled.button`
  border: 1px solid rgba(90, 39, 87, 0.26);
  border-radius: 8px;
  padding: 0.38rem 0.62rem;
  background: ${({ $added }) =>
    $added
      ? "linear-gradient(135deg, #5a2757, #7d2f79)"
      : "rgba(90, 39, 87, 0.08)"};
  color: ${({ $added }) => ($added ? "#ffffff" : "var(--dm-purple)")};
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
  animation: ${({ $added }) => ($added ? "addToCartPulse 0.34s ease" : "none")};

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.03);
  }
`;

export const FloatingCart = styled.button`
  position: fixed;
  right: 0.8rem;
  bottom: 1rem;
  border: 1px solid rgba(90, 39, 87, 0.22);
  border-radius: 999px;
  padding: 0.74rem 0.84rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.96);
  color: var(--dm-purple);
  box-shadow: 0 14px 28px rgba(58, 21, 65, 0.18);
  font-weight: 700;
  cursor: pointer;
  z-index: 30;
  backdrop-filter: blur(8px);

  &:hover {
    border-color: rgba(90, 39, 87, 0.34);
    box-shadow: 0 16px 30px rgba(58, 21, 65, 0.24);
    transform: translateY(-1px);
  }

  b {
    font-size: 0.82rem;
    padding: 0.14rem 0.42rem;
    border-radius: 999px;
    background: rgba(90, 39, 87, 0.1);
    color: #36153f;
  }

  @media (max-width: 520px) {
    right: 0.75rem;
    left: auto;
    bottom: 0.8rem;
  }
`;

export const ProductDetailOverlay = styled.section`
  position: fixed;
  inset: 0;
  background: #ececef;
  z-index: 120;
  overflow-y: auto;
  overscroll-behavior: contain;
  animation: ${({ $closing }) =>
    $closing ? "detailFadeOut 0.24s ease forwards" : "detailFadeIn 0.24s ease"};
`;

export const ProductDetailImage = styled.div`
  position: relative;
  width: 100%;
  height: min(48vh, 430px);
  background: ${({ $image }) =>
    $image
      ? `url(${$image}) center / cover`
      : "linear-gradient(135deg, #20232c, #353b4f)"};
  animation: ${({ $closing }) =>
    $closing
      ? "detailImageHide 0.24s ease forwards"
      : "detailImageReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1)"};
  transform-origin: center top;
`;

export const ProductDetailBackButton = styled.button`
  position: absolute;
  top: 1.1rem;
  left: 1rem;
  width: 46px;
  height: 46px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.88);
  color: #1f1f24;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background: #ffffff;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
  }
`;

export const ProductDetailBody = styled.div`
  padding: 1.45rem 1.2rem 2rem;
  text-align: center;
  animation: ${({ $closing }) =>
    $closing
      ? "detailBodyDown 0.24s ease forwards"
      : "detailBodyRise 0.3s cubic-bezier(0.22, 1, 0.36, 1)"};
  animation-delay: ${({ $closing }) => ($closing ? "0s" : "0.06s")};
  animation-fill-mode: both;

  h2 {
    margin: 0;
    font-size: 1.22rem;
    letter-spacing: 0.02em;
    color: #1e1f24;
    text-transform: uppercase;
  }

  p {
    margin: 1rem 0 0;
    color: #8a8a92;
    font-size: 0.98rem;
    line-height: 1.42;
  }
`;

export const ProductDetailPrice = styled.div`
  margin-top: 1.4rem;
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--dm-purple);
`;

export const ProductDetailRatingText = styled.p`
  margin: 2.2rem 0 0 !important;
  color: #22242d !important;
  font-size: 1rem !important;
`;

export const ProductDetailStars = styled.div`
  margin-top: 1.2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
`;

export const ProductDetailStarButton = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  color: ${({ $active }) => ($active ? "#d7b35e" : "#d5d5da")};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.16s ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-1px) scale(1.03);
    outline: none;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

export const ProductDetailRatingMeta = styled.p`
  margin: 0.75rem 0 0 !important;
  color: #6f6b79 !important;
  font-size: 0.86rem !important;
`;

export const ProductDetailActions = styled.div`
  margin-top: 2rem;

  button {
    min-width: 220px;
    padding: 0.68rem 0.95rem;
    transition:
      transform 0.2s ease,
      background-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(48, 15, 58, 0.18);
    }
  }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(19, 11, 24, 0.34);
  backdrop-filter: blur(2px);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: opacity 0.22s ease;
  z-index: 70;
`;

export const Drawer = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  width: min(520px, 100vw);
  height: 100vh;
  background: var(--dm-light-bg);
  border-left: 1px solid rgba(15, 23, 42, 0.12);
  box-shadow: -20px 0 40px rgba(15, 23, 42, 0.2);
  transform: ${({ $open }) =>
    $open ? "translateX(0) scale(1)" : "translateX(106%) scale(0.986)"};
  opacity: ${({ $open }) => ($open ? 1 : 0.74)};
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease;
  animation: ${({ $open }) =>
    $open ? "drawerPanelIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)" : "none"};
  will-change: transform, opacity;
  z-index: 90;
  display: flex;
  flex-direction: column;

  @media (max-width: 640px) {
    transition:
      transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.18s ease;
    animation: ${({ $open }) =>
      $open ? "drawerPanelIn 0.24s cubic-bezier(0.22, 1, 0.36, 1)" : "none"};
  }
`;

export const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.95rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #17181e, #1f2027);
  animation: drawerHeaderRise 0.24s cubic-bezier(0.22, 1, 0.36, 1);

  h2 {
    margin: 0;
    font-size: 1.04rem;
    font-family: "Space Grotesk", "Sora", sans-serif;
    color: #ffffff;
  }

  button {
    border: 1px solid rgba(255, 255, 255, 0.2);
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    cursor: pointer;
  }
`;

export const DrawerTotal = styled.strong`
  margin-left: auto;
  margin-right: 0.55rem;
  color: #9aaeff;
  font-size: 0.96rem;
  font-family: "Space Grotesk", "Sora", sans-serif;
`;

export const DrawerTabs = styled.div`
  margin: 0.85rem 0.95rem 0;
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background: rgba(26, 31, 44, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.18rem;
  animation: drawerHeaderRise 0.28s cubic-bezier(0.22, 1, 0.36, 1);
`;

export const DrawerTab = styled.button`
  border: none;
  border-radius: 8px;
  padding: 0.54rem 0.66rem;
  font-weight: 700;
  cursor: pointer;
  color: ${({ $active }) => ($active ? "#ffffff" : "#d2d7e8")};
  background: ${({ $active }) =>
    $active ? "linear-gradient(135deg, #3f64ff, #6f86ff)" : "transparent"};
`;

export const DrawerContent = styled.div`
  padding: 0.9rem 0.95rem 1.2rem;
  overflow: auto;
  flex: 1;
  color: var(--dm-light-text);
  animation: ${({ $open }) =>
    $open ? "drawerContentRise 0.28s cubic-bezier(0.22, 1, 0.36, 1)" : "none"};

  @media (max-width: 640px) {
    animation: ${({ $open }) =>
      $open ? "drawerContentRise 0.2s cubic-bezier(0.22, 1, 0.36, 1)" : "none"};
  }

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(90, 39, 87, 0.3);
    border-radius: 999px;
  }
`;

export const CartLine = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 0.72rem;
  background: var(--dm-light-surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  animation: ${({ $open }) => ($open ? "cartLineIn 0.26s ease both" : "none")};
  animation-delay: ${({ $index = 0 }) => `${Math.min($index, 7) * 0.045}s`};

  @media (max-width: 640px) {
    animation: ${({ $open }) => ($open ? "cartLineIn 0.2s ease both" : "none")};
    animation-delay: ${({ $index = 0 }) => `${Math.min($index, 7) * 0.024}s`};
  }

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(90, 39, 87, 0.24);
    box-shadow: 0 8px 18px rgba(39, 19, 44, 0.1);
  }

  strong {
    color: #212229;
  }

  & + & {
    margin-top: 0.62rem;
  }
`;

export const QtyWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;

  button {
    border: 1px solid rgba(90, 39, 87, 0.22);
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: rgba(90, 39, 87, 0.08);
    color: var(--dm-purple);
    cursor: pointer;

    &:hover {
      background: rgba(90, 39, 87, 0.16);
    }
  }

  strong {
    min-width: 14px;
    text-align: center;
    color: #2b1630;
  }
`;

export const Summary = styled.div`
  margin-top: 0.84rem;
  border: 1px dashed rgba(63, 100, 255, 0.4);
  background: rgba(63, 100, 255, 0.08);
  border-radius: 10px;
  padding: 0.78rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.92rem;
  color: #4b5574;

  strong {
    color: #2d4bc8;
    font-size: 1.12rem;
    font-family: "Space Grotesk", "Sora", sans-serif;
  }
`;

export const InputGrid = styled.div`
  margin-top: 0.62rem;
  display: grid;
  gap: 0.62rem;

  input,
  textarea,
  select {
    width: 100%;
    border-radius: 8px;
    border: none;
    border-bottom: 2px solid rgba(63, 100, 255, 0.5);
    background: #ffffff;
    color: var(--dm-light-text);
    padding: 0.65rem 0.2rem 0.5rem;
    font-size: 0.94rem;
    outline: none;

    &::placeholder {
      color: #9695a0;
    }

    &:focus {
      border-bottom-color: rgba(63, 100, 255, 0.9);
      box-shadow: none;
    }
  }

  textarea {
    min-height: 90px;
    resize: vertical;
  }
`;

export const Label = styled.label`
  display: grid;
  gap: 0.32rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #6b7184;
`;

export const EmptyHint = styled.div`
  border: 1px dashed rgba(90, 39, 87, 0.28);
  border-radius: 10px;
  padding: 0.95rem;
  background: rgba(255, 255, 255, 0.82);
  color: #7b7786;
  text-align: center;
`;

export const CheckoutButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 0;
  margin-top: 0.85rem;
  padding: 0.82rem 0.95rem;
  background: linear-gradient(135deg, #10b7a5, #17cab6);
  color: #ffffff;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(16, 183, 165, 0.24);
  transition:
    transform 0.2s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
    filter: brightness(1.06);
    box-shadow: 0 14px 28px rgba(16, 183, 165, 0.28);
  }
`;

export const InlineInfo = styled.div`
  margin-top: 0.74rem;
  border-radius: 10px;
  border: 1px solid rgba(63, 100, 255, 0.2);
  background: linear-gradient(
    135deg,
    rgba(63, 100, 255, 0.08),
    rgba(111, 134, 255, 0.09)
  );
  color: #3f4d79;
  padding: 0.62rem 0.76rem;
  font-size: 0.8rem;
  line-height: 1.45;
`;

export const SavedCardsSection = styled.section`
  margin-top: 0.2rem;
  display: grid;
  gap: 0.52rem;
`;

export const SavedCardsHeading = styled.strong`
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #55618a;
`;

export const SavedCardRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.58rem;
  align-items: stretch;

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

export const SavedCardMainButton = styled.button`
  text-align: left;
  border-radius: 16px;
  padding: 0.9rem;
  border: ${({ $selected }) =>
    $selected
      ? "2px solid rgba(63, 100, 255, 0.8)"
      : "1px solid rgba(63, 100, 255, 0.2)"};
  background: ${({ $selected }) =>
    $selected
      ? "linear-gradient(130deg, rgba(233, 239, 255, 0.98), rgba(221, 231, 255, 0.95))"
      : "linear-gradient(140deg, rgba(255, 255, 255, 0.98), rgba(245, 248, 255, 0.96))"};
  color: #221c29;
  box-shadow: ${({ $selected }) =>
    $selected
      ? "0 16px 30px rgba(63, 100, 255, 0.2)"
      : "0 12px 24px rgba(31, 20, 38, 0.08)"};
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(63, 100, 255, 0.52);
  }
`;

export const SavedCardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 0.55rem;

  strong {
    letter-spacing: 0.05em;
    font-size: 0.86rem;
  }
`;

export const SavedCardBrandIdentity = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
`;

export const SavedCardState = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.54rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid
    ${({ $tone }) =>
      $tone === "defaultCard"
        ? "rgba(34, 197, 94, 0.4)"
        : $tone === "active"
          ? "rgba(63, 100, 255, 0.42)"
          : "rgba(63, 100, 255, 0.18)"};
  background: ${({ $tone }) =>
    $tone === "defaultCard"
      ? "rgba(34, 197, 94, 0.15)"
      : $tone === "active"
        ? "rgba(63, 100, 255, 0.14)"
        : "rgba(63, 100, 255, 0.08)"};
  color: ${({ $tone }) =>
    $tone === "defaultCard"
      ? "#166534"
      : $tone === "active"
        ? "#2f4bc5"
        : "#5f6990"};
`;

export const SavedCardNumber = styled.div`
  font-size: 1.06rem;
  font-weight: 800;
`;

export const SavedCardHolder = styled.div`
  margin-top: 0.42rem;
  font-size: 0.72rem;
  opacity: 0.84;
  letter-spacing: 0.03em;
  text-transform: uppercase;
`;

export const SavedCardActions = styled.div`
  display: grid;
  gap: 0.42rem;
  align-content: start;
  min-width: 128px;
`;

export const CardMiniAction = styled.button`
  border-radius: 10px;
  border: 1px solid
    ${({ $variant }) =>
      $variant === "success"
        ? "rgba(34, 197, 94, 0.35)"
        : $variant === "danger"
          ? "rgba(239, 68, 68, 0.34)"
          : "rgba(148, 163, 184, 0.36)"};
  background: ${({ $variant }) =>
    $variant === "success"
      ? "rgba(34, 197, 94, 0.11)"
      : $variant === "danger"
        ? "rgba(239, 68, 68, 0.1)"
        : "rgba(255, 255, 255, 0.8)"};
  color: ${({ $variant }) =>
    $variant === "success"
      ? "#166534"
      : $variant === "danger"
        ? "#991b1b"
        : "#4b5563"};
  padding: 0.62rem 0.72rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(0.99);
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.09);
  }
`;

export const CardDraftRow = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 0.75rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const CardLastRow = styled.div`
  display: grid;
  grid-template-columns: 0.9fr 0.5fr;
  gap: 0.75rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const CardVisualPreview = styled.div`
  margin-top: 0.15rem;
  margin-bottom: 0.2rem;
  border-radius: 16px;
  padding: 1rem;
  min-height: 156px;
  background:
    linear-gradient(140deg, rgba(64, 93, 255, 0.98), rgba(76, 106, 255, 0.95)),
    linear-gradient(45deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  position: relative;
  overflow: hidden;
  box-shadow: 0 14px 26px rgba(31, 52, 150, 0.3);

  &::before {
    content: "";
    position: absolute;
    top: -24px;
    right: -16px;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.11);
  }

  &::after {
    content: "";
    position: absolute;
    left: 36%;
    top: 18%;
    width: 90px;
    height: 90px;
    transform: rotate(45deg);
    background: rgba(10, 15, 36, 0.13);
    border-radius: 12px;
  }
`;

export const CardVisualTop = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const CardChip = styled.span`
  width: 28px;
  height: 22px;
  border-radius: 5px;
  background: linear-gradient(135deg, #f8df8c, #f2ba53);
  box-shadow: inset 0 0 0 1px rgba(116, 86, 27, 0.28);
`;

export const CardBrandMark = styled.span`
  position: relative;
  width: 34px;
  height: 20px;
  display: inline-block;

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 0;
    width: 20px;
    height: 20px;
    border-radius: 999px;
  }

  &::before {
    left: 0;
    background: #ff4d4f;
  }

  &::after {
    right: 0;
    background: #ffb800;
    opacity: 0.86;
  }
`;

export const CardBrandLogo = styled.img`
  width: 84px;
  height: 30px;
  object-fit: contain;
  background: transparent;
  padding: 0;
  border: none;
  filter: none;
`;

export const CardVisualNumber = styled.div`
  position: relative;
  z-index: 1;
  margin-top: 2rem;
  color: #ffffff;
  letter-spacing: 0.17em;
  font-size: 0.92rem;
  font-weight: 700;
`;

export const CardVisualFooter = styled.div`
  position: relative;
  z-index: 1;
  margin-top: 1.3rem;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 0.7rem;
  color: #ffffff;

  .left,
  .right {
    display: grid;
    gap: 0.12rem;
  }

  small {
    font-size: 0.56rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.82;
  }

  strong {
    font-size: 0.78rem;
    letter-spacing: 0.09em;
  }
`;

export const BrandOptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
`;

export const BrandOptionButton = styled.button`
  min-height: 54px;
  padding: 0.35rem 0.28rem;
  border-radius: 12px;
  border: ${({ $active }) =>
    $active
      ? "2px solid rgba(63, 100, 255, 0.82)"
      : "1px solid rgba(63, 100, 255, 0.18)"};
  background: ${({ $active, $accent }) =>
    $active
      ? `linear-gradient(140deg, ${$accent}, rgba(255, 255, 255, 0.92))`
      : "rgba(255, 255, 255, 0.84)"};
  color: #2c2033;
  cursor: pointer;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.14rem;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(63, 100, 255, 0.54);
    box-shadow: 0 8px 18px rgba(43, 69, 173, 0.18);
  }

  span {
    font-size: 0.64rem;
    line-height: 1.08;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  @media (max-width: 560px) {
    min-height: 52px;
    padding: 0.28rem 0.24rem;
    gap: 0.09rem;

    span {
      font-size: 0.6rem;
      line-height: 1.04;
      letter-spacing: 0.02em;
    }
  }
`;

export const CardActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.52rem;
`;

export const CardPrimaryAction = styled.button`
  padding: 0.78rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(16, 183, 165, 0.4);
  background: linear-gradient(
    135deg,
    rgba(16, 183, 165, 0.18),
    rgba(23, 202, 182, 0.14)
  );
  color: #0f766e;
  cursor: pointer;
  font-weight: 800;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(16, 183, 165, 0.26);
  }
`;

export const CardGhostAction = styled.button`
  padding: 0.78rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.42);
  background: rgba(255, 255, 255, 0.7);
  color: #4b5563;
  cursor: pointer;
  font-weight: 700;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
  }
`;

export const OrderFlowCard = styled.div`
  margin-top: 0.7rem;
  border: 1px solid rgba(90, 39, 87, 0.18);
  border-radius: 12px;
  background: var(--dm-light-surface);
  padding: 0.78rem;
  box-shadow: 0 10px 22px rgba(39, 19, 44, 0.08);
`;

export const OrderMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.52rem;
  flex-wrap: wrap;
`;

export const OrderMetaPill = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(90, 39, 87, 0.24);
  background: rgba(90, 39, 87, 0.08);
  color: #4a2451;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.25rem 0.62rem;
`;

export const OrderFlowList = styled.div`
  margin-top: 0.82rem;
  display: grid;
  gap: 0.58rem;
`;

export const OrderFlowItem = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 0.58rem;
  align-items: start;
  opacity: ${({ $state }) => ($state === "pending" ? 0.5 : 1)};
  animation: flowStepIn 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: ${({ $index = 0 }) =>
    `${Math.min(Number($index || 0), 8) * 0.05}s`};

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    left: 10px;
    top: 18px;
    bottom: -11px;
    width: 2px;
    border-radius: 2px;
    background: ${({ $state }) =>
      $state === "done" || $state === "active"
        ? "linear-gradient(180deg, rgba(90, 39, 87, 0.2), rgba(125, 47, 121, 0.76), rgba(90, 39, 87, 0.2))"
        : "rgba(90, 39, 87, 0.16)"};
    background-size: 100% 220%;
    animation: ${({ $state }) =>
      $state === "active" ? "flowTrailSweep 0.9s linear infinite" : "none"};
  }
`;

export const OrderFlowDot = styled.span`
  margin-top: 2px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid
    ${({ $state }) =>
      $state === "done"
        ? "#4f2150"
        : $state === "active"
          ? "#7d2f79"
          : "rgba(90, 39, 87, 0.24)"};
  background: ${({ $state }) =>
    $state === "done"
      ? "#4f2150"
      : $state === "active"
        ? "rgba(125, 47, 121, 0.22)"
        : "transparent"};
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease,
    border-color 0.24s ease,
    background 0.24s ease;
  animation: ${({ $state }) =>
    $state === "active" ? "flowDotPulse 1.2s ease-out infinite" : "none"};
`;

export const OrderFlowContent = styled.div`
  strong {
    display: block;
    font-size: 0.9rem;
    color: #26122b;
  }

  span {
    display: block;
    margin-top: 0.14rem;
    font-size: 0.78rem;
    color: #716b7a;
    line-height: 1.42;
  }
`;

export const OrderFlowHint = styled.p`
  margin: 0.74rem 0 0;
  color: #6a6072;
  font-size: 0.78rem;
  line-height: 1.45;
`;

export const StepDots = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;

  span {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(243, 161, 93, 0.34);

    &.on {
      background: linear-gradient(130deg, var(--dm-brand), var(--dm-brand-2));
    }
  }
`;

export const SectionHead = styled.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;

  h2 {
    margin: 0;
    font-size: clamp(1.03rem, 3.3vw, 1.24rem);
    font-family: "Space Grotesk", "Sora", sans-serif;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    color: var(--dm-muted);
    font-size: 0.84rem;
  }
`;

export const Tiny = styled.span`
  color: var(--dm-muted);
  font-size: 0.76rem;
`;
