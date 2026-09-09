import styled, { keyframes } from 'styled-components';

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
`;

export const Page = styled.main`
  --ink: #0f172a;
  --muted: #5f6b7a;
  --line: #e5eaf0;
  --surface: #ffffff;
  --surface-soft: #f6f8fb;
  --blue: #2563eb;
  --blue-dark: #1d4ed8;
  --blue-soft: #eff6ff;
  --cyan: #0ea5e9;
  --green: #16a34a;
  min-height: 100vh;
  color: var(--ink);
  background:
    radial-gradient(circle at 8% 2%, rgba(14, 165, 233, 0.12), transparent 26rem),
    radial-gradient(circle at 92% 8%, rgba(37, 99, 235, 0.1), transparent 28rem),
    #fff;
  font-family: 'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
`;

export const Container = styled.div`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;

  @media (max-width: 640px) {
    width: min(calc(100% - 28px), 1180px);
  }
`;

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(226, 232, 240, 0.82);
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(18px);
`;

export const HeaderInner = styled(Container)`
  min-height: 74px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
`;

export const Brand = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 11px;
  font-family: 'Sora', sans-serif;
  font-size: 1.08rem;
  font-weight: 800;
  letter-spacing: -0.03em;

  span:first-child {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: #fff;
    background: linear-gradient(135deg, var(--cyan), var(--blue-dark));
    box-shadow: 0 10px 25px rgba(37, 99, 235, 0.24);
  }
`;

export const Nav = styled.nav<{ $open?: boolean }>`
  display: flex;
  align-items: center;
  gap: 28px;

  > a {
    color: #475569;
    font-size: 0.94rem;
    font-weight: 650;
    transition: color 160ms ease;
  }

  > a:hover {
    color: var(--blue);
  }

  @media (max-width: 820px) {
    position: absolute;
    top: 66px;
    left: 14px;
    right: 14px;
    display: ${({ $open }) => ($open ? 'grid' : 'none')};
    gap: 6px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.14);

    > a {
      padding: 12px 14px;
      border-radius: 10px;
    }

    > a:hover {
      background: var(--surface-soft);
    }
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 820px) {
    > a {
      display: none;
    }
  }
`;

export const MenuButton = styled.button`
  display: none;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--ink);
  background: #fff;

  @media (max-width: 820px) {
    display: inline-flex;
  }
`;

export const Button = styled.a<{ $secondary?: boolean; $compact?: boolean }>`
  min-height: ${({ $compact }) => ($compact ? '42px' : '50px')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: ${({ $compact }) => ($compact ? '0 17px' : '0 22px')};
  border: 1px solid ${({ $secondary }) => ($secondary ? '#d8e0e9' : 'transparent')};
  border-radius: 13px;
  color: ${({ $secondary }) => ($secondary ? '#1e293b' : '#fff')};
  background: ${({ $secondary }) => ($secondary ? '#fff' : 'linear-gradient(135deg, #2563eb, #1d4ed8)')};
  font-size: 0.94rem;
  font-weight: 750;
  box-shadow: ${({ $secondary }) => ($secondary ? 'none' : '0 12px 28px rgba(37, 99, 235, 0.22)')};
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ $secondary }) => ($secondary ? '#b9c6d4' : 'transparent')};
    box-shadow: ${({ $secondary }) => ($secondary ? '0 10px 25px rgba(15, 23, 42, 0.08)' : '0 16px 34px rgba(37, 99, 235, 0.28)')};
  }
`;

export const Hero = styled.section`
  padding: 86px 0 70px;
  overflow: hidden;

  @media (max-width: 860px) {
    padding-top: 58px;
  }
`;

export const HeroGrid = styled(Container)`
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(500px, 1.08fr);
  gap: 58px;
  align-items: center;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

