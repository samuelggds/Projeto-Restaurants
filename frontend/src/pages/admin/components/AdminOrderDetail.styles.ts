import styled from 'styled-components';

export const SplitLayout = styled.div`
  && {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    align-items: stretch;
    gap: 14px;
    transition: grid-template-columns 220ms ease, gap 220ms ease;
  }
  &&[data-detail-open='false'] {
    grid-template-columns: minmax(0, 1fr) minmax(0, 0fr);
    gap: 0;
  }
  && .selected-order-detail {
    min-width: 0;
    max-height: 840px;
    overflow: auto;
    border: 1px solid #e2e8e3;
    border-radius: 12px;
    background: #fff;
    opacity: 1;
    visibility: visible;
    transition: opacity 180ms ease, visibility 0s linear;
    scrollbar-width: thin;
    scroll-behavior: auto;
  }
  &&[data-detail-open='false'] .selected-order-detail {
    border-color: transparent;
    overflow: hidden;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 140ms ease, visibility 0s linear 220ms;
  }
  && .order-compact-list {
    max-height: 840px;
  }
  @media (max-width: 1020px) {
    &&, &&[data-detail-open='false'] {
      grid-template-columns: minmax(0, 1fr);
    }
    && .order-compact-list { min-height: 0; max-height: 380px; }
    && .selected-order-detail { max-height: none; }
    &&[data-detail-open='false'] .selected-order-detail { display: none; }
    &&[data-detail-open='false'] .order-compact-list { max-height: 840px; }
  }
  @media (prefers-reduced-motion: reduce) {
    &&, && .selected-order-detail { transition: none; }
  }
`;

