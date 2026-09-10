import styled, { keyframes } from 'styled-components';

const arrive = keyframes`from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); }`;
export const Page = styled.div`
  --ink: #233c30;
  --muted: #6b7468;
  --line: #e0e5d8;
  --forest: #233f32;
  --lime: #e1ecb5;
  --canvas: #faf9f5;
  min-height: 100vh;
  background: var(--canvas);
  color: var(--ink);
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  line-height: 1.5;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  a {
    text-decoration: none;
  }
  button,
  input,
  select,
  textarea {
    font: inherit;
  }
  button,
  a {
    -webkit-tap-highlight-color: transparent;
  }
  a:focus-visible,
  button:focus-visible,
  summary:focus-visible,
  [role='tabpanel']:focus-visible {
    outline: 3px solid #75964e;
    outline-offset: 5px;
  }
  main > section {
    scroll-margin-top: 90px;
  }
  .eyebrow {
    color: #697a57;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
  }
  .skip-link {
    position: fixed;
    left: 16px;
    top: -100px;
    z-index: 100;
    background: var(--forest);
    color: white;
    padding: 12px 18px;
    border-radius: 8px;
  }
  .skip-link:focus {
    top: 12px;
  }
  .plan-help {
    text-align: center;
    margin: 30px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .plan-help a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 5px;
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
`;
export const Container = styled.div`
  width: min(1240px, calc(100% - 96px));
  margin-inline: auto;
  @media (max-width: 960px) {
    width: calc(100% - 48px);
  }
  @media (max-width: 500px) {
    width: calc(100% - 36px);
  }
`;
export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 60;
  background: #faf9f5f2;
  backdrop-filter: blur(18px);
  border-bottom: 1px solid #e6e8dd;
`;
export const HeaderInner = styled(Container)`
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  @media (max-width: 1100px) {
    gap: 18px;
  }
  @media (max-width: 960px) {
    min-height: 74px;
  }
`;
export const Brand = styled.a<{ $light?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: ${({ $light }) => ($light ? '#f4f5e8' : 'var(--ink)')};
  font-family: 'Manrope', sans-serif;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.8px;
  white-space: nowrap;
  img {
    width: 42px;
    height: 38px;
    object-fit: contain;
    mix-blend-mode: ${({ $light }) => ($light ? 'screen' : 'multiply')};
    filter: ${({ $light }) => ($light ? 'invert(1)' : 'none')};
  }
  .brand-dot {
    color: ${({ $light }) => ($light ? '#d7e4a7' : '#8b9e61')};
  }
  @media (max-width: 1100px) {
    font-size: 19px;
    img {
      width: 36px;
      height: 34px;
    }
  }
`;
export const Nav = styled.nav<{ $open: boolean }>`
  display: flex;
  gap: clamp(15px, 2vw, 28px);
  align-items: center;
  a {
    font-size: 12px;
    color: #5a6555;
    font-weight: 500;
    white-space: nowrap;
    padding: 12px 0;
    transition: color 150ms;
  }
  a:hover {
    color: #102e19;
  }
  @media (max-width: 960px) {
    position: absolute;
    top: 73px;
    left: 18px;
    right: 18px;
    max-height: calc(100dvh - 90px);
    overflow: auto;
    display: ${({ $open }) => ($open ? 'grid' : 'none')};
    gap: 2px;
    padding: 12px;
    background: #fffefb;
    border: 1px solid var(--line);
    border-radius: 0 0 16px 16px;
    box-shadow: 0 18px 30px #26352816;
    a {
      padding: 13px 15px;
      font-size: 15px;
      border-radius: 8px;
    }
    a:hover {
      background: #f1f3e9;
    }
  }
`;
export const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  @media (max-width: 960px) {
    > a {
      display: none;
    }
  }
`;
export const MenuButton = styled.button`
  display: none;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--ink);
  background: transparent;
  cursor: pointer;
  @media (max-width: 960px) {
    display: grid;
  }
