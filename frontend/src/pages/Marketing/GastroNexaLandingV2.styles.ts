import styled, { keyframes } from 'styled-components';

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

export const Page = styled.main`
  --ink: #191816;
  --muted: #6f6a63;
  --line: #e4ddd5;
  --canvas: #f6f7f4;
  --surface: #ffffff;
  --brand: #d64d08;
  --brand-dark: #a83904;
  --green: #287139;
  min-height: 100vh;
  color: var(--ink);
  background: var(--canvas);
  font-family: 'DM Sans', Inter, system-ui, sans-serif;

  *, *::before, *::after { box-sizing: border-box; }
  a { color: inherit; text-decoration: none; }
  button, a { -webkit-tap-highlight-color: transparent; }
`;

export const Container = styled.div`
  width: min(1240px, calc(100% - 44px));
  margin: 0 auto;
  @media (max-width: 680px) { width: min(100% - 24px, 1240px); }
`;

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 60;
  border-bottom: 1px solid rgba(228, 221, 213, 0.88);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
`;

export const HeaderInner = styled(Container)`
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
`;

export const Brand = styled.a<{ $light?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: ${({ $light }) => ($light ? '#fff' : '#151412')};
  font-family: 'Sora', sans-serif;
  font-weight: 820;
  letter-spacing: -0.035em;
  font-size: 17px;

  .brand-g {
    width: 34px;
    height: 40px;
    display: grid;
    place-items: center;
    color: currentColor;
    background: transparent;
    font-family: 'Sora', sans-serif;
    font-size: 34px;
    line-height: 1;
    font-weight: 900;
    letter-spacing: -0.09em;
  }
`;