export const DetailPanel = styled.article`
  min-width: 0;
  min-height: 710px;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #243d31;
  animation: admin-order-detail-reveal 160ms ease-out;

  @keyframes admin-order-detail-reveal { from { opacity: 0; } to { opacity: 1; } }
  @keyframes admin-order-detail-spin { to { transform: rotate(360deg); } }
  .detail-spinner { animation: admin-order-detail-spin 900ms linear infinite; }
  *, *::before, *::after { box-sizing: border-box; }
  button { font: inherit; cursor: pointer; }
  button:disabled { cursor: not-allowed; opacity: .55; }
  button:focus-visible { outline: 2px solid #196347; outline-offset: 3px; }
  h3, h4, p { margin: 0; }
  h4 { color: #34473c; font-size: 11px; font-weight: 550; }
  svg { flex-shrink: 0; }

  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 15px 14px 10px;
  }
  .detail-identity { min-width: 0; flex: 1; }
  .detail-title-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .detail-title-row h3 { color: #192d23; font-size: 15px; font-weight: 750; letter-spacing: -.025em; }
  .detail-identity p { margin-top: 5px; color: #7b8b81; font-size: 10px; line-height: 1.45; overflow-wrap: anywhere; }
  .order-status { display: inline-flex; gap: 4px; align-items: center; padding: 4px 7px; border-radius: 20px; background: #edf5f0; color: #2f6c53; font-size: 9px; line-height: 1.2; }
  .order-status i { width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
  .order-status[data-status='PENDENTE'] { background: #fff4df; color: #a66e26; }
  .order-status[data-status='PREPARANDO'] { background: #eaf4f9; color: #3e7691; }
  .order-status[data-status='SAIU_PARA_ENTREGA'] { background: #f2edfa; color: #786195; }
  .order-status[data-status='CANCELADO'] { background: #fff0ee; color: #c44a42; }
  .detail-header-actions { display: flex; gap: 5px; flex-shrink: 0; }
  .detail-header-actions button { width: 29px; height: 29px; display: grid; place-items: center; padding: 0; border: 1px solid #e6ebe5; border-radius: 6px; color: #7d8b82; background: #fafbf9; }
  .detail-header-actions button:hover { border-color: #9ebbad; background: #eef5ef; }
  .detail-header-actions svg { width: 13px; height: 13px; }
  .detail-notice { display: flex; align-items: flex-start; gap: 6px; margin: 0 14px 12px; padding: 8px; border-radius: 7px; color: #ad6621; background: #fff4dc; font-size: 10px; line-height: 1.45; }
  .detail-notice svg { width: 13px; height: 13px; margin-top: 1px; }
  .detail-notice[data-tone='success'] { background: #eef7f0; color: #2f7152; }

  .detail-progress, .detail-items, .detail-payment { border-top: 1px solid #edf0eb; padding: 12px 14px; }
  .detail-progress h4 { margin-bottom: 11px; }
  .detail-steps { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px; }
  .detail-step { display: grid; justify-items: center; gap: 6px; min-width: 0; color: #a3aca6; font-size: 9px; text-align: center; }
  .detail-step-icon { height: 28px; width: 28px; display: grid; place-items: center; border-radius: 50%; background: #f1f3f1; color: #aeb8b1; }
  .detail-step-icon svg { height: 13px; width: 13px; }
  .detail-step[data-complete='true'] { color: #648774; }
  .detail-step[data-complete='true'] .detail-step-icon { background: #eaf4ee; color: #39785c; }
  .detail-step[data-current='true'] { color: #264e3c; }
  .detail-step[data-current='true'] .detail-step-icon { background: #183f31; color: #fff; }
  .detail-section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
  .detail-section-heading > span { color: #88978d; font-size: 10px; white-space: nowrap; }
  .detail-section-heading > b { color: #20372a; font-size: 12px; white-space: nowrap; }
  .detail-item { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 7px; align-items: start; margin: 10px 0; }
  .detail-quantity { display: grid; place-items: center; min-height: 22px; border-radius: 4px; background: #e9f3ed; color: #296b4d; font-size: 10px; font-weight: 700; }
  .detail-item strong, .detail-item b { display: block; color: #22362a; font-size: 11px; line-height: 1.4; }
  .detail-item strong { overflow-wrap: anywhere; }
  .detail-item > b { font-size: 10px; white-space: nowrap; }
  .detail-item small { display: block; margin-top: 2px; font-size: 10px; color: #839187; line-height: 1.4; overflow-wrap: anywhere; }
  .detail-observation { display: flex; gap: 6px; margin-top: 12px; padding: 9px; border-radius: 5px; background: #faf9f5; color: #7f8d84; font-size: 10px; line-height: 1.5; overflow-wrap: anywhere; }
  .detail-observation svg { width: 12px; height: 12px; margin-top: 2px; color: #678c77; }
  .detail-muted { color: #7c8b81; font-size: 10px; line-height: 1.55; }
  .detail-payment-state { display: flex; align-items: flex-start; gap: 8px; padding: 9px; border: 1px solid #e7eee7; border-radius: 6px; background: #f6faf7; color: #337453; }
  .detail-payment-state[data-tone='warning'] { color: #997025; border-color: #f2e7cd; background: #fffbf2; }
  .detail-payment-state[data-tone='neutral'] { color: #718075; background: #f7f8f6; }
  .detail-payment-state > svg { width: 16px; height: 16px; }
  .detail-payment-state strong { display: block; font-size: 11px; }
  .detail-payment-state small { display: block; font-size: 10px; line-height: 1.5; margin-top: 3px; }
  .detail-table-methods { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin: 9px 0; }
  .detail-table-methods span { display: grid; place-items: center; gap: 4px; min-height: 49px; border: 1px solid #e4eae3; border-radius: 6px; font-size: 10px; color: #718378; background: #fff; }
  .detail-table-methods span[data-selected='true'] { border-color: #23533e; background: #ebf4ee; color: #23533e; }
  .detail-table-methods svg { width: 15px; height: 15px; }
  .detail-receipt { width: 100%; min-height: 38px; display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 10px; padding: 8px; border: 1px solid #ff4b4b; border-radius: 6px; color: #fff; background: #ff4b4b; font-size: 11px; }
  .detail-receipt svg { width: 15px; height: 15px; }

  .detail-financial-history { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; border-top: 1px solid #edf0eb; padding: 13px 14px; }
  .detail-financial, .detail-history { min-width: 0; }
  .detail-financial h4, .detail-history h4 { margin-bottom: 9px; font-size: 10px; }
  .detail-financial > div { display: flex; justify-content: space-between; gap: 5px; padding: 3px 0; font-size: 9px; line-height: 1.5; color: #849188; }
  .detail-financial b { color: #2b4233; font-weight: 550; white-space: nowrap; }
  .detail-financial > .detail-total { margin-top: 4px; padding-top: 7px; border-top: 1px solid #e6ece6; font-weight: 700; color: #253f2f; }
  .detail-total b { font-weight: 750; }
  .detail-history { padding-left: 9px; border-left: 1px solid #edf0eb; }
  .detail-history ol { list-style: none; padding: 0; margin: 0; }
  .detail-history li { position: relative; padding: 0 0 10px 10px; border-left: 1px solid #e2e9e2; }
  .detail-history li:last-child { padding-bottom: 0; }
  .detail-history li::before { content: ''; position: absolute; top: 3px; left: -3px; width: 5px; height: 5px; border-radius: 50%; background: #cbd7cd; }
  .detail-history li[data-latest='true']::before { background: #245d41; }
  .detail-history strong { display: block; color: #39533f; font-size: 9px; font-weight: 600; line-height: 1.4; }
  .detail-history time { display: block; color: #8b978e; font-size: 8px; margin-top: 3px; line-height: 1.4; }

  .detail-footer { flex: 1; border-top: 1px solid #edf0eb; padding: 12px 14px 20px; background: #fcfbf8; }
  .detail-primary, .detail-secondary { width: 100%; min-height: 39px; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 9px; border: 1px solid #183f31; border-radius: 6px; background: #183f31; color: #fff; font-size: 11px; }
  .detail-primary svg { width: 14px; height: 14px; }
  .detail-secondary { background: #fff; color: #31583f; margin-bottom: 8px; }
  .detail-operation-note { display: flex; align-items: flex-start; gap: 6px; padding: 8px 0; color: #65806c; font-size: 9px; line-height: 1.5; }
  .detail-operation-note svg { width: 12px; height: 12px; margin-top: 1px; }
  .detail-footer-links { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .detail-footer-links button { display: inline-flex; align-items: center; gap: 4px; min-height: 30px; padding: 4px 0; border: 0; background: transparent; font-size: 10px; text-align: left; }
  .detail-cancel { color: #eb4c49; }
  .detail-more { color: #8a958b; white-space: nowrap; }
  .detail-more svg { width: 12px; height: 12px; transition: transform 160ms ease; }
  .detail-more[aria-expanded='true'] svg { transform: rotate(180deg); }
  .detail-more-content { margin-top: 10px; border-top: 1px solid #e7ece5; padding-top: 10px; animation: admin-order-detail-reveal 160ms ease-out; }
  .detail-more-content dl { display: grid; gap: 7px; margin: 0; }
  .detail-more-content dl > div { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; font-size: 10px; }
  .detail-more-content dt { color: #879489; }
  .detail-more-content dd { margin: 0; color: #385440; text-align: right; overflow-wrap: anywhere; }
  .detail-more-content > p { margin-top: 10px; }

  @media (max-width: 600px) {
    min-height: 620px;
    .detail-header-actions button { width: 34px; height: 34px; }
    .detail-header-actions svg { width: 15px; height: 15px; }
    .detail-primary, .detail-secondary, .detail-receipt { min-height: 44px; }
    .detail-footer-links button { min-height: 38px; }
  }
  @media (prefers-reduced-motion: reduce) {
    &, .detail-more-content, .detail-spinner { animation: none; }
    .detail-more svg { transition: none; }
  }
`;