export const Eyebrow = styled.span`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  color: #1d4ed8;
  background: rgba(239, 246, 255, 0.9);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const HeroCopy = styled.div`
  h1 {
    max-width: 700px;
    margin-top: 20px;
    font-family: 'Sora', sans-serif;
    font-size: clamp(2.55rem, 5vw, 4.7rem);
    line-height: 1.02;
    letter-spacing: -0.065em;
  }

  h1 span {
    color: var(--blue);
  }

  > p {
    max-width: 650px;
    margin-top: 23px;
    color: var(--muted);
    font-size: clamp(1rem, 1.8vw, 1.16rem);
    line-height: 1.75;
  }
`;

export const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
`;

export const TrustRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-top: 30px;
  color: #526173;
  font-size: 0.88rem;
  font-weight: 650;

  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  svg {
    color: var(--green);
  }
`;

export const DashboardFrame = styled.div`
  position: relative;
  padding: 15px;
  border: 1px solid rgba(203, 213, 225, 0.75);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.68);
  box-shadow: 0 35px 80px rgba(30, 64, 175, 0.16);
  backdrop-filter: blur(18px);

  &::before {
    content: '';
    position: absolute;
    inset: -40px -55px auto auto;
    width: 170px;
    height: 170px;
    border-radius: 999px;
    background: rgba(14, 165, 233, 0.14);
    filter: blur(10px);
    z-index: -1;
  }
`;

export const Dashboard = styled.div`
  min-height: 480px;
  overflow: hidden;
  border: 1px solid #dbe3ec;
  border-radius: 19px;
  background: #f7f9fc;
`;

export const DashboardTop = styled.div`
  min-height: 66px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  border-bottom: 1px solid #e5eaf0;
  background: #fff;

  strong {
    display: block;
    font-size: 0.9rem;
  }

  small {
    color: #8290a3;
  }

  span:last-child {
    padding: 7px 10px;
    border-radius: 999px;
    color: #15803d;
    background: #ecfdf3;
    font-size: 0.72rem;
    font-weight: 800;
  }
`;

export const DashboardBody = styled.div`
  display: grid;
  grid-template-columns: 115px 1fr;
  min-height: 414px;
`;

export const DashboardNav = styled.div`
  padding: 14px 10px;
  border-right: 1px solid #e5eaf0;
  background: #fff;

  span {
    display: block;
    height: 34px;
    margin-bottom: 7px;
    border-radius: 9px;
    background: #f1f5f9;
  }

  span:first-child {
    background: #e8f0ff;
  }
`;

export const DashboardContent = styled.div`
  padding: 18px;
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const Metric = styled.div`
  padding: 12px;
  border: 1px solid #e4e9ef;
  border-radius: 12px;
  background: #fff;

  small {
    color: #7b8796;
    font-size: 0.64rem;
  }

  strong {
    display: block;
    margin-top: 5px;
    font-size: 0.98rem;
  }
`;

export const OrdersMock = styled.div`
  margin-top: 13px;
  padding: 14px;
  border: 1px solid #e4e9ef;
  border-radius: 14px;
  background: #fff;

  > div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  > div:first-child strong {
    font-size: 0.84rem;
  }

  > div:first-child span {
    color: var(--blue);
    font-size: 0.66rem;
    font-weight: 750;
  }
`;

export const OrderRow = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 0.8fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid #eef2f6;
  font-size: 0.67rem;

  strong {
    font-size: 0.7rem;
  }

  span {
    width: fit-content;
    padding: 5px 7px;
    border-radius: 999px;
    color: #1d4ed8;
    background: #eff6ff;
    font-weight: 750;
  }
`;

export const FloatingBadge = styled.div`
  position: absolute;
  right: -18px;
  bottom: 45px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #dbe4ed;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.15);
  animation: ${float} 5s ease-in-out infinite;

  svg {
    color: var(--green);
  }

  strong,
  small {
    display: block;
  }

  small {
    margin-top: 2px;
    color: #7b8796;
    font-size: 0.7rem;
  }

  @media (max-width: 560px) {
    right: 5px;
    bottom: 20px;
  }
