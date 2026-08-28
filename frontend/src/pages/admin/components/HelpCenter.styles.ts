import styled from 'styled-components';

export const Root = styled.section`
  width: min(100%, 1080px);
  display: grid;
  gap: 18px;
`;
export const Hero = styled.header`
  padding: 27px 29px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: linear-gradient(135deg, #fff7f1, #fffdfb 65%);
  box-shadow: 0 12px 35px rgba(79, 47, 23, 0.06);
  span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--a);
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  span svg {
    width: 17px;
  }
  h2 {
    margin: 12px 0 7px;
    font-size: clamp(24px, 3vw, 32px);
  }
  p {
    margin: 0;
    max-width: 720px;
    color: var(--muted);
    line-height: 1.55;
  }
`;
export const Guide = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  article {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: #fff;
    transition:
      box-shadow 180ms ease,
      border-color 180ms ease;
  }
  article.open {
    grid-column: span 2;
    border-color: color-mix(in srgb, var(--a) 34%, var(--border));
    box-shadow: 0 10px 26px rgba(72, 43, 22, 0.07);
  }
  article > button {
    width: 100%;
    min-height: 76px;
    padding: 13px 15px;
    border: 0;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    color: #24201d;
    cursor: pointer;
  }
  article > button:hover {
    background: #fdf9f5;
  }
  i {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--a);
    background: #fff0e6;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }
  i svg {
    width: 19px;
  }
  span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  b {
    font-size: 14px;
  }
  small {
    color: var(--muted);
    font-size: 11px;
  }
  article > button > svg {
    margin-left: auto;
    width: 18px;
    color: var(--muted);
    transition: transform 180ms ease;
  }
  article.open > button > svg {
    transform: rotate(180deg);
  }
  .guide-details {
    padding: 0 19px 20px;
    display: grid;
    grid-template-columns: minmax(250px, 0.68fr) minmax(0, 1.32fr);
    gap: 20px;
    align-items: start;
  }
  ol {
    margin: 0;
    padding: 0;
    display: grid;
    gap: 9px;
    counter-reset: guide-step;
    color: #4b4742;
    font-size: 13px;
    line-height: 1.5;
  }
  li {
    position: relative;
    min-height: 48px;
    padding: 10px 11px 10px 43px;
    list-style: none;
    border: 1px solid #eee2d8;
    border-radius: 10px;
    background: #fffaf6;
    box-shadow: 0 4px 11px rgba(79, 47, 23, 0.035);
  }
  li::before {
    counter-increment: guide-step;
    content: counter(guide-step);
    position: absolute;
    top: 50%;
    left: 11px;
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    transform: translateY(-50%);
    border-radius: 50%;
    background: var(--a);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    box-shadow: 0 3px 8px rgba(184, 69, 19, 0.22);
  }
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
    article.open {
      grid-column: auto;
    }
    .guide-details {
      grid-template-columns: 1fr;
      padding: 0 14px 16px;
    }
  }
