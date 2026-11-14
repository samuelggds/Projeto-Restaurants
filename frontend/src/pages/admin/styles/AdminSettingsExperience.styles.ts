import styled from 'styled-components';

export const SettingsHero = styled.section`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #252a31;
  background: #fff;

  .settings-hero-copy {
    min-width: 0;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    align-items: start;
    gap: 14px;
  }
  .settings-hero-icon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border: 1px solid #f0e3d9;
    border-radius: 10px;
    color: #b94a17;
    background: #fff8f2;
  }
  .settings-hero-icon svg { width: 22px; height: 22px; }
  .settings-eyebrow {
    display: block;
    margin: 0 0 7px;
    color: #b94a17;
    font-size: 12px;
    font-weight: 650;
    letter-spacing: .05em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    color: #252a31;
    font-size: clamp(20px, 2.2vw, 25px);
    font-weight: 650;
    line-height: 1.3;
    letter-spacing: -.35px;
  }
  p { max-width: 680px; margin: 9px 0 0; color: #68717d; font-size: 14px; line-height: 1.65; }
  .settings-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 9px 11px;
    color: #545e69;
    background: #f8f9fb;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.5;
  }
  .settings-hero-badge svg { width: 16px; height: 16px; flex-shrink: 0; color: #b94a17; }
  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
    .settings-hero-badge { justify-self: start; }
  }
  @media (max-width: 480px) {
    padding: 18px 16px;
    .settings-hero-copy { grid-template-columns: minmax(0, 1fr); }
  }
`;

export const SettingsCardHeading = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;
  .settings-card-copy { min-width: 0; }
  h2, h3 { margin: 0; line-height: 1.4; }
  p { margin: 7px 0 0; color: #68717d; font-size: 13px; line-height: 1.6; }
  .settings-card-icon {
    width: 40px; height: 40px; flex: 0 0 auto;
    display: grid; place-items: center; border: 1px solid #edf0f2;
    border-radius: 10px; color: #68717d; background: #f8f9fb;
  }
  .settings-card-icon svg { width: 19px; height: 19px; }
`;

export const SettingsToggleList = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 18px;
  .toggle-row {
    min-width: 0;
    min-height: 76px;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
  }
  .toggle-row:hover { border-color: #cfd5dd; }
  .toggle-row > div { min-width: 0; display: grid; gap: 5px; }
  .toggle-row b { color: #303740; font-size: 14px; font-weight: 600; line-height: 1.4; }
  .toggle-row span { color: #68717d; font-size: 13px; line-height: 1.6; }
  .toggle-row input[type='checkbox'] {
    appearance: none; width: 44px; height: 25px; flex: 0 0 44px;
    position: relative; margin-left: auto; border: 0; border-radius: 999px;
    background: #cdd3db; cursor: pointer; transition: background 160ms ease;
  }
  .toggle-row input[type='checkbox']::after {
    content: ''; position: absolute; top: 3px; left: 3px;
    width: 19px; height: 19px; border-radius: 50%; background: #fff;
    transition: transform 160ms ease;
  }
  .toggle-row input[type='checkbox']:checked { background: #b94a17; }
  .toggle-row input[type='checkbox']:checked::after { transform: translateX(19px); }
  .toggle-row input[type='checkbox']:focus-visible { outline: 3px solid #b94a17; outline-offset: 3px; }
  .toggle-row input[type='checkbox']:disabled { opacity: .5; cursor: not-allowed; }
  @media (prefers-reduced-motion: reduce) {
    .toggle-row input[type='checkbox'], .toggle-row input[type='checkbox']::after { transition: none; }
  }
`;

export const SettingsInfoStrip = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 18px;
  padding: 13px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  color: #555f6b;
  background: #f8f9fb;
  font-size: 13px;
  line-height: 1.6;
  svg { width: 17px; height: 17px; flex: 0 0 auto; margin-top: 2px; color: #68717d; }
`;
