import styled from 'styled-components';

export const OrdersWorkspace = styled.div`
  display: grid;
  gap: 12px;
  min-width: 0;

  .orders-command-header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:4px 5px 0}
  .orders-command-header h1{margin:0;color:#1d3026;font-size:26px;font-weight:650;letter-spacing:-.035em}
  .orders-command-header p{margin:4px 0 0;color:#829087;font-size:12px}
  .command-context{display:flex;gap:8px;flex-wrap:wrap}
  .command-context span{display:inline-flex;align-items:center;gap:7px;border-radius:10px;background:#eaf4ee;padding:10px 12px;color:#285b44;font-size:11px}
  .command-context span+span{background:#fff;border:1px solid #e0e6e1}
  .command-context svg{width:14px;height:14px}
  .orders-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
  .metric-card{position:relative;min-height:90px;min-width:0;border:1px solid #e1e8e3;border-radius:11px;background:#fff;text-align:left;padding:13px;font:inherit;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between}
  .metric-card>span{font-size:11px;color:#89958a}
  .metric-card strong{font-size:25px;color:#263b2e;font-weight:650}
  .metric-card svg{position:absolute;right:12px;top:12px;width:19px;height:19px;color:#5d9879}
  .metric-card:last-child svg{color:#fa5656}
  .orders-filters{display:grid;grid-template-columns:minmax(180px,1fr) repeat(3,minmax(96px,auto)) 44px;gap:8px}
  .orders-filters label{min-width:0;min-height:42px;border:1px solid #e3e9e4;border-radius:9px;background:#fff;padding:0 10px;display:flex;align-items:center;gap:8px}
  .orders-filters label svg{width:15px;height:15px;color:#758679;flex-shrink:0}
  .orders-filters input,.orders-filters select{min-width:0;width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:11px;color:#354b3b}
  .filters-clear{border:1px solid #e3e9e4;border-radius:9px;background:#fff;display:grid;place-items:center;cursor:pointer}
  .filters-clear:disabled{opacity:.4;cursor:default}
  .filters-clear svg{width:17px;height:17px}
  .orders-split-view{grid-template-columns:minmax(0,1.55fr) minmax(330px,1fr);gap:12px;align-items:stretch}
  .order-compact-list{max-height:790px;min-height:550px;border-radius:12px;padding:0;gap:0;overflow:auto}
  .queue-list-head{display:flex;align-items:center;gap:8px;padding:12px;border-bottom:1px solid #e9eee9;color:#304938;font-size:11px;font-weight:700}
  .queue-list-head>span{background:#f0f4f1;border-radius:30px;padding:4px 8px;font-weight:500;color:#74867c}
  .queue-list-head button{width:auto;min-height:28px;margin-left:auto;padding:4px 7px;font-size:10px;color:#64896b}
  .queue-list-head svg{width:13px;height:13px}
  .queue-columns,.order-compact-list>button{display:grid;grid-template-columns:minmax(120px,1.4fr) minmax(65px,1fr) minmax(65px,1fr) 72px minmax(78px,1fr);align-items:center;gap:9px}
  .queue-columns{padding:10px 12px;color:#9ca8a0;font-size:10px}
  .order-compact-list>button{border:0;border-bottom:1px solid #edf1ed;border-radius:0;min-height:72px;padding:11px 12px;text-align:left}
  .order-compact-list>button.selected{background:#eff7f1;box-shadow:inset 3px 0 #1e6746}
  .compact-identity b{font-size:11px;color:#294132}
  .compact-identity small,.compact-modality,.compact-payment{font-size:10px;color:#778a7b;line-height:1.4}
  .compact-value{font-size:11px;color:#2b4234;font-weight:700;white-space:nowrap}
  .compact-status{font-size:10px;border-radius:20px;background:#f2f4f2;padding:5px;color:#687e6c}
  .compact-status.tone-pendente{background:#fff1dc;color:#ba762d}
  .compact-status.tone-preparando{background:#e9f5f9;color:#327a9a}
  .compact-status.tone-pronto{background:#e9f6ed;color:#247a4c}
  .compact-status.tone-saiu_para_entrega{background:#f3ecfc;color:#785aaa}
  .compact-status.tone-cancelado{background:#fff0f0;color:#c75151}
  .selected-order-detail{max-height:790px;overflow:auto;border:1px solid #e5ebe5;border-radius:12px;background:#fff}
  .selected-order-detail .order-card{border:0;border-radius:0;box-shadow:none}
  .selected-order-items,.order-financial,.order-history{border-top:1px solid #edf0ed;padding:14px 15px}
  .items-heading{display:flex;justify-content:space-between;color:#304837;font-size:12px;font-weight:700;margin-bottom:10px}
  .items-heading span{font-size:10px;color:#98a89b;font-weight:400}
  .ordered-item{display:grid;grid-template-columns:23px minmax(0,1fr) auto;gap:9px;margin:11px 0;align-items:start}
  .item-quantity{font-size:10px;font-weight:700;color:#236848;background:#eaf3ed;border-radius:5px;padding:4px}
  .ordered-item strong,.ordered-item b{font-size:11px;color:#293c30}
  .ordered-item small{display:block;margin-top:3px;color:#8b9a90;font-size:10px}
  .no-order-items,.order-observation{font-size:11px;color:#748b7c}
  .order-observation{padding:9px;border-radius:8px;background:#f7f9f6}
  .order-financial h4,.order-history h4{margin:0 0 9px;font-size:11px;color:#354c3d}
  .order-financial div,.order-history div{display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:10px;color:#77877a}
  .order-financial b,.order-history time{color:#2a4535}
  .financial-total{border-top:1px solid #e8ede8;margin-top:5px;padding-top:9px!important;font-weight:700}
  .status-actions button{background:#173e30;color:#fff;border-color:#173e30}
  @media(max-width:1350px){.queue-columns,.order-compact-list>button{grid-template-columns:minmax(110px,1.4fr) minmax(65px,1fr) 72px minmax(75px,1fr)}.compact-payment,.queue-columns span:nth-child(3){display:none}}
  @media(max-width:1020px){.orders-split-view{grid-template-columns:1fr}.order-compact-list{max-height:380px;min-height:0}.selected-order-detail{max-height:none}.orders-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(max-width:660px){.orders-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.orders-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.orders-search{grid-column:1/-1}.filters-clear{min-height:42px}.queue-columns{display:none}.order-compact-list>button{grid-template-columns:minmax(100px,1fr) 68px minmax(65px,1fr)}.compact-modality,.compact-payment{display:none}.metric-card{min-height:79px}}

  .orders-split-view {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(250px, 0.95fr) minmax(340px, 1.05fr);
    align-items: start;
    gap: 12px;
    margin-top: 14px;
  }
  .order-compact-list {
    min-width: 0;
    max-height: min(72vh, 780px);
    overflow: auto;
    border: 1px solid #e6e9e5;
    border-radius: 12px;
    background: #fff;
    padding: 6px;
    display: grid;
    align-content: start;
    gap: 5px;
  }
  .order-compact-list button {
    width: 100%;
    min-width: 0;
    min-height: 64px;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: 8px;
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    text-align: left;
    color: #213029;
    background: #fff;
    font: inherit;
    cursor: pointer;
  }
  .order-compact-list button:hover { background: #f7f8f6; }
  .order-compact-list button.selected {
    background: #eff7f0;
    border-color: #b9d5c1;
    box-shadow: inset 3px 0 #206c4d;
  }
  .order-compact-list button:focus-visible { outline: 2px solid #206c4d; outline-offset: -2px; }
  .compact-identity, .compact-side { min-width: 0; display: grid; gap: 5px; }
  .compact-identity b { font-size: 12px; overflow-wrap: anywhere; }
  .compact-identity b span { font-weight: 550; }
  .compact-identity small, .compact-side small { font-size: 10px; color: #75837b; }
  .compact-side { flex-shrink: 0; text-align: right; }
  .compact-side strong { font-size: 12px; color: #263b2f; }
  .selected-order-detail { min-width: 0; max-height: min(72vh, 780px); overflow: auto; }
  .selected-order-detail .order-card { margin: 0; }
  @media (max-width: 1020px) {
    .orders-split-view { grid-template-columns: minmax(0, 1fr); }
    .order-compact-list { max-height: 280px; }
    .selected-order-detail { max-height: none; }
  }
  @media (max-width: 600px) {
    .order-compact-list { max-height: 230px; }
    .orders-split-view { gap: 8px; }
  }
`;

