import styled from 'styled-components';

export const Root = styled.section`
  max-width: 1180px;
  margin: 0 auto;
  width: 100%;
  display: grid;
  gap: 18px;
`;
export const Hero = styled.header`
  padding: 28px;
  border: 1px solid #eadfd7;
  border-radius: 20px;
  background: #fffdfa;
  box-shadow: 0 14px 35px rgba(65, 43, 26, 0.06);
  small {
    display: flex;
    gap: 7px;
    align-items: center;
    color: #cc5e3b;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h2 {
    margin: 13px 0 7px;
    font-size: 30px;
    color: #24211f;
  }
  p {
    margin: 0;
    color: #766e68;
    line-height: 1.55;
  }
`;
export const Guide = styled.article`
  border: 1px solid #eadfd7;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
`;
export const GuideButton = styled.button`
  width: 100%;
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 18px;
  text-align: left;
  cursor: pointer;
  color: #28231f;
  .icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: #fff0e8;
    color: #d35d37;
  }
  strong {
    display: block;
    font-size: 16px;
  }
  small {
    color: #837a74;
  }
  .chevron {
    margin-left: auto;
  }
`;
export const GuideContent = styled.div`
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(360px, 1.25fr);
  align-items: start;
  gap: 18px;
  padding: 0 18px 18px;
  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`;
export const Steps = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  max-height: 560px;
  overflow-y: auto;
  padding-right: 5px;
  scrollbar-width: thin;
  li {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    padding: 13px;
    border: 1px solid #f1ddd2;
    background: #fffaf7;
    border-radius: 11px;
    color: #605750;
    font-size: 13px;
    line-height: 1.5;
  }
  b {
    flex: 0 0 23px;
    height: 23px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #d25f39;
    color: #fff;
    font-size: 12px;
  }
