import styled from 'styled-components';

export const Workspace = styled.section`
  display: grid;
  gap: 18px;
`;

export const Hero = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  padding: 22px;
  border: 1px solid #e7e8ec;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff 0%, #fff7f1 100%);

  h2 { margin: 0 0 6px; font-size: 24px; }
  p { margin: 0; color: #68707b; max-width: 700px; line-height: 1.5; }
  button {
    border: 0; border-radius: 12px; padding: 12px 16px; cursor: pointer;
    font-weight: 800; display: inline-flex; align-items: center; gap: 8px;
    background: var(--brand, #d64d08); color: #fff; white-space: nowrap;
  }

  @media (max-width: 700px) {
    align-items: stretch; flex-direction: column;
    button { justify-content: center; width: 100%; }
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 1100px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 650px) { grid-template-columns: 1fr; }
`;

export const Card = styled.article`
  overflow: hidden;
  border: 1px solid #e8e9ed;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(30, 34, 45, .06);

  .image {
    aspect-ratio: 16 / 10; background: #f4f5f7; position: relative; overflow: hidden;
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .placeholder { width: 100%; height: 100%; display: grid; place-items: center; color: #9aa0aa; }
    .status {
      position: absolute; left: 12px; top: 12px; padding: 6px 9px; border-radius: 999px;
      background: rgba(17,24,39,.84); color: #fff; font-size: 11px; font-weight: 800;
      backdrop-filter: blur(8px);
    }
  }
  .body { padding: 16px; display: grid; gap: 10px; }
  h3 { margin: 0; font-size: 18px; }
  p { margin: 0; color: #737985; line-height: 1.45; min-height: 40px; }
  .meta { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
  .price { font-size: 19px; font-weight: 900; color: #17191f; }
  .groups { color: #737985; font-size: 12px; }
  .actions { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
  button {
    border: 1px solid #e1e3e8; border-radius: 10px; padding: 10px 12px; background: #fff;
    cursor: pointer; font-weight: 800;
  }
  button.primary { background: #17191f; color: #fff; border-color: #17191f; }
  button.danger { color: #b42318; }
`;

export const Empty = styled.div`
  border: 1px dashed #cfd3da; border-radius: 18px; padding: 42px 24px; text-align: center;
  background: #fafbfc;
  h3 { margin: 10px 0 6px; }
  p { margin: 0 auto; color: #747b86; max-width: 560px; line-height: 1.5; }
`;

export const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 1200; background: rgba(14, 18, 25, .58);
  display: flex; justify-content: flex-end;
  @media (max-width: 760px) { align-items: flex-end; }
`;

export const Editor = styled.div`
  width: min(760px, 100vw);
  height: 100%;
  background: #fff;
  overflow: auto;
  box-shadow: -20px 0 60px rgba(0,0,0,.18);
  display: flex; flex-direction: column;

  .head {
    position: sticky; top: 0; z-index: 3; background: rgba(255,255,255,.96);
    backdrop-filter: blur(12px); border-bottom: 1px solid #eceef1;
    padding: 18px 22px; display: flex; justify-content: space-between; gap: 12px; align-items: center;
  }
  .head h2 { margin: 0; font-size: 22px; }
  .head p { margin: 3px 0 0; color: #737985; font-size: 13px; }
  .close { border: 0; background: #f3f4f6; border-radius: 50%; width: 38px; height: 38px; cursor: pointer; }
  .content { padding: 22px; display: grid; gap: 20px; }
  .section { border: 1px solid #e8e9ed; border-radius: 16px; padding: 18px; display: grid; gap: 14px; }
  .section > header { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
  .section h3 { margin: 0; font-size: 17px; }
  .section header p { margin: 4px 0 0; color: #767d88; font-size: 13px; line-height: 1.4; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  label { display: grid; gap: 6px; font-size: 12px; font-weight: 800; color: #3e444d; }
  input, textarea, select {
    width: 100%; box-sizing: border-box; border: 1px solid #d8dbe1; border-radius: 11px;
    padding: 11px 12px; background: #fff; font: inherit; color: #17191f;
  }
  textarea { min-height: 90px; resize: vertical; }
  .photo {
    display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: start;
  }
  .photo-preview {
    aspect-ratio: 1; border-radius: 14px; overflow: hidden; background: #f2f3f5;
    border: 1px dashed #cdd1d8; display: grid; place-items: center; color: #8b919b;
  }
  .photo-preview img { width: 100%; height: 100%; object-fit: cover; }
  .photo-actions { display: grid; gap: 8px; }
  .photo-actions button, .add-group, .add-option {
    border: 1px solid #dfe2e7; border-radius: 10px; padding: 10px 12px; background: #fff;
    cursor: pointer; font-weight: 800; display: inline-flex; gap: 8px; align-items: center; justify-content: center;
  }
  .photo-actions button.ai { background: #17191f; color: #fff; border-color: #17191f; }
  .hint { padding: 10px 12px; border-radius: 10px; background: #f7f8fa; color: #6e7580; font-size: 12px; line-height: 1.45; }
  .group { border: 1px solid #e8e9ed; border-radius: 14px; padding: 14px; display: grid; gap: 12px; background: #fcfcfd; }
  .group-head { display: grid; grid-template-columns: 1fr 105px 105px auto; gap: 8px; align-items: end; }
  .option {
    display: grid; grid-template-columns: minmax(170px, 1fr) 90px 80px 80px 80px auto auto;
    gap: 8px; align-items: end; padding: 10px; border-radius: 12px; background: #fff; border: 1px solid #eceef1;
  }
  .option .fixed { display: flex; align-items: center; gap: 6px; padding-bottom: 10px; white-space: nowrap; }
  .option .fixed input { width: auto; }
  .icon-button { border: 0; background: transparent; color: #a33; cursor: pointer; padding: 10px; }
  .footer {
    position: sticky; bottom: 0; z-index: 3; background: rgba(255,255,255,.97);
    backdrop-filter: blur(12px); border-top: 1px solid #eceef1;
    padding: 14px 22px; display: flex; gap: 10px; justify-content: flex-end;
  }
  .footer button { border-radius: 11px; padding: 11px 16px; font-weight: 800; cursor: pointer; }
  .footer .secondary { background: #fff; border: 1px solid #dfe2e7; }
  .footer .save { background: var(--brand, #d64d08); border: 1px solid var(--brand, #d64d08); color: #fff; }
  .feedback { padding: 11px 13px; border-radius: 11px; font-size: 13px; }
  .feedback.error { background: #fff1f0; color: #a33; }
  .feedback.success { background: #ecfdf3; color: #067647; }

  @media (max-width: 760px) {
    width: 100%; height: min(94vh, 900px); border-radius: 22px 22px 0 0;
    .content { padding: 16px; }
    .grid2, .photo { grid-template-columns: 1fr; }
    .photo-preview { max-width: 240px; width: 100%; }
    .group-head { grid-template-columns: 1fr 1fr; }
    .group-head > label:first-child { grid-column: 1 / -1; }
    .option { grid-template-columns: 1fr 1fr; }
    .option > label:first-child { grid-column: 1 / -1; }
    .option .fixed { align-self: center; }
    .footer { display: grid; grid-template-columns: 1fr 1fr; }
  }
`;
