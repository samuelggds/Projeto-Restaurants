import styled from 'styled-components';

export const Page = styled.div<{
  $primary: string;
  $embedded?: boolean;
  $customerPageVariant?: boolean;
}>`
  --config-primary: ${({ $primary }) => $primary || '#d64d08'};
  position: ${({ $embedded }) => ($embedded ? 'relative' : 'fixed')};
  inset: ${({ $embedded }) => ($embedded ? 'auto' : '0')};
  z-index: ${({ $embedded }) => ($embedded ? '1' : '600')};
  width: 100%;
  min-width: 0;
  height: ${({ $embedded }) => ($embedded ? 'auto' : '100dvh')};
  min-height: ${({ $embedded }) => ($embedded ? '0' : '100svh')};
  overflow-x: hidden;
  overflow-y: ${({ $embedded }) => ($embedded ? 'visible' : 'auto')};
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scroll-padding-top: calc(90px + env(safe-area-inset-top, 0px));
  scroll-padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  background:
    radial-gradient(
      circle at 8% 0%,
      color-mix(in srgb, var(--config-primary) 9%, transparent),
      transparent 27rem
    ),
    #f7f7f7;
  color: #211d19;
  font-family: inherit;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  @supports not (height: 100dvh) {
    height: ${({ $embedded }) => ($embedded ? 'auto' : '100vh')};
  }

  ${({ $customerPageVariant }) =>
    $customerPageVariant
      ? `
        background:#fdfcf9;

        > header{display:none}

        .product-layout{
          width:min(1120px,calc(100% - 48px));
          margin:0 auto;
          padding:40px 0 80px;
          grid-template-columns:536px 536px;
          gap:48px;
          align-items:start;
        }

        .product-summary{
          position:relative;
          top:auto;
          overflow:visible;
          border:0;
          border-radius:0;
          background:transparent;
          box-shadow:none;
        }

        .product-summary > img{
          width:536px;
          height:360px;
          border-radius:16px;
          object-fit:cover;
        }

        .product-summary > div{display:none}

        .product-image-caption{
          display:block;
          margin-top:12px;
          color:#8b837c;
          text-align:center;
          font-size:11px;
          line-height:16px;
        }

        .product-summary button[aria-label="Voltar ao cardápio"]{
          display:none;
        }

        .product-form{
          padding:28px;
          gap:24px;
          border:1px solid #ece7e1;
          border-radius:16px;
          background:#fff;
          box-shadow:0 6px 24px rgba(0,0,0,.04);
          animation:customerConfiguratorEnter 260ms cubic-bezier(.2,.8,.2,1) both;
        }

        @keyframes customerConfiguratorEnter{
          from{opacity:0;transform:translateY(8px)}
          to{opacity:1;transform:translateY(0)}
        }

        .product-details{
          padding:0 0 24px;
          border:0;
          border-bottom:1px solid #ece7e1;
          border-radius:0;
          gap:12px;
        }

        .product-group{
          padding:0 0 24px;
          border-width:0 0 1px;
          border-radius:0;
          box-shadow:none;
        }

        .product-group-header{margin-bottom:12px}
        .product-option-list{grid-template-columns:1fr;gap:8px}
        .product-option{min-height:45px;border-radius:8px}
        .product-option > label{min-height:45px;padding:10px 14px}
        .product-option,
        .product-bottom-bar > button,
        .product-quantity button{
          transition:transform 160ms ease,border-color 160ms ease,background-color 160ms ease,box-shadow 160ms ease;
        }
        .product-bottom-bar > button:not(:disabled):hover{transform:translateY(-1px)}
        .product-bottom-bar > button:not(:disabled):active{transform:translateY(0) scale(.99)}

        .product-observation{
          padding:0;
          border:0;
          border-radius:0;
        }

        .product-observation textarea{
          min-height:44px;
          resize:none;
        }

        .product-bottom-bar{
          margin:0;
          padding:0;
          border:0;
          border-radius:0;
          box-shadow:none;
          background:transparent;
        }

        @media(min-width:901px){
          height:calc(100dvh - 80px);
          max-height:calc(100dvh - 80px);
          min-height:0;
          overflow-x:hidden;
          overflow-y:auto;
          overscroll-behavior-y:contain;
          scrollbar-gutter:stable;
          touch-action:pan-y;
        }

        @media(max-width:900px){
          max-height:calc(100dvh - 80px);
          min-height:0;
          overflow-y:auto;
          overscroll-behavior:contain;

          .product-layout{
            width:min(720px,calc(100% - 32px));
            grid-template-columns:minmax(0,1fr);
            gap:24px;
          }

          .product-summary > img{
            width:100%;
            max-width:100%;
          }
        }

        @media(max-width:760px){
          max-height:calc(100dvh - 64px);
        }

        @media(max-height:540px) and (orientation:landscape){
          height:auto;
          min-height:0;
          max-height:calc(100dvh - 80px);
          overflow-y:auto;
          overscroll-behavior:contain;
        }

        @media(prefers-reduced-motion:reduce){
          .product-form{animation:none}
          .product-option,
          .product-bottom-bar > button,
          .product-quantity button{transition:none}
        }

        @media(max-width:620px){
          .product-layout{
            width:100%;
            padding:0;
            display:block;
          }

          .product-summary{position:relative}

          .product-summary > img{
            width:100%;
            height:220px;
            border-radius:0;
          }

          .product-image-caption{display:none}

          .product-summary button[aria-label="Voltar ao cardápio"]{
            display:grid;
            top:14px;
            left:16px;
          }

          .product-form{
            padding:0 0 82px;
            gap:0;
            border:0;
            border-radius:0;
            box-shadow:none;
          }

          .product-details{
            padding:20px 20px 18px;
            border-bottom:1px solid #eee7e1;
          }

          .product-details h1{font-size:24px}
          .product-details p{font-size:14px;line-height:1.45}
          .product-details strong{font-size:18px}

          .product-group{padding:20px}
          .product-group-header{margin-bottom:12px}
          .product-option-list{gap:8px}

          .product-option-list[data-selection='SINGLE']{
            display:flex;
            flex-wrap:wrap;
            gap:8px;
          }

          .product-half-group .product-option-list[data-selection='SINGLE']{
            display:flex;
            flex-direction:column;
            flex-wrap:nowrap;
            gap:8px;
            width:100%;
          }

          .product-option-list[data-selection='SINGLE'] .product-option{
            min-height:36px;
            width:auto;
            flex:0 0 auto;
            border-radius:9px;
          }

          .product-half-group .product-option-list[data-selection='SINGLE'] .product-option{
            width:100%;
            min-height:46px;
            border:1px solid #ece7e1;
            border-radius:9px;
            background:#fff;
          }

          .product-option-list[data-selection='SINGLE'] .product-option > label{
            min-height:36px;
            padding:0 12px;
            display:flex;
            gap:0;
          }

          .product-half-group .product-option-list[data-selection='SINGLE'] .product-option > label{
            min-height:46px;
            padding:6px 8px;
            display:grid;
            grid-template-columns:auto minmax(0,1fr) auto;
            gap:8px;
          }

          .product-option-list[data-selection='SINGLE'] .product-option i,
          .product-option-list[data-selection='SINGLE'] .product-option strong{
            display:none;
          }

          .product-half-group .product-option-list[data-selection='SINGLE'] .product-option i{
            display:grid;
          }

          .product-half-group .product-option-list[data-selection='SINGLE'] .product-option strong{
            display:block;
            font-size:11px;
          }

          .product-half-group .product-option-list[data-selection='SINGLE'] .product-option label{
            gap:8px;
          }

          .product-half-group .product-option-list[data-selection='SINGLE'] .product-option img{
            width:34px;
            height:34px;
            flex:0 0 34px;
            border-radius:7px;
          }

          .product-half-group .half-group-footer{
            display:none;
          }

          .product-option-list[data-selection='MULTIPLE']{
            padding:8px 12px;
            border:1px solid #ece7e1;
            border-radius:12px;
            background:#fff;
          }

          .product-option-list[data-selection='MULTIPLE'] .product-option{
            min-height:32px;
            border:0;
            border-radius:0;
            background:transparent;
          }

          .product-option-list[data-selection='MULTIPLE'] .product-option > label{
            min-height:32px;
            padding:4px 0;
          }

          .product-option-list[data-selection='MULTIPLE'] .product-option i{
            width:20px;
            height:20px;
            border-radius:6px;
          }

          .product-option{min-height:44px}
          .product-option > label{min-height:44px;padding:9px 12px}

          .product-observation{
            padding:20px;
            border-bottom:1px solid #eee7e1;
          }

          .product-observation span,
          .product-observation small{
            display:none;
          }

          .product-observation textarea{min-height:44px}

          .product-bottom-bar{
            position:static;
            bottom:auto;
            z-index:5;
            padding:12px 20px calc(12px + env(safe-area-inset-bottom));
            border-top:1px solid #ece7e1;
            background:#fff;
            box-shadow:0 -8px 20px rgba(0,0,0,.06);
          }

          .product-quantity{flex:0 0 auto}

          .product-bottom-bar > button{
            min-height:46px;
            border-radius:10px;
          }
        }
      `
      : ''}
`;

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 5;
  padding-top: env(safe-area-inset-top, 0px);
  border-bottom: 1px solid #ededed;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(18px);

  @media (max-width: 760px) {
    background: #fffdfa;
    backdrop-filter: none;
  }
