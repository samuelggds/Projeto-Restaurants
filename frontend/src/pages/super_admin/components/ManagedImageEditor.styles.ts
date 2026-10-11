import styled, { keyframes } from 'styled-components';

const rotate = keyframes`to { transform: rotate(360deg); }`;

export const Editor = styled.section`
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #e8dfd8;
  border-radius: 12px;
  background: #fffaf7;

  .image-title { display: flex; align-items: center; gap: 8px; color: #513a2d; font-size: 13px; }
  p { margin: 0; color: #73665e; font-size: 12px; line-height: 1.5; }
  .image-cost { padding: 9px 11px; background: #f1f8f1; color: #315938; border-radius: 8px; }
  .image-paste { padding: 14px; border: 1px dashed #cfc0b4; border-radius: 9px; text-align: center; font-size: 12px; color: #73665e; }
  .image-paste:focus-visible { outline: 2px solid #c13b3b; outline-offset: 3px; }
  .image-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .image-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 9px 12px; border: 1px solid #d8cbc1; border-radius: 9px; color: #574438; background: #fff; font-size: 12px; font-weight: 750; cursor: pointer; }
  .image-actions .image-primary { background: #df3c44; border-color: #df3c44; color: #fff; }
  .image-actions button:disabled { cursor: not-allowed; opacity: .55; }
  .image-actions button:focus-visible { outline: 2px solid #9f292f; outline-offset: 3px; }
  .image-preview { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  figure { min-width: 0; margin: 0; border: 1px solid #e7ddd5; border-radius: 10px; overflow: hidden; background: #fff; }
  figcaption { padding: 8px; font-size: 11px; color: #66564b; font-weight: 750; }
  img { display: block; width: 100%; height: 180px; object-fit: contain; }
  .image-error { padding: 10px; border-radius: 8px; color: #922c2c; background: #fff0ef; }
  .image-spinner { animation: ${rotate} 1s linear infinite; }
  @media (max-width: 540px) {
    padding: 11px;
    .image-preview { grid-template-columns: 1fr; }
    .image-actions button { flex: 1 1 auto; }
  }
  @media (prefers-reduced-motion: reduce) { .image-spinner { animation: none; } }
`;