`;
export const SettingsGroup = styled.section`
  grid-column: span 2;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  transition:
    box-shadow 180ms ease,
    border-color 180ms ease;
  &.open {
    border-color: color-mix(in srgb, var(--a) 34%, var(--border));
    box-shadow: 0 10px 26px rgba(72, 43, 22, 0.07);
  }
  > button {
    width: 100%;
    min-height: 76px;
    padding: 13px 15px;
    border: 0;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    color: #24201d;
    cursor: pointer;
  }
  > button:hover {
    background: #fdf9f5;
  }
  > button i {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--a);
    background: #fff0e6;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }
  > button i svg {
    width: 19px;
  }
  > button span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  > button b {
    font-size: 14px;
  }
  > button small {
    color: var(--muted);
    font-size: 11px;
  }
  > button > svg {
    margin-left: auto;
    width: 18px;
    color: var(--muted);
    transition: transform 180ms ease;
  }
  &.open > button > svg {
    transform: rotate(180deg);
  }
  .settings-guides {
    padding: 0 12px 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .settings-guides-intro {
    grid-column: 1/-1;
    margin: 0;
    padding: 2px 3px 5px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }
  .settings-guide-item > button {
    min-height: 68px;
    padding: 12px 13px;
  }
  .settings-guide-item > button i {
    width: 34px;
    height: 34px;
    border-radius: 10px;
  }
  .settings-guide-item > button i svg {
    width: 17px;
  }
  .settings-guide-item.open {
    grid-column: 1/-1;
  }
  @media (max-width: 650px) {
    grid-column: auto;
    .settings-guides {
      grid-template-columns: 1fr;
      padding: 0 10px 12px;
    }
    .settings-guides-intro {
      grid-column: auto;
    }
    .settings-guide-item.open {
      grid-column: auto;
    }
  }
`;
export const Preview = styled.figure`
  margin: 0;
  overflow: hidden;
  border: 1px solid #e9dfd6;
  border-radius: 12px;
  background: #fbfaf8;
  box-shadow: 0 8px 20px rgba(79, 47, 23, 0.07);
  .preview-topbar {
    min-height: 32px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: #1d252d;
    color: #f7f1e9;
    font-size: 9px;
    letter-spacing: 0.06em;
  }
  .preview-topbar span {
    opacity: 0.72;
  }
  .preview-topbar b {
    font-size: 10px;
  }
  .preview-content {
    display: grid;
    grid-template-columns: 122px minmax(0, 1fr);
    min-height: 225px;
  }
  .preview-sidebar {
    padding: 11px 9px;
    display: grid;
    align-content: start;
    gap: 7px;
    background: #27313b;
    color: #dce3e9;
    font-size: 9px;
  }
  .preview-sidebar .brand {
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    color: #fff;
    font-weight: 800;
    line-height: 1.35;
  }
  .preview-sidebar span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .preview-sidebar .selected {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 6px;
    border-radius: 5px;
    background: rgba(243, 105, 44, 0.25);
    color: #fff;
  }
  .preview-sidebar em {
    font-style: normal;
  }
  .preview-page {
    position: relative;
    padding: 14px;
    background: #fff;
  }
  .marker {
    width: 17px;
    height: 17px;
    display: grid;
    place-items: center;
    position: absolute;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #df560f;
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    box-shadow: 0 2px 7px rgba(125, 45, 10, 0.35);
    z-index: 2;
  }
  .preview-sidebar .selected em {
    width: 17px;
    height: 17px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #df560f;
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    box-shadow: 0 2px 7px rgba(125, 45, 10, 0.35);
  }
  .preview-title {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee8e1;
  }
  .preview-title svg {
    width: 19px;
    color: var(--a);
    margin-top: 2px;
  }
  .preview-title div {
    display: grid;
    gap: 2px;
  }
  .preview-title small {
    font-size: 8px;
    color: #9a8f84;
    letter-spacing: 0.07em;
  }
  .preview-title b {
    font-size: 13px;
    color: #2d2722;
  }
  .preview-title p {
    margin: 1px 0 0;
    color: #83776d;
    font-size: 9px;
    line-height: 1.35;
  }
  .title-marker {
    right: 0;
    top: -5px;
  }
  .preview-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    padding: 12px 0;
  }
  .preview-form label {
    position: relative;
    display: grid;
    gap: 4px;
    padding: 7px;
    border: 1px solid #e7ded6;
    border-radius: 6px;
    background: #fff;
  }
  .preview-form label:last-child:nth-child(odd) {
    grid-column: span 2;
  }
  .preview-form label > span {
    display: block;
    position: relative;
    color: #645a51;
    font-size: 8px;
    font-weight: 800;
  }
  .preview-form label > b {
    display: block;
    min-height: 17px;
    padding: 4px 5px;
    overflow: hidden;
    border: 1px solid #e7ded6;
    border-radius: 4px;
    background: #fcfaf8;
    color: #776c62;
    font-size: 8px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .preview-form .marker {
    right: -7px;
    top: -8px;
  }
  .preview-action {
    position: relative;
    display: block;
    width: max-content;
    margin-left: auto;
    padding: 7px 11px;
    border: 0;
    border-radius: 6px;
    background: var(--a);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    cursor: default;
  }
  .preview-action .marker {
    top: -8px;
    right: -8px;
  }
  figcaption {
    padding: 8px 11px;
    background: #f8f4ef;
    color: #80766d;
    font-size: 10px;
    line-height: 1.4;
  }
  figcaption b {
    color: #49413a;
  }
  .overview-preview {
    display: grid;
    grid-template-columns: 122px minmax(0, 1fr);
    min-height: 294px;
    background: #fdfbf9;
  }
  .overview-sidebar {
    padding: 13px 9px;
    display: grid;
    align-content: start;
    gap: 8px;
    background: #171d21;
    color: #e4e9eb;
    font-size: 8px;
  }
  .overview-sidebar > strong {
    color: var(--a);
    font-family: Georgia, serif;
    font-size: 30px;
    line-height: 0.75;
  }
  .overview-sidebar > b {
    font-family: Georgia, serif;
    font-size: 11px;
  }
  .overview-sidebar > small {
    margin: 3px 0 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #384047;
    color: #9aa8b0;
    font-size: 7px;
    letter-spacing: 0.08em;
  }
  .overview-sidebar span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .overview-sidebar .selected {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 6px;
    border-left: 2px solid var(--a);
    border-radius: 7px;
    background: #332820;
    color: #ff7a38;
    font-weight: 800;
  }
  .overview-sidebar em {
    width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #df560f;
    color: #fff;
    font-size: 8px;
    font-style: normal;
    box-shadow: 0 2px 7px rgba(125, 45, 10, 0.35);
  }
  .overview-page {
    position: relative;
    padding: 14px;
    background: #fdfbf9;
  }
  .overview-page > header {
    position: relative;
    padding-bottom: 10px;
    border-bottom: 1px solid #e4ddd6;
  }
  .overview-page > header small {
    color: var(--a);
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }
  .overview-page > header h4 {
    margin: 3px 0;
    color: #26211d;
    font-size: 17px;
  }
  .overview-page > header p {
    margin: 0;
    color: #80766d;
    font-size: 8px;
  }
  .overview-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    padding: 10px 0;
  }
  .overview-metrics > b {
    position: relative;
    display: grid;
    gap: 3px;
    padding: 7px;
    border: 1px solid #e6ddd6;
    border-radius: 7px;
    background: #fff;
    color: #756b62;
    font-size: 7px;
    font-weight: 500;
  }
  .overview-metrics > b > span {
    color: #28221e;
    font-size: 14px;
    font-weight: 800;
  }
  .overview-metrics small {
    font-size: 7px;
  }
  .overview-metrics .marker {
    right: -6px;
    top: -7px;
  }
  .overview-lists {
    display: grid;
    grid-template-columns: 1.08fr 0.92fr;
    gap: 9px;
  }
  .overview-lists section {
    position: relative;
    overflow: hidden;
    padding: 8px;
    border: 1px solid #e5ddd6;
    border-radius: 8px;
    background: #fff;
  }
  .overview-lists h5 {
    position: relative;
    margin: 0 0 7px;
    color: #28221e;
    font-size: 11px;
  }
  .overview-lists h5 .marker {
    right: 0;
    top: -7px;
  }
  .mini-filters {
    display: grid;
    grid-template-columns: 1.45fr 0.8fr;
    gap: 5px;
  }
  .mini-filters span {
    overflow: hidden;
    padding: 5px;
    border: 1px solid #e8e0d9;
    border-radius: 5px;
    color: #81766d;
    font-size: 7px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .overview-lists p {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    margin: 0;
    padding: 7px 0;
    border-bottom: 1px solid #eee7e0;
    color: #322a25;
    font-size: 8px;
  }
  .overview-lists p b {
    font-size: 8px;
  }
  .overview-lists footer {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding-top: 7px;
  }
  .overview-lists footer small {
    margin-right: auto;
    color: #83776c;
    font-size: 7px;
  }
  .overview-lists footer button {
    padding: 4px 5px;
    border: 1px solid #f0dfd5;
    border-radius: 4px;
    background: #fff;
    color: var(--a);
    font-size: 7px;
  }
  .overview-lists footer .marker {
    left: 57px;
    bottom: -5px;
  }
  .faithful-shell {
    display: grid;
    grid-template-columns: 118px minmax(0, 1fr);
    min-height: 294px;
    background: #fdfbf9;
  }
  .faithful-shell main,
  .settings-shell main {
    min-width: 0;
    padding: 14px;
    background: #fdfbf9;
  }
  .faithful-navigation {
    padding: 13px 9px;
    display: grid;
    align-content: start;
    gap: 8px;
    background: #171d21;
    color: #e4e9eb;
    font-size: 8px;
  }
  .faithful-navigation > span,
  .settings-navigation > span {
    position: relative;
    display: block;
    overflow: hidden;
    padding: 6px;
    border-radius: 6px;
    color: inherit;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .faithful-navigation > span.active {
    padding-left: 27px;
    border-left: 2px solid var(--a);
    background: #332820;
    color: #ff7a38;
    font-weight: 800;
  }
  .guide-marker {
    position: absolute;
    z-index: 3;
    display: grid;
    width: 16px;
    height: 16px;
    place-items: center;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #df560f;
    color: #fff;
    font-size: 8px;
    font-weight: 800;
    font-style: normal;
    line-height: 1;
    box-shadow: 0 2px 7px rgba(125, 45, 10, 0.35);
    pointer-events: none;
  }
  .faithful-navigation .guide-marker {
    left: 5px;
    top: 50%;
    transform: translateY(-50%);
  }
  .faithful-header {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e4ddd6;
  }
  .faithful-header > svg {
    width: 19px;
    color: var(--a);
    margin-top: 2px;
  }
  .faithful-header div {
    display: grid;
    gap: 2px;
  }
  .faithful-header small {
    color: var(--a);
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }
  .faithful-header h4 {
    margin: 1px 0;
    color: #26211d;
    font-size: 16px;
  }
  .faithful-header p {
    margin: 0;
    color: #80766d;
    font-size: 8px;
  }
  .faithful-header > .guide-marker {
    right: 4px;
    top: 4px;
  }
  .overview-shell {
    min-height: 311px;
  }
  .overview-stat-cards {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    padding: 10px 0;
  }
  .overview-stat-cards article {
    position: relative;
    display: grid;
    gap: 3px;
    padding: 7px;
    border: 1px solid #e6ddd6;
    border-radius: 7px;
    background: #fff;
  }
  .overview-stat-cards small {
    color: #756b62;
    font-size: 7px;
  }
  .overview-stat-cards b {
    color: #28221e;
    font-size: 14px;
  }
  .overview-stat-cards span {
    color: #83776c;
    font-size: 7px;
  }
  .overview-stat-cards .guide-marker {
    right: 4px;
    top: 4px;
  }
  .overview-data-panels {
    display: grid;
    grid-template-columns: 1.08fr 0.92fr;
    gap: 9px;
  }
  .overview-data-panels section,
  .orders-preview,
  .management-preview {
    position: relative;
    padding: 8px;
    border: 1px solid #e5ddd6;
    border-radius: 8px;
    background: #fff;
  }
  .overview-data-panels h5,
  .category-panel h5 {
    position: relative;
    margin: 0 0 7px;
    color: #28221e;
    font-size: 11px;
  }
  .overview-data-panels h5 .guide-marker,
  .category-panel h5 .guide-marker {
    right: 0;
    top: 0;
  }
  .mock-filter-row {
    display: grid;
    grid-template-columns: 1.45fr 0.8fr auto;
    gap: 5px;
  }
  .mock-filter-row span,
  .category-panel > span {
    position: relative;
    overflow: hidden;
    padding: 6px;
    border: 1px solid #e8e0d9;
    border-radius: 5px;
    color: #81766d;
    font-size: 7px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .mock-filter-row .guide-marker {
    right: 3px;
    top: 3px;
  }
  .mock-filter-row button,
  .category-panel button,
  .orders-preview footer button,
  .management-preview footer button {
    position: relative;
    padding: 6px 22px 6px 8px;
    border: 0;
    border-radius: 5px;
    background: var(--a);
    color: #fff;
    font-size: 7px;
    font-weight: 800;
  }
  .empty-lines {
    display: grid;
    gap: 0;
    padding-top: 5px;
  }
  .empty-lines i,
  .empty-list i {
    display: block;
    height: 20px;
    border-bottom: 1px solid #eee7e0;
    background: linear-gradient(90deg, #f5f0eb 30%, #fff 30%, #fff 71%, #f5f0eb 71%);
  }
  .overview-data-panels footer,
  .orders-preview footer,
  .management-preview footer {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding-top: 7px;
  }
  .overview-data-panels footer small,
  .orders-preview footer small,
  .management-preview footer small {
    margin-right: auto;
    color: #83776c;
    font-size: 7px;
  }
  .overview-data-panels footer button {
    position: relative;
    padding: 4px 20px 4px 5px;
    border: 1px solid #f0dfd5;
    border-radius: 4px;
    background: #fff;
    color: var(--a);
    font-size: 7px;
  }
  .overview-data-panels footer .guide-marker {
    right: 3px;
    top: 3px;
  }
  .orders-preview {
    margin-top: 11px;
  }
  .empty-list {
    display: grid;
    gap: 0;
    padding-top: 7px;
  }
  .empty-list.large i {
    height: 28px;
  }
  .orders-preview footer {
    margin-top: 8px;
  }
  .orders-preview footer .guide-marker,
  .management-preview footer .guide-marker {
    right: 3px;
    top: 3px;
  }
  .menu-preview {
    margin-top: 11px;
  }
  .mock-product-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
    padding: 9px 0;
  }
  .mock-product-grid article {
    position: relative;
    display: grid;
    gap: 4px;
    padding: 7px;
    border: 1px solid #e6ddd6;
    border-radius: 7px;
    background: #fff;
  }
  .mock-product-grid i {
    display: block;
    height: 38px;
    border-radius: 4px;
    background: linear-gradient(135deg, #f3e3d7, #fff);
  }
  .mock-product-grid b {
    font-size: 8px;
  }
  .mock-product-grid span {
    color: #83776c;
    font-size: 7px;
  }
  .mock-product-grid em {
    color: var(--a);
    font-size: 8px;
    font-style: normal;
    font-weight: 800;
  }
  .mock-product-grid strong {
    position: absolute;
    right: 7px;
    bottom: 6px;
    color: #6c625b;
    font-size: 12px;
  }
  .category-panel {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 5px;
    padding: 8px;
    border: 1px solid #e6ddd6;
    border-radius: 7px;
    background: #fff;
  }
  .category-panel h5 {
    grid-column: 1/-1;
  }
  .settings-shell {
    display: grid;
    grid-template-columns: 106px 138px minmax(0, 1fr);
    min-height: 294px;
    background: #fdfbf9;
  }
  .settings-navigation {
    padding: 10px 7px;
    display: grid;
    align-content: start;
    gap: 5px;
    border-right: 1px solid #e4ddd6;
    background: #fff;
    color: #585049;
    font-size: 7px;
  }
  .settings-navigation input {
    width: 100%;
    padding: 6px;
    border: 1px solid #e6ddd6;
    border-radius: 5px;
    background: #fdfbf9;
    color: #83776c;
    font-size: 7px;
  }
  .settings-navigation > small {
    margin: 3px 0;
    color: #a36b49;
    font-size: 6px;
    font-weight: 800;
  }
  .settings-navigation > span.active {
    padding-left: 26px;
    background: #fff0e6;
    color: var(--a);
    font-weight: 800;
  }
  .settings-navigation .guide-marker {
    left: 5px;
    top: 50%;
    transform: translateY(-50%);
  }
  .settings-form-preview {
    position: relative;
    margin-top: 10px;
    padding-top: 32px;
    border: 1px solid #e5ddd6;
    border-radius: 8px;
    background: #fff;
  }
  .save-actions {
    position: absolute;
    top: 7px;
    right: 7px;
    display: flex;
    gap: 5px;
  }
  .save-actions button {
    position: relative;
    padding: 5px 20px 5px 7px;
    border: 1px solid #e5ddd6;
    border-radius: 5px;
    background: #fff;
    color: #5f554d;
    font-size: 7px;
  }
  .save-actions button:last-child {
    border: 0;
    background: var(--a);
    color: #fff;
    font-weight: 800;
  }
  .save-actions .guide-marker {
    right: 3px;
    top: 3px;
  }
  .settings-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
    padding: 8px;
  }
  .settings-fields label {
    display: grid;
    gap: 4px;
  }
  .settings-fields label b {
    position: relative;
    color: #4e453e;
    font-size: 7px;
  }
  .settings-fields label .guide-marker {
    right: 2px;
    top: 1px;
  }
  .settings-fields label span {
    overflow: hidden;
    padding: 7px;
    border: 1px solid #e6ddd6;
    border-radius: 5px;
    color: #81766d;
    font-size: 7px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .management-preview {
    margin-top: 11px;
  }
  .management-list {
    display: grid;
    margin-top: 8px;
  }
  .management-list article {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 0;
    border-bottom: 1px solid #eee7e0;
  }
  .management-list article > i {
    width: 21px;
    height: 21px;
    border-radius: 50%;
    background: #f5ede7;
  }
  .management-list article > div {
    display: grid;
    gap: 2px;
  }
  .management-list article b {
    font-size: 8px;
  }
  .management-list article span {
    color: #83776c;
    font-size: 7px;
  }
  .management-list article em {
    margin-left: auto;
    color: #a49b93;
    font-size: 8px;
    font-style: normal;
  }
  @media (max-width: 650px) {
    .preview-content {
      grid-template-columns: 92px minmax(0, 1fr);
    }
    .preview-sidebar {
      font-size: 8px;
    }
    .preview-page {
      padding: 10px;
    }
    .preview-form {
      grid-template-columns: 1fr;
      gap: 6px;
    }
    .preview-form label:last-child:nth-child(odd) {
      grid-column: auto;
    }
    .preview-form label {
      padding: 6px;
    }
    .overview-preview {
      grid-template-columns: 92px minmax(0, 1fr);
    }
    .overview-sidebar {
      font-size: 7px;
    }
    .overview-sidebar > strong {
      font-size: 24px;
    }
    .overview-page {
      padding: 9px;
    }
    .overview-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .overview-lists {
      grid-template-columns: 1fr;
    }
    .overview-lists section:last-child {
      display: none;
    }
    .faithful-shell {
      grid-template-columns: 86px minmax(0, 1fr);
    }
    .faithful-navigation {
      font-size: 7px;
    }
    .faithful-brand strong {
      font-size: 22px;
    }
    .faithful-shell main,
    .settings-shell main {
      padding: 9px;
    }
    .overview-stat-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .overview-data-panels {
      grid-template-columns: 1fr;
    }
    .overview-data-panels section:last-child {
      display: none;
    }
    .mock-filter-row {
      grid-template-columns: 1fr;
    }
    .mock-filter-row span:nth-child(2) {
      display: none;
    }
    .mock-product-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .mock-product-grid article:last-child {
      display: none;
    }
    .category-panel {
      grid-template-columns: 1fr;
    }
    .settings-shell {
      grid-template-columns: 74px 96px minmax(0, 1fr);
    }
    .settings-navigation {
      font-size: 6px;
    }
    .settings-navigation input {
      font-size: 6px;
    }
    .settings-fields {
      grid-template-columns: 1fr;
    }
    .settings-fields label:nth-child(n + 3) {
      display: none;
    }
    .management-list article:nth-child(n + 3) {
      display: none;
    }
  }
`;
export const ReportCard = styled.section`
  padding: 25px 28px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: #fff;
  box-shadow: 0 12px 35px rgba(79, 47, 23, 0.05);
  .heading {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    margin-bottom: 19px;
  }
  .refresh-issues {
    min-height: 34px;
    padding: 0 11px;
    border: 1px solid #ded7cf;
    border-radius: 9px;
    background: #fff;
    color: #493e38;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .heading .refresh-issues:first-of-type {
    margin-left: auto;
  }
  .heading > i {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--a);
  }
  .heading svg {
    width: 21px;
  }
  h2 {
    margin: 0 0 4px;
    font-size: 19px;
  }
  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }
  form {
    display: grid;
    grid-template-columns: minmax(190px, 0.45fr) minmax(0, 1fr);
    gap: 15px;
  }
  label {
    display: grid;
    gap: 7px;
    color: #3a3530;
    font-size: 12px;
    font-weight: 700;
  }
  select,
  textarea {
    width: 100%;
    border: 1px solid #ded7cf;
    border-radius: 10px;
    background: #fcfbf9;
    color: #25211e;
    padding: 11px 12px;
    outline: 0;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  textarea {
    min-height: 92px;
    resize: vertical;
    line-height: 1.45;
  }
  select:focus,
  textarea:focus {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }
  footer {
    grid-column: 1/-1;
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  footer span {
    font-size: 12px;
    font-weight: 700;
  }
  .success {
    color: #18743a;
  }
  .error {
    color: #b42318;
  }
  footer button {
    margin-left: auto;
    min-height: 42px;
    padding: 0 15px;
    border: 0;
    border-radius: 10px;
    background: var(--a);
    color: #fff;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    box-shadow: 0 8px 16px color-mix(in srgb, var(--a) 18%, transparent);
    cursor: pointer;
  }
  footer button:disabled {
    opacity: 0.55;
    box-shadow: none;
    cursor: not-allowed;
  }
  footer svg {
    width: 17px;
  }
  .employee-issue {
    display: grid;
    gap: 8px;
    padding: 12px;
    margin-top: 10px;
    border: 1px solid #eadfd7;
    border-radius: 10px;
    background: #fffaf7;
  }
  .employee-issue b {
    color: #493e38;
    font-size: 13px;
  }
  .employee-issue pre {
    margin: 0;
    white-space: pre-wrap;
    color: #655b54;
    font: inherit;
    font-size: 12px;
    line-height: 1.45;
  }
  .issue-response {
    padding: 9px;
    border-radius: 8px;
    background: #f1f8f3;
    color: #275c39;
  }
  .issue-reply {
    font-size: 12px;
  }
  .employee-issue .delete-issue {
    color: #a62b24;
    background: #fff;
    border: 1px solid #e9bcb8;
    box-shadow: none;
  }
  .employee-issue footer {
    justify-content: flex-end;
  }
  .employee-issue footer button {
    margin-left: 0;
    padding: 8px 10px;
    font-size: 12px;
  }
  .platform-conversation {
    display: grid;
    gap: 10px;
    max-height: 340px;
    margin: 0 0 18px;
    padding: 14px;
    overflow-y: auto;
    border: 1px solid #e5ded7;
    border-radius: 14px;
    background: #faf8f5;
  }
  .platform-conversation article {
    width: min(78%, 720px);
    padding: 11px 13px;
    border: 1px solid #e2d9d1;
    border-radius: 13px 13px 13px 4px;
    background: #fff;
    box-shadow: 0 5px 14px rgba(60, 43, 29, 0.05);
  }
  .platform-conversation article.from-admin {
    justify-self: end;
    border-color: color-mix(in srgb, var(--a) 25%, #e2d9d1);
    border-radius: 13px 13px 4px 13px;
    background: color-mix(in srgb, var(--a) 7%, #fff);
  }
  .platform-conversation article header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 5px;
  }
  .platform-conversation article b {
    color: #40372f;
    font-size: 12px;
  }
  .platform-conversation article time {
    color: #887d73;
    font-size: 10px;
  }
  .platform-conversation article p {
    color: #514840;
    white-space: pre-wrap;
  }
  .platform-conversation .conversation-status {
    display: inline-flex;
    margin-top: 8px;
    padding: 4px 7px;
    border-radius: 999px;
    background: #e8f5eb;
    color: #24733a;
    font-size: 10px;
    font-weight: 800;
  }
  .platform-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 86px;
    color: #766b62;
  }
  .platform-empty svg {
    width: 25px;
    color: var(--a);
  }
  .platform-empty span {
    display: grid;
    gap: 2px;
  }
  .platform-empty b {
    color: #40372f;
    font-size: 13px;
  }
  .platform-empty small {
    font-size: 11px;
  }
  @media (max-width: 650px) {
    padding: 20px;
    form {
      grid-template-columns: 1fr;
    }
    footer {
      align-items: stretch;
      flex-direction: column;
    }
    footer button {
      margin-left: 0;
      justify-content: center;
    }
    .heading {
      flex-wrap: wrap;
    }
    .heading .refresh-issues:first-of-type {
      margin-left: 0;
    }
    .platform-conversation article {
      width: 94%;
    }
  }
`;
export const Tip = styled.p`
  margin: 0;
  padding: 13px 16px;
  border-radius: 12px;
  color: #635d57;
  background: #f3f0eb;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  svg {
    width: 18px;
    color: var(--a);
    flex: 0 0 auto;
  }
`;