`;
export const Button = styled.a<{ $small?: boolean; $secondary?: boolean; $lime?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: ${({ $small }) => ($small ? '43px' : '52px')};
  padding: 12px ${({ $small }) => ($small ? '20px' : '25px')};
  border-radius: 999px;
  border: 1px solid ${({ $secondary }) => ($secondary ? '#cdd7c4' : 'transparent')};
  color: ${({ $lime, $secondary }) => ($lime || $secondary ? '#263e2f' : '#fffef7')};
  background: ${({ $secondary, $lime }) => ($secondary ? 'transparent' : $lime ? 'var(--lime)' : 'var(--forest)')};
  font-size: ${({ $small }) => ($small ? '12px' : '13px')};
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  transition:
    background 160ms,
    transform 160ms,
    box-shadow 160ms;
  cursor: pointer;
  svg {
    flex-shrink: 0;
  }
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 17px #193d2420;
    background: ${({ $secondary, $lime }) => ($secondary ? '#eef2e6' : $lime ? '#d4e59d' : '#33543e')};
  }
`;
export const TextLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  padding: 12px 0;
  &:hover {
    text-decoration: underline;
    text-underline-offset: 5px;
  }
  .play-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid #c7d0bd;
    border-radius: 50%;
  }
`;
export const Hero = styled.section`
  padding: 57px 0 0;
  background: #faf9f5;
  @media (max-width: 960px) {
    padding-top: 36px;
  }
