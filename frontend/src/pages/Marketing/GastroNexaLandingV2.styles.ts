import styled from 'styled-components';

const pagePadding = 'max(24px, calc((100vw - 1264px) / 2))';

export const Page = styled.div`
  --orange:#f45b2a;
  --orange-dark:#d94618;
  --peach:#fff1e5;
  --peach-strong:#ffe2d2;
  --cream:#fff9f3;
  --sand:#f8f4ef;
  --ink:#211e1c;
  --copy:#3d3733;
  --muted:#746b65;
  --line:#e9ded6;
  --dark:#191816;
  --green:#1e3a2f;
  --lime:#c8e86a;
  min-height:100vh;
  overflow-x:hidden;
  background:var(--cream);
  color:var(--ink);
  font-family:'Inter',system-ui,sans-serif;
  *,*::before,*::after{box-sizing:border-box}
  a{text-decoration:none;color:inherit}
  button,input,select,textarea{font:inherit}
  button,a{-webkit-tap-highlight-color:transparent}
  h1,h2,h3,p{margin:0}
  h1,h2,h3{font-family:'Manrope','Inter',sans-serif}
  .skip-link{position:fixed;top:-100px;left:16px;z-index:999;padding:10px 15px;border-radius:8px;background:var(--dark);color:#fff}
  .skip-link:focus{top:12px}
  a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(244,91,42,.38);outline-offset:3px}
  main>section{scroll-margin-top:80px}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;

export const Brand = styled.a<{ $light?: boolean }>`
  display:inline-flex;align-items:center;gap:10px;min-width:0;color:${({$light})=>$light?'#fff':'var(--ink)'};
  font-family:'Manrope','Inter',sans-serif;font-size:20px;font-weight:800;white-space:nowrap;
  img{width:36px;height:36px;object-fit:contain;mix-blend-mode:${({$light})=>$light?'screen':'multiply'};filter:${({$light})=>$light?'invert(1)':'none'}}
  strong{color:var(--orange)}
`;

export const Header = styled.header`
  position:sticky;top:0;z-index:90;height:78px;border-bottom:1px solid rgba(233,222,214,.55);background:rgba(255,249,243,.96);backdrop-filter:blur(16px);
`;
export const HeaderInner = styled.div`
  width:100%;height:100%;padding:0 ${pagePadding};display:flex;align-items:center;justify-content:space-between;gap:28px;
  .header-actions{display:flex;align-items:center;gap:10px}
  @media(max-width:960px){padding:0 22px}
`;
export const Nav = styled.nav<{ $open:boolean }>`
  display:flex;align-items:center;gap:28px;margin-left:auto;margin-right:auto;
  a{padding:10px 0;color:var(--copy);font-size:13px;font-weight:600;white-space:nowrap}
  a:hover{color:var(--orange-dark)}
  @media(max-width:960px){
    position:absolute;top:77px;left:16px;right:16px;display:${({$open})=>$open?'grid':'none'};gap:2px;padding:12px;border:1px solid var(--line);border-radius:0 0 18px 18px;background:var(--cream);box-shadow:0 20px 45px rgba(50,25,15,.13);
    a{padding:13px 14px;border-radius:10px;font-size:15px}a:hover{background:var(--peach)}
  }
`;
export const MenuButton = styled.button`
  display:none;width:44px;height:44px;border:1px solid var(--line);border-radius:50%;background:#fff;color:var(--ink);place-items:center;
  @media(max-width:960px){display:grid}
`;

export const PrimaryButton = styled.a`
  min-height:52px;padding:0 22px;border:1px solid var(--orange);border-radius:999px;background:var(--orange);color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:10px;font-size:14px;font-weight:700;white-space:nowrap;transition:transform .16s ease,box-shadow .16s ease;
  &:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(244,91,42,.22)}
  @media(max-width:960px){&.desktop-cta{display:none}}
`;
export const SecondaryButton = styled.a`
  min-height:52px;padding:0 22px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);display:inline-flex;align-items:center;justify-content:center;gap:10px;font-size:14px;font-weight:700;white-space:nowrap;
`;
export const SoftButton = styled.a`
  min-height:52px;padding:0 22px;border-radius:999px;background:var(--peach-strong);color:var(--orange-dark);display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:700;