`;

export const Section = styled.section<{ $soft?: boolean; $dark?: boolean }>`
  padding: 92px 0;
  color: ${({ $dark }) => ($dark ? '#f8fafc' : 'inherit')};
  background: ${({ $soft, $dark }) => ($dark ? '#0f172a' : $soft ? '#f7f9fc' : 'transparent')};

  @media (max-width: 720px) {
    padding: 72px 0;
  }
`;

export const SectionHeading = styled.div`
  max-width: 740px;
  margin-bottom: 38px;

  h2 {
    margin-top: 14px;
    font-family: 'Sora', sans-serif;
    font-size: clamp(2rem, 4vw, 3.2rem);
    line-height: 1.08;
    letter-spacing: -0.05em;
  }

  p {
    margin-top: 15px;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.7;
  }
`;

export const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const FeatureCard = styled.article`
  padding: 25px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;

  &:hover {
    transform: translateY(-4px);
    border-color: #cbd7e5;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
  }

  > span {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: var(--blue);
    background: var(--blue-soft);
  }

  h3 {
    margin-top: 18px;
    font-size: 1.05rem;
  }

  p {
    margin-top: 9px;
    color: var(--muted);
    font-size: 0.91rem;
    line-height: 1.65;
  }
`;

export const Split = styled.div`
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 58px;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const Steps = styled.div`
  display: grid;
  gap: 13px;
`;

export const Step = styled.div`
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 15px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;

  > span {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: #fff;
    background: var(--blue);
    font-weight: 800;
  }

  p {
    margin-top: 5px;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.55;
  }
`;

export const DemoCard = styled.div`
  position: relative;
  overflow: hidden;
  padding: 34px;
  border: 1px solid #24334a;
  border-radius: 25px;
  background:
    radial-gradient(circle at 90% 0%, rgba(37, 99, 235, 0.28), transparent 18rem),
    #111c2f;

  &::after {
    content: '';
    position: absolute;
    width: 240px;
    height: 240px;
    right: -90px;
    bottom: -130px;
    border-radius: 999px;
    background: rgba(14, 165, 233, 0.12);
  }

  h3 {
    max-width: 500px;
    font-family: 'Sora', sans-serif;
    font-size: clamp(1.7rem, 3vw, 2.45rem);
    letter-spacing: -0.04em;
  }

  p {
    max-width: 650px;
    margin: 14px 0 24px;
    color: #b9c5d4;
    line-height: 1.7;
  }
`;

export const DemoMini = styled.div`
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  div {
    padding: 15px;
    border: 1px solid #283950;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
  }

  small {
    color: #91a1b6;
  }

  strong {
    display: block;
    margin-top: 5px;
    font-size: 1.06rem;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const AudienceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 13px;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const AudienceCard = styled.div`
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 17px;
  background: #fff;

  svg {
    color: var(--blue);
  }

  strong {
    display: block;
    margin-top: 12px;
  }

  p {
    margin-top: 7px;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.55;
  }
`;

export const ContactPanel = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 35px;
  padding: clamp(28px, 5vw, 56px);
  border: 1px solid #d9e3ee;
  border-radius: 28px;
  background:
    radial-gradient(circle at 100% 0%, rgba(14, 165, 233, 0.12), transparent 23rem),
    #fff;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.08);

  h2 {
    font-family: 'Sora', sans-serif;
    font-size: clamp(2rem, 4vw, 3.15rem);
    line-height: 1.07;
    letter-spacing: -0.05em;
  }

  p {
    max-width: 610px;
    margin-top: 15px;
    color: var(--muted);
    line-height: 1.7;
  }

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const ContactActions = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 11px;

  ${Button} {
    width: 100%;
  }

  small {
    color: #738196;
    text-align: center;
    line-height: 1.45;
  }
`;

export const Faq = styled.div`
  display: grid;
  gap: 10px;

  details {
    border: 1px solid var(--line);
    border-radius: 15px;
    background: #fff;
  }

  summary {
    padding: 18px 20px;
    font-weight: 750;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  p {
    padding: 0 20px 19px;
    color: var(--muted);
    line-height: 1.65;
  }
`;