`;
export const HeroGrid = styled(Container)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(35px, 6vw, 85px);
  padding-bottom: 68px;
  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);
    gap: 28px;
  }
  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 38px;
    padding-bottom: 46px;
  }
`;
export const HeroCopy = styled.div`
  min-width: 0;
  animation: ${arrive} 650ms ease both;
  h1 {
    font-family: 'Manrope', sans-serif;
    font-size: clamp(43px, 4.6vw, 67px);
    font-weight: 500;
    line-height: 1.12;
    letter-spacing: -0.055em;
    margin: 23px 0 22px;
  }
  h1 em {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400;
    color: #79885b;
  }
  > p {
    font-size: 15px;
    line-height: 1.85;
    color: var(--muted);
    max-width: 465px;
    margin: 0;
  }
  @media (max-width: 1100px) {
    .desktop-break {
      display: none;
    }
  }
  @media (max-width: 960px) {
    h1 {
      font-size: 44px;
    }
  }
  @media (max-width: 760px) {
    max-width: 570px;
    h1 {
      font-size: clamp(40px, 8.5vw, 59px);
    }
    > p {
      max-width: 500px;
    }
  }
  @media (max-width: 380px) {
    h1 {
      font-size: 37px;
    }
    > p {
      font-size: 14px;
    }
  }
`;
export const HeroBadge = styled.div`
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.13em;
  color: #667950;
  > span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #899960;
    box-shadow: 0 0 0 4px #eef1e3;
    flex-shrink: 0;
  }
  @media (max-width: 380px) {
    font-size: 8px;
    letter-spacing: 0.09em;
  }
`;
export const HeroActions = styled.div`
  margin-top: 30px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
  @media (max-width: 1100px) {
    gap: 8px 18px;
  }
  @media (max-width: 380px) {
    > a:first-child {
      width: 100%;
    }
  }
`;
export const HeroProof = styled.div`
  margin-top: 24px;
  display: flex;
  gap: 10px 18px;
  flex-wrap: wrap;
  color: #738065;
  font-size: 10px;
  span {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
  svg {
    width: 14px;
  }
`;
export const HeroFootnote = styled.p`
  && {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 54px;
    font-size: 11px;
    color: #7c8375;
  }
  .small-line {
    width: 30px;
    height: 1px;
    background: #b8c0ad;
  }
  @media (max-width: 760px) {
    && {
      margin-top: 27px;
    }
  }
`;
export const HeroVisual = styled.div`
  position: relative;
  min-width: 0;
  margin-right: 6px;
  animation: ${arrive} 800ms 90ms ease both;
  .photo-wrap {
    position: relative;
    height: 546px;
    border-radius: 22px 22px 90px 22px;
    overflow: hidden;
    background: #e1decd;
  }
  .photo-wrap > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 44%;
    display: block;
  }
  .photo-shade {
    position: absolute;
    inset: 55% 0 0;
    background: linear-gradient(transparent, #14291b80);
  }
  .photo-caption {
    position: absolute;
    left: 30px;
    bottom: 33px;
    margin: 0;
    color: #fffef3;
    font-size: 17px;
    line-height: 1.6;
  }
  .photo-caption em {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 23px;
    font-weight: 400;
  }
  .photo-sticker {
    position: absolute;
    right: -17px;
    top: 25px;
    display: flex;
    align-items: center;
    gap: 9px;
    transform: rotate(6deg);
    background: #e3ebba;
    color: #4b6239;
    padding: 12px 17px;
    border-radius: 11px;
    box-shadow: 0 5px 15px #203b161a;
    font-size: 10px;
    line-height: 1.5;
  }
  .photo-sticker b {
    font-size: 13px;
  }
  .order-notice {
    position: absolute;
    left: -35px;
    bottom: 141px;
    width: 319px;
    padding: 16px 15px 24px;
    background: #fffefa;
    border: 1px solid #eef0e7;
    box-shadow: 0 12px 35px #14291b28;
    border-radius: 15px;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .notice-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: #f0f3e6;
    color: #627545;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .order-notice b {
    display: block;
    font-size: 12px;
    font-weight: 700;
  }
  .order-notice small {
    display: block;
    font-size: 9px;
    color: #7e8676;
    margin-top: 3px;
  }
  .notice-check {
    margin-left: auto;
    color: #4e7551;
  }
  .sample-label {
    position: absolute;
    right: 15px;
    bottom: 7px;
    color: #8f9789;
    font-size: 7px;
    letter-spacing: 0.02em;
  }
  @media (max-width: 1100px) {
    .photo-wrap {
      height: 520px;
    }
    .order-notice {
      left: -18px;
      width: 280px;
      gap: 9px;
    }
    .order-notice b {
      font-size: 11px;
    }
    .photo-caption {
      left: 22px;
    }
    .photo-caption em {
      font-size: 20px;
    }
  }
  @media (max-width: 960px) {
    .photo-wrap {
      height: 470px;
    }
    .photo-sticker {
      right: -12px;
    }
    .photo-caption {
      font-size: 14px;
    }
  }
  @media (max-width: 760px) {
    max-width: 540px;
    width: calc(100% - 8px);
    margin: 0 auto;
    .photo-wrap {
      height: 460px;
      object-position: center;
    }
    .order-notice {
      left: -8px;
      bottom: 116px;
    }
    .photo-sticker {
      right: -7px;
    }
  }
  @media (max-width: 380px) {
    .photo-wrap {
      height: 390px;
    }
    .order-notice {
      width: 260px;
      padding-inline: 12px;
    }
    .photo-caption {
      font-size: 13px;
      left: 20px;
      bottom: 25px;
    }
    .photo-caption em {
      font-size: 18px;
    }
  }
`;
export const AudienceStrip = styled(Container)`
  border-top: 1px solid #e1e5d8;
  min-height: 106px;
  padding-block: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  > span {
    color: #8a927f;
    font-size: 9px;
    letter-spacing: 0.13em;
    font-weight: 600;
    max-width: 125px;
    line-height: 1.8;
  }
  > div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: clamp(24px, 4vw, 60px);
  }
  > div > span {
    display: flex;
    gap: 10px;
    align-items: center;
    color: #738168;
    font-family: 'Manrope', sans-serif;
    font-weight: 600;
    font-size: 15px;
  }
  svg {
    width: 20px;
    height: 20px;
    stroke-width: 1.4;
  }
  @media (max-width: 960px) {
    flex-direction: column;
    > span {
      max-width: none;
    }
    > div {
      justify-content: center;
      gap: 20px 30px;
    }
    > div > span {
      font-size: 13px;
    }
  }
  @media (max-width: 500px) {
    > div {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px 22px;
    }
    > div > span {
      font-size: 11px;
    }
  }
`;
export const Section = styled.section<{ $soft?: boolean }>`
  padding: 95px 0;
  background: ${({ $soft }) => ($soft ? '#f1f3e9' : '#fffefa')};
  h2 {
    font-family: 'Manrope', sans-serif;
    font-size: clamp(32px, 3.6vw, 46px);
    line-height: 1.17;
    letter-spacing: -0.045em;
    font-weight: 500;
    margin: 16px 0;
  }
  h2 em {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400;
  }
  @media (max-width: 760px) {
    padding: 62px 0;
  }
`;
export const Eyebrow = styled.span`
  display: inline-block;
  color: #798764;
  font-weight: 700;
  font-size: 9px;
  line-height: 1.6;
  letter-spacing: 0.16em;
`;
export const SectionHeading = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 45px;
  margin-bottom: 40px;
  h2 {
    margin-bottom: 0;
  }
  > p {
    color: var(--muted);
    max-width: 375px;
    line-height: 1.8;
    margin: 0 0 4px;
    font-size: 14px;
  }
  @media (max-width: 760px) {
    display: block;
    > p {
      margin-top: 20px;
      max-width: 500px;
    }
  }
