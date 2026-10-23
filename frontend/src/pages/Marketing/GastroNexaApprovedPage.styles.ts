import styled from 'styled-components';
/** Scoped, faithful style port of the approved orange/white/black landing page. */
export const ApprovedPage = styled.div`
  min-height:100vh;
  background:#fffdfb;
  color:#191715;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  overflow-x:clip;
  -webkit-font-smoothing:antialiased;
  
& {--navy:#191513;--navy2:#28201b;--blue:#f26421;--blue2:#ff8c47;--sky:#fff0e4;--light:#fffcfa;--white:#fff;--ink:#191715;--muted:#6c625b;--line:#eee1d8;--green:#169f71;--gold:#fdbb55;--shadow:0 26px 70px rgba(15,39,92,.12);--radius:24px;scroll-behavior:smooth;scroll-padding-top:90px}
*{box-sizing:border-box}&{scroll-behavior:smooth}&{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);background:#fff;-webkit-font-smoothing:antialiased;overflow-x:hidden}a{text-decoration:none;color:inherit}button{font:inherit;cursor:pointer}svg{display:block}.icon{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}.container{width:min(1180px,calc(100% - 56px));margin:auto}.pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.03em}.section-eyebrow{color:var(--blue);text-transform:uppercase;letter-spacing:.17em;font-size:11px;font-weight:850}.section-title{font-size:clamp(31px,3.1vw,47px);line-height:1.13;letter-spacing:-.047em;margin:15px 0 15px;font-weight:820}.section-desc{max-width:560px;color:var(--muted);font-size:16px;line-height:1.7;margin:0}.section-center{text-align:center}.section-center .section-desc{margin:auto}.main-btn,.outline-btn,.light-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:12px;min-height:49px;padding:0 21px;font-size:13px;font-weight:800;transition:transform .2s,box-shadow .2s;white-space:nowrap}.main-btn{background:var(--blue);color:white;border:1px solid var(--blue);box-shadow:0 10px 23px rgba(49,93,255,.22)}.main-btn:hover,.outline-btn:hover,.light-btn:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(36,67,142,.18)}.outline-btn{border:1px solid #f8dfcd;color:var(--ink);background:white}.light-btn{background:#fff;color:#b94716;border:1px solid white}.main-btn .icon,.outline-btn .icon,.light-btn .icon{width:16px;height:16px}
.notice{min-height:34px;background:#151312;color:#fff5ec;display:flex;justify-content:center;align-items:center;gap:10px;font-size:11px;font-weight:600;padding:8px 16px;text-align:center}.notice strong{color:#ffbc8c}.notice-star{color:#71e7c4}.site-header{height:78px;background:rgba(255,255,255,.96);border-bottom:1px solid #fff5ec;position:sticky;top:0;z-index:99;backdrop-filter:blur(14px)}.header-flex{height:100%;display:flex;align-items:center;justify-content:space-between;gap:30px}.brand{display:inline-flex;align-items:center;gap:10px;white-space:nowrap}.brand-mark{display:grid;place-items:center;width:37px;height:37px;border-radius:11px;background:linear-gradient(140deg,#f0ac7d 0%,#ed651f 76%);color:white;box-shadow:0 8px 17px rgba(30,78,218,.22);position:relative;transform:rotate(-7deg)}.brand-mark::after{content:'';position:absolute;border:2px solid rgba(255,255,255,.25);inset:4px;border-radius:8px}.brand-mark b{font-size:18px;font-weight:940;letter-spacing:-5px;margin-right:4px;transform:rotate(7deg)}.brand-name{font-size:22px;font-weight:840;letter-spacing:-.07em;color:#191614}.brand-name span{color:#ed651f}.header-nav{display:flex;align-items:center;gap:31px;margin-left:auto}.header-nav a{font-weight:670;font-size:12px;color:#625d56;transition:color .16s}.header-nav a:hover{color:var(--blue)}.header-actions{display:flex;align-items:center;gap:12px}.header-actions .main-btn{min-height:44px;border-radius:10px;padding:0 17px;font-size:12px}.mobile-toggle{display:none;align-items:center;justify-content:center;border:1px solid var(--line);background:white;width:44px;height:44px;border-radius:11px;color:var(--ink)}
.hero{background:linear-gradient(133deg,#fffdfa 0%,#fff8f1 60%,#fff1e4 100%);position:relative;padding:91px 0 100px;overflow:hidden}.hero:before{content:'';position:absolute;width:670px;height:670px;border-radius:50%;right:-160px;top:-220px;background:radial-gradient(circle,#ffe3cb 0%,rgba(213,225,255,.15) 68%,transparent 72%)}.hero:after{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(#f3b788 1px,transparent 1px);background-size:24px 24px;mask-image:linear-gradient(90deg,transparent 54%,black 100%);opacity:.32}.hero-grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);align-items:center;gap:20px;position:relative;z-index:1}.hero-copy{padding:0 0 0 0;position:relative;z-index:3}.hero-badge{background:#fff0e2;border:1px solid #f6d3b6;padding:8px 13px;color:#da5418;margin-bottom:27px}.hero-badge .dot{width:6px;height:6px;border-radius:50%;background:#f0ac7d;box-shadow:0 0 0 4px #f3d4bd}.hero h1{font-size:clamp(48px,4.5vw,68px);font-weight:870;letter-spacing:-.07em;line-height:1.04;margin:0 0 24px;color:#181513;max-width:620px}.hero h1 em{font-style:normal;color:#f26421}.hero p{font-size:16px;line-height:1.77;color:#7e7972;margin:0;max-width:490px}.hero-buttons{display:flex;flex-wrap:wrap;gap:10px;margin:30px 0 25px}.hero-assurance{display:flex;flex-wrap:wrap;gap:17px;font-size:11px;font-weight:730;color:#6f6a63}.hero-assurance span{display:flex;align-items:center;gap:6px}.hero-assurance .icon{width:15px;height:15px;color:var(--green)}
.device-zone{height:580px;position:relative;min-width:0}.device-glow{position:absolute;top:16px;right:5px;width:510px;height:510px;border-radius:50%;background:radial-gradient(circle at 48% 48%,#ffd4b1 5%,#ffebd8 59%,transparent 71%);opacity:.73}.device-glow:after{content:'';width:395px;height:395px;border:1px solid #fac29a;border-radius:50%;position:absolute;top:55px;left:55px}.desktop-device{position:absolute;width:585px;max-width:100%;top:52px;right:-13px;background:#fff;border:8px solid #fff;border-radius:20px;box-shadow:0 35px 80px rgba(28,61,128,.22);overflow:hidden;transform:rotate(1deg)}.browser-top{height:29px;display:flex;align-items:center;gap:5px;background:#fff5ec;border-radius:11px 11px 0 0;padding:0 12px}.browser-top i{background:#ff827e;width:7px;height:7px;border-radius:50%}.browser-top i:nth-child(2){background:#ffc35d}.browser-top i:nth-child(3){background:#57cda7}.browser-top span{font-size:9px;font-weight:650;color:#a39e97;margin-left:12px}.dash{height:363px;display:grid;grid-template-columns:112px 1fr;background:#fff5ec}.dash-side{background:#201b18;color:#fff5ec;padding:19px 10px;display:flex;flex-direction:column;gap:9px}.dash-side .dash-mini-logo{font-weight:850;font-size:12px;letter-spacing:-.4px;color:#fff;padding:0 5px 20px}.dash-side .dash-mini-logo span{color:#f0ac7d}.dash-side .dash-side-item{display:flex;align-items:center;gap:7px;padding:8px 9px;border-radius:6px;font-weight:620;font-size:8px;color:#f0ac7d}.dash-side .dash-side-item.selected{background:#ed651f;color:white}.dash-side .dash-side-item .icon{width:12px;height:12px}.dash-content{padding:24px 21px;min-width:0}.dash-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:17px}.dash-head b{font-size:17px;letter-spacing:-.45px;color:#211b17}.dash-head small{font-size:9px;font-weight:700;color:#aaa59e}.dash-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.dash-stat{border:1px solid #fff5ec;border-radius:8px;background:#fff;padding:12px 10px;display:grid;gap:7px;min-height:78px}.dash-stat .tiny{font-size:8px;color:#9b968f;font-weight:630}.dash-stat strong{font-size:17px;color:#211b17;letter-spacing:-.5px}.dash-stat small{font-size:8px;color:#13ad7a}.dash-lower{display:grid;grid-template-columns:1.1fr .9fr;gap:12px;margin-top:12px}.dash-graph,.dash-orders{border:1px solid #fff5ec;background:white;border-radius:9px;padding:13px 12px;min-height:155px}.dash-panel-title{font-size:10px;font-weight:770;color:#725444}.graph-bars{display:flex;align-items:flex-end;gap:10px;height:98px;border-bottom:1px solid #fff5ec;padding:11px 7px 0}.graph-bars i{display:block;flex:1;max-width:26px;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#f8dfcd,#f26421)}.graph-bars i:nth-child(2n){background:#fff5ec}.graph-bars i:nth-child(1){height:33%}.graph-bars i:nth-child(2){height:58%}.graph-bars i:nth-child(3){height:48%}.graph-bars i:nth-child(4){height:80%}.graph-bars i:nth-child(5){height:64%}.graph-bars i:nth-child(6){height:96%}.graph-bars i:nth-child(7){height:70%}.dash-order{display:flex;justify-content:space-between;gap:6px;border-bottom:1px solid #fff5ec;padding:12px 0;font-size:8px;color:#7f7a73}.dash-order b{color:#725444}.dash-order em{font-style:normal;color:#119e6c;font-weight:800}.dash-order:last-child{border:0}.mobile-device{position:absolute;bottom:9px;left:-1px;width:214px;height:406px;background:white;border:7px solid #211b17;border-radius:33px;box-shadow:0 24px 50px rgba(20,33,73,.28);overflow:hidden;transform:rotate(-7deg);z-index:2}.mobile-device:before{content:'';width:66px;height:14px;border-radius:0 0 10px 10px;position:absolute;top:-1px;left:calc(50% - 33px);background:#211b17;z-index:2}.phone-head{height:111px;background:linear-gradient(125deg,#171412,#ea6423);color:white;padding:31px 13px 8px;position:relative;overflow:hidden}.phone-head:after{content:'🍔';position:absolute;right:3px;top:30px;font-size:60px;filter:drop-shadow(0 7px 4px rgba(0,0,0,.22));transform:rotate(-18deg)}.phone-head b{font-size:13px;display:block;position:relative;z-index:1}.phone-head span{display:block;font-size:8px;margin-top:3px;color:#fff0df;position:relative;z-index:1}.phone-&{padding:13px 11px 12px}.phone-body .title{font-size:10px;font-weight:800;color:#211b17}.phone-cats{display:flex;gap:5px;margin:10px 0}.phone-cats span{padding:6px 7px;border-radius:7px;background:#fff5ec;color:#837e77;font-size:7px;font-weight:700}.phone-cats span:first-child{background:#f26421;color:#fff}.phone-item{padding:8px 0;border-bottom:1px solid #fff5ec;display:grid;grid-template-columns:35px 1fr;gap:7px;align-items:center}.food-thumb{width:36px;height:36px;border-radius:7px;display:grid;place-items:center;font-size:19px;background:#ffead6}.phone-item:nth-child(2) .food-thumb{background:#f9e2be}.phone-item b{display:block;font-size:8px}.phone-item span{display:block;font-size:6.5px;color:#9f9a93;margin-top:3px}.phone-item strong{display:block;font-size:8px;color:#f26421;margin-top:2px}.phone-checkout{margin-top:13px;border-radius:7px;background:#f26421;color:white;display:flex;justify-content:space-between;padding:9px;font-size:8px;font-weight:780}.float-order{position:absolute;top:20px;right:-23px;z-index:4;background:#fff;border:1px solid #e7f1ee;border-radius:13px;box-shadow:0 18px 35px rgba(23,54,119,.14);display:flex;align-items:center;gap:10px;padding:11px 15px}.float-order .float-icon{display:grid;place-items:center;width:33px;height:33px;border-radius:10px;color:#008e65;background:#e4fbf2}.float-order b{display:block;font-size:11px;color:#211b17}.float-order span{font-size:9px;color:#99948d}.float-demo-note{position:absolute;right:4px;bottom:2px;color:#938e87;font-size:9px;font-weight:650}
.benefit-strip{background:#fff;border-bottom:1px solid #fff5ec;padding:30px 0}.benefit-row{display:grid;grid-template-columns:repeat(4,1fr);gap:19px}.benefit-mini{display:flex;align-items:center;gap:12px;border-right:1px solid #fff5ec}.benefit-mini:last-child{border:0}.mini-icon{background:#fff5ec;color:#ed651f;display:grid;place-items:center;width:40px;height:40px;border-radius:12px;flex-shrink:0}.mini-icon .icon{width:19px;height:19px}.benefit-mini strong{display:block;color:#725444;font-size:12px}.benefit-mini span{font-size:10px;color:#9b968f;display:block;margin-top:5px}
.features-section{padding:112px 0 111px;background:#fff}.feature-header{display:flex;justify-content:space-between;align-items:flex-end;gap:25px;margin-bottom:40px}.feature-header .section-title{max-width:625px}.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.feature-card{border:1px solid #fff5ec;padding:29px 27px;min-height:213px;border-radius:18px;background:#fff;transition:box-shadow .2s,transform .2s}.feature-card:hover{box-shadow:0 20px 45px rgba(34,68,140,.09);transform:translateY(-3px)}.feature-card .mini-icon{width:48px;height:48px;border-radius:14px;margin-bottom:26px}.feature-card:nth-child(2) .mini-icon,.feature-card:nth-child(5) .mini-icon{background:#e3f8f0;color:#119875}.feature-card:nth-child(3) .mini-icon{background:#fff1df;color:#df8a25}.feature-card h3{font-size:16px;letter-spacing:-.4px;margin:0 0 10px}.feature-card p{font-size:12px;color:#8e8982;line-height:1.7;margin:0}
.offer-section{padding:0 0 108px;background:#fff}.offer{border-radius:27px;background:linear-gradient(120deg,#191715 0%,#25201d 60%,#3c2921 100%);color:#fff;padding:43px 57px;display:grid;grid-template-columns:1fr 205px;align-items:center;position:relative;overflow:hidden;min-height:250px}.offer:before{content:'';position:absolute;right:-110px;top:-150px;border:1px solid rgba(255,255,255,.2);border-radius:50%;width:500px;height:500px}.offer:after{content:'';position:absolute;right:23px;top:-105px;border:1px solid rgba(255,255,255,.15);border-radius:50%;width:380px;height:380px}.offer-copy{position:relative;z-index:2}.offer .section-eyebrow{color:#f8dfcd}.offer h2{font-size:30px;letter-spacing:-1.3px;line-height:1.21;margin:12px 0}.offer p{color:#f3d4bd;max-width:570px;font-size:12px;line-height:1.7;margin:0}.offer h2 em{font-style:normal;color:#9bf1c9}.offer-badges{display:flex;align-items:center;gap:12px;margin-top:20px;flex-wrap:wrap}.offer-badges a{color:#fff;font-size:12px;font-weight:790;text-decoration:underline;text-underline-offset:4px}.offer .light-btn{min-height:39px;padding:0 17px;font-size:11px}.offer-badges a.light-btn{color:#b94716;text-decoration:none}.printer-illustration{width:185px;height:176px;position:relative;z-index:2;justify-self:center;transform:rotate(8deg)}.printer-paper{height:95px;width:101px;background:#fff;border-radius:5px;position:absolute;left:41px;top:0;z-index:1;box-shadow:0 3px 6px rgba(0,0,0,.05);padding:14px 12px}.printer-paper span{height:3px;background:#f8dfcd;display:block;margin-bottom:7px;border-radius:10px}.printer-paper span:nth-child(2){width:75%}.printer-paper span:nth-child(4){width:52%}.printer-body{position:absolute;width:150px;height:99px;bottom:3px;left:18px;border-radius:17px 17px 13px 13px;background:linear-gradient(160deg,#fff 0%,#fff5ec 100%);box-shadow:0 18px 25px rgba(0,0,0,.17);z-index:2}.printer-body:after{content:'';position:absolute;background:#f8dfcd;border-radius:5px;width:112px;height:12px;left:19px;top:39px;box-shadow:inset 0 2px 4px rgba(0,0,0,.08)}.printer-led{width:9px;height:9px;border-radius:50%;background:#3fe0aa;position:absolute;right:18px;top:16px}.printer-out{position:absolute;bottom:-6px;left:24px;width:105px;height:32px;border-radius:3px 3px 10px 10px;background:#fff;border-top:8px solid #f8dfcd;box-shadow:0 8px 12px rgba(0,0,0,.12)}
.product-section{background:#fff8f1;padding:112px 0}.product-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:36px}.product-heading .section-title{max-width:620px}.tabs{display:flex;gap:7px;padding:6px;background:#fff0e2;border:1px solid #fff5ec;width:max-content;border-radius:12px}.tabs button{padding:12px 14px;border:0;border-radius:8px;color:#7d7871;font-size:11px;font-weight:750;background:transparent}.tabs button.active{color:#d9581e;background:white;box-shadow:0 4px 12px rgba(33,59,131,.09)}.product-preview{display:grid;grid-template-columns:.55fr 1fr;background:#fff;border:1px solid #fff5ec;border-radius:27px;overflow:hidden;box-shadow:0 26px 75px rgba(20,48,105,.08);min-height:388px}.product-description{padding:55px 47px;background:linear-gradient(140deg,#191715,#30231d);color:white;display:flex;flex-direction:column;justify-content:center;gap:17px}.product-description .small-chip{width:max-content;border-radius:999px;padding:8px 11px;font-size:10px;color:#f8dfcd;background:#725444;font-weight:750}.product-description h3{font-size:31px;letter-spacing:-1.3px;line-height:1.1;margin:0}.product-description p{color:#f8dfcd;font-size:13px;line-height:1.75;margin:0}.product-description .usecase{display:flex;align-items:center;gap:8px;font-weight:730;font-size:11px;color:#a6f1d4}.product-pane{padding:28px;background:#fff5ec;min-width:0}.pane{display:none;height:100%}.pane.active{display:block}.pane-window{background:white;border:1px solid #f4e6dc;border-radius:16px;overflow:hidden;box-shadow:0 10px 28px rgba(22,55,123,.06);height:100%}.pane-top{background:#fff;border-bottom:1px solid #fff5ec;padding:14px 17px;display:flex;justify-content:space-between;align-items:center}.pane-top strong{font-size:12px}.pane-top span{font-size:10px;color:#99948d}.pane-&{padding:19px}.menu-categories{display:flex;gap:8px;margin-bottom:16px}.menu-categories span{padding:8px 11px;border-radius:999px;background:#fff5ec;color:#807b74;font-size:10px;font-weight:720}.menu-categories span:first-child{background:#ec6424;color:#fff}.menu-item-row{border:1px solid #fff5ec;background:#fff;border-radius:12px;display:grid;grid-template-columns:53px 1fr auto;gap:12px;align-items:center;padding:9px;margin-bottom:9px}.menu-item-row .food-thumb{width:53px;height:50px;font-size:28px}.menu-item-row strong{font-size:11px}.menu-item-row span{font-size:10px;color:#a9a49d;display:block;margin-top:4px}.menu-item-row b{font-size:11px;color:#f26421}.order-columns{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}.order-col{background:#fff5ec;border:1px solid #fff5ec;border-radius:12px;padding:12px;min-height:214px}.order-col h4{font-size:11px;margin:0 0 14px;color:#7d7871}.order-card{background:white;border:1px solid #fff5ec;padding:11px;border-radius:8px;margin-bottom:10px;box-shadow:0 5px 8px rgba(34,58,106,.04)}.order-card strong{font-size:11px;display:block}.order-card span{display:block;color:#ada8a1;font-size:9px;margin:8px 0}.order-card b{font-size:9px;color:#e45c22}.analytics-big{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.analytics-big>div{padding:17px;border:1px solid #fff5ec;border-radius:11px}.analytics-big small{display:block;font-size:9px;color:#9d9891}.analytics-big strong{font-size:19px;display:block;color:#725444;margin-top:8px}.analytics-bars{height:143px;display:flex;align-items:flex-end;gap:18px;padding:17px 18px 0;margin-top:22px;border-bottom:1px solid #fff5ec;background:repeating-linear-gradient(to top,#fff5ec 0,#fff5ec 1px,transparent 1px,transparent 34px)}.analytics-bars span{flex:1;border-radius:6px 6px 0 0;background:linear-gradient(0deg,#f26421,#f8dfcd)}.analytics-bars span:nth-child(1){height:42%}.analytics-bars span:nth-child(2){height:61%}.analytics-bars span:nth-child(3){height:48%}.analytics-bars span:nth-child(4){height:77%}.analytics-bars span:nth-child(5){height:63%}.analytics-bars span:nth-child(6){height:94%}.analytics-bars span:nth-child(7){height:80%}.analytics-bars span:nth-child(8){height:100%}
.steps-section{padding:110px 0;background:#fff}.steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:23px;margin-top:43px}.step-card{border:1px solid #fff5ec;background:#fff;border-radius:19px;padding:28px 26px;min-height:198px;position:relative}.step-num{font-weight:880;font-size:13px;color:var(--blue);width:43px;height:43px;border-radius:13px;background:#fff0e2;display:grid;place-items:center;margin-bottom:22px}.step-card h3{font-size:17px;letter-spacing:-.5px;margin:0 0 10px}.step-card p{font-size:12px;color:#959089;line-height:1.7;margin:0}.step-card.middle{background:#25201d;color:#fff;border-color:#25201d;box-shadow:0 20px 40px rgba(18,43,105,.15)}.step-card.middle .step-num{color:#fff;background:#f26421}.step-card.middle p{color:#f8dfcd}
.pricing-section{padding:110px 0 115px;background:#fff8f1}.price-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:stretch;margin-top:46px}.price-card{background:white;border:1px solid #fff5ec;border-radius:20px;padding:30px 27px;display:flex;flex-direction:column;position:relative;min-height:421px}.price-card.featured{border:2px solid #f26421;box-shadow:0 25px 62px rgba(36,77,199,.13);transform:translateY(-7px)}.price-card h3{font-size:22px;letter-spacing:-.8px;margin:0 0 6px}.price-card .plan-desc{font-size:11px;line-height:1.6;color:#99948d;min-height:54px;margin:0 0 14px}.price-card .price{display:flex;align-items:baseline;gap:3px;margin-bottom:16px}.price-card .price strong{font-size:37px;letter-spacing:-1.7px}.price-card .price span{font-size:12px;color:#9d9891}.price-card .trial{font-size:10px;color:#19916e;font-weight:750;margin-bottom:21px}.plan-features{padding:19px 0 21px;border-top:1px solid #fff5ec;margin:0;list-style:none;display:grid;gap:14px;flex:1}.plan-features li{display:flex;align-items:start;gap:9px;color:#76716a;font-size:11px;line-height:1.35}.plan-features .icon{width:15px;height:15px;flex:0 0 15px;color:#139d73}.price-card .main-btn,.price-card .outline-btn{width:100%;font-size:12px}.price-ribbon{position:absolute;top:-17px;right:20px;border-radius:999px;background:#f26421;color:white;font-size:9px;font-weight:850;padding:9px 13px}.price-note{font-size:11px;text-align:center;color:#a39e97;margin-top:25px;line-height:1.7}
.faq-section{padding:100px 0;background:white}.faq-grid{display:grid;grid-template-columns:.72fr 1fr;gap:70px}.faq-list details{border-bottom:1px solid #fff5ec;padding:18px 0}.faq-list summary{cursor:pointer;list-style:none;font-size:13px;font-weight:730;display:flex;align-items:center;justify-content:space-between;gap:16px}.faq-list summary::-webkit-details-marker{display:none}.faq-list summary:after{content:'+';font-size:22px;color:var(--blue);font-weight:440}.faq-list details[open] summary:after{content:'−'}.faq-list p{font-size:12px;color:#8f8a83;line-height:1.7;margin:11px 30px 0 0}.bottom-cta{background:linear-gradient(105deg,#ec5b19,#f47d2e);padding:60px 0;color:white}.bottom-row{display:flex;align-items:center;justify-content:space-between;gap:20px}.bottom-cta h2{font-size:31px;line-height:1.16;letter-spacing:-1.3px;max-width:660px;margin:0 0 12px}.bottom-cta p{font-size:12px;color:#f8dfcd;line-height:1.5;margin:0}.footer{background:#171412;color:white;padding:54px 0 25px}.footer-top{display:flex;align-items:flex-start;justify-content:space-between;gap:30px;padding-bottom:43px}.footer .brand-name{color:white}.footer-desc{max-width:365px;font-size:12px;line-height:1.8;color:#b8b3ac;margin:20px 0 0}.footer-links{display:flex;gap:70px}.footer-links h4{font-size:12px;color:#fff;margin:0 0 20px}.footer-links a{display:block;font-size:11px;color:#f8dfcd;margin:13px 0}.footer-bottom{border-top:1px solid rgba(255,255,255,.11);padding-top:20px;display:flex;align-items:center;justify-content:space-between;gap:20px;color:#a39e97;font-size:10px}
@media(max-width:1220px){.device-zone{transform:scale(.91);transform-origin:center center}.hero-grid{grid-template-columns:.92fr 1.08fr}.desktop-device{right:-50px}.float-order{right:-38px}}@media(max-width:990px){.container{width:min(850px,calc(100% - 40px))}.header-nav{gap:14px}.header-actions .main-btn{display:none}.hero{padding:60px 0 65px}.hero-grid{grid-template-columns:1fr}.hero-copy{max-width:700px}.hero h1{font-size:57px}.device-zone{height:540px;transform:scale(.92);transform-origin:center center;width:640px;max-width:100%;margin:auto}.desktop-device{right:0}.float-order{right:0}.benefit-row{grid-template-columns:repeat(2,1fr);gap:25px}.benefit-mini:nth-child(2){border-right:0}.feature-grid{grid-template-columns:repeat(2,1fr)}.product-heading{align-items:start;flex-direction:column}.faq-grid{gap:40px}}
@media(max-width:690px){.notice{font-size:10px}.container{width:calc(100% - 34px)}.site-header{height:65px}.brand-mark{height:34px;width:34px}.brand-name{font-size:19px}.mobile-toggle{display:flex}.header-nav{display:none;position:absolute;top:65px;left:0;right:0;background:white;box-shadow:0 22px 40px rgba(23,43,85,.13);padding:20px 18px;flex-direction:column;align-items:stretch;gap:0}.header-nav.open{display:flex}.header-nav a{display:block;padding:14px;font-size:14px}.hero{padding:47px 0 47px}.hero h1{font-size:43px;max-width:470px}.hero p{font-size:14px;line-height:1.75}.hero-badge{font-size:10px;margin-bottom:19px}.hero-buttons{margin:24px 0 20px}.main-btn,.outline-btn{padding:0 16px;min-height:47px;font-size:11px}.hero-assurance{gap:10px;font-size:10px}.device-zone{height:368px;width:100%;transform:scale(1);overflow:visible;margin-top:14px}.device-glow{width:350px;height:350px;right:-50px;top:2px}.device-glow:after{width:250px;height:250px;left:50px;top:50px}.desktop-device{width:94%;top:30px;right:-3px;border-width:5px;border-radius:13px}.browser-top{height:22px}.browser-top span{font-size:7px}.dash{height:245px;grid-template-columns:72px 1fr}.dash-side{padding:12px 6px;gap:4px}.dash-side .dash-mini-logo{font-size:8px;padding-bottom:10px}.dash-side .dash-side-item{font-size:0;padding:7px}.dash-side .dash-side-item .icon{width:10px;height:10px}.dash-content{padding:13px 10px}.dash-head b{font-size:11px}.dash-head small{font-size:7px}.dash-stats{gap:5px}.dash-stat{padding:6px;min-height:49px;gap:4px}.dash-stat .tiny{font-size:6px}.dash-stat strong{font-size:10px}.dash-stat small{font-size:6px}.dash-lower{grid-template-columns:1fr;gap:5px;margin-top:6px}.dash-graph{padding:8px;min-height:115px}.dash-orders{display:none}.dash-panel-title{font-size:8px}.graph-bars{height:78px}.mobile-device{width:128px;height:245px;bottom:0;left:0;border-width:4px;border-radius:20px}.mobile-device:before{height:9px;width:39px;left:calc(50% - 19px)}.phone-head{height:69px;padding:21px 7px 5px}.phone-head b{font-size:8px}.phone-head span{font-size:5px}.phone-head:after{font-size:37px;right:-3px;top:19px}.phone-&{padding:8px}.phone-body .title{font-size:7px}.phone-cats{gap:3px;margin:5px 0}.phone-cats span{font-size:5px;padding:4px}.phone-item{grid-template-columns:22px 1fr;gap:3px;padding:5px 0}.phone-item .food-thumb{width:21px;height:22px;font-size:12px}.phone-item b{font-size:5px}.phone-item span{font-size:4px}.phone-item strong{font-size:5px}.phone-checkout{font-size:5px;padding:6px;margin-top:7px}.float-order{top:16px;right:-4px;padding:6px 8px;gap:5px;border-radius:7px}.float-order .float-icon{width:20px;height:20px;border-radius:6px}.float-order .icon{width:12px;height:12px}.float-order b{font-size:7px}.float-order span{font-size:6px}.float-demo-note{bottom:1px;right:2px;font-size:7px}.benefit-strip{padding:22px 0}.benefit-row{grid-template-columns:repeat(2,1fr);gap:23px 12px}.benefit-mini{gap:9px}.benefit-mini .mini-icon{height:31px;width:31px;border-radius:9px}.benefit-mini .mini-icon .icon{width:16px;height:16px}.benefit-mini strong{font-size:10px}.benefit-mini span{font-size:8px}.features-section,.steps-section,.pricing-section,.product-section,.faq-section{padding:67px 0}.section-title{font-size:32px}.section-desc{font-size:13px}.feature-header{display:block;margin-bottom:25px}.feature-grid{grid-template-columns:1fr;gap:11px}.feature-card{min-height:auto;padding:22px 20px}.feature-card .mini-icon{margin-bottom:14px;height:40px;width:40px}.feature-card h3{font-size:15px}.offer-section{padding-bottom:65px}.offer{padding:29px 24px;grid-template-columns:1fr;min-height:0}.offer h2{font-size:25px}.offer p{font-size:11px}.printer-illustration{height:150px;margin-top:7px;transform:rotate(8deg) scale(.78);transform-origin:top center}.product-heading{margin-bottom:23px}.tabs{width:100%;overflow-x:auto}.tabs button{white-space:nowrap;flex:1;font-size:9px;padding:10px 8px}.product-preview{grid-template-columns:1fr;border-radius:19px}.product-description{padding:27px 24px;gap:10px}.product-description h3{font-size:24px}.product-description p{font-size:12px}.product-pane{padding:14px;height:290px}.pane-&{padding:12px}.pane-top{padding:10px}.menu-item-row{grid-template-columns:38px 1fr auto;padding:6px}.menu-item-row .food-thumb{width:38px;height:36px;font-size:21px}.menu-item-row strong{font-size:9px}.menu-item-row span{font-size:8px}.menu-item-row b{font-size:9px}.menu-categories span{font-size:8px;padding:7px}.order-col{padding:7px;min-height:194px}.order-col h4{font-size:8px}.order-card{padding:6px}.order-card strong{font-size:8px}.order-card span,.order-card b{font-size:7px}.analytics-big>div{padding:10px}.analytics-big small{font-size:7px}.analytics-big strong{font-size:13px}.steps-grid,.price-grid{grid-template-columns:1fr;gap:13px;margin-top:26px}.step-card{min-height:auto;padding:23px}.step-num{margin-bottom:15px}.price-card{min-height:0;padding:24px}.price-card.featured{transform:none}.faq-grid{grid-template-columns:1fr;gap:18px}.bottom-cta{padding:45px 0}.bottom-row{flex-direction:column;align-items:flex-start}.bottom-cta h2{font-size:26px}.footer{padding:40px 0 24px}.footer-top{flex-direction:column}.footer-links{gap:43px;flex-wrap:wrap}.footer-bottom{flex-direction:column;align-items:flex-start}}
@media(prefers-reduced-motion:reduce){&{scroll-behavior:auto}*{transition:none!important}}

/* GastroNexa original identity -- orange, black and white */
& {--navy:#181513;--navy2:#25201d;--blue:#f26421;--blue2:#ff8e4c;--sky:#fff0e3;--light:#fffaf5;--ink:#211b18;--muted:#6c625c;--line:#e8ded6;--shadow:0 24px 58px rgba(44,24,14,.10)}
&{background:#fffdfb}
.main-btn{background:#f26421;border-color:#f26421;color:#fff;border-radius:999px;box-shadow:0 12px 26px rgba(242,100,33,.24)}
.main-btn:hover{background:#df5317;box-shadow:0 14px 28px rgba(242,100,33,.24)}
.outline-btn{border-radius:999px;border-color:#e3cdbd;color:#221c18}
.light-btn{border-radius:999px;color:#ce4c16;background:#fff;border-color:#fff}
.notice{background:#181513;color:#f6ece5}
.notice strong{color:#ffbb8f}
.notice-star{color:#ff8c45}
.site-header{border-bottom:1px solid #efe4dc;background:rgba(255,255,255,.97)}
.brand{gap:6px}
.brand-mark{width:49px;height:46px;display:grid;place-items:center;transform:none;box-shadow:none;background:transparent;border-radius:0;flex:0 0 49px;color:#111}
.brand-mark::after{display:none}
.brand-mark .official-gx{width:49px;height:43px;display:block;filter:drop-shadow(0 1px 0 rgba(0,0,0,.1))}
.brand-name{letter-spacing:-.06em;color:#1a1715;font-weight:900;font-size:23px}
.brand-name span{color:#ec641f}
.header-nav a{color:#4a433f}
.header-nav a:hover{color:#d55217}
.hero{background:linear-gradient(116deg,#fffdfa 0%,#fff9f4 53%,#fff0e3 100%)}
.hero:before{background:radial-gradient(circle,#ffcfac 0%,rgba(255,211,183,.22) 67%,transparent 72%)}
.hero:after{background-image:radial-gradient(#edb28b 1px,transparent 1px);opacity:.32}
.hero-badge{background:#fff0e1;border-color:#f5d5bd;color:#c95319}
.hero-badge .dot{background:#f26421;box-shadow:0 0 0 4px #ffe0cd}
.hero h1{color:#1b1714;letter-spacing:-.065em}
.hero h1 em{color:#f26421}
.hero p{color:#655b55}
.hero-assurance{color:#625952}
.hero-assurance .icon{color:#f26421}
.device-glow{background:radial-gradient(circle at 48% 48%,#ffd3ae 6%,#ffead9 60%,transparent 71%)}
.device-glow:after{border-color:#f7cbaa}
.desktop-device{box-shadow:0 32px 76px rgba(47,25,13,.20)}
.dash-side{background:#1b1917;color:#fff}
.dash-side .dash-mini-logo span{color:#ff873c}
.dash-side .dash-side-item.selected{background:#ed6726;color:#fff}
.dash-side .dash-side-item{color:#c5b8ad}
.graph-bars i{background:linear-gradient(180deg,#ffbd88,#f26421)}
.graph-bars i:nth-child(2n){background:#f8dfcd}
.phone-head{background:linear-gradient(120deg,#171412,#ef6e2b)}
.phone-head span{color:#ffddc2}
.phone-cats span:first-child,.phone-checkout{background:#ef6421;color:#fff}
.float-order{box-shadow:0 16px 40px rgba(36,22,15,.15)}
.benefit-mini strong{color:#2a211c}
.mini-icon{background:#fff0e4;color:#e45c1d}
.feature-card:hover{box-shadow:0 16px 36px rgba(72,39,15,.09)}
.feature-card:nth-child(2) .mini-icon,.feature-card:nth-child(5) .mini-icon{background:#ffead9;color:#d7511d}
.feature-card:nth-child(3) .mini-icon{background:#211a17;color:#ffad71}
.offer{background:radial-gradient(circle at 100% 25%,#60311d 0%,#25201c 43%,#161412 100%)}
.offer .section-eyebrow,.offer h2 em{color:#ffae77}
.offer p{color:#e5d5c8}
.offer-badges a.light-btn{color:#c95018}
.printer-body{background:linear-gradient(160deg,#fff 0%,#e7dcd3 100%)}
.product-section,.pricing-section{background:#fff8f1}
.tabs{background:#f9e9dc;border-color:#f5ddca}
.tabs button.active{color:#cc531e}
.product-preview{border-color:#eedbd0;box-shadow:0 20px 55px rgba(58,30,13,.09)}
.product-description{background:linear-gradient(145deg,#211b17,#432a1e)}
.product-description .small-chip{background:rgba(255,141,65,.18);color:#ffc596}
.product-description p{color:#ebd7ca}
.product-description .usecase{color:#ffa770}
.product-pane{background:#fffaf6}
.menu-categories span:first-child{background:#f26421}
.menu-item-row b,.order-card b{color:#df591a}
.analytics-bars span{background:linear-gradient(0deg,#f26421,#ffa86d)}
.step-card.middle{background:#241c18;border-color:#241c18;box-shadow:0 17px 38px rgba(39,28,19,.17)}
.step-card.middle .step-num{background:#f26421}
.step-card.middle p{color:#e0cec4}
.price-card.featured{border-color:#ee6525;box-shadow:0 25px 56px rgba(189,85,35,.12)}
.price-ribbon{background:#ef6421}
.plan-features .icon{color:#e96222}
.bottom-cta{background:linear-gradient(115deg,#f36a24 0%,#e65116 100%)}
.bottom-cta p{color:#fff1e6}
.footer{background:#171412}
.footer .brand-name{color:#fff}
.footer .brand-mark{background:#fff;border-radius:13px;width:43px;height:43px;flex:0 0 43px}
.footer .brand-mark .official-gx{width:43px;height:39px;color:#151312}
.footer .brand-name span{color:#fa823c}
.footer-desc,.footer-links a,.footer-bottom{color:#c2b5ad}

:focus-visible{outline:3px solid rgba(242,100,33,.5);outline-offset:3px}
@media(max-width:690px){.brand-mark{width:40px;height:38px;flex-basis:40px}.brand-mark .official-gx{width:40px;height:36px}.brand-name{font-size:19px}.footer .brand-mark{width:40px;height:40px;flex-basis:40px}}
@media(max-width:690px){}

/* ===== V2: Site comercial completo com formulario inicial, identidade original ===== */
& { --orange:#f26421; --orange-deep:#de4f13; --charcoal:#171412; --soft-orange:#fff2e7; --beige:#fffaf6; }
&{scroll-padding-top:100px}
&{color:#211b17;background:#fffdfb}
button,input,select{font:inherit}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid rgba(242,100,33,.5);outline-offset:3px}
.site-header{background:rgba(22,20,19,.97);border-bottom:1px solid #332722;box-shadow:0 5px 24px rgba(23,14,9,.13)}
.header-nav a{color:#f1e7e0}
.header-nav a:hover{color:#ff9a62}
.site-header .brand-name{color:#fff}
.site-header .brand-name span{color:#ff7933}
.site-header .brand-mark{background:transparent!important;border-radius:0!important;box-shadow:none;transform:none;color:#fff!important}
.site-header .brand-mark .official-gx{color:#fff!important;filter:none!important;width:49px;height:43px}
.site-header .main-btn{background:#f26421;border:1px solid #f26421}
.notice{background:#0f0e0d;min-height:30px}
.mobile-toggle{background:#24201e;color:white;border-color:#4f3730}
.hero{padding:72px 0 74px;background:linear-gradient(120deg,#fffdfb 4%,#fffaf6 48%,#fff0e4 100%)}
.hero::before{width:590px;height:590px;top:-200px;right:-65px;background:radial-gradient(circle,#ffdfc5,rgba(255,223,197,.22) 66%,transparent 73%)}
.hero::after{opacity:.26;mask-image:linear-gradient(90deg,transparent 49%,black 100%)}
.hero-grid-lead{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:68px;align-items:center;max-width:1220px}
.hero-copy{padding:4px 0 0}
.hero-copy h1{font-size:clamp(43px,4.8vw,71px);font-weight:900;line-height:1.03;letter-spacing:-.073em;margin-bottom:23px}
.hero-copy p{max-width:510px;font-size:17px;color:#685c55;line-height:1.65}
.hero-copy p strong{color:#171412}
.hero-badge{font-size:11px;margin-bottom:25px;background:#fff1e8}
.hero-buttons{margin:29px 0 25px;gap:11px}
.hero-buttons .main-btn,.hero-buttons .outline-btn{min-height:53px}
.hero-assurance{gap:11px 18px;line-height:1.6}
.hero-social-proof{margin-top:40px;display:flex;align-items:center;gap:15px}
.social-proof-bubbles{display:flex;flex-shrink:0;padding-left:6px}
.social-proof-bubbles span{width:36px;height:36px;margin-left:-8px;border:3px solid white;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#ffe5ce,#fff8f2);box-shadow:0 5px 12px rgba(120,61,28,.12);font-size:18px}
.hero-social-proof>div:last-child{display:grid;gap:3px}
.hero-social-proof b{font-size:11px;font-weight:800;color:#3b2a21}
.hero-social-proof small{font-size:10px;color:#8d786b}
.hero-sparkle{position:absolute;pointer-events:none;color:#f26421;z-index:1;animation:sparkSpin 18s linear infinite}
.sparkle-a{font-size:47px;top:45px;left:47%}.sparkle-b{font-size:25px;bottom:42px;left:15%;opacity:.45}
.lead-card{position:relative;z-index:2;padding:28px 29px 25px;background:#fff;border:1px solid #f8d8c6;border-top:5px solid #f26421;border-radius:25px;box-shadow:0 24px 65px rgba(101,52,23,.12),0 6px 22px rgba(68,29,13,.04);width:100%;max-width:525px;margin-left:auto}
.lead-card::before{content:'';position:absolute;width:90px;height:90px;right:-15px;top:-19px;border-radius:50%;background:#ffbd93;filter:blur(30px);opacity:.35;z-index:-1}
.lead-badge{font-size:10px;font-weight:850;letter-spacing:.14em;color:#ed5f1e;margin-bottom:14px}
.lead-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:19px}
.lead-heading h2{font-size:clamp(24px,2.1vw,31px);line-height:1.13;letter-spacing:-.055em;font-weight:900;max-width:380px;margin:0}
.lead-heading h2 em{font-style:normal;color:#f26421}
.lead-heading p{color:#81746d;font-size:12px;line-height:1.5;margin:9px 0 0}
.lead-icon{width:49px;height:49px;flex:0 0 49px;display:grid;place-items:center;background:#fff0e5;color:#e75b1b;border-radius:16px;transform:rotate(8deg)}
.lead-icon .icon{width:24px;height:24px}
.lead-form{display:grid;gap:13px}
.lead-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px 12px}
.lead-field{display:grid;align-content:start;gap:6px;min-width:0}
.lead-field>span{font-size:10.5px;font-weight:800;color:#514139}
.lead-field b{color:#ec6021}
.lead-field input,.lead-field select{width:100%;min-width:0;height:43px;padding:0 11px;border:1px solid #eadfd7;border-radius:9px;outline:none;background:#fffcfa;color:#271c16;font-size:12px;transition:border-color .18s,box-shadow .18s}
.lead-field input::placeholder{color:#a79d96;opacity:1}
.lead-field input:hover,.lead-field select:hover{border-color:#e8bca5}
.lead-field input:focus,.lead-field select:focus{border-color:#f26421;box-shadow:0 0 0 3px #ffe5d6}
.lead-field select{appearance:auto}
.lead-channels{margin:0;padding:0;border:0;min-width:0}
.lead-channels legend{font-size:10.5px;font-weight:800;color:#514139;margin-bottom:9px}
.lead-channel-options{display:flex;flex-wrap:wrap;gap:8px}
.lead-channel-options label{position:relative;cursor:pointer}
.lead-channel-options input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
.lead-channel-options span{display:flex;align-items:center;gap:6px;border:1px solid #eee3da;border-radius:99px;background:#fffaf6;padding:8px 12px;color:#6d5e56;font-weight:750;font-size:11px;transition:all .16s}
.lead-channel-options span::before{content:'+';display:grid;place-items:center;width:12px;height:12px;border:1px solid #cbb8ae;border-radius:50%;font-size:11px;line-height:1}
.lead-channel-options input:checked+span{background:#fff0e5;color:#e15c1b;border-color:#f3b38b}
.lead-channel-options input:checked+span::before{content:'✓';border-color:transparent;background:#f26421;color:white;font-size:9px}
.lead-channel-options input:focus-visible+span{outline:3px solid #ffc29f;outline-offset:2px}
.lead-consent{display:flex;gap:10px;align-items:flex-start;cursor:pointer;font-size:10px;line-height:1.45;color:#75695f}
.lead-consent>input{accent-color:#ed5e1d;width:14px;height:14px;flex:0 0 14px;margin:0}
.lead-consent a{text-decoration:underline;color:#c24d18;font-weight:750}
.lead-submit{width:100%;border-radius:12px;min-height:52px!important;margin-top:3px;font-size:13px}
.lead-submit .icon{width:16px;height:16px}
.lead-footnote{display:flex;align-items:start;gap:7px;margin:0!important;max-width:none!important;font-size:10px!important;line-height:1.5!important;color:#93867b!important}
.lead-footnote .icon{width:15px;height:15px;flex:0 0 15px;color:#17976a}
.lead-feedback{min-height:0;margin:0!important;color:#c8521a!important;font-weight:700;font-size:11px!important}
.showcase-section{position:relative;padding:90px 0 90px;background:radial-gradient(ellipse at 78% 35%,#fff1e4,#fffaf6 46%,#fffefb 76%);overflow:hidden;scroll-margin-top:90px}
.showcase-section::after{content:'';position:absolute;right:-185px;top:110px;width:420px;height:420px;border:1px solid #ffdecb;border-radius:50%;pointer-events:none}
.showcase-grid{display:grid;grid-template-columns:minmax(0,.74fr) minmax(0,1.26fr);gap:20px;align-items:center;position:relative;z-index:1}
.showcase-copy{align-self:center;padding:12px 0 20px}
.showcase-copy h2{font-size:clamp(31px,3.15vw,46px);line-height:1.08;letter-spacing:-.06em;margin:15px 0;font-weight:850}
.showcase-copy h2 em{font-style:normal;color:#f26421}
.showcase-copy p{font-size:15px;line-height:1.65;color:#796b62;max-width:375px}
.showcase-tags{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin:22px 0}
.showcase-tags span{padding:8px 12px;border-radius:10px;border:1px solid #f4ddcf;background:rgba(255,255,255,.87);color:#514237;font-size:12px;font-weight:750;box-shadow:0 8px 20px rgba(107,58,31,.05)}
.showcase-link{font-size:13px;color:#e65e1c;font-weight:850;text-decoration:none;display:inline-flex;align-items:center;gap:7px}
.showcase-link:hover{text-decoration:underline}
.cartoon-chef{width:210px;height:192px;margin:14px 0 -28px;position:relative;filter:drop-shadow(0 12px 20px rgba(127,62,17,.1))}
.cartoon-chef>svg{width:100%;height:100%}
.chef-bubble{position:absolute;right:-94px;top:22px;width:128px;border-radius:16px;padding:10px 12px;background:white;border:1px solid #f5dfd0;box-shadow:0 12px 28px rgba(67,34,15,.08);color:#e05b1b;font-size:11px;font-weight:830;transform:rotate(6deg);animation:softBob 5.5s ease-in-out infinite}
.showcase-visual{min-width:0;position:relative}
.showcase-visual .device-zone{height:550px;margin:0;transform:none;max-width:unset;width:100%}
.showcase-visual .desktop-device{top:55px;right:0;width:min(575px,96%)}
.showcase-visual .mobile-device{bottom:10px;left:4px}
.showcase-visual .float-order{right:-4px}
.showcase-visual .device-glow{top:12px;right:0}
.feature-card,.step-card,.price-card,.benefit-mini,.cartoon-chef,.lead-card{transition:transform .24s ease,box-shadow .24s ease}
.feature-card:hover,.step-card:hover{transform:translateY(-5px)}
.price-card:hover{transform:translateY(-5px)}
.price-card.featured:hover{transform:translateY(-10px)}
.main-btn{background:linear-gradient(110deg,#f26421 0%,#ff7b2b 96%);box-shadow:0 12px 26px rgba(227,78,21,.22)}
.main-btn:hover{box-shadow:0 14px 30px rgba(227,78,21,.27)}
.hero-copy .hero-badge{animation:enterUp .75s ease both}
.lead-card{animation:cardEnter .75s cubic-bezier(.18,.8,.25,1) both}
.showcase-visual .desktop-device{animation:softBob 7s ease-in-out infinite}
.showcase-visual .mobile-device{animation:phoneBob 6s ease-in-out infinite}
.showcase-visual .float-order{animation:softBob 4.5s ease-in-out infinite}
.graph-bars i{transform-origin:bottom;animation:barRise .9s cubic-bezier(.15,.8,.3,1) backwards}
.graph-bars i:nth-child(2){animation-delay:.1s}.graph-bars i:nth-child(3){animation-delay:.2s}.graph-bars i:nth-child(4){animation-delay:.3s}.graph-bars i:nth-child(5){animation-delay:.4s}.graph-bars i:nth-child(6){animation-delay:.5s}.graph-bars i:nth-child(7){animation-delay:.6s}
[data-reveal]{opacity:1;transform:none}
&.js-motion [data-reveal]:not(.in-view){opacity:0;transform:translateY(28px)}
&.js-motion [data-reveal]{transition:opacity .7s ease,transform .7s cubic-bezier(.21,.64,.23,1)}
&.js-motion .lead-card[data-reveal]{transition:opacity .7s ease .12s,transform .7s cubic-bezier(.21,.64,.23,1) .12s}
@keyframes enterUp{from{opacity:0;transform:translateY(13px)}to{opacity:1;transform:translateY(0)}}
@keyframes cardEnter{from{opacity:0;transform:translateY(20px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes sparkSpin{to{transform:rotate(360deg)}}
@keyframes softBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes phoneBob{0%,100%{transform:rotate(-7deg) translateY(0)}50%{transform:rotate(-7deg) translateY(-7px)}}
@keyframes barRise{from{transform:scaleY(.1)}to{transform:scaleY(1)}}
@media(max-width:1220px){
  .hero-grid-lead{grid-template-columns:minmax(0,1fr) minmax(0,.94fr);gap:30px}
  .hero-copy h1{font-size:clamp(42px,5vw,64px)}
  .showcase-visual .device-zone{transform:scale(.88);transform-origin:center right}
}
@media(max-width:990px){
  .hero-grid-lead{grid-template-columns:1fr;gap:33px}
  .hero-copy{max-width:760px}
  .hero-copy h1{max-width:690px}
  .lead-card{max-width:none;margin:0 auto}
  .lead-heading h2{max-width:unset}
  .lead-field-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .showcase-grid{grid-template-columns:1fr;gap:15px}
  .showcase-copy{padding-bottom:0}
  .showcase-copy h2{max-width:670px}
  .showcase-copy p{max-width:640px}
  .cartoon-chef{display:none}
  .showcase-visual{min-height:525px}
  .showcase-visual .device-zone{transform:none;width:min(700px,100%);margin:auto;max-width:700px}
  .showcase-visual .desktop-device{right:0}
}
@media(max-width:690px){
  .site-header .brand-mark{color:#fff!important;width:38px;height:36px;flex-basis:38px}
  .site-header .brand-mark .official-gx{width:39px;height:36px}
  .site-header .brand-name{font-size:19px}
  .header-nav{background:#1c1715;box-shadow:0 18px 36px rgba(20,10,5,.28);border-bottom:1px solid #4a342a}
  .header-nav a{color:#fff0e5}
  .header-nav a:hover{color:#ff9d61}
  .hero{padding:49px 0 60px}
  .hero-grid-lead{gap:28px}
  .hero-copy h1{font-size:clamp(35px,9.1vw,48px);line-height:1.05;margin-bottom:16px}
  .hero-copy p{font-size:14px;line-height:1.64}
  .hero-social-proof{margin-top:25px}
  .hero-buttons .main-btn,.hero-buttons .outline-btn{font-size:11px;padding:0 12px}
  .hero-buttons{gap:9px}
  .lead-card{padding:24px 17px 20px;border-radius:20px}
  .lead-heading h2{font-size:25px}
  .lead-icon{width:42px;height:42px;flex-basis:42px}
  .lead-field-grid{grid-template-columns:1fr 1fr;gap:12px 9px}
  .lead-field input,.lead-field select{font-size:11px;height:42px;padding:0 9px}
  .lead-field>span{font-size:10px}
  .lead-channel-options{gap:6px}
  .lead-channel-options span{font-size:10px;padding:7px 10px}
  .showcase-section{padding:63px 0 52px}
  .showcase-copy h2{font-size:34px}
  .showcase-visual{min-height:350px}
  .showcase-visual .device-zone{height:365px;margin:0 auto;transform:none;max-width:100%;width:100%}
  .showcase-visual .desktop-device{top:29px;right:-4px;width:93%}
  .showcase-visual .mobile-device{bottom:0;left:0}
  .showcase-visual .float-order{right:0}
  .hero-sparkle{display:none}
}
@media(max-width:390px){
  .hero-buttons{display:grid;grid-template-columns:1fr 1fr}
  .hero-buttons a{padding-left:8px;padding-right:8px;white-space:normal;text-align:center;line-height:1.2}
  .lead-field-grid{grid-template-columns:1fr}
  .showcase-tags{gap:7px}
  .showcase-copy h2{font-size:30px}
}
@media(max-width:1040px) and (min-width:691px){
  .price-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .price-card.featured{grid-column:1/-1}
}
@media(max-width:690px){
  .hero{padding:37px 0 47px}
  .hero-grid-lead{gap:18px}
  .hero-badge{margin-bottom:14px}
  .hero-copy h1{margin-bottom:13px}
  .hero-copy p{font-size:13.6px;line-height:1.55}
  .hero-buttons{margin:17px 0 15px}
  .hero-social-proof{display:none}
  .lead-card{margin-top:4px}
  .price-grid{grid-template-columns:1fr}
  .price-card.featured{grid-column:auto}
}
.footer .brand-mark{background:transparent!important;border-radius:0!important;color:#fff!important;box-shadow:none!important}
.footer .brand-mark .official-gx{color:#fff!important}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
  &.js-motion [data-reveal]:not(.in-view){opacity:1;transform:none}
}


/* GX branding enhancements. *//* Inline official GX paths eliminate browser differences caused by <use> in local/mobile previews. */
.site-header .brand,.footer .brand{display:inline-flex!important;visibility:visible!important;align-items:center;flex-shrink:0;opacity:1!important}
.site-header .brand-mark,.site-header .brand-name{display:inline-grid;visibility:visible!important;opacity:1!important}
.site-header .brand-mark{place-items:center;background:transparent!important}
.site-header .official-gx{display:block!important;color:white!important;fill:currentColor!important;min-width:30px}
.site-header .brand-name{display:inline!important;white-space:nowrap;font-size:23px;font-weight:900;color:white!important;letter-spacing:-.055em}
.site-header .brand-name span{color:#ff7a36!important}

.phone-powered{height:24px;display:flex;align-items:center;justify-content:center;gap:3px;background:#fff8f2;color:#38302a;font-size:7px;font-weight:750;letter-spacing:-.01em;white-space:nowrap;border-bottom:1px solid #f6e4d8}
.phone-powered svg{color:#241e19;width:15px;height:13px;display:block}
.phone-powered span strong{color:#f26421}

@media(max-width:690px){
  /* Make official branding the first and most prominent mobile header item. */
  .notice{display:none!important}
  .site-header{height:72px!important;top:0;position:sticky;z-index:99}
  .site-header .header-flex{height:72px!important;min-width:0;gap:8px}
  .site-header .brand{display:inline-flex!important;gap:5px!important;min-width:0;max-width:calc(100% - 68px)}
  .site-header .brand-mark{display:grid!important;width:41px;height:41px;flex:0 0 41px;color:#fff!important}
  .site-header .brand-mark .official-gx{width:40px!important;height:38px!important}
  .site-header .brand-name{font-size:21px!important;line-height:1.1;letter-spacing:-.06em}
  .site-header .mobile-toggle{width:44px;height:44px;flex:0 0 44px;display:flex!important}
  .site-header .header-nav{top:72px;padding:14px 19px 19px}

.mobile-menu-brand svg{width:29px;height:27px;fill:currentColor;color:#fff}

.phone-powered{height:23px;font-size:7px}
}
@media(max-width:355px){
  .site-header .brand-mark{width:33px;height:34px;flex-basis:33px}
  .site-header .brand-mark .official-gx{width:33px!important;height:32px!important}
  .site-header .brand-name{font-size:18px!important}
}


/* Floating functional illustration: a tiny received-order card instead of an abstract asterisk. */
.hero-order-sticker{position:absolute;top:41px;left:calc(50% - 109px);width:169px;min-height:64px;padding:9px 12px 9px 9px;display:flex;align-items:center;gap:8px;z-index:1;border:1px solid #f7d9c7;border-radius:18px;background:linear-gradient(145deg,#fff 35%,#fff7f2 100%);box-shadow:0 13px 29px rgba(114,54,21,.12),0 2px 6px rgba(114,54,21,.07);transform:rotate(-6deg);pointer-events:none;animation:orderStickerFloat 5s ease-in-out infinite}
.sticker-receipt{display:grid;place-items:center;width:45px;height:45px;flex:0 0 45px;border-radius:13px;background:#fff0e6}
.sticker-receipt svg{width:43px;height:43px}
.sticker-message{display:flex;flex-direction:column;gap:3px;min-width:0}
.sticker-message strong{color:#211914;font-size:11px;line-height:1.1;white-space:nowrap;font-weight:850}
.sticker-message small{font-size:9px;color:#c6652f;line-height:1.2;white-space:nowrap;font-weight:700}
.sticker-spark{position:absolute;right:-8px;top:-8px;width:18px;height:18px;background:#ffb077;border:4px solid #fffaf6;border-radius:50%;box-shadow:0 2px 4px #dda37c55}
@keyframes orderStickerFloat{0%,100%{transform:rotate(-6deg) translateY(0)}50%{transform:rotate(-4deg) translateY(-7px)}}
@media(max-width:1100px){.hero-order-sticker{display:none}}
@media(prefers-reduced-motion:reduce){.hero-order-sticker{animation:none}}

  
  /* The approved layout, with existing form/plan components mounted inside. */
  .lead-card{padding:0;border-top:3px solid #f26421;border-radius:25px;overflow:visible;background:#fff;box-shadow:0 22px 62px rgba(75,37,14,.12)}
  #gx-lead-root > div{position:relative;z-index:2;padding:27px 26px;border-radius:22px;background:#fff;box-shadow:none;color:#221c19}
  #gx-lead-root h3{font-size:25px;line-height:1.2;letter-spacing:-.04em}
  #gx-lead-root h3 em{font-style:normal;color:#f26421}
  #gx-lead-root input:not([type='checkbox']),#gx-lead-root select,#gx-lead-root textarea{min-height:42px;padding:10px 12px;font-size:12px;border-radius:10px}
  #gx-lead-root fieldset{row-gap:11px}
  #gx-lead-root label{font-size:11px}
  #gx-lead-root button[type='submit']{min-height:48px;border-radius:12px}
  #gx-pricing-root>.price-grid{width:100%}
  #gx-pricing-root .price-card{min-width:0}
  #gx-pricing-root .price-card details{padding-top:8px;border-top:1px solid #eee0d8;margin:8px 0}
  #gx-pricing-root .price-card details summary{font-size:12px;font-weight:750;color:#d75c1f;cursor:pointer}
  #gx-pricing-root .price-card details li{padding-top:5px}
  #gx-pricing-root .price-card .plan-features{margin-bottom:16px}
  #gx-pricing-root .price-card .bonus-detail{color:#af541e;font-size:11px}
  .site-header .brand-name{color:#fff!important}
  .site-header .brand-name span{color:#ff7a36!important}
  .site-header .brand-mark .official-gx{color:#fff!important}
  @media(max-width:690px){
    .lead-card{border-radius:21px}
    #gx-lead-root>div{padding:20px 15px}
    #gx-lead-root h3{font-size:22px}
  }
  @media(prefers-reduced-motion:reduce){
    *,*::before,*::after{animation:none!important;transition:none!important}
  }


/* Printer illustration: recognizable 58 mm thermal receipt printer, not floating paper. */
.offer .printer-illustration{
  width:220px;height:195px;transform:rotate(-5deg);
  filter:drop-shadow(0 19px 19px rgba(0,0,0,.24));
}
.offer .printer-paper{
  left:70px;top:0;width:90px;height:102px;
  border-radius:5px 5px 3px 3px;
  box-shadow:0 4px 5px rgba(25,15,10,.12);
  transform:rotate(1.5deg);
  padding:13px 12px;
}
.offer .printer-paper span{height:3px;margin-bottom:8px;background:#e5b79b}
.offer .printer-paper span:first-child{height:6px;background:#e7722e;width:62%}
.offer .printer-body{
  position:absolute;left:20px;bottom:0;
  width:186px;height:110px;border-radius:33px 33px 22px 22px;
  background:linear-gradient(147deg,#fff 8%,#eae6e2 61%,#bcb5ae 100%);
  border:2px solid rgba(255,255,255,.8);
  box-shadow:inset 0 5px 5px #fff, inset -8px -10px 16px rgba(70,51,42,.17),0 15px 25px rgba(0,0,0,.24);
  z-index:2;
}
.offer .printer-body::before{
  content:'';position:absolute;top:7px;left:15px;right:15px;height:53px;
  border-radius:28px 28px 13px 13px;
  background:linear-gradient(180deg,#37302d,#231d1b);
  border:3px solid #bdb6af;
  box-shadow:0 4px 0 rgba(68,54,45,.24);
}
.offer .printer-body::after{
  content:'';position:absolute;z-index:3;left:34px;top:56px;
  width:114px;height:11px;border-radius:3px;
  background:linear-gradient(#171312,#51443c);
  box-shadow:inset 0 2px 3px #0c0909;
}
.offer .printer-led{
  position:absolute;z-index:4;right:23px;bottom:23px;top:auto;
  height:10px;width:10px;background:#36c995;
  box-shadow:0 0 0 4px #ece6dd,0 0 12px #36c995;
}
.offer .printer-out{
  position:absolute;z-index:4;bottom:-3px;left:45px;
  width:95px;height:26px;border-radius:5px 5px 13px 13px;
  background:linear-gradient(180deg,#efe6dc,#fff);
  border-top:5px solid #f47b3b;
  box-shadow:0 7px 10px rgba(17,9,4,.16);
}
.offer .printer-58mm{
  position:absolute;bottom:19px;left:19px;z-index:4;
  font-size:10px;letter-spacing:.06em;font-weight:900;color:#665448;
}
@media(max-width:690px){
  .offer .printer-illustration{
    width:220px;height:195px;margin:4px auto 0;
    transform:rotate(-5deg) scale(.86);
    transform-origin:center center;
  }
}

`;