export const Nav = styled.nav<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 28px;
  a {
    color: #5e5954;
    font-size: 13px;
    font-weight: 750;
  }
  a:hover { color: var(--brand); }

  @media (max-width: 860px) {
    position: absolute;
    top: 64px;
    left: 12px;
    right: 12px;
    display: ${({ $open }) => ($open ? 'grid' : 'none')};
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 20px 48px rgba(31, 25, 21, 0.16);
    a { padding: 12px; border-radius: 7px; }
    a:hover { background: #faf7f4; }
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  @media (max-width: 860px) { > a { display: none; } }
`;

export const MenuButton = styled.button`
  display: none;
  width: 42px;
  height: 42px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  place-items: center;
  @media (max-width: 860px) { display: grid; }
`;

export const Button = styled.a<{ $secondary?: boolean; $dark?: boolean; $small?: boolean }>`
  min-height: ${({ $small }) => ($small ? '42px' : '50px')};
  padding: 0 ${({ $small }) => ($small ? '16px' : '21px')};
  border: 1px solid ${({ $secondary, $dark }) => ($secondary ? ($dark ? '#4d4945' : '#d8d0c8') : 'transparent')};
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${({ $secondary, $dark }) => ($secondary ? ($dark ? '#fff' : '#27231f') : '#fff')};
  background: ${({ $secondary, $dark }) => ($secondary ? ($dark ? 'transparent' : '#fff') : $dark ? '#fff' : 'var(--brand)')};
  ${({ $dark, $secondary }) => $dark && !$secondary ? 'color: #191816;' : ''}
  font-size: 13px;
  font-weight: 820;
  box-shadow: ${({ $secondary }) => ($secondary ? 'none' : '0 10px 24px rgba(214, 77, 8, 0.20)')};
  transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
  &:hover { transform: translateY(-2px); filter: brightness(0.97); }
`;

export const Hero = styled.section`
  position: relative;
  overflow: hidden;
  padding: 76px 0 84px;
  background:
    radial-gradient(circle at 90% 4%, rgba(214, 77, 8, 0.11), transparent 27rem),
    linear-gradient(rgba(60, 48, 40, 0.026) 1px, transparent 1px),
    linear-gradient(90deg, rgba(60, 48, 40, 0.026) 1px, transparent 1px),
    #f6f7f4;
  background-size: auto, 32px 32px, 32px 32px, auto;
`;

export const HeroGrid = styled(Container)`
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(500px, 1.08fr);
  gap: 58px;
  align-items: center;
  @media (max-width: 1030px) { grid-template-columns: 1fr; }
`;

export const Eyebrow = styled.span`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #9b3c0e;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: .09em;
  text-transform: uppercase;
`;

export const HeroCopy = styled.div`
  h1 {
    margin: 17px 0 0;
    max-width: 720px;
    font-family: 'Sora', sans-serif;
    font-size: clamp(42px, 6.4vw, 76px);
    line-height: .99;
    letter-spacing: -.065em;
    font-weight: 760;
  }
  h1 span { color: var(--brand); }
  > p {
    max-width: 650px;
    margin: 23px 0 0;
    color: var(--muted);
    font-size: 17px;
    line-height: 1.72;
  }
`;

export const HeroActions = styled.div`
  margin-top: 29px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const HeroProof = styled.div`
  margin-top: 29px;
  display: flex;
  flex-wrap: wrap;
  gap: 9px 19px;
  color: #5f5a55;
  font-size: 12px;
  font-weight: 730;
  span { display: inline-flex; align-items: center; gap: 6px; }
  svg { color: var(--green); }
`;

export const ProductPreview = styled.div`
  position: relative;
  padding: 13px;
  border: 1px solid #dcd4cc;
  border-radius: 16px;
  background: rgba(255,255,255,.72);
  box-shadow: 0 32px 72px rgba(46, 37, 30, .15);
`;

export const AppWindow = styled.div`
  min-height: 500px;
  overflow: hidden;
  border: 1px solid #ddd6ce;
  border-radius: 10px;
  background: #f6f7f4;
`;

export const AppTop = styled.div`
  min-height: 64px;
  padding: 0 17px;
  border-bottom: 1px solid #e2dbd4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  .identity { display: flex; align-items: center; gap: 9px; }
  .mark { width: 35px; height: 35px; display:grid; place-items:center; border-radius:7px; background:var(--brand); color:#fff; font-weight:900; }
  b, small { display:block; }
  b { font-size:12px; }
  small { color:#8a817a; font-size:9px; margin-top:2px; }
  > span { color:#287139; background:#edf7ee; border-radius:999px; padding:6px 8px; font-size:9px; font-weight:850; }
`;

export const AppBody = styled.div`
  display: grid;
  grid-template-columns: 122px minmax(0,1fr);
  min-height: 435px;
`;

export const AppNav = styled.aside`
  padding: 14px 9px;
  border-right: 1px solid #e4ddd5;
  background: linear-gradient(180deg,#282320,#17191a);
  display:grid;
  align-content:start;
  gap:7px;
  span { height:35px; border-radius:6px; background:rgba(255,255,255,.07); }
  span:first-child { background:var(--brand); }
`;

export const AppContent = styled.div`
  padding: 18px;
  min-width:0;
`;

export const MetricGrid = styled.div`
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:9px;
  @media (max-width:560px){grid-template-columns:repeat(2,1fr);}
`;

export const Metric = styled.div`
  min-width:0;
  padding:12px;
  border:1px solid #e4ddd5;
  border-radius:8px;
  background:#fff;
  small{color:#847d77;font-size:9px;}
  strong{display:block;margin-top:5px;font-size:14px;}
`;

export const Orders = styled.div`
  margin-top:12px;
  border:1px solid #e4ddd5;
  border-radius:8px;
  background:#fff;
  overflow:hidden;
  header{padding:13px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee8e3;font-size:11px;}
`;

export const Order = styled.div`
  display:grid;
  grid-template-columns:1fr .75fr auto;
  gap:8px;
  align-items:center;
  padding:11px 14px;
  border-bottom:1px solid #f0ece8;
  font-size:9px;
  b{font-size:10px;}
  span:last-child{padding:4px 6px;border-radius:999px;background:#f3f9f6;color:#176b52;font-weight:800;}
`;

export const FloatingCard = styled.div`
  position:absolute;
  right:-20px;
  bottom:36px;
  min-width:210px;
  padding:12px 14px;
  border:1px solid #ded6cf;
  border-radius:9px;
  display:flex;
  align-items:center;
  gap:10px;
  background:#fff;
  box-shadow:0 16px 36px rgba(31,25,21,.14);
  animation:${float} 5s ease-in-out infinite;
  svg{color:var(--green);}
  b,small{display:block;}
  b{font-size:11px;}
  small{margin-top:2px;color:#817a74;font-size:9px;}
  @media(max-width:560px){right:4px;bottom:18px;}
`;

export const Section = styled.section<{ $soft?: boolean; $dark?: boolean }>`
  padding:88px 0;
  color:${({$dark})=>$dark?'#fff':'inherit'};
  background:${({$soft,$dark})=>$dark?'#191816':$soft?'#f0f2ef':'#fff'};
`;

export const Heading = styled.div`
  max-width:760px;
  margin-bottom:35px;
  h2{margin:11px 0 0;font-family:'Sora',sans-serif;font-size:clamp(31px,4.8vw,52px);line-height:1.08;letter-spacing:-.05em;}
  p{margin:14px 0 0;color:#756f69;font-size:15px;line-height:1.65;}
`;

export const Features = styled.div`
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
  @media(max-width:850px){grid-template-columns:1fr 1fr;}
  @media(max-width:560px){grid-template-columns:1fr;}
`;

export const Feature = styled.article`
  min-height:190px;
  padding:22px;
  border:1px solid #e2dbd4;
  border-radius:9px;
  background:#fff;
  box-shadow:0 7px 22px rgba(50,39,30,.035);
  .icon{width:42px;height:42px;border-radius:7px;display:grid;place-items:center;color:var(--brand);background:#fff0e8;}
  h3{margin:19px 0 7px;font-family:'Sora',sans-serif;font-size:17px;letter-spacing:-.03em;}
  p{margin:0;color:#756f69;font-size:13px;line-height:1.55;}
`;

export const Workflow = styled.div`
  display:grid;
  grid-template-columns:.9fr 1.1fr;
  gap:50px;
  align-items:start;
  @media(max-width:850px){grid-template-columns:1fr;}
`;

export const Steps = styled.div`
  display:grid;
  gap:10px;
`;

export const Step = styled.article`
  padding:18px;
  border:1px solid #e3dcd5;
  border-radius:8px;
  display:grid;
  grid-template-columns:40px minmax(0,1fr);
  gap:13px;
  background:#fff;
  >span{width:40px;height:40px;border-radius:7px;display:grid;place-items:center;color:#fff;background:var(--brand);font-weight:900;}
  b{font-size:14px;}
  p{margin:5px 0 0;color:#756f69;font-size:12px;line-height:1.5;}
`;

export const DemoBand = styled.div`
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  gap:28px;
  padding:42px;
  border:1px solid #3b3835;
  border-radius:10px;
  background:
    radial-gradient(circle at 88% 0%,rgba(214,77,8,.22),transparent 19rem),
    #201e1c;
  h2{margin:9px 0 0;font-family:'Sora',sans-serif;font-size:clamp(30px,4.3vw,48px);letter-spacing:-.05em;}
  p{max-width:680px;margin:13px 0 0;color:#c9c1ba;line-height:1.6;}
  @media(max-width:760px){grid-template-columns:1fr;padding:28px 22px;}
`;

export const PlanGrid = styled.div`
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:15px;
  max-width:900px;
  margin:0 auto;
  @media(max-width:680px){grid-template-columns:1fr;}
`;

export const Plan = styled.article<{ $featured?: boolean }>`
  position:relative;
  padding:28px;
  border:1px solid ${({$featured})=>$featured?'#d64d08':'#ddd6cf'};
  border-radius:10px;
  background:#fff;
  box-shadow:${({$featured})=>$featured?'0 18px 45px rgba(214,77,8,.12)':'0 8px 24px rgba(45,35,28,.04)'};
  .badge{position:absolute;top:16px;right:16px;padding:5px 8px;border-radius:999px;color:#9d3508;background:#fff0e8;font-size:9px;font-weight:850;text-transform:uppercase;}
  h3{margin:0;font-family:'Sora',sans-serif;font-size:23px;}
  .description{min-height:44px;color:#746e68;line-height:1.5;font-size:13px;}
  .price{display:flex;align-items:baseline;gap:5px;margin:22px 0 6px;}
  .price strong{font-family:'Sora',sans-serif;font-size:35px;letter-spacing:-.05em;}
  .price span{color:#7b746e;font-size:12px;}
  .trial{color:#287139;font-size:11px;font-weight:800;}
  ul{display:grid;gap:10px;margin:22px 0;padding:0;list-style:none;}
  li{display:flex;gap:8px;align-items:flex-start;color:#4e4945;font-size:13px;}
  li svg{flex:0 0 auto;color:#287139;margin-top:1px;}
`;

export const Audience = styled.div`
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;
  @media(max-width:800px){grid-template-columns:1fr 1fr;}
  @media(max-width:480px){grid-template-columns:1fr;}
`;

export const AudienceCard = styled.div`
  padding:19px;
  border:1px solid #e3ddd6;
  border-radius:8px;
  background:#fff;
  svg{color:var(--brand);}
  b{display:block;margin-top:13px;}
  p{margin:5px 0 0;color:#756f69;font-size:12px;line-height:1.5;}
`;

export const Faq = styled.div`
  display:grid;
  gap:8px;
  max-width:880px;
  details{border:1px solid #e1dad3;border-radius:8px;background:#fff;padding:0 17px;}
  summary{padding:17px 0;cursor:pointer;font-weight:800;}
  p{margin:0 0 17px;color:#756f69;line-height:1.6;font-size:13px;}
`;

export const Contact = styled.div`
  padding:35px;
  border:1px solid #ded7d0;
  border-radius:10px;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  gap:30px;
  background:#fff;
  h2{margin:9px 0 0;font-family:'Sora',sans-serif;font-size:clamp(28px,4vw,43px);letter-spacing:-.05em;}
  p{max-width:700px;margin:12px 0 0;color:#756f69;line-height:1.6;}
  .actions{display:grid;gap:9px;min-width:220px;}
  @media(max-width:760px){grid-template-columns:1fr;padding:25px 20px;.actions{min-width:0;}}
`;

export const Footer = styled.footer`
  padding:32px 0;
  border-top:1px solid #302d2a;
  background:#191816;
  color:#fff;
`;

export const FooterInner = styled(Container)`
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:20px;
  color:#aaa29b;
  font-size:11px;
  @media(max-width:600px){flex-direction:column;align-items:flex-start;}
`;
