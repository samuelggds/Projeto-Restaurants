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
  min-width: 0;
  max-width: 100%;
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
    min-width: 0;
    max-width: 100%;
    padding: 18px;
    overflow: hidden;
    box-sizing: border-box;
  }

  .canvas,
  .canvas * {
    box-sizing: border-box;
    min-width: 0;
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
    min-width: 0;
    max-width: 100%;
  }

  [data-marker] {
    position: relative;
  }

  [data-marker]::after {
    position: absolute;
    z-index: 4;
    top: 5px;
    right: 5px;
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
    transform: none;
  }

  .side span[data-marker]::after {
    top: 50%;
    right: auto;
    left: 5px;
    transform: translateY(-50%);
  }

  .canvas h4[data-marker]::after {
    right: 3px;
  }

  .mock-input[data-marker],
  .mock-select[data-marker],
  .mock-field[data-marker],
  .mock-channel-tabs[data-marker],
  .mock-live[data-marker],
  .mock-metric[data-marker],
  .mock-panel[data-marker],
  .mock-ready-empty[data-marker],
  .mock-history-empty[data-marker],
  .mock-map[data-marker] {
    padding-right: 24px;
  }

  .mock-help-context {
    position: absolute;
    top: 13px;
    right: 13px;
    display: grid;
    width: 21px;
    height: 21px;
    color: #a85034;
    font-size: 12px;
    font-weight: 900;
    place-items: center;
    background: #fff0e8;
    border-radius: 50%;
  }

  .mock-toolbar {
    display: flex;
    gap: 7px;
  }

  .mock-queue-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.85fr) minmax(0, 1.1fr);
    align-items: center;
    gap: 7px;
  }

  .mock-deliveries-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1.05fr);
    align-items: center;
    gap: 7px;
  }

  .mock-tables-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1.05fr);
    align-items: center;
    gap: 7px;
  }

  .mock-calls-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.8fr) minmax(0, 1.05fr);
    align-items: center;
    gap: 7px;
  }

  .mock-calls-panels {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .mock-calls-empty {
    display: grid;
    min-height: 90px;
    padding: 12px;
    color: #90857e;
    font-size: 9px;
    text-align: center;
    place-items: center;
    background: #fcfaf8;
    border: 1px dashed #e5d9d1;
    border-radius: 7px;
  }

  .mock-calls-empty > i {
    display: grid;
    width: 25px;
    height: 25px;
    color: #bd6a4d;
    font-size: 15px;
    font-style: normal;
    place-items: center;
    background: #fff0e8;
    border-radius: 50%;
  }

  .mock-table-admin-notice {
    position: relative;
    min-height: 30px;
    padding: 8px 29px 8px 9px;
    color: #315f42;
    font-size: 8px;
    font-weight: 800;
    line-height: 1.25;
    background: #edf8f0;
    border: 1px solid #cfe8d5;
    border-radius: 7px;
  }

  .mock-tables-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .mock-table-row {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 9px;
    padding: 9px;
    background: #fcfaf8;
    border: 1px solid #e5d9d1;
    border-radius: 7px;
  }

  .mock-table-identity {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    gap: 7px;
    padding: 5px 28px 5px 6px;
  }

  .mock-table-identity span,
  .mock-table-identity b,
  .mock-table-identity small {
    display: block;
    min-width: 0;
  }

  .mock-table-identity b {
    color: #3d3530;
    font-size: 9px;
  }

  .mock-table-identity small {
    margin-top: 3px;
    color: #8d837d;
    font-size: 7px;
  }

  .mock-table-identity em {
    flex: 0 0 auto;
    padding: 4px 7px;
    color: #26753a;
    font-size: 7px;
    font-style: normal;
    font-weight: 800;
    background: #eaf7ed;
    border-radius: 999px;
  }

  .mock-table-row button {
    position: relative;
    flex: 0 0 auto;
    min-height: 30px;
    padding: 7px 29px 7px 10px;
    color: #fff;
    font: inherit;
    font-size: 8px;
    font-weight: 800;
    background: #d35d37;
    border: 0;
    border-radius: 7px;
  }

  .mock-deliveries-empty {
    display: grid;
    min-height: 88px;
    padding: 12px;
    color: #91867f;
    font-size: 9px;
    text-align: center;
    place-items: center;
    background: #fcfaf8;
    border: 1px dashed #e5d9d1;
    border-radius: 7px;
  }

  .mock-deliveries-empty > i {
    display: grid;
    width: 25px;
    height: 25px;
    color: #bd6a4d;
    font-size: 15px;
    font-style: normal;
    place-items: center;
    background: #fff0e8;
    border-radius: 50%;
  }

  .mock-ready-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .mock-history-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mock-history-toolbar .mock-channel-tabs {
    width: min(245px, 100%);
    flex: 0 0 auto;
  }

  .mock-history-section {
    position: relative;
    overflow: hidden;
    padding: 12px;
    background: #fff;
    border: 1px solid #eadfd7;
    border-radius: 10px;
  }

  .mock-history-section > header {
    overflow: hidden;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 1px solid #f1e7e1;
  }

  .mock-history-section h5 {
    margin: 0;
    color: #3c3531;
    font-size: 11px;
  }
  .mock-history-section header p {
    margin: 4px 0 0;
    color: #8e847d;
    font-size: 8px;
  }
  .mock-history-section > header > i {
    position: relative;
    z-index: 5;
    display: grid;
    width: 25px;
    height: 25px;
    color: #a85034;
    font-size: 16px;
    font-style: normal;
    place-items: center;
    background: #fff0e8;
    border-radius: 7px;
  }

  .mock-history-section > header > i[data-marker]::after {
    top: 2px;
    right: 2px;
    z-index: 6;
    transform: none;
  }

  .mock-history-table {
    overflow: hidden;
    border: 1px solid #eee3dc;
    border-radius: 7px;
  }
  .mock-history-head {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1fr 1fr 0.8fr;
    gap: 4px;
    padding: 7px;
    color: #7a6f68;
    font-size: 7px;
    font-weight: 800;
    background: #faf6f3;
  }
  .mock-history-empty {
    display: grid;
    min-height: 75px;
    padding: 10px;
    color: #92877f;
    font-size: 8px;
    text-align: center;
    place-items: center;
  }
  .mock-history-empty i {
    display: grid;
    width: 22px;
    height: 22px;
    color: #b46b51;
    font-size: 14px;
    font-style: normal;
    place-items: center;
    background: #fff0e8;
    border-radius: 50%;
  }

  .mock-ready-toolbar .mock-channel-tabs {
    width: min(245px, 100%);
  }

  .mock-ready-section {
    padding: 12px;
    background: #fff;
    border: 1px solid #eadfd7;
    border-radius: 10px;
  }

  .mock-ready-section > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 9px;
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 1px solid #f1e7e1;
  }

  .mock-ready-section h5 {
    margin: 0;
    color: #3c3531;
    font-size: 11px;
  }

  .mock-ready-section header p {
    max-width: 285px;
    margin: 4px 0 0;
    color: #8e847d;
    font-size: 8px;
    line-height: 1.35;
  }

  .mock-ready-section > header > i {
    display: grid;
    width: 25px;
    height: 25px;
    flex: 0 0 auto;
    color: #fff;
    font-size: 14px;
    font-style: normal;
    font-weight: 900;
    place-items: center;
    background: #31994c;
    border-radius: 50%;
  }

  .mock-ready-empty {
    display: grid;
    min-height: 86px;
    padding: 12px;
    color: #8f857e;
    font-size: 9px;
    text-align: center;
    place-items: center;
    background: #fbfdfb;
    border: 1px dashed #cde2d1;
    border-radius: 8px;
  }

  .mock-ready-empty > i {
    display: grid;
    width: 25px;
    height: 25px;
    color: #31994c;
    font-size: 16px;
    font-style: normal;
    font-weight: 900;
    place-items: center;
    background: #eaf7ed;
    border-radius: 50%;
  }

  .mock-channel-tabs {
    display: flex;
    padding: 3px;
    background: #f4efeb;
    border: 1px solid #e6d9d1;
    border-radius: 8px;
  }

  .mock-channel-tabs span {
    flex: 1;
    padding: 6px 4px;
    color: #837871;
    font-size: 8px;
    font-weight: 700;
    text-align: center;
    border-radius: 5px;
  }

  .mock-channel-tabs span.active {
    color: #b94f2e;
    background: #fff;
    box-shadow: 0 1px 3px #6043301c;
  }

  .mock-live {
    padding: 8px 9px;
    color: #287d3c;
    font-size: 8px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: #edf8ef;
    border: 1px solid #cce6d1;
    border-radius: 7px;
  }

  .mock-queue-columns .mock-panel > header {
    align-items: center;
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

  .courier-pickup-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .courier-pickup-toolbar button {
    border: 1px solid #eadfd7;
    border-radius: 7px;
    background: #fff;
    color: #6a5144;
    font-size: 8px;
    font-weight: 700;
    padding: 0 10px;
  }
  .mock-pickup-card {
    width: min(310px, 100%);
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid #eadfd7;
    border-radius: 10px;
    background: #fff;
  }
  .mock-pickup-card header {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #2c2825;
    font-size: 10px;
  }
  .mock-pickup-card header small {
    padding: 3px 5px;
    color: #df6d13;
    background: #fff1dc;
    border-radius: 999px;
    font-size: 7px;
  }
  .mock-pickup-card header b {
    margin-left: auto;
    color: #ef2737;
    font-size: 11px;
  }
  .pickup-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .pickup-chips span {
    padding: 4px 6px;
    border: 1px solid #d9e0eb;
    border-radius: 5px;
    color: #46607b;
    background: #f8fbff;
    font-size: 8px;
  }
  .mock-pickup-card p,
  .mock-pickup-card em {
    margin: 0;
    color: #71665e;
    font-size: 8px;
    font-style: normal;
    line-height: 1.4;
  }
  .mock-pickup-card p {
    padding-top: 7px;
    border-top: 1px solid #f0e6df;
  }
  .mock-pickup-card button {
    min-height: 30px;
    border: 0;
    border-radius: 7px;
    color: #fff;
    background: #ed1d2f;
    font-size: 9px;
    font-weight: 800;
  }
  .mock-delivery-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .mock-delivery-cards .mock-pickup-card {
    width: 100%;
  }
  .mock-delivery-cards input {
    width: 100%;
    min-width: 0;
    padding: 7px;
    border: 1px solid #cbd8e8;
    border-radius: 6px;
    color: #8797ad;
    font-size: 8px;
  }
  .mock-delivery-cards .mock-pickup-card button {
    background: #dce5f0;
    color: #8aa0bd;
  }
  .history-cards .mock-pickup-card {
    min-height: 105px;
  }
  .mock-route-notice {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px;
    border: 1px solid #f6b496;
    border-radius: 10px;
    background: linear-gradient(90deg, #fff 0%, #fff0df 100%);
    color: #3b2b25;
  }
  .mock-route-notice > i {
    width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    color: #e45c20;
    border: 1px solid #f8c5ae;
    border-radius: 7px;
    font-style: normal;
  }
  .mock-route-notice span {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .mock-route-notice b {
    font-size: 10px;
  }
  .mock-route-notice small {
    color: #7e6156;
    font-size: 8px;
  }
  .mock-route-notice button {
    margin-left: auto;
    min-height: 27px;
    border: 0;
    border-radius: 7px;
    background: #d9571c;
    color: #fff;
    padding: 0 10px;
    font-size: 8px;
    font-weight: 800;
    white-space: nowrap;
  }
  .mock-route-empty {
    min-height: 70px;
    display: grid;
    place-items: center;
    color: #9a9089;
    font-size: 9px;
    border: 1px dashed #e7dcd4;
    border-radius: 9px;
    background: #fcfaf8;
  }
  .mock-profile-card {
    width: min(390px, 100%);
    display: grid;
    gap: 13px;
    padding: 14px;
    border: 1px solid #d9e2ed;
    border-radius: 10px;
    background: #fff;
  }
  .mock-profile-card header {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .mock-profile-card header > i {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: #d61327;
    font-size: 19px;
    font-style: normal;
  }
  .mock-profile-card header span {
    display: grid;
    gap: 3px;
  }
  .mock-profile-card header b {
    color: #17273b;
    font-size: 12px;
  }
  .mock-profile-card header small {
    width: max-content;
    padding: 2px 6px;
    border-radius: 999px;
    color: #61758d;
    background: #edf3fa;
    font-size: 7px;
  }
  .mock-profile-card header button {
    margin-left: auto;
    padding: 6px 10px;
    border: 1px solid #ee1c32;
    border-radius: 6px;
    color: #e41d31;
    background: #fff;
    font-size: 8px;
    font-weight: 700;
  }
  .mock-profile-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }
  .mock-profile-fields span {
    display: grid;
    gap: 5px;
    padding: 9px;
    border: 1px solid #dce5ef;
    border-radius: 7px;
    background: #f8fafc;
  }
  .mock-profile-fields small {
    color: #8498b1;
    font-size: 7px;
  }
  .mock-profile-fields b {
    color: #23364f;
    font-size: 9px;
    overflow-wrap: anywhere;
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

  .mock-waiter-overview {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
    gap: 8px;
  }

  .mock-waiter-overview > .mock-panel {
    min-height: 174px;
  }

  .mock-waiter-side {
    display: grid;
    gap: 8px;
  }

  .mock-waiter-empty {
    display: grid;
    min-height: 65px;
    padding: 9px;
    color: #938881;
    font-size: 8px;
    text-align: center;
    place-items: center;
    background: #fcfaf8;
    border: 1px dashed #e5d9d1;
    border-radius: 7px;
  }

  .mock-waiter-empty i {
    display: grid;
    width: 21px;
    height: 21px;
    color: #bd6a4d;
    font-size: 13px;
    font-style: normal;
    place-items: center;
    background: #fff0e8;
    border-radius: 50%;
  }

  .mock-panel {
    min-width: 0;
    padding: 10px;
    background: #fff;
    border: 1px solid #eadfd7;
    border-radius: 9px;
    overflow: hidden;
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

    .mock-waiter-overview {
      grid-template-columns: 1fr;
    }

    .mock-delivery-cards {
      grid-template-columns: 1fr;
    }

    .mock-waiter-overview > .mock-panel {
      min-height: 0;
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

    .mock-queue-toolbar {
      grid-template-columns: 1fr 1fr;
    }

    .mock-deliveries-toolbar {
      grid-template-columns: 1fr 1fr;
    }

    .mock-tables-toolbar {
      grid-template-columns: 1fr 1fr;
    }

    .mock-table-admin-notice {
      grid-column: 1 / -1;
    }

    .mock-table-row {
      align-items: stretch;
      flex-direction: column;
    }

    .mock-table-row button {
      width: 100%;
    }

    .mock-calls-toolbar {
      grid-template-columns: 1fr 1fr;
    }

    .mock-calls-panels {
      grid-template-columns: 1fr;
    }

    .mock-ready-toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .mock-history-toolbar {
      align-items: stretch;
      flex-direction: column;
    }
    .mock-history-toolbar .mock-channel-tabs {
      width: 100%;
    }

    .mock-ready-toolbar .mock-channel-tabs {
      width: 100%;
    }

    .mock-queue-toolbar .mock-input,
    .mock-queue-toolbar .mock-channel-tabs {
      grid-column: 1 / -1;
    }

    .mock-deliveries-toolbar .mock-input {
      grid-column: 1 / -1;
    }

    .mock-tables-toolbar .mock-input {
      grid-column: 1 / -1;
    }

    .mock-calls-toolbar .mock-input {
      grid-column: 1 / -1;
    }

    .mock-live {
      overflow: hidden;
      text-overflow: ellipsis;
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
      top: 4px;
      right: 4px;
      transform: none;
    }

    .side span[data-marker]::after {
      left: 3px;
      transform: translateY(-50%);
    }

    .mock-help-context {
      top: 9px;
      right: 9px;
      width: 18px;
      height: 18px;
      font-size: 10px;
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
  label {
    display: grid;
    gap: 5px;
    color: #5f5650;
    font-size: 13px;
    font-weight: 700;
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