export { HeroCopy, OrdersHero, PriorityCard } from './AdminOrders.hero.styles';

export const OrdersSummary = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;

  .summary-card {
    position: relative;
    min-width: 0;
    min-height: 86px;
    overflow: hidden;
    border: 1px solid #e5dfd8;
    border-radius: 8px;
    padding: 18px;
    color: inherit;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 3px 12px rgba(48, 35, 25, 0.035);
    display: flex;
    align-items: flex-start;
    gap: 13px;
    text-align: left;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  .summary-card:hover,
  .summary-card[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--a) 34%, #e5dfd8);
    box-shadow: 0 13px 31px rgba(48, 35, 25, 0.08);
    transform: translateY(-2px);
  }

  .summary-card[aria-pressed='true']::after {
    content: '';
    position: absolute;
    right: 15px;
    bottom: 0;
    left: 15px;
    height: 3px;
    border-radius: 999px 999px 0 0;
    background: var(--a);
  }

  .summary-icon {
    flex: 0 0 32px;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: grid;
    place-items: center;
  }

  .summary-icon svg {
    width: 20px;
    height: 20px;
  }

  .summary-icon.active {
    color: #c94d17;
    background: #fff0e8;
  }

  .summary-icon.payment {
    color: #9b6713;
    background: #fff6df;
  }

  .summary-icon.progress {
    color: #346b9b;
    background: #edf5fc;
  }

  .summary-icon.delivered {
    color: #24764d;
    background: #eaf7ef;
  }

  .summary-copy {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .summary-copy small {
    overflow: hidden;
    color: #766f69;
    font-size: 11px;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .summary-copy strong {
    color: #211f1c;
    font-size: 22px;
    line-height: 1.05;
    letter-spacing: -0.035em;
  }

  .summary-copy em {
    color: #8b837d;
    font-size: 10px;
    font-style: normal;
    line-height: 1.35;
  }

  .summary-arrow {
    position: absolute;
    right: 14px;
    bottom: 14px;
    width: 14px;
    height: 14px;
    color: #b7afa8;
  }

  @media (max-width: 1060px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 500px) {
    gap: 9px;

    .summary-card {
      min-height: 118px;
      padding: 14px;
      gap: 10px;
    }

    .summary-icon {
      flex-basis: 36px;
      width: 36px;
      height: 36px;
      border-radius: 8px;
    }

    .summary-icon svg {
      width: 18px;
      height: 18px;
    }

    .summary-copy strong {
      font-size: 22px;
    }

    .summary-copy small {
      white-space: normal;
    }
  }

  @media (max-width: 350px) {
    grid-template-columns: 1fr;
  }

  @media (prefers-reduced-motion: reduce) {
    .summary-card {
      transition: none;
    }

    .summary-card:hover,
    .summary-card[aria-pressed='true'] {
      transform: none;
    }
  }
`;

export const OrdersPanel = styled.section`
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e5dfd8;
  border-radius: 8px;
  padding: 23px;
  background: #fff;
  box-shadow: 0 12px 34px rgba(48, 35, 25, 0.055);

  @media (max-width: 560px) {
    padding: 17px 14px;
    border-radius: 8px;
  }
`;

export const OrdersPanelHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;

  > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .section-icon {
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    border-radius: 8px;
    color: #c94d17;
    background: #fff0e8;
    display: grid;
    place-items: center;
  }

  .section-icon svg {
    width: 20px;
    height: 20px;
  }

  > div > span:last-child {
    min-width: 0;
  }

  small {
    color: #a14925;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.09em;
  }

  h2 {
    margin: 3px 0 0;
    color: #24211e;
    font-size: 21px;
    letter-spacing: 0;
  }

  p {
    margin: 5px 0 0;
    color: #7b746e;
    font-size: 12px;
    line-height: 1.5;
  }

  .live-status {
    min-height: 38px;
    flex: 0 0 auto;
    padding: 0 12px;
    border: 1px solid #d6eadc;
    border-radius: 999px;
    color: #2d7548;
    background: #f0faf4;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 10px;
    font-weight: 750;
    white-space: nowrap;
  }

  .live-status svg {
    width: 15px;
    height: 15px;
    color: #3d9860;
  }

  @media (max-width: 680px) {
    flex-direction: column;

    .live-status {
      align-self: flex-start;
    }
  }

  @media (max-width: 420px) {
    .section-icon {
      display: none;
    }
  }
`;

export const QueueTabs = styled.nav`
  margin-top: 21px;
  padding: 5px;
  overflow-x: auto;
  border: 1px solid #ebe5de;
  border-radius: 13px;
  background: #f7f5f2;
  display: flex;
  gap: 4px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    min-width: max-content;
    min-height: 38px;
    padding: 0 11px;
    border: 1px solid transparent;
    border-radius: 9px;
    color: #6e6761;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 10px;
    font-weight: 750;
    transition:
      background 160ms ease,
      border-color 160ms ease,
      color 160ms ease,
      box-shadow 160ms ease;
  }

  button span {
    min-width: 21px;
    min-height: 21px;
    padding: 0 6px;
    border-radius: 999px;
    background: #eae6e1;
    display: inline-grid;
    place-items: center;
    font-size: 9px;
  }

  button:hover {
    color: #322d29;
    background: rgba(255, 255, 255, 0.7);
  }

  button[aria-pressed='true'] {
    border-color: #e3dbd4;
    color: #a9451a;
    background: #fff;
    box-shadow: 0 4px 12px rgba(48, 35, 25, 0.07);
  }

  button[aria-pressed='true'] span {
    color: #b3491c;
    background: #fff0e8;
  }

  @media (max-width: 560px) {
    margin-right: -14px;
    margin-left: -14px;
    padding-right: 14px;
    padding-left: 14px;
    border-right: 0;
    border-left: 0;
    border-radius: 0;

    button {
      min-height: 44px;
    }
  }
`;

export const OrdersToolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 220px minmax(150px, auto);
  align-items: end;
  gap: 11px;
  padding: 19px 0;

  .search-field,
  .status-filter {
    min-width: 0;
    display: grid;
    gap: 7px;
  }

  .search-field > span,
  .status-filter > span {
    color: #625b55;
    font-size: 10px;
    font-weight: 800;
  }

  .search-field > div,
  .status-filter > div {
    min-width: 0;
    height: 44px;
    padding: 0 12px;
    border: 1px solid #ded7d0;
    border-radius: 11px;
    color: #817a73;
    background: #faf9f7;
    display: flex;
    align-items: center;
    gap: 9px;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease;
  }

  .search-field > div:focus-within,
  .status-filter > div:focus-within {
    border-color: color-mix(in srgb, var(--a) 68%, #d5cdc6);
    background: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 11%, transparent);
  }

  .search-field svg,
  .status-filter svg {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
  }

  input,
  select {
    min-width: 0;
    width: 100%;
    height: 100%;
    border: 0;
    outline: 0;
    color: #302c28;
    background: transparent;
    font: inherit;
    font-size: 12px;
  }

  input::placeholder {
    color: #969089;
  }

  select {
    appearance: none;
    cursor: pointer;
  }

  .status-filter svg {
    pointer-events: none;
  }

  .toolbar-result {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .toolbar-result > span {
    min-height: 44px;
    padding: 0 12px;
    border-radius: 11px;
    color: #746d67;
    background: #f5f2ee;
    display: grid;
    place-content: center;
    font-size: 9px;
    text-align: center;
    white-space: nowrap;
  }

  .toolbar-result > span strong {
    color: #38332f;
    font-size: 12px;
  }

  .toolbar-result > button {
    min-width: max-content;
    min-height: 44px;
    padding: 0 11px;
    border: 1px solid #e1dad3;
    border-radius: 10px;
    color: #a8471c;
    background: #fff;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 750;
  }

  .toolbar-result > button svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr) 210px;

    .toolbar-result {
      grid-column: 1 / -1;
      justify-content: flex-start;
    }
  }

  @media (max-width: 580px) {
    grid-template-columns: 1fr;

    .toolbar-result {
      grid-column: auto;
      justify-content: space-between;
    }
  }

  @media (max-width: 390px) {
    .toolbar-result {
      align-items: stretch;
      flex-direction: column;
    }
  }
`;

export const OrdersList = styled.div`
  display: grid;
  gap: 12px;

  .order-card {
    --order-tone: #777069;
    position: relative;
    min-width: 0;
    overflow: hidden;
    border: 1px solid #e6dfd7;
    border-radius: 8px;
    padding: 18px;
    background: #fff;
    box-shadow: 0 5px 18px rgba(49, 34, 22, 0.035);
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  .order-card::before {
    content: '';
    position: absolute;
    top: 14px;
    bottom: 14px;
    left: 0;
    width: 3px;
    border-radius: 0 999px 999px 0;
    background: var(--order-tone);
  }

  .order-card:hover {
    border-color: #d8cec4;
    box-shadow: 0 10px 28px rgba(49, 34, 22, 0.07);
    transform: translateY(-1px);
  }

  .order-card.status-pendente {
    --order-tone: #a85d12;
  }

  .order-card.status-preparando {
    --order-tone: #b84a1b;
  }

  .order-card.status-pronto {
    --order-tone: #347a41;
  }

  .order-card.status-saiu_para_entrega {
    --order-tone: #286da8;
  }

  .order-card.status-entregue {
    --order-tone: #217644;
  }

  .order-card.status-cancelado {
    --order-tone: #a9433c;
  }

  .order-header {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .order-identity {
    min-width: 0;
    display: grid;
    gap: 8px;
  }

  .order-identity > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .order-number {
    flex: 0 0 auto;
    padding: 5px 8px;
    border: 1px solid color-mix(in srgb, var(--a) 22%, #e3ddd6);
    border-radius: 8px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 6%, #fff);
    font-size: 11px;
    font-weight: 850;
  }

  h3 {
    overflow: hidden;
    margin: 0;
    color: #201d1a;
    font-size: 16px;
    letter-spacing: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .order-created {
    color: #7d766f;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
  }

  .order-created svg {
    width: 13px;
    height: 13px;
  }

  .order-status {
    min-height: 31px;
    flex: 0 0 auto;
    padding: 0 11px;
    border-radius: 999px;
    color: var(--order-tone);
    background: color-mix(in srgb, var(--order-tone) 9%, #fff);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .order-status i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .order-details {
    min-width: 0;
    margin-top: 16px;
    padding: 14px;
    border: 1px solid #eee8e1;
    border-radius: 8px;
    background: #faf9f7;
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) auto;
    align-items: center;
    gap: 17px;
  }

  .detail {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .detail-icon {
    flex: 0 0 38px;
    width: 38px;
    height: 38px;
    border-radius: 8px;
    color: #2d7650;
    background: #e8f6ee;
    display: grid;
    place-items: center;
  }

  .detail-icon svg {
    width: 18px;
    height: 18px;
  }

  .tone-warning .detail-icon {
    color: #9a640b;
    background: #fff3d5;
  }

  .tone-neutral .detail-icon,
  .detail-icon.neutral {
    color: #5b6470;
    background: #edf0f3;
  }

  .detail > div,
  .order-total {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .detail > div > span,
  .order-total > span {
    color: #8a837c;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .detail b {
    overflow: hidden;
    color: #2a2723;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail small {
    overflow: hidden;
    color: #777069;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .order-total {
    min-width: 126px;
    padding-left: 17px;
    border-left: 1px solid #e6dfd8;
    text-align: right;
  }

  .order-total strong {
    color: #1e1b18;
    font-size: 18px;
    letter-spacing: -0.025em;
    white-space: nowrap;
  }

  .order-progress {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 150px minmax(180px, 1fr);
    align-items: center;
    gap: 16px;
  }

  .progress-heading {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .progress-heading span {
    color: #89827b;
    font-size: 9px;
  }

  .progress-heading b {
    overflow: hidden;
    color: #37322e;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progress-content {
    min-width: 0;
  }

  .progress-track {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
  }

  .progress-track i {
    height: 6px;
    border-radius: 999px;
    background: #e7e2dc;
    transition: background 180ms ease;
  }

  .progress-track i[data-active='true'] {
    background: color-mix(in srgb, var(--order-tone) 82%, #d7864f);
  }

  .progress-track.cancelled i {
    background: #f2d7d4;
  }

  .progress-labels {
    margin-top: 7px;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
  }

  .progress-labels span {
    overflow: hidden;
    color: #9a938c;
    font-size: 8px;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .order-actions {
    min-width: 0;
    margin-top: 16px;
    padding-top: 15px;
    border-top: 1px solid #eee8e1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .operation-note {
    min-width: 0;
    color: #777069;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 10px;
    font-weight: 650;
    line-height: 1.4;
  }

  .operation-note svg {
    flex: 0 0 auto;
    width: 15px;
    height: 15px;
  }

  .refund-note {
    color: #28724a;
  }

  .manual-note {
    color: #95610e;
  }

  .processing-note {
    color: #2d648f;
  }

  .failed-note {
    color: #a43c35;
  }

  .finished-note {
    color: #777069;
  }

  .action-buttons {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  button {
    min-height: 44px;
    padding: 0 13px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
    transition:
      background 160ms ease,
      border-color 160ms ease,
      color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  button svg {
    width: 15px;
    height: 15px;
  }

  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 22%, transparent);
    outline-offset: 2px;
  }

  .confirm-payment {
    border: 1px solid color-mix(in srgb, var(--a) 38%, #e0d9d2);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 7%, #fff);
  }

  .confirm-payment:hover:not(:disabled) {
    border-color: var(--a);
    color: #fff;
    background: var(--a);
    box-shadow: 0 7px 16px color-mix(in srgb, var(--a) 20%, transparent);
  }

  .cancel-order {
    border: 1px solid #e8c6c2;
    color: #a43c35;
    background: #fff8f7;
  }

  .cancel-order:hover:not(:disabled) {
    border-color: #b8443c;
    color: #fff;
    background: #b8443c;
    box-shadow: 0 7px 16px rgba(184, 68, 60, 0.2);
  }

  button:disabled {
    opacity: 0.55;
    cursor: wait;
    transform: none;
  }

  .loading-icon {
    animation: admin-order-loading 700ms linear infinite;
  }

  @keyframes admin-order-loading {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 820px) {
    .order-details {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .order-total {
      grid-column: 1 / -1;
      min-width: 0;
      padding: 11px 0 0;
      border-top: 1px solid #e6dfd8;
      border-left: 0;
      text-align: left;
    }

    .order-actions {
      align-items: flex-start;
      flex-direction: column;
    }

    .action-buttons {
      width: 100%;
      justify-content: flex-start;
    }
  }

  @media (max-width: 560px) {
    .order-card {
      padding: 15px 13px;
    }

    .order-header {
      flex-direction: column;
    }

    .order-status {
      align-self: flex-start;
    }

    .order-details {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .order-total {
      grid-column: auto;
    }

    .order-progress {
      grid-template-columns: 1fr;
      gap: 9px;
    }

    .progress-labels {
      display: none;
    }

    .action-buttons {
      display: grid;
      grid-template-columns: 1fr;
    }

    button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .order-card,
    button,
    .progress-track i {
      transition: none;
    }

    .order-card:hover,
    button:hover:not(:disabled) {
      transform: none;
    }

    .loading-icon {
      animation-duration: 1400ms;
    }
  }
`;

export const OrdersEmpty = styled.div`
  min-height: 280px;
  padding: 32px 20px;
  border: 1px dashed #dcd3ca;
  border-radius: 8px;
  background: #faf9f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;

  > span {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    color: #b64a1b;
    background: #fff0e8;
    display: grid;
    place-items: center;
  }

  > span svg {
    width: 22px;
    height: 22px;
  }

  h3 {
    margin: 13px 0 0;
    color: #312d29;
    font-size: 16px;
  }

  p {
    max-width: 410px;
    margin: 7px 0 0;
    color: #7d756e;
    font-size: 11px;
    line-height: 1.55;
  }

  button {
    min-height: 44px;
    margin-top: 17px;
    padding: 0 14px;
    border: 1px solid #ded6ce;
    border-radius: 10px;
    color: var(--a);
    background: #fff;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
  }

  button svg {
    width: 15px;
    height: 15px;
  }
`;

export const OrdersPagination = styled.footer`
  min-height: 52px;
  padding-top: 16px;
  color: #817a73;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  font-size: 10px;

  > div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  button {
    min-height: 40px;
    padding: 0 11px;
    border: 1px solid #dfd8d1;
    border-radius: 10px;
    color: #a8471c;
    background: #fff;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font: inherit;
    font-size: 10px;
    font-weight: 750;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      background 160ms ease;
  }

  button:hover {
    border-color: color-mix(in srgb, var(--a) 45%, #d8d0c8);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, #fff);
  }

  button svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 620px) {
    align-items: stretch;
    flex-direction: column;

    > div {
      width: 100%;
    }

    button {
      min-height: 44px;
      flex: 1;
      justify-content: center;
    }
  }
`;
