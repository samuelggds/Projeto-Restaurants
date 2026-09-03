import styled from 'styled-components';

export const SettingsHero = styled.section`
  position: relative;
  overflow: hidden;
  min-height: 168px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  padding: 26px 28px;
  border: 1px solid #ded5cd;
  border-radius: 12px;
  color: #fff;
  background:
    radial-gradient(circle at 91% 10%, color-mix(in srgb, var(--a) 22%, transparent), transparent 29%),
    linear-gradient(132deg, #29231f 0%, #3a302a 54%, #24201d 100%);
  box-shadow: 0 18px 42px rgba(43, 32, 25, 0.13);

  &::after {
    content: '';
    position: absolute;
    right: -58px;
    bottom: -92px;
    width: 190px;
    height: 190px;
    border: 25px solid rgba(255, 255, 255, 0.045);
    border-radius: 50%;
    pointer-events: none;
  }

  .settings-hero-copy {
    position: relative;
    z-index: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr);
    align-items: start;
    gap: 16px;
  }

  .settings-hero-icon {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    color: color-mix(in srgb, var(--a) 68%, white);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.08);
  }

  .settings-hero-icon svg {
    width: 25px;
    height: 25px;
  }

  .settings-eyebrow {
    display: block;
    margin: 1px 0 7px;
    color: color-mix(in srgb, var(--a) 50%, white);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: #fff;
    font-size: clamp(21px, 2.4vw, 29px);
    line-height: 1.1;
    letter-spacing: -0.035em;
  }

  p {
    max-width: 680px;
    margin: 9px 0 0;
    color: rgba(255, 255, 255, 0.69);
    font-size: 12px;
    line-height: 1.55;
  }

  .settings-hero-badge {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    padding: 8px 11px;
    color: #f5eee9;
    background: rgba(255, 255, 255, 0.075);
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
    backdrop-filter: blur(8px);
  }

  .settings-hero-badge svg {
    width: 15px;
    height: 15px;
    color: color-mix(in srgb, var(--a) 65%, white);
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    .settings-hero-badge {
      justify-self: start;
    }
  }

  @media (max-width: 480px) {
    min-height: 0;
    padding: 20px 17px;
    .settings-hero-copy {
      grid-template-columns: 1fr;
    }
  }
`;

export const SettingsCardHeading = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 2px;

  .settings-card-copy {
    min-width: 0;
  }

  h2,
  h3 {
    margin: 0;
  }

  p {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }

  .settings-card-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a) 11%, transparent);
    transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .settings-card-icon svg {
    width: 19px;
    height: 19px;
  }

  section:hover & .settings-card-icon {
    transform: translateY(-2px) scale(1.035);
  }

  @media (prefers-reduced-motion: reduce) {
    .settings-card-icon {
      transition: none;
    }
  }
`;

export const SettingsToggleList = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 18px;

  .toggle-row {
    min-height: 72px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 13px;
    border: 1px solid #ebe4dd;
    border-radius: 9px;
    background: #fcfbf9;
    transition:
      border-color 200ms ease,
      background 200ms ease,
      box-shadow 240ms ease,
      transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .toggle-row:hover {
    border-color: #ddd2c8;
    background: #fff;
    box-shadow: 0 8px 20px rgba(49, 36, 27, 0.045);
    transform: translateY(-1px);
  }

  .toggle-row > div {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .toggle-row b {
    color: #37312d;
    font-size: 12px;
  }

  .toggle-row span {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }

  .toggle-row input[type='checkbox'] {
    appearance: none;
    width: 44px;
    height: 25px;
    flex: 0 0 44px;
    position: relative;
    margin-left: auto;
    border: 0;
    border-radius: 999px;
    background: #d4cfca;
    cursor: pointer;
    transition:
      background 220ms ease,
      box-shadow 220ms ease;
  }

  .toggle-row input[type='checkbox']::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgba(43, 32, 25, 0.2);
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .toggle-row input[type='checkbox']:checked {
    background: var(--a);
    box-shadow: 0 4px 11px color-mix(in srgb, var(--a) 20%, transparent);
  }

  .toggle-row input[type='checkbox']:checked::after {
    transform: translateX(19px);
  }

  .toggle-row input[type='checkbox']:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 17%, transparent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle-row,
    .toggle-row input[type='checkbox'],
    .toggle-row input[type='checkbox']::after {
      transition: none;
    }
  }
`;

export const SettingsInfoStrip = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 18px;
  padding: 12px 13px;
  border: 1px solid color-mix(in srgb, var(--a) 14%, #e5ded7);
  border-radius: 8px;
  color: #665e58;
  background: color-mix(in srgb, var(--a) 4%, #fbfaf8);
  font-size: 10px;
  line-height: 1.5;

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    margin-top: 1px;
    color: var(--a);
  }
`;