`;
export const Badge = styled.span`
  display:inline-flex;align-items:center;gap:8px;width:max-content;max-width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--copy);font-size:11px;font-weight:700;
  i{width:8px;height:8px;border-radius:50%;background:#2eb66b;box-shadow:0 0 0 4px rgba(46,182,107,.12)}
`;
export const Eyebrow = styled.span`
  display:inline-flex;width:max-content;max-width:100%;padding:7px 12px;border-radius:999px;background:var(--peach-strong);color:var(--orange-dark);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;
`;
export const DarkEyebrow = styled(Eyebrow)`
  background:rgba(255,255,255,.09);color:var(--peach-strong);
`;

export const Hero = styled.section`
  position:relative;min-height:790px;padding:74px ${pagePadding} 70px;background:var(--peach);overflow:hidden;
  .hero-accent{position:absolute;top:-170px;right:-80px;width:640px;height:640px;object-fit:contain;pointer-events:none}
  @media(max-width:1100px){padding:60px 48px}
  @media(max-width:760px){min-height:auto;padding:44px 20px 48px;.hero-accent{width:420px;height:420px;right:-210px;top:-110px}}
`;
export const HeroGrid = styled.div`
  position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,548px) minmax(0,1fr);gap:48px;align-items:center;max-width:1264px;margin:0 auto;
  @media(max-width:1050px){grid-template-columns:1fr;gap:44px}
