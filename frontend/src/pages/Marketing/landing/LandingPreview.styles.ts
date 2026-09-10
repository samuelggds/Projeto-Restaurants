import styled from 'styled-components';

export const Showcase = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.84fr) minmax(0, 1.16fr);
  align-items: center;
  gap: clamp(32px, 6vw, 80px);
  .showcase-copy > p {
    color: var(--muted);
    line-height: 1.8;
    max-width: 400px;
  }
  h2 {
    font-size: clamp(32px, 3.6vw, 46px);
    letter-spacing: -0.045em;
    line-height: 1.16;
    margin: 18px 0;
    font-weight: 600;
  }
  h2 em {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400;
  }
  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
  }
`;
export const Tabs = styled.div`
  display: grid;
  gap: 7px;
  margin-top: 30px;
  button {
    width: 100%;
    min-width: 0;
    padding: 15px 16px;
    border: 1px solid transparent;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    background: transparent;
    text-align: left;
    color: var(--muted);
    cursor: pointer;
    transition:
      background 180ms,
      border-color 180ms;
  }
  button[aria-selected='true'] {
    color: var(--ink);
    border-color: #d8e0cf;
    background: #fffefa;
    box-shadow: 0 5px 16px #263e2710;
  }
  .tab-icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 12px;
    background: #e5e9dd;
    color: var(--forest);
  }
  button[aria-selected='true'] .tab-icon {
    background: var(--forest);
    color: #e6edc5;
  }
  b {
    font-size: 15px;
    display: block;
    font-weight: 700;
  }
  small {
    display: block;
    line-height: 1.5;
    font-size: 12px;
    margin-top: 4px;
  }
  button > svg:last-child {
    margin-left: auto;
    flex-shrink: 0;
  }
  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    small {
      max-width: 250px;
    }
  }
  @media (max-width: 500px) {
    button {
      padding: 11px;
      gap: 9px;
    }
    small,
    button > svg:last-child {
      display: none;
    }
    .tab-icon {
      width: 32px;
      height: 32px;
    }
    b {
      font-size: 13px;
    }
  }
`;
export const PreviewPanel = styled.div`
  min-width: 0;
  border: 1px solid #d5ddcf;
  border-radius: 18px;
  background: #fffefa;
  box-shadow: 0 20px 50px #25422b10;
  overflow: hidden;
  .window-bar {
    display: flex;
    align-items: center;
    gap: 15px;
    height: 45px;
    padding: 0 20px;
    background: #f0f1e9;
    border-bottom: 1px solid #e0e4d9;
    font-size: 11px;
    color: #677263;
  }
  .dots {
    display: flex;
    gap: 5px;
  }
  .dots i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #c0c8b8;
  }
  .sample {
    margin-left: auto;
    letter-spacing: 0.12em;
    font-size: 9px;
  }
  .window-content {
    padding: 26px;
  }
  .window-heading {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 26px;
  }
  .workspace-icon {
    width: 43px;
    height: 43px;
    flex-shrink: 0;
    border-radius: 12px;
    background: var(--forest);
    color: #e3edbc;
    display: grid;
    place-items: center;
  }
  .window-heading small {
    letter-spacing: 0.12em;
    font-size: 8px;
    color: #7c8579;
  }
  h3 {
    margin: 5px 0 0;
    font-size: 16px;
    line-height: 1.4;
    letter-spacing: -0.02em;
    font-weight: 700;
  }
  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4d8868;
    margin-left: auto;
    box-shadow: 0 0 0 5px #eef4eb;
    flex-shrink: 0;
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 29px;
  }
  .metrics > div {
    border: 1px solid #e3e8dc;
    border-radius: 11px;
    padding: 16px;
  }
  .metrics > div:first-child {
    background: #edf2df;
    border-color: #edf2df;
  }
  .metrics small {
    display: block;
    color: #6a7663;
    font-size: 10px;
  }
  .metrics b {
    display: block;
    font-size: 28px;
    letter-spacing: -0.04em;
    margin-top: 9px;
    font-weight: 600;
  }
  .orders-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 17px;
  }
  h4 {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
  }
  .orders-title > span {
    display: flex;
    gap: 5px;
    align-items: center;
    color: #788472;
    font-size: 10px;
  }
  .order-table {
    font-size: 10px;
  }
  .order-table > div {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1fr);
    gap: 8px;
    align-items: center;
    min-height: 56px;
    border-bottom: 1px solid #ebeee6;
  }
  .order-table > div:last-child {
    border-bottom: 0;
  }
  .order-table b {
    font-weight: 600;
    line-height: 1.5;
  }
  .order-table [role='cell']:last-child {
    text-align: right;
  }
  .order-table .table-head {
    min-height: 28px;
    color: #7e8679;
    font-size: 9px;
  }
  .table-head > span:last-child {
    text-align: right;
  }
  .order-table i {
    display: inline-block;
    font-style: normal;
    background: #f1f0eb;
    color: #6c7364;
    font-size: 9px;
    padding: 5px 8px;
    border-radius: 5px;
    white-space: nowrap;
  }
  .order-table .ready {
    color: #356347;
    background: #e8f1e6;
  }
  .order-table .preparing {
    color: #865b20;
    background: #faf0da;
  }
  .window-note {
    margin-top: 16px;
    padding: 12px;
    display: flex;
    gap: 8px;
    align-items: center;
    color: #587049;
    background: #f3f6eb;
    border-radius: 8px;
    font-size: 10px;
    line-height: 1.6;
  }
  .window-note svg {
    flex-shrink: 0;
  }
  .preview-caption {
    color: #747c6c;
    font-size: 10px;
    text-align: center;
    line-height: 1.6;
    padding: 0 18px 17px;
    margin: 0;
  }
  @media (max-width: 600px) {
    .window-content {
      padding: 18px 14px;
    }
    h3 {
      font-size: 13px;
    }
    .metrics > div {
      padding: 13px 9px;
    }
    .metrics small {
      font-size: 9px;
    }
    .metrics b {
      font-size: 24px;
    }
    .order-table {
      font-size: 9px;
    }
    .order-table i {
      padding: 5px;
      font-size: 8px;
    }
  }
`;
export const Flow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin: 0 20px 15px;
  padding-top: 15px;
  border-top: 1px solid #e8ece1;
  span {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    color: #5b6c52;
    font-size: 9px;
  }
  > svg {
    color: #a3ad99;
    margin: 0 5px;
  }
  @media (max-width: 380px) {
    gap: 8px;
    margin-inline: 8px;
    span {
      font-size: 8px;
    }
    > svg {
      margin: 0;
    }
  }
`;