`;
export const Features = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`;
export const Feature = styled.article`
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 29px;
  border: 1px solid #e2e5d9;
  border-radius: 19px;
  background: #f7f8f0;
  &.kitchen-card {
    background: #f7f1e8;
    border-color: #eee6d9;
  }
  &.management-card {
    background: #2d4738;
    color: #fafbed;
    border-color: #2d4738;
  }
  .feature-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 26px;
  }
  .feature-icon {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: #e6ebd6;
    color: #687c4c;
  }
  &.kitchen-card .feature-icon {
    background: #eee1cd;
    color: #957246;
  }
  &.management-card .feature-icon {
    background: #435c43;
    color: #e2edb8;
  }
  .feature-number {
    color: #a4ac94;
    font-size: 11px;
    font-family: 'Manrope', sans-serif;
  }
  h3 {
    font-family: 'Manrope', sans-serif;
    font-size: 23px;
    letter-spacing: -0.035em;
    font-weight: 500;
    line-height: 1.35;
    margin: 0 0 15px;
    max-width: 245px;
  }
  > p {
    color: #74806b;
    font-size: 12px;
    line-height: 1.85;
    margin: 0 0 27px;
  }
  &.management-card > p {
    color: #c3cebc;
  }
  .feature-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: auto;
    padding-bottom: 25px;
  }
  .feature-tags > span {
    font-size: 9px;
    border: 1px solid #dce2d0;
    border-radius: 6px;
    padding: 5px 8px;
    color: #677457;
  }
  &.kitchen-card .feature-tags > span {
    border-color: #e4d8c7;
    color: #927044;
  }
  &.management-card .feature-tags > span {
    border-color: #556749;
    color: #d1dfc0;
  }
  .feature-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-top: 1px solid #dfe5d4;
    padding-top: 19px;
  }
  .feature-bottom small {
    font-size: 10px;
    line-height: 1.6;
  }
  &.management-card .feature-bottom {
    border-color: #526247;
  }
  @media (max-width: 1100px) {
    padding: 23px;
    h3 {
      font-size: 21px;
    }
  }
  @media (max-width: 760px) {
    h3 {
      max-width: none;
      font-size: 25px;
    }
    > p {
      max-width: 500px;
      font-size: 14px;
    }
    .feature-tags > span {
      font-size: 11px;
    }
    .feature-bottom small {
      font-size: 12px;
    }
  }
`;
export const DemoSection = styled.section`
  background: #fffefa;
  padding: 82px 0 0;
  @media (max-width: 760px) {
    padding-top: 54px;
  }
`;
export const DemoBand = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.88fr);
  gap: 80px;
  align-items: center;
  background: #203d2f;
  padding: 58px 62px;
  border-radius: 24px;
  color: #f9f9ed;
  ${Eyebrow} {
    color: #bdcb91;
  }
  h2 {
    font-family: 'Manrope', sans-serif;
    font-weight: 500;
    line-height: 1.1;
    font-size: clamp(37px, 4vw, 52px);
    letter-spacing: -0.045em;
    margin: 20px 0;
  }
  h2 em {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400;
    color: #d6e5a9;
  }
  > div > p {
    font-size: 13px;
    line-height: 1.9;
    color: #bccbb8;
    max-width: 440px;
    margin: 0 0 26px;
  }
  .demo-note {
    display: block;
    color: #b3c2a8;
    font-size: 9px;
    margin-top: 16px;
    line-height: 1.6;
  }
  .journey-label {
    display: block;
    font-size: 8px;
    letter-spacing: 0.13em;
    color: #a9bd9c;
    margin-bottom: 22px;
  }
  .journey-step {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 18px;
    border: 1px solid #496149;
    background: #2e4a38;
    border-radius: 13px;
  }
  .journey-step > span {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 1px solid #66805a;
    border-radius: 11px;
    color: #dae8b5;
    flex-shrink: 0;
  }
  .journey-step > svg {
    margin-left: auto;
    color: #bed29b;
    flex-shrink: 0;
  }
  .journey-step small {
    display: block;
    font-size: 8px;
    letter-spacing: 0.09em;
    color: #a9bd9c;
    margin-bottom: 4px;
  }
  .journey-step b {
    display: block;
    font-size: 12px;
    font-weight: 500;
  }
  .journey-line {
    height: 19px;
    margin-left: 40px;
    border-left: 1px dashed #6b8058;
  }
  .demo-journey > p {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 20px 0 0;
    font-size: 9px;
    color: #aebf9b;
  }
  @media (max-width: 1050px) {
    gap: 35px;
    padding: 44px;
  }
  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    padding: 34px 24px;
    gap: 38px;
    .journey-step {
      padding: 13px;
    }
    .journey-step b {
      font-size: 11px;
    }
    .journey-step > svg {
      width: 15px;
    }
    .demo-note {
      font-size: 10px;
    }
  }