`;
export const HeroCopy = styled.div`
  display:grid;gap:24px;align-content:center;
  h1{font-size:clamp(44px,4.1vw,58px);line-height:1.03;font-weight:500;letter-spacing:-.05em}
  >p{max-width:548px;color:var(--muted);font-size:19px;line-height:1.55}
  .hero-actions{display:flex;flex-wrap:wrap;gap:12px}
  .assurances{display:flex;flex-wrap:wrap;gap:18px;color:var(--muted);font-size:11px}.assurances span{display:flex;align-items:center;gap:6px}.assurances svg{color:#24965d}
  @media(max-width:600px){gap:20px;h1{font-size:42px}.hero-actions>a{flex:1;min-width:160px}.assurances{gap:10px 14px}}
`;
export const ProductStage = styled.div`
  position:relative;min-height:570px;min-width:0;
  .desktop-product{position:absolute;top:70px;left:0;width:min(588px,84%);height:430px;border:6px solid #fff;border-radius:24px;overflow:hidden;background:#fff;box-shadow:0 24px 56px -12px rgba(50,25,15,.18)}
  .browser-bar{height:36px;padding:0 14px;display:flex;align-items:center;gap:6px;background:#f6f2ee}.browser-bar>i{width:8px;height:8px;border-radius:50%;background:#d4cac3}.browser-bar>i:nth-child(1){background:#ff8b72}.browser-bar>i:nth-child(2){background:#f5c15e}.browser-bar>i:nth-child(3){background:#68c986}.browser-bar span{width:280px;height:20px;padding:5px 10px;margin-left:2px;border-radius:999px;background:#fff;color:var(--muted);font-size:8px}
  .desktop-product>img{display:block;width:100%;height:394px;object-fit:cover}
  .phone-product{position:absolute;right:0;bottom:0;width:192px;height:388px;border:6px solid #fff;border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 24px 56px -12px rgba(50,25,15,.18)}
  .phone-status{height:30px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;font-size:8px}.phone-cover{width:100%;height:112px;object-fit:cover}
  .phone-menu{padding:12px;display:grid;gap:10px}.phone-menu>b{font-family:'Manrope';font-size:14px}.phone-menu>small{margin-top:-9px;color:#248c5a;font-size:8px}.phone-categories{display:flex;gap:5px;font-size:7px}.phone-categories span,.phone-categories em{padding:4px 7px;border-radius:999px;font-style:normal}.phone-categories span{background:var(--orange);color:#fff}.phone-categories em{background:var(--sand);color:var(--muted)}
  .phone-item{display:grid;grid-template-columns:1fr 54px;gap:8px}.phone-item>div{display:grid;gap:3px}.phone-item b{font-size:9px}.phone-item small{font-size:7px;line-height:1.3;color:var(--muted)}.phone-item strong{font-size:9px;color:var(--orange)}.phone-item img{width:54px;height:54px;object-fit:cover;border-radius:8px}
  .phone-menu>button{height:34px;padding:0 12px;border:0;border-radius:999px;background:var(--orange);color:#fff;display:flex;justify-content:space-between;align-items:center;font-size:8px}
  .order-badge{position:absolute;left:26px;bottom:18px;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:#fff;box-shadow:0 12px 32px -8px rgba(59,37,24,.1)}.order-badge>span{width:34px;height:34px;border-radius:14px;background:#e4f4eb;color:#248c5a;display:grid;place-items:center}.order-badge>div{display:grid;gap:2px}.order-badge small{font-size:9px;color:var(--muted)}.order-badge b{font-family:'Manrope';font-size:13px}
  @media(max-width:1050px){width:min(720px,100%);margin:auto}
  @media(max-width:600px){min-height:390px;.desktop-product{top:25px;width:88%;height:300px}.desktop-product>img{height:264px}.phone-product{width:150px;height:302px}.phone-cover{height:82px}.phone-menu{padding:8px;gap:6px}.phone-item{grid-template-columns:1fr 42px}.phone-item img{width:42px;height:42px}.phone-categories{overflow:hidden}.order-badge{left:8px;bottom:0}}
`;

export const QuickBenefits = styled.section`
  padding:52px ${pagePadding};display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;background:#fff;
  article{display:flex;gap:12px;min-width:0}article>span{width:40px;height:40px;flex:0 0 40px;border-radius:14px;background:var(--peach-strong);color:var(--orange-dark);display:grid;place-items:center}h3{font-size:15px}p{margin-top:5px;color:var(--muted);font-size:11px;line-height:1.45}
  @media(max-width:900px){grid-template-columns:repeat(2,1fr);padding:38px 28px}
  @media(max-width:520px){grid-template-columns:1fr;padding:34px 20px}
`;

export const Challenge = styled.section`
  padding:96px ${pagePadding};display:grid;grid-template-columns:560px minmax(0,1fr);gap:64px;align-items:center;background:var(--cream);
  @media(max-width:1100px){grid-template-columns:minmax(0,1fr) minmax(0,1fr);padding:76px 48px}
  @media(max-width:820px){grid-template-columns:1fr;padding:64px 20px;gap:40px}
`;
export const OperationVisual = styled.div`
  position:relative;width:100%;height:520px;border-radius:32px;overflow:hidden;box-shadow:0 12px 28px rgba(59,37,24,.12);
  >img{width:100%;height:100%;object-fit:cover}.order-alert{position:absolute;right:20px;bottom:20px;width:250px;padding:16px;border-radius:16px;background:#fff;box-shadow:0 12px 32px -8px rgba(59,37,24,.14);display:grid;gap:10px}.order-alert>div{display:flex;justify-content:space-between;align-items:center}.order-alert>div b{color:var(--orange);font-size:10px}.order-alert>div span{padding:4px 8px;border-radius:999px;background:#e4f4eb;color:#248c5a;font-size:8px;font-weight:800}.order-alert strong{font-family:'Manrope';font-size:15px}.order-alert small{color:var(--muted);font-size:10px}
  @media(max-width:820px){height:min(110vw,520px)}
`;
export const ChallengeCopy = styled.div`
  display:grid;gap:25px;h2{font-size:42px;line-height:1.1;letter-spacing:-.035em} >p{color:var(--muted);font-size:19px;line-height:1.55}
  .problems{display:grid;gap:12px;list-style:none;margin:0;padding:0}.problems li{display:flex;gap:10px;color:var(--copy);font-size:14px;line-height:1.5}.problems span{width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:#ffe8e1;color:#d94618;display:grid;place-items:center;font-weight:800}
  .solution{padding:20px;border-radius:24px;background:var(--peach-strong);display:grid;gap:11px}.solution h3{font-size:17px}.solution p{display:flex;align-items:center;gap:10px;color:var(--copy);font-size:14px}.solution i{width:22px;height:22px;border-radius:50%;background:#e4f4eb;color:#248c5a;display:grid;place-items:center}
  @media(max-width:600px){h2{font-size:34px}>p{font-size:17px}}
`;

const paddedSection = styled.section`padding:96px ${pagePadding};`;
export const FeaturesSection = styled(paddedSection)`
  background:var(--sand);
`;
export const SectionHeading = styled.div`
  max-width:1264px;margin:0 auto 42px;display:flex;align-items:flex-end;justify-content:space-between;gap:44px;
  >div{max-width:790px;display:grid;gap:14px}h2{font-size:42px;line-height:1.1;letter-spacing:-.035em}p{color:var(--muted);font-size:19px;line-height:1.55}
  >aside{width:240px;padding:18px;border-radius:16px;background:var(--dark);color:#fff;display:grid;gap:5px}aside strong{font-family:'Manrope';font-size:28px}aside span{color:rgba(255,255,255,.66);font-size:11px}
  .ethics{width:310px;background:#e4f4eb;color:var(--copy);display:flex;grid-template-columns:none;align-items:flex-start;gap:10px}.ethics svg{flex:0 0 22px;color:#248c5a}.ethics span{color:var(--copy);font-size:10px;line-height:1.45}
  @media(max-width:860px){align-items:flex-start;flex-direction:column;>aside,.ethics{width:100%}h2{font-size:36px}}
`;
export const CenterHeading = styled.div`
  max-width:860px;margin:0 auto 44px;text-align:center;display:grid;justify-items:center;gap:14px;
  h2{font-size:42px;line-height:1.1;letter-spacing:-.035em}p{color:var(--muted);font-size:19px;line-height:1.55}
  @media(max-width:600px){h2{font-size:34px}p{font-size:16px}}
`;
export const FeatureGrid = styled.div`
  max-width:1264px;margin:auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;
  article{min-height:238px;padding:22px;border:1px solid var(--line);border-radius:24px;background:#fff;display:flex;flex-direction:column;gap:16px}.icon{width:44px;height:44px;border-radius:16px;background:var(--peach-strong);color:var(--orange-dark);display:grid;place-items:center}article>div{display:grid;gap:8px}h3{font-size:18px}p{color:var(--muted);font-size:13px;line-height:1.5}small{margin-top:auto;display:flex;align-items:center;gap:7px;color:var(--orange-dark);font-size:11px;font-weight:700}
  @media(max-width:1050px){grid-template-columns:repeat(2,1fr)}
  @media(max-width:580px){grid-template-columns:1fr}
`;

export const MultiTenant = styled.section`
  position:relative;padding:100px ${pagePadding};background:var(--dark);color:#fff;display:grid;grid-template-columns:512px minmax(0,1fr);gap:58px;align-items:center;overflow:hidden;
  .orange-glow{position:absolute;left:-240px;bottom:-320px;width:650px;height:650px;object-fit:contain;pointer-events:none}.tenant-copy{position:relative;z-index:1;display:grid;gap:24px}.tenant-copy h2{font-size:42px;line-height:1.1}.tenant-copy>p{color:rgba(255,255,255,.72);font-size:19px;line-height:1.55}.tenant-copy ul{list-style:none;padding:0;margin:0;display:grid;gap:12px}.tenant-copy li{display:flex;gap:10px;align-items:center;color:rgba(255,255,255,.85);font-size:14px}.tenant-copy li span{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.09);display:grid;place-items:center}
  @media(max-width:1050px){grid-template-columns:1fr;padding:80px 48px}
  @media(max-width:600px){padding:64px 20px;.tenant-copy h2{font-size:34px}}
`;
export const NetworkDashboard = styled.div`
  position:relative;z-index:1;width:min(602px,100%);margin-left:auto;border-radius:24px;overflow:hidden;background:#fff;color:var(--ink);box-shadow:0 24px 56px -12px rgba(50,25,15,.22);
  >header{height:62px;padding:0 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}>header>a{font-size:13px}>header>a img{width:28px;height:28px}>header>span{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:9px}>header i{width:28px;height:28px;border-radius:50%;background:var(--peach-strong);color:var(--orange-dark);display:grid;place-items:center;font-style:normal;font-weight:800}
  .dash-body{display:grid;grid-template-columns:128px 1fr;min-height:398px}.dash-body nav{padding:18px 12px;background:#f8f5f2;display:grid;align-content:start;gap:8px}.dash-body nav span{height:32px;padding:0 8px;border-radius:8px;color:var(--muted);display:flex;align-items:center;gap:7px;font-size:9px}.dash-body nav svg{width:13px}.dash-body nav .active{background:var(--peach-strong);color:var(--orange-dark);font-weight:700}
  .dash-content{padding:20px;display:grid;align-content:start;gap:16px}.dash-title{display:flex;justify-content:space-between;align-items:center}.dash-title>div{display:grid;gap:3px}.dash-title b{font-family:'Manrope';font-size:18px}.dash-title small{color:var(--muted);font-size:9px}.dash-title button{border:0;border-radius:999px;background:var(--orange);color:#fff;padding:7px 10px;font-size:8px}
  .dash-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.dash-metrics span{padding:11px;border-radius:10px;background:var(--sand);display:grid;gap:3px}.dash-metrics b{font-size:13px}.dash-metrics small{font-size:7px;color:var(--muted)}
  .units{display:grid;gap:8px}.units>div{padding:11px 12px;border:1px solid var(--line);border-radius:10px;display:flex;align-items:center;gap:9px}.pin{width:28px;height:28px;border-radius:8px;background:var(--peach-strong);color:var(--orange-dark);display:grid;place-items:center}.units>div>span:nth-child(2){display:grid;gap:2px}.units b{font-size:10px}.units small{font-size:8px;color:var(--muted)}.units em{margin-left:auto;padding:4px 8px;border-radius:999px;background:var(--sand);color:var(--muted);font-size:7px;font-style:normal;font-weight:700}.units em.open{background:#e4f4eb;color:#248c5a}
  @media(max-width:600px){.dash-body{grid-template-columns:1fr}.dash-body nav{display:none}.dash-content{padding:14px}.dash-title button{display:none}}
`;

export const StepsSection = styled(paddedSection)`background:var(--cream);`;
export const StepGrid = styled.div`
  max-width:1264px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;
  article{min-height:280px;padding:26px;border:1px solid var(--line);border-radius:24px;background:#fff;display:flex;flex-direction:column;gap:20px}.step-top{display:flex;align-items:center;justify-content:space-between}.step-top>b{color:var(--orange);font-size:12px}.step-top>span{width:42px;height:42px;border-radius:16px;background:var(--peach-strong);color:var(--orange-dark);display:grid;place-items:center}article>div:nth-child(2){display:grid;gap:10px}h3{font-size:22px}p{color:var(--muted);font-size:14px;line-height:1.55}small{margin-top:auto;display:flex;gap:7px;align-items:center;color:#248c5a;font-size:10px;font-weight:700}
  article.featured{border-color:var(--orange);background:var(--orange);color:#fff;box-shadow:0 12px 32px -8px rgba(59,37,24,.1)}article.featured .step-top>b{color:rgba(255,255,255,.72)}article.featured .step-top>span{background:var(--dark);color:#fff}article.featured p{color:rgba(255,255,255,.82)}article.featured small{color:#fff}
  @media(max-width:780px){grid-template-columns:1fr}
`;

export const ProductSection = styled(paddedSection)`background:var(--peach);`;
export const Gallery = styled.div`
  max-width:1264px;margin:auto;display:grid;grid-template-columns:340fr 536fr 340fr;gap:24px;align-items:center;
  figure{margin:0;border:1px solid var(--line);border-radius:24px;overflow:hidden;background:#fff;box-shadow:0 12px 32px -8px rgba(59,37,24,.1)}figure.featured{border:2px solid var(--orange);box-shadow:0 24px 56px -12px rgba(50,25,15,.18)}figure img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}.featured img{aspect-ratio:536/402}figcaption{padding:14px 16px;display:grid;gap:3px}figcaption b{font-family:'Manrope';font-size:13px}figcaption small{color:var(--muted);font-size:9px}
  @media(max-width:900px){grid-template-columns:1fr 1.3fr 1fr;gap:12px}
  @media(max-width:660px){grid-template-columns:1fr;figure{max-width:520px;margin:auto}.featured{order:-1}}
`;
export const ProductCallouts = styled.div`
  max-width:1264px;margin:20px auto 0;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;
  article{padding:18px;border-radius:16px;background:rgba(255,255,255,.66);display:flex;gap:13px}article>span{width:40px;height:40px;flex:0 0 40px;border-radius:14px;background:var(--peach-strong);color:var(--orange-dark);display:grid;place-items:center}svg{width:18px}article>div{display:grid;gap:5px}b{font-family:'Manrope';font-size:14px}p{color:var(--muted);font-size:11px;line-height:1.4}
  @media(max-width:700px){grid-template-columns:1fr}
`;

export const SignalsSection = styled(paddedSection)`background:#fff;`;
export const SignalGrid = styled.div`
  max-width:1264px;margin:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:18px;
  article{min-height:210px;padding:22px;border:1px solid var(--line);border-radius:24px;background:var(--cream);display:flex;flex-direction:column;gap:16px}article>span{width:42px;height:42px;border-radius:16px;background:#e4f4eb;color:#248c5a;display:grid;place-items:center}article>span svg{width:19px}h3{font-size:16px}p{color:var(--muted);font-size:12px;line-height:1.5}
  @media(max-width:800px){grid-template-columns:repeat(2,1fr)}
  @media(max-width:480px){grid-template-columns:1fr}
`;

export const PlansSection = styled(paddedSection)`background:var(--cream);`;
export const FaqSection = styled.section`
  padding:96px ${pagePadding};background:#fff;display:grid;grid-template-columns:390px minmax(0,1fr);gap:72px;
  .faq-intro{display:grid;align-content:start;gap:14px}.faq-intro h2{font-size:42px;line-height:1.1}.faq-intro>p{color:var(--muted);font-size:19px;line-height:1.55}.faq-help{margin-top:10px;padding:20px;border-radius:16px;background:var(--peach);display:grid;gap:10px}.faq-help b{font-family:'Manrope';font-size:15px}.faq-help p{color:var(--muted);font-size:11px;line-height:1.45}.faq-help a{color:var(--orange-dark);font-size:11px;font-weight:800}
  .faq-list details{border-bottom:1px solid var(--line);padding:20px 0}.faq-list summary{list-style:none;display:grid;grid-template-columns:30px 1fr 18px;gap:18px;align-items:start;cursor:pointer}.faq-list summary::-webkit-details-marker{display:none}.faq-number{width:30px;height:30px;border-radius:50%;background:var(--peach-strong);color:var(--orange-dark);display:grid;place-items:center;font-size:9px;font-weight:800}.faq-list details[open] .faq-number{background:var(--orange);color:#fff}.faq-list summary b{padding-top:5px;font-family:'Manrope';font-size:16px}.faq-list summary i{font-style:normal;font-size:20px;color:var(--orange)}.faq-list details>p{padding:8px 36px 0 48px;color:var(--muted);font-size:12px;line-height:1.55}
  @media(max-width:850px){grid-template-columns:1fr;gap:38px;padding:70px 28px}.faq-intro h2{font-size:36px}
`;

export const DemoSection = styled.section`
  position:relative;padding:96px ${pagePadding};background:var(--dark);color:#fff;display:grid;grid-template-columns:480px minmax(0,1fr);gap:64px;overflow:hidden;
  .demo-food{position:absolute;left:0;top:0;bottom:0;width:min(620px,48%);height:100%;object-fit:cover}.demo-overlay{position:absolute;inset:0 auto 0 0;width:min(620px,48%);background:rgba(0,0,0,.38)}
  .demo-copy{position:relative;z-index:1;display:grid;gap:28px}.demo-copy h2{font-size:42px;line-height:1.1;text-shadow:0 2px 10px rgba(0,0,0,.5)}.demo-copy>p{font-size:19px;line-height:1.55;color:rgba(255,255,255,.88);text-shadow:0 1px 6px rgba(0,0,0,.4)}.demo-copy ul{list-style:none;padding:0;margin:0;display:grid;gap:12px}.demo-copy li{display:flex;align-items:center;gap:10px;font-size:14px;color:rgba(255,255,255,.88)}.demo-copy li span{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.09);display:grid;place-items:center}.privacy-note{padding:16px;border-radius:16px;background:rgba(255,255,255,.07);display:flex;align-items:flex-start;gap:10px;color:rgba(255,255,255,.8);font-size:10px;line-height:1.45}.privacy-note svg{flex:0 0 20px}
  >div:last-child{position:relative;z-index:2}
  @media(max-width:960px){grid-template-columns:1fr;padding:76px 48px;.demo-food,.demo-overlay{width:100%;opacity:.48}.demo-copy{max-width:620px}}
  @media(max-width:600px){padding:64px 20px;.demo-copy h2{font-size:34px}}
`;
export const FinalCta = styled.section`
  padding:64px ${pagePadding};background:var(--orange);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:40px;
  >div{max-width:760px;display:grid;gap:9px}h2{font-size:36px;line-height:1.1;font-weight:500}p{color:rgba(255,255,255,.82);font-size:14px;line-height:1.5}>a{min-height:52px;padding:0 22px;border-radius:999px;background:var(--dark);display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:700;white-space:nowrap}
  @media(max-width:760px){flex-direction:column;align-items:flex-start;padding:48px 24px;h2{font-size:30px}}
`;
export const Footer = styled.footer`
  padding:64px ${pagePadding} 28px;background:var(--dark);color:#fff;
  .footer-top{max-width:1264px;margin:auto;display:grid;grid-template-columns:360px repeat(3,180px);justify-content:space-between;gap:30px}.footer-brand{display:grid;align-content:start;gap:18px}.footer-brand>p{color:rgba(255,255,255,.56);font-size:12px;line-height:1.55}.socials{display:flex;gap:8px}.socials a{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.05);display:grid;place-items:center}.socials svg{width:16px}.footer-top>div:not(.footer-brand){display:grid;align-content:start;gap:12px}.footer-top b{font-size:11px}.footer-top a{color:rgba(255,255,255,.5);font-size:10px}.footer-top a:hover{color:#fff}.footer-bottom{max-width:1264px;margin:52px auto 0;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;gap:20px;color:rgba(255,255,255,.4);font-size:9px}.footer-bottom nav{display:flex;gap:18px}.footer-bottom a{color:inherit}
  @media(max-width:900px){.footer-top{grid-template-columns:1.4fr repeat(3,1fr)}}
  @media(max-width:700px){padding:48px 24px 24px;.footer-top{grid-template-columns:1fr 1fr}.footer-brand{grid-column:1/-1}.footer-bottom{flex-direction:column}}
  @media(max-width:430px){.footer-top{grid-template-columns:1fr}}
`;

export const PlanGrid = styled.div`
  max-width:1264px;margin:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;
  @media(max-width:760px){grid-template-columns:1fr}
`;
export const Plan = styled.article<{ $featured:boolean }>`
  min-height:510px;padding:32px;border:${({$featured})=>$featured?'1px solid #1e3a2f':'1px solid var(--line)'};border-radius:28px;background:${({$featured})=>$featured?'#1e3a2f':'#fff'};color:${({$featured})=>$featured?'#fff':'var(--ink)'};box-shadow:${({$featured})=>$featured?'0 16px 48px -8px rgba(30,58,47,.25)':'0 12px 32px -8px rgba(59,37,24,.1)'};display:flex;flex-direction:column;gap:22px;
  .plan-top{display:flex;align-items:center;justify-content:space-between}.plan-icon{width:44px;height:44px;border-radius:14px;background:${({$featured})=>$featured?'rgba(255,255,255,.09)':'var(--sand)'};display:grid;place-items:center}.plan-badge{padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.09);font-size:9px;font-weight:800}
  h3{font-size:36px}.description{min-height:44px;color:${({$featured})=>$featured?'rgba(255,255,255,.72)':'var(--muted)'};font-size:14px;line-height:1.55}.price{display:flex;align-items:flex-end;gap:4px}.price span{font-family:'Manrope';font-size:18px;color:${({$featured})=>$featured?'rgba(255,255,255,.72)':'var(--muted)'}.price strong{font-family:'Manrope';font-size:52px;line-height:1}.price small{padding-bottom:5px;color:${({$featured})=>$featured?'rgba(255,255,255,.72)':'var(--muted)'};font-size:14px}.trial{display:flex;align-items:center;gap:7px;color:${({$featured})=>$featured?'rgba(255,255,255,.72)':'#248c5a'};font-size:11px}
  .plan-cta{width:100%;min-height:54px;border:${({$featured})=>$featured?'0':'1px solid var(--line)'};border-radius:999px;background:${({$featured})=>$featured?'var(--lime)':'#fff'};color:${({$featured})=>$featured?'#1e3a2f':'var(--ink)'};display:flex;align-items:center;justify-content:center;gap:10px;font-size:15px;font-weight:700}
  ul{list-style:none;margin:0;padding:20px 0 0;border-top:1px solid ${({$featured})=>$featured?'rgba(255,255,255,.12)':'var(--line)'};display:grid;gap:12px}li{display:flex;align-items:center;gap:10px;color:${({$featured})=>$featured?'rgba(255,255,255,.85)':'var(--copy)'};font-size:13px}li svg{width:16px;color:${({$featured})=>$featured?'var(--lime)':'#248c5a'}}
`;