`;

export const HeaderInner = styled.div`
  width: min(1240px, calc(100% - 40px));
  min-height: 74px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  button {
    border: 0;
    background: transparent;
    color: #302a25;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 10px 0;
    font-weight: 750;
    cursor: pointer;
  }

  span {
    color: #81776e;
    font-size: 13px;
  }

  @media (max-width: 620px) {
    width: calc(100% - 28px);
    min-height: 60px;
    span {
      display: none;
    }
  }
`;

export const Layout = styled.main`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 30px 0 48px;
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(460px, 1.1fr);
  gap: 34px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding-top: 18px;
    padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px));
  }

  @media (max-width: 620px) {
    width: 100%;
    padding: 0 0 14px;
    gap: 0;
  }
`;

export const ProductSummary = styled.aside`
  position: sticky;
  top: 104px;
  overflow: hidden;
  border: 1px solid #e7ddd4;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 14px 38px rgba(20, 20, 20, 0.08);

  img {
    width: 100%;
    height: clamp(250px, 34vw, 420px);
    object-fit: cover;
    display: block;
  }

  > div {
    padding: 24px 25px 27px;
  }

  small {
    display: block;
    margin-bottom: 9px;
    color: var(--config-primary);
    font-weight: 850;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(25px, 3vw, 34px);
    line-height: 1.08;
    letter-spacing: -0.035em;
  }

  p {
    margin: 13px 0 19px;
    color: #6f665e;
    line-height: 1.55;
  }

  strong {
    color: #1d1d1f;
    font-size: 23px;
  }

  @media (max-width: 900px) {
    position: static;
    display: grid;
    grid-template-columns: minmax(210px, 0.75fr) 1fr;
    img {
      height: 100%;
      min-height: 260px;
    }
  }

  @media (max-width: 620px) {
    display: block;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    img {
      height: 220px;
      min-height: 0;
    }
    > div {
      display:none;
    }
  }

  @media (max-width: 900px) and (max-height: 540px) and (orientation: landscape) {
    display: grid;
    grid-template-columns: minmax(138px, 34vw) minmax(0, 1fr);

    img {
      height: 100%;
      min-height: 150px;
      max-height: 190px;
    }

    > div {
      padding: 15px 17px;
    }

    h1 {
      font-size: 23px;
    }

    p {
      margin: 8px 0 11px;
      font-size: 13px;
      line-height: 1.4;
    }

    strong {
      font-size: 19px;
    }
  }