`;
export const CenterHeading = styled.div`
  text-align: center;
  margin-bottom: 45px;
  h2 {
    margin-top: 18px;
  }
  p {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.8;
    margin-bottom: 0;
  }
`;
export const PlanGrid = styled.div`
  max-width: 850px;
  margin-inline: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 23px;
  @media (max-width: 650px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
export const Plan = styled.article<{ $featured: boolean }>`
  padding: 33px;
  border: 1px solid ${({ $featured }) => ($featured ? '#31503b' : '#dce2d2')};
  border-radius: 20px;
  background: ${({ $featured }) => ($featured ? '#294332' : '#fffefa')};
  color: ${({ $featured }) => ($featured ? '#fffef1' : 'var(--ink)')};
  display: flex;
  flex-direction: column;
  .plan-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
    margin-bottom: 25px;
  }
  .plan-icon {
    width: 48px;
    height: 48px;
    border-radius: 13px;
    border: 1px solid ${({ $featured }) => ($featured ? '#536745' : '#e1e5d6')};
    color: ${({ $featured }) => ($featured ? '#e1ecb5' : '#6e8055')};
    display: grid;
    place-items: center;
  }
  .plan-badge {
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.08em;
    border: 1px solid #65794f;
    border-radius: 999px;
    color: #d7e6af;
    padding: 6px 10px;
  }
  h3 {
    font-size: 23px;
    font-weight: 600;
    margin: 0 0 9px;
    letter-spacing: -0.035em;
  }
  .description {
    max-width: 300px;
    min-height: 43px;
    font-size: 13px;
    color: ${({ $featured }) => ($featured ? '#bfcdaf' : 'var(--muted)')};
    line-height: 1.7;
    margin: 0 0 21px;
  }
  .price {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-family: 'Manrope', sans-serif;
  }
  .price > span {
    font-size: 15px;
  }
  .price strong {
    font-size: 45px;
    font-weight: 500;
    letter-spacing: -0.055em;
  }
  .price small {
    font-size: 12px;
    color: ${({ $featured }) => ($featured ? '#bfcdaf' : 'var(--muted)')};
  }
  .trial {
    display: flex;
    align-items: center;
    gap: 5px;
    color: ${({ $featured }) => ($featured ? '#d5e3b3' : '#7d8e64')};
    font-size: 10px;
    margin: 6px 0 25px;
  }
  > a {
    width: 100%;
  }
  ul {
    list-style: none;
    margin: 25px 0 0;
    padding: 22px 0 0;
    border-top: 1px solid ${({ $featured }) => ($featured ? '#4d6241' : '#e6eadf')};
    display: grid;
    gap: 14px;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 12px;
    color: ${({ $featured }) => ($featured ? '#d3dfc6' : '#6b7960')};
  }
  li svg {
    flex-shrink: 0;
    color: ${({ $featured }) => ($featured ? '#c8dd9a' : '#7d945e')};
  }
  @media (max-width: 380px) {
    padding: 26px;
    .price strong {
      font-size: 40px;
    }
  }
`;
export const FaqLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 80px;
  > div:first-child > p {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.8;
    max-width: 310px;
    margin: 0 0 15px;
  }
  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 25px;
  }
`;
export const Faq = styled.div`
  details {
    border-bottom: 1px solid #d9dfcf;
  }
  details:first-child {
    border-top: 1px solid #d9dfcf;
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    font-weight: 500;
    font-size: 14px;
    list-style: none;
    cursor: pointer;
    min-height: 75px;
    padding: 20px 0;
    line-height: 1.6;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary > span {
    font-size: 24px;
    font-weight: 300;
    color: #7c8e67;
    flex-shrink: 0;
    transition: transform 180ms;
  }
  details[open] summary > span {
    transform: rotate(45deg);
  }
  p {
    margin: 0;
    padding: 0 34px 22px 0;
    color: #6d7963;
    font-size: 13px;
    line-height: 1.85;
  }
`;
export { ContactLayout, Footer } from './landing/LandingFooter.styles';