`;
export const Preview = styled.div`
  display: grid;
  min-height: 250px;
  grid-template-columns: 110px minmax(0, 1fr);
  overflow: hidden;
  background: #fcfaf8;
  border: 1px solid #e9ddd5;
  border-radius: 14px;

  .side {
    padding: 14px 10px;
    color: #d7dde0;
    font-size: 10px;
    background: #202b33;
  }

  .brand {
    margin-bottom: 13px;
    color: #fff;
    font-weight: 800;
  }

  .side span {
    position: relative;
    display: block;
    padding: 7px 5px;
    border-radius: 6px;
  }

  .side span.active {
    padding-left: 31px;
    color: #fff;
    background: #a85034;
  }

  .sidebar-badge {
    position: absolute;
    top: 50%;
    left: 5px;
    display: grid;
    width: 20px;
    height: 20px;
    color: #d25f39;
    font-size: 10px;
    font-style: normal;
    font-weight: 800;
    place-items: center;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px #0003;
    transform: translateY(-50%);
  }

  .canvas {
    position: relative;
    padding: 18px;
  }

  .crumb {
    color: #d05b38;
    font-size: 10px;
    font-weight: 800;
  }

  .canvas h4 {
    position: relative;
    width: max-content;
    max-width: calc(100% - 22px);
    margin: 5px 0;
    padding-right: 26px;
    font-size: 17px;
  }

  .canvas p {
    margin: 0;
    color: #81766f;
    font-size: 11px;
  }

  .mock-body {
    display: grid;
    gap: 10px;
    margin-top: 15px;
  }

  [data-marker] {
    position: relative;
  }

  [data-marker]::after {
    position: absolute;
    z-index: 4;
    top: 0;
    right: 0;
    display: grid;
    width: 20px;
    height: 20px;
    color: #fff;
    font-size: 9px;
    font-weight: 900;
    line-height: 1;
    content: attr(data-marker);
    place-items: center;
    background: #d35d37;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 7px #0004;
    transform: translate(38%, -38%);
  }

  .side span[data-marker]::after {
    top: 50%;
    right: auto;
    left: 5px;
    transform: translateY(-50%);
  }

  .canvas h4[data-marker]::after {
    right: 1px;
  }

  .mock-input[data-marker],
  .mock-select[data-marker],
  .mock-field[data-marker] {
    padding-right: 24px;
  }

  .mock-support {
    width: max-content;
    max-width: calc(100% - 12px);
    margin: 4px 10px 0 auto;
    padding: 6px 23px 6px 8px;
    color: #7c7069;
    font-size: 8px;
    line-height: 1.3;
    background: #fff7f2;
    border: 1px dashed #dfb9aa;
    border-radius: 7px;
  }

  .mock-toolbar {
    display: flex;
    gap: 7px;
  }

  .mock-input,
  .mock-select,
  .mock-location {
    min-height: 30px;
    padding: 8px 10px;
    color: #756b65;
    font-size: 9px;
    background: #fff;
    border: 1px solid #e6d9d1;
    border-radius: 7px;
  }

  .mock-input {
    flex: 1;
  }

  .mock-select {
    min-width: 100px;
  }

  .mock-layout {
    display: grid;
    gap: 8px;
  }

  .mock-layout.split {
    grid-template-columns: 1.25fr 0.75fr;
  }

  .mock-layout.triple {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .mock-panel {
    min-width: 0;
    padding: 10px;
    background: #fff;
    border: 1px solid #eadfd7;
    border-radius: 9px;
  }

  .mock-panel > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid #f1e7e1;
  }

  .mock-panel h5 {
    margin: 0;
    color: #3c3531;
    font-size: 10px;
  }

  .mock-panel header p {
    margin: 3px 0 0;
    color: #958b84;
    font-size: 7px;
    line-height: 1.3;
  }

  .mock-panel > header > i {
    display: grid;
    width: 19px;
    height: 19px;
    color: #c96342;
    font-size: 12px;
    font-style: normal;
    place-items: center;
    background: #fff0e8;
    border-radius: 6px;
  }

  .mock-empty {
    display: grid;
    min-height: 48px;
    padding: 9px;
    color: #9a9089;
    font-size: 8px;
    text-align: center;
    place-items: center;
    background: #fcfaf8;
    border: 1px dashed #e5d9d1;
    border-radius: 7px;
  }

  .mock-empty i {
    display: block;
    margin-bottom: 3px;
    color: #cabeb6;
    font-size: 14px;
    font-style: normal;
  }

  .mock-metrics,
  .mock-mini-metrics,
  .mock-finance {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
  }

  .mock-metric {
    padding: 9px;
    background: #fff;
    border: 1px solid #eadfd7;
    border-radius: 8px;
  }

  .mock-metric span,
  .mock-metric small {
    display: block;
    color: #8d837d;
    font-size: 8px;
  }

  .mock-metric strong {
    display: block;
    margin: 3px 0;
    color: #292421;
    font-size: 16px;
  }

  .mock-summary-list {
    display: grid;
    gap: 5px;
  }

  .mock-summary-list span {
    display: flex;
    justify-content: space-between;
    padding: 5px 7px;
    color: #756b65;
    font-size: 8px;
    background: #fcfaf8;
    border-radius: 5px;
  }

  .mock-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  .mock-table-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  .mock-table-cards article {
    min-width: 0;
    padding: 8px;
    background: #fcfaf8;
    border: 1px solid #eadfd7;
    border-radius: 7px;
  }

  .mock-table-cards b,
  .mock-table-cards small {
    display: block;
  }

  .mock-table-cards b {
    color: #423a35;
    font-size: 8px;
  }
  .mock-table-cards small {
    margin-top: 5px;
    color: #8f857e;
    font-size: 7px;
  }

  .table-state {
    display: inline-block;
    margin-top: 5px;
    padding: 3px 5px;
    font-size: 6px;
    font-weight: 900;
    letter-spacing: 0.04em;
    border-radius: 999px;
  }
  .table-state.free {
    color: #26753a;
    background: #eaf7ed;
  }
  .table-state.occupied {
    color: #a56310;
    background: #fff3da;
  }
  .table-state.code {
    color: #8b4b9f;
    background: #f7eafa;
  }
  .table-state.action {
    color: #b24c2e;
    background: #fff0e8;
  }

  .mock-field {
    color: #786f69;
    font-size: 8px;
  }

  .mock-field span {
    display: block;
    height: 25px;
    margin-top: 4px;
    background: #fcfaf8;
    border: 1px solid #e6d9d1;
    border-radius: 6px;
  }

  .mock-action-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 2px 11px 0 0;
  }

  .mock-action {
    position: relative;
    padding: 8px 11px;
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    background: #d35d37;
    border-radius: 7px;
  }

  .mock-rows {
    display: grid;
    gap: 6px;
  }

  .mock-rows > span {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 25px;
    padding: 5px;
    background: #fcfaf8;
    border-radius: 5px;
  }

  .mock-rows i {
    width: 17px;
    height: 17px;
    background: #f3d8cd;
    border-radius: 50%;
  }

  .mock-rows b {
    width: 60%;
    height: 5px;
    background: #e6ddd7;
    border-radius: 5px;
  }

  .mock-dark-hero {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 13px;
    color: #fff;
    background: linear-gradient(135deg, #202b33, #354650);
    border-radius: 10px;
  }

  .mock-dark-hero small,
  .mock-dark-hero strong,
  .mock-dark-hero span {
    display: block;
  }

  .mock-dark-hero small {
    color: #efb29b;
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .mock-dark-hero strong {
    margin: 4px 0 2px;
    font-size: 13px;
  }

  .mock-dark-hero span {
    color: #cdd5d9;
    font-size: 8px;
  }

  .mock-mini-metrics {
    grid-template-columns: repeat(3, minmax(42px, 1fr));
    align-self: center;
  }

  .mock-mini-metrics span {
    padding: 6px;
    text-align: center;
    background: #ffffff12;
    border-radius: 6px;
  }

  .mock-mini-metrics b {
    color: #fff;
    font-size: 12px;
  }

  .mock-finance span {
    padding: 6px;
    background: #fcfaf8;
    border-radius: 6px;
  }

  .mock-finance small,
  .mock-finance strong {
    display: block;
  }

  .mock-finance small {
    color: #8b817a;
    font-size: 7px;
  }

  .mock-finance strong {
    margin-top: 3px;
    color: #35302c;
    font-size: 10px;
  }

  .mock-location {
    width: max-content;
    min-height: auto;
    color: #287d3c;
    font-weight: 800;
    background: #edf8ef;
    border-color: #cce6d1;
  }

  .mock-map {
    position: relative;
    display: grid;
    min-height: 135px;
    overflow: hidden;
    color: #576b62;
    font-size: 10px;
    place-items: center;
    background-color: #e5ede7;
    background-image:
      linear-gradient(#cfdbd2 1px, transparent 1px),
      linear-gradient(90deg, #cfdbd2 1px, transparent 1px);
    background-size: 24px 24px;
    border: 1px solid #ccd9cf;
    border-radius: 9px;
  }

  .mock-map i {
    color: #d35d37;
    font-size: 25px;
    font-style: normal;
  }

  .mock-map small {
    padding: 4px 7px;
    color: #68776f;
    font-size: 7px;
    background: #ffffffcf;
    border-radius: 5px;
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
    margin-top: 17px;
  }

  .field {
    height: 42px;
    padding: 8px;
    color: #9b918b;
    font-size: 10px;
    background: #fff;
    border: 1px solid #e6d9d1;
    border-radius: 8px;
  }

  .action {
    position: relative;
    width: max-content;
    margin: 14px 14px 0 auto;
    padding: 8px 11px;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    background: #d35d37;
    border-radius: 7px;
  }

  .badge {
    position: absolute;
    display: grid;
    width: 22px;
    height: 22px;
    color: #fff;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
    place-items: center;
    background: #de6338;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px #0003;
  }

  .badge.two {
    top: -8px;
    right: 0;
  }

  .badge.three {
    top: -10px;
    right: -10px;
  }

  @media (max-width: 480px) {
    grid-template-columns: 86px minmax(0, 1fr);

    .side {
      padding: 10px 7px;
      font-size: 9px;
    }

    .side span.active {
      padding-left: 27px;
    }

    .sidebar-badge {
      left: 3px;
      width: 18px;
      height: 18px;
    }

    .canvas {
      padding: 12px;
    }

    .canvas h4 {
      padding-right: 22px;
      font-size: 14px;
    }

    .fields {
      grid-template-columns: 1fr;
    }

    .field:nth-child(n + 3) {
      display: none;
    }

    .action {
      margin-right: 12px;
    }

    .mock-layout.split,
    .mock-layout.triple {
      grid-template-columns: 1fr;
    }

    .mock-layout.triple .mock-panel:nth-child(n + 3) {
      display: none;
    }

    .mock-metrics,
    .mock-finance {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .mock-toolbar,
    .mock-dark-hero {
      flex-direction: column;
    }

    .mock-select {
      min-width: 0;
    }

    .mock-mini-metrics {
      width: 100%;
    }

    [data-marker]::after {
      width: 17px;
      height: 17px;
      font-size: 8px;
      transform: translate(25%, -25%);
    }

    .side span[data-marker]::after {
      left: 3px;
      transform: translateY(-50%);
    }
  }
`;
export const Report = styled.form`
  padding: 20px;
  border-radius: 18px;
  border: 1px solid #eadfd7;
  background: #fff;
  display: grid;
  gap: 12px;
  h3 {
    margin: 0;
    font-size: 19px;
  }
  .sub {
    margin: 0;
    color: #766e68;
    font-size: 14px;
  }
  input,
  textarea {
    font: inherit;
    border: 1px solid #dfd5ce;
    border-radius: 10px;
    padding: 11px 12px;
    outline: none;
  }
  textarea {
    min-height: 96px;
    resize: vertical;
  }
  input:focus,
  textarea:focus {
    border-color: #d35d37;
    box-shadow: 0 0 0 3px #d35d3720;
  }
  button {
    justify-self: start;
    border: 0;
    border-radius: 9px;
    padding: 11px 15px;
    background: #d35d37;
    color: #fff;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .success {
    color: #287d3c;
    font-size: 13px;
  }
  .error {
    color: #bf3333;
    font-size: 13px;
  }
`;