`;

export const DesktopProductDetails = styled.section`
  display:grid;
  gap:12px;
  padding:28px 28px 24px;
  border:1px solid #ece7e1;
  border-radius:16px;
  background:#fff;

  h1{margin:0;font-size:30px;line-height:1.15;font-weight:800}
  p{margin:0;color:#6f665e;font-size:14px;line-height:1.55}
  strong{color:var(--config-primary);font-size:22px}

  @media(max-width:620px){
    padding:20px 18px 18px;
    border:0;
    border-radius:0;
    border-bottom:1px solid #eee7e1;
    h1{font-size:26px}
    p{font-size:14px;line-height:1.5}
    strong{font-size:18px}
  }
`;

export const PromotionPrice = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin: -5px 0 6px;

  span {
    display: inline-flex;
    width: fit-content;
    margin: 0;
    padding: 5px 8px;
    border-radius: 999px;
    color: #fff;
    background: var(--config-primary);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.05em;
  }

  del {
    color: #8f857c;
    font-size: 14px;
    font-weight: 650;
  }
`;

export const PromotionHint = styled.span`
  display: block;
  margin-top: 7px;
  color: #756a61;
  font-size: 11px;
  line-height: 1.45;
`;

export const Form = styled.form`
  min-width: 0;
  display: grid;
  gap: 16px;

  @media (max-width: 620px) {
    padding: 0;
    border-top: 0;
  }

  @media (max-width: 900px) and (max-height: 540px) and (orientation: landscape) {
    padding-top: 14px;
  }
`;

export const Intro = styled.div`
  padding: 4px 2px 3px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;

  h2 {
    margin: 0 0 6px;
    font-size: 25px;
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: #746b63;
    font-size: 14px;
  }

  @media (max-width: 540px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
`;

export const Progress = styled.div<{ $value: number }>`
  width: 190px;
  flex: 0 0 auto;

  div {
    height: 7px;
    border-radius: 999px;
    background: #e9e1da;
    overflow: hidden;
  }

  div::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $value }) => `${Math.max(0, Math.min(100, $value))}%`};
    border-radius: inherit;
    background: var(--config-primary);
    transition: width 180ms ease;
  }

  small {
    display: block;
    margin-top: 7px;
    color: #6e655d;
    text-align: right;
    font-size: 11px;
    font-weight: 700;
  }

  @media (max-width: 540px) {
    width: 100%;
    small {
      text-align: left;
    }
  }
`;

export const Group = styled.fieldset<{ $error?: boolean }>`
  min-width: 0;
  margin: 0;
  padding: 20px;
  border: 1px solid ${({ $error }) => ($error ? '#dc6860' : '#e6ddd5')};
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 8px 25px rgba(71, 46, 26, 0.045);

  @media (max-width: 620px) {
    padding:20px 18px;
    border-width:0 0 1px;
    border-radius:0;
    box-shadow:none;
  }
`;

export const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 15px;

  h3 {
    margin: 0 0 5px;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #786f67;
    font-size: 13px;
    line-height: 1.45;
  }

  @media (max-width: 360px) {
    flex-direction: column;
    gap: 10px;
  }
`;

export const Badge = styled.span<{ $required: boolean }>`
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 999px;
  background: ${({ $required }) =>
    $required ? 'color-mix(in srgb, var(--config-primary) 11%, #fff)' : '#f3f0ec'};
  color: ${({ $required }) => ($required ? 'var(--config-primary)' : '#756d65')};
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`;

export const OptionList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 9px;

  @media (max-width: 620px) {
    grid-template-columns:1fr;
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const OptionIdentity = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;

  > span {
    min-width: 0;
  }
`;

export const OptionImage = styled.img`
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border: 1px solid #e5ddd6;
  border-radius: 8px;
  object-fit: cover;
  background: #f7f3f0;
`;

export const Option = styled.div<{ $selected: boolean; $disabled: boolean }>`
  min-height: 58px;
  border: 1px solid ${({ $selected }) => ($selected ? 'var(--config-primary)' : '#e9e1da')};
  border-radius: 13px;
  background: ${({ $selected }) =>
    $selected ? 'color-mix(in srgb, var(--config-primary) 6%, #fff)' : '#fff'};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 150ms ease;

  &:hover {
    transform: ${({ $disabled }) => ($disabled ? 'none' : 'translateY(-1px)')};
    border-color: ${({ $disabled }) => ($disabled ? '#e9e1da' : 'var(--config-primary)')};
  }

  > label {
    min-height: 58px;
    padding: 12px 14px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    cursor: inherit;
  }

  > label > input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  i {
    width: 23px;
    height: 23px;
    border: 1.5px solid ${({ $selected }) => ($selected ? 'var(--config-primary)' : '#bdb4ac')};
    border-radius: 7px;
    display: grid;
    place-items: center;
    background: ${({ $selected }) => ($selected ? 'var(--config-primary)' : '#fff')};
    color: #fff;
    font-style: normal;
  }

  > label > input[type='radio'] + i {
    border-radius: 50%;
  }

  b {
    display: block;
    font-size: 14px;
  }

  small {
    color: #81786f;
    font-size: 11px;
  }

  strong {
    color: ${({ $selected }) => ($selected ? 'var(--config-primary)' : '#443c35')};
    font-size: 13px;
    white-space: nowrap;
  }
`;

export const QuantityStepper = styled.div`
  min-height: 48px;
  padding: 8px 12px;
  border-top: 1px solid #eadfd7;
  background: color-mix(in srgb, var(--config-primary) 3%, #fff);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  > span {
    color: #6f665e;
    font-size: 11px;
    font-weight: 750;
  }
`;
export const Composition = styled.section`
  padding: 20px;
  border: 1px solid #e6ddd5;
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 8px 25px rgba(71, 46, 26, 0.045);

  .composition-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .composition-list > label {
    min-width: 0;
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 11px 12px;
    border: 1px solid #e8e0d9;
    border-radius: 12px;
    background: #fcfbfa;
  }

  .composition-list > label.removed {
    border-color: #efc3bd;
    background: #fff7f6;
  }

  .composition-list > label > span:first-child {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .composition-list b {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .composition-list small {
    color: #81786f;
    font-size: 10px;
  }

  .remove-control,
  .fixed-control {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--config-primary);
    font-size: 11px;
    font-weight: 800;
  }

  .fixed-control {
    color: #746b63;
  }

  @media (max-width: 620px) {
    padding: 17px 14px;
    border-radius: 16px;
    .composition-list {
      grid-template-columns: 1fr;
    }
  }
`;

export const PortionBuilder = styled.fieldset<{ $error?: boolean }>`
  min-width: 0;
  margin: 0;
  padding: 20px;
  border: 1px solid ${({ $error }) => ($error ? '#dc6860' : '#e6ddd5')};
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 8px 25px rgba(71, 46, 26, 0.045);

  .portion-count {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 13px;
  }

  .portion-count button {
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid #ded5cc;
    border-radius: 9px;
    color: #544b44;
    background: #fff;
    font-weight: 750;
    cursor: pointer;
  }

  .portion-count button.active {
    border-color: var(--config-primary);
    color: var(--config-primary);
    background: color-mix(in srgb, var(--config-primary) 7%, #fff);
  }

  .portion-list {
    display: grid;
    gap: 9px;
  }

  .portion-row {
    min-width: 0;
    display: grid;
    grid-template-columns: 120px minmax(150px, 1fr) minmax(150px, 1fr);
    align-items: end;
    gap: 10px;
    padding: 11px;
    border: 1px solid #e9e1da;
    border-radius: 13px;
    background: #fcfbfa;
  }

  .portion-number {
    min-width: 0;
    min-height: 42px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-content: center;
    gap: 1px 7px;
  }

  .portion-number svg {
    grid-row: 1 / 3;
    width: 18px;
    color: var(--config-primary);
  }

  .portion-number b,
  .portion-number small {
    font-size: 11px;
  }

  .portion-number small {
    color: #81786f;
  }

  .portion-row label {
    min-width: 0;
    display: grid;
    gap: 5px;
    color: #615850;
    font-size: 10px;
    font-weight: 800;
  }

  .portion-row select,
  .portion-row input {
    width: 100%;
    min-height: 42px;
    border: 1px solid #dcd2ca;
    border-radius: 9px;
    padding: 0 10px;
    color: #302a25;
    background: #fff;
  }

  @media (max-width: 700px) {
    padding: 17px 14px;
    border-radius: 16px;
    .portion-row {
      grid-template-columns: 1fr;
      align-items: stretch;
    }
  }
`;

export const GroupFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 11px;
  color: #81786f;
  font-size: 11px;

  .error {
    color: #ba3932;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 700;
  }
`;

export const Empty = styled.div`
  padding: 24px;
  border: 1px solid #f0c5a6;
  border-radius: 17px;
  background: #fff8f2;
  color: #774225;
  display: flex;
  align-items: flex-start;
  gap: 11px;

  b {
    display: block;
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
  }
`;

export const Observation = styled.label`
  padding: 20px;
  border: 1px solid #e6ddd5;
  border-radius: 19px;
  background: #fff;
  display: grid;
  gap: 10px;

  div {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  b {
    font-size: 16px;
  }

  span,
  small {
    color: #81786f;
    font-size: 11px;
  }

  textarea {
    min-height: 94px;
    resize: vertical;
    padding: 12px 13px;
    border: 1px solid #ded5cc;
    border-radius: 12px;
    outline: 0;
    line-height: 1.45;
  }

  textarea:focus {
    border-color: var(--config-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--config-primary) 11%, transparent);
  }

  @media (max-width: 620px) {
    padding:20px 18px;
    border-width:0 0 1px;
    border-radius:0;
  }
`;

export const BottomBar = styled.div<{ $stickyOnMobile?: boolean }>`
  position: static;
  z-index: 4;
  margin-top: 3px;
  padding: 13px 14px 13px 17px;
  border: 1px solid #e1d6cd;
  border-radius: 18px;
  background: rgba(255, 253, 250, 0.96);
  backdrop-filter: blur(16px);
  box-shadow: 0 14px 40px rgba(47, 27, 13, 0.16);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  .total-description {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  small {
    display: block;
    margin-bottom: 2px;
    color: #81776e;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  strong {
    font-size: 21px;
  }

  > button {
    min-width: 260px;
    min-height: 51px;
    padding: 0 20px;
    border: 0;
    border-radius: 13px;
    background: var(--config-primary);
    color: #fff;
    font-weight: 850;
    cursor: pointer;
    box-shadow: 0 8px 22px color-mix(in srgb, var(--config-primary) 25%, transparent);
  }

  > button:disabled {
    background: #b9b1aa;
    box-shadow: none;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    bottom: auto;
  }

  @media (max-width: 620px) {
    position: ${ ({ $stickyOnMobile }) => ($stickyOnMobile ? 'sticky' : 'static') };
    bottom: ${ ({ $stickyOnMobile }) => ($stickyOnMobile ? '0' : 'auto') };
    width:100%;
    min-width:0;
    margin:0;
    padding:12px 18px calc(12px + env(safe-area-inset-bottom));
    border-width:1px 0 0;
    border-radius:0;
    gap:10px;
    background:#fff;
    backdrop-filter:none;
    box-shadow:0 -8px 24px rgba(0,0,0,.08);

    .total-description{display:none}

    > button {
      min-width:0;
      flex:1 1 auto;
      min-height:46px;
      padding-inline:12px;
      font-size:14px;
      border-radius:10px;
    }

    strong {font-size:17px}
  }

  @media (max-width: 340px) {
    padding-inline: 11px;

    small {
      font-size: 9px;
    }

    > button {
      padding-inline: 9px;
      font-size: 12px;
    }
  }

  @media (max-height: 540px) and (orientation: landscape) {
    position: static;
    bottom: auto;
  }
`;

export const ProductImagePlaceholder = styled.div`
  width: 100%;
  min-height: 250px;
  display: grid;
  place-items: center;
  background: #f3f3f4;
  color: #b6b6bc;

  svg {
    width: 52px;
    height: 52px;
    stroke-width: 1.5;
  }

  @media (max-width: 620px) {
    min-height: 260px;
  }
`;

export { ProductQuantity } from './ProductConfigurator.quantity.styles';

export const ProductTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h1 {
    min-width: 0;
  }
`;

export const ProductRating = styled.span`
  flex: 0 0 auto;
  padding-top: 4px;
  color: #d89c00;
  font-size: 11px;
  font-weight: 850;
`;

export const ProductBack = styled.button`
  position: absolute;
  z-index: 3;
  top: 14px;
  left: 14px;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255,255,255,.94);
  color: #1f1f22;
  display: grid;
  place-items: center;
  box-shadow: 0 3px 12px rgba(0,0,0,.12);
`;

export const TableMenuProductPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 2px;

  del {
    color: #948c85;
    font-size: 12px;
    font-weight: 650;
  }

  strong {
    color: #1c1c1f;
    font-size: 22px;
    line-height: 1;
  }
`;

export { HalfHalfBuilder, PortionStatus, HalfHalfNotice } from './ProductConfigurator.halfHalf.styles';