export const Footer = styled.footer`
  padding: 34px 0;
  border-top: 1px solid #e7ecf1;
  background: #fbfcfe;
`;

export const FooterInner = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: #68768a;
  font-size: 0.84rem;

  @media (max-width: 680px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const DemoPage = styled(Page)`
  background: #f5f7fb;
`;

export const DemoHeader = styled.div`
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

export const DemoShell = styled(Container)`
  padding: 36px 0 72px;
`;

export const DemoIntro = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 24px;

  h1 {
    max-width: 720px;
    font-family: 'Sora', sans-serif;
    font-size: clamp(2rem, 4vw, 3.4rem);
    letter-spacing: -0.05em;
  }

  p {
    max-width: 650px;
    margin-top: 12px;
    color: var(--muted);
    line-height: 1.65;
  }

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const DemoAdmin = styled.div`
  overflow: hidden;
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 650px;
  border: 1px solid #dbe3ec;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 25px 65px rgba(15, 23, 42, 0.1);

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const DemoSidebar = styled.aside`
  padding: 22px 14px;
  color: #d8e3f0;
  background: #111c2f;

  > strong {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 8px 20px;
    color: #fff;
    font-family: 'Sora', sans-serif;
  }

  nav {
    display: grid;
    gap: 5px;
  }

  button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 11px 12px;
    border: 0;
    border-radius: 10px;
    color: #aebdd0;
    background: transparent;
    font: inherit;
    text-align: left;
  }

  button[data-active='true'] {
    color: #fff;
    background: #20314a;
  }

  @media (max-width: 760px) {
    nav {
      grid-template-columns: repeat(3, 1fr);
    }

    button {
      justify-content: center;
      font-size: 0.8rem;
    }

    button svg {
      display: none;
    }
  }
`;

export const DemoWorkspace = styled.section`
  padding: 26px;
  background: #f7f9fc;

  @media (max-width: 560px) {
    padding: 18px;
  }
`;

export const DemoWorkspaceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 20px;

  h2 {
    font-size: 1.15rem;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 9px;
    border-radius: 999px;
    color: #15803d;
    background: #ecfdf3;
    font-size: 0.72rem;
    font-weight: 800;
  }
`;

export const DemoMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const DemoMetric = styled.div`
  padding: 17px;
  border: 1px solid #e2e8f0;
  border-radius: 15px;
  background: #fff;

  small {
    color: #718096;
  }

  strong {
    display: block;
    margin-top: 7px;
    font-size: 1.25rem;
  }

  em {
    display: block;
    margin-top: 4px;
    color: #16a34a;
    font-size: 0.72rem;
    font-style: normal;
  }
`;

export const DemoTable = styled.div`
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 15px;
  background: #fff;

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    padding: 17px;
    border-bottom: 1px solid #edf1f5;
  }
`;

export const DemoTableRow = styled.div`
  display: grid;
  grid-template-columns: 0.7fr 1.2fr 1fr 0.8fr;
  gap: 12px;
  padding: 14px 17px;
  border-bottom: 1px solid #f0f3f6;
  color: #475569;
  font-size: 0.84rem;

  &:last-child {
    border-bottom: 0;
  }

  strong {
    color: #0f172a;
  }

  span:last-child {
    width: fit-content;
    padding: 5px 7px;
    border-radius: 999px;
    color: #1d4ed8;
    background: #eff6ff;
    font-size: 0.72rem;
    font-weight: 750;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const DemoCallout = styled.div`
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border: 1px solid #dbe5ef;
  border-radius: 16px;
  background: #fff;

  > div span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--blue);
    font-size: 0.78rem;
    font-weight: 800;
  }

  p {
    margin-top: 5px;
    color: var(--muted);
    font-size: 0.88rem;
  }

  ${Button} {
    animation: ${pulse} 2.8s ease-in-out infinite;
  }

  @media (max-width: 680px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;
