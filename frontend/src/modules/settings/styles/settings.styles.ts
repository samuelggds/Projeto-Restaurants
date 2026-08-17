import styled, { createGlobalStyle } from 'styled-components';

export const GlobalSettingsStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap');
`;

export const Page = styled.main`
  --admin-primary: #c95d3d;
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);
  min-height: 100vh;
  color: #25211e;
  background: #f5f3f0;
  font-family: Manrope, Arial, sans-serif;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  display: flex;
  height: 100vh;
  padding: 28px 18px;
  background: #211e1b;
  flex-direction: column;
  overflow-y: auto;

  @media (max-width: 900px) {
    position: static;
    height: auto;
  }
`;

export const SidebarTitle = styled.div`
  display: grid;
  gap: 5px;
  padding: 7px 12px 30px;

  span {
    color: #9f9690;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  strong {
    color: #fffaf4;
    font-family: 'DM Serif Display', serif;
    font-size: 29px;
    font-weight: 400;
  }
`;

export const SidebarNav = styled.nav`
  display: grid;
  gap: 6px;
`;

export const SidebarButton = styled.button<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: 38px 1fr;
  align-items: center;
  gap: 11px;
  padding: 12px;
  color: ${({ $active }) => ($active ? 'white' : '#b7afa9')};
  background: ${({ $active }) => ($active ? '#342f2b' : 'transparent')};
  border: 0;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  box-shadow: ${({ $active }) => ($active ? 'inset 3px 0 var(--admin-primary)' : 'none')};
  transition:
    background 0.18s ease,
    color 0.18s ease;

  &:hover {
    color: white;
    background: #342f2b;
  }
`;

export const SidebarIcon = styled.span`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: #dca38e;
  background: #2c2825;
  border-radius: 9px;
  font-size: 16px;
`;

export const SidebarButtonLabel = styled.span`
  display: grid;
  gap: 3px;

  strong {
    font-size: 12px;
    color: inherit;
  }

  small {
    color: #857d77;
    font-size: 9px;
  }
`;

export const SidebarHelp = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 13px;
  color: #d5cdc7;
  background: #2c2825;
  border: 1px solid #3c3733;
  border-radius: 11px;

  > span {
    display: grid;
    place-items: center;
    width: 31px;
    height: 31px;
    color: #211e1b;
    background: #dca38e;
    border-radius: 50%;
    font-weight: 800;
    flex-shrink: 0;
  }

  div {
    display: grid;
    gap: 2px;

    strong {
      font-size: 10px;
    }
    small {
      color: #8f8781;
      font-size: 9px;
    }
  }
`;

export const Content = styled.section`
  min-width: 0;
`;

export const Topbar = styled.div`
  position: sticky;
  z-index: 5;
  top: 0;
  display: flex;
  min-height: 82px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 15px 38px;
  background: rgba(255, 253, 250, 0.92);
  border-bottom: 1px solid #e5ddd5;
  backdrop-filter: blur(12px);
`;

export const TopbarInfo = styled.div`
  display: grid;
  gap: 4px;

  span {
    color: #a09891;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  strong {
    font-size: 16px;
    color: #25211e;
  }
`;

export const TopbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const SavedMessage = styled.span`
  margin-right: 5px;
  color: #417b50;
  font-size: 10px;
  font-weight: 800;
`;

export const PreviewButton = styled.button`
  min-height: 43px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  color: #312c28;
  background: white;
  border: 1px solid #ddd3cb;
  cursor: pointer;

  &:hover {
    background: #f8f3eb;
  }
`;

export const SaveButton = styled.button`
  min-height: 43px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  color: white;
  background: var(--admin-primary);
  border: 1px solid var(--admin-primary);
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
  &:not(:disabled):hover {
    filter: brightness(1.06);
  }
`;

export const ContentBody = styled.div`
  width: min(100% - 76px, 1000px);
  margin: 0 auto;
  padding: 54px 0 90px;
`;

export const Panel = styled.div`
  > header {
    margin-bottom: 27px;

    > span {
      color: var(--admin-primary);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    h2 {
      margin: 8px 0;
      font-family: 'DM Serif Display', serif;
      font-size: 37px;
      font-weight: 400;
      letter-spacing: -0.02em;
    }

    p {
      margin: 0;
      color: #827a74;
      font-size: 11px;
    }
  }
`;

export const Card = styled.div<{ $stack?: boolean }>`
  padding: 30px;
  background: #fffdfa;
  border: 1px solid #e5ddd5;
  border-radius: 15px;
  box-shadow: 0 12px 32px rgba(44, 35, 29, 0.04);
  display: ${({ $stack }) => ($stack ? 'grid' : 'block')};
  gap: ${({ $stack }) => ($stack ? '30px' : '0')};
`;

export const Grid = styled.div<{ $three?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $three }) =>
    $three ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))'};
  gap: 23px;
  ${({ $three }) =>
    $three &&
    `
    padding: 27px 0;
    border-top: 1px solid #ece4dd;
    border-bottom: 1px solid #ece4dd;
  `}

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

export const FieldLabel = styled.label`
  display: grid;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  color: #6b6460;

  span {
    color: inherit;
  }
  small {
    color: #9a9591;
    font-size: 9px;
    font-weight: 400;
  }
`;

export const Input = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 13px;
  border: 1px solid #ddd3cb;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  background: white;
  color: #25211e;

  &:focus {
    border-color: var(--admin-primary);
    box-shadow: 0 0 0 3px rgba(201, 93, 61, 0.09);
  }
  &:disabled {
    opacity: 0.6;
    background: #f5f3f0;
    cursor: not-allowed;
  }
`;

export const Select = styled.select`
  width: 100%;
  height: 44px;
  padding: 0 13px;
  border: 1px solid #ddd3cb;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  background: white;
  color: #25211e;

  &:focus {
    border-color: var(--admin-primary);
    box-shadow: 0 0 0 3px rgba(201, 93, 61, 0.09);
  }
`;

export const Textarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid #ddd3cb;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  resize: vertical;
  outline: none;
  background: white;
  color: #25211e;

  &:focus {
    border-color: var(--admin-primary);
    box-shadow: 0 0 0 3px rgba(201, 93, 61, 0.09);
  }
`;

export const CharCount = styled.small`
  text-align: right;
  color: #9a9591;
  font-size: 9px;
`;

export const SwitchLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #ece4dd;
  cursor: pointer;

  &:last-child {
    border-bottom: 0;
  }

  > span {
    display: grid;
    gap: 3px;

    strong {
      font-size: 13px;
      color: #25211e;
    }
    small {
      font-size: 10px;
      color: #9a9591;
    }
  }
`;

export const SwitchTrack = styled.span<{ $checked?: boolean }>`
  position: relative;
  width: 42px;
  height: 24px;
  background: ${({ $checked }) => ($checked ? 'var(--admin-primary)' : '#d6cfc9')};
  border-radius: 999px;
  flex-shrink: 0;
  transition: background 0.18s ease;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${({ $checked }) => ($checked ? '21px' : '3px')};
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    transition: left 0.18s ease;
  }
`;

export const SwitchGroup = styled.div`
  border: 1px solid #e5ddd5;
  border-radius: 12px;
  padding: 0 16px;
  overflow: hidden;
`;

export const SocialInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    background: #f5f3f0;
    border: 1px solid #ddd3cb;
    border-radius: 8px;
    font-size: 14px;
    flex-shrink: 0;
  }
`;

export const BrandPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: #f5f3f0;
  border-radius: 12px;
  margin-bottom: 24px;
`;

export const BrandLogo = styled.div<{ $color?: string }>`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${({ $color }) => $color || 'var(--admin-primary)'};
  display: grid;
  place-items: center;
  color: white;
  font-family: 'DM Serif Display', serif;
  font-size: 28px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const BrandInfo = styled.div`
  display: grid;
  gap: 3px;

  strong {
    font-size: 16px;
    color: #25211e;
  }
  span {
    font-size: 11px;
    color: #9a9591;
  }
`;

export const ColorField = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  input[type='color'] {
    width: 44px;
    height: 44px;
    border: 1px solid #ddd3cb;
    border-radius: 8px;
    padding: 3px;
    cursor: pointer;
  }
`;

export const AboutPreview = styled.div`
  margin-top: 20px;
  padding: 20px;
  background: #f5f3f0;
  border-radius: 12px;

  span {
    color: var(--admin-primary);
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.13em;
  }
  strong {
    display: block;
    margin: 8px 0 6px;
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    font-weight: 400;
  }
  p {
    margin: 0;
    color: #827a74;
    font-size: 12px;
    line-height: 1.7;
  }
`;

export const HoursList = styled.div`
  display: grid;
  gap: 14px;
`;

export const HoursRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #ece4dd;

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;

export const DaySwitch = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 160px;
  cursor: pointer;

  input[type='checkbox'] {
    display: none;
  }

  strong {
    font-size: 13px;
  }
`;

export const DayToggle = styled.span<{ $checked?: boolean }>`
  width: 36px;
  height: 20px;
  background: ${({ $checked }) => ($checked ? 'var(--admin-primary)' : '#d6cfc9')};
  border-radius: 999px;
  flex-shrink: 0;
  position: relative;
  transition: background 0.18s;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $checked }) => ($checked ? '18px' : '2px')};
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: left 0.18s;
  }
`;

export const TimeRange = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  input[type='time'] {
    height: 38px;
    padding: 0 10px;
    border: 1px solid #ddd3cb;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    background: white;
    color: #25211e;
    outline: none;

    &:focus {
      border-color: var(--admin-primary);
    }
  }

  span {
    color: #9a9591;
    font-size: 12px;
  }
`;

export const ClosedLabel = styled.span`
  color: #b91c1c;
  font-size: 11px;
  font-weight: 700;
`;

export const WhatsappPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #f5f3f0;
  border-radius: 12px;
  margin-top: 6px;
`;

export const WhatsappIcon = styled.div`
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  background: #25d366;
  border-radius: 50%;
  color: white;
  font-size: 20px;
  flex-shrink: 0;
`;

export const WhatsappPreviewInfo = styled.div`
  flex: 1;
  display: grid;
  gap: 2px;

  span {
    color: var(--admin-primary);
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }
  strong {
    font-size: 13px;
    color: #25211e;
  }
  small {
    font-size: 10px;
    color: #9a9591;
  }
`;

export const WhatsappTestLink = styled.a`
  padding: 8px 14px;
  background: #25d366;
  color: white;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    filter: brightness(1.06);
  }
  &[aria-disabled='true'] {
    opacity: 0.45;
    pointer-events: none;
  }
`;

export const ErrorAlert = styled.div`
  padding: 10px 14px;
  background: rgba(185, 28, 28, 0.08);
  border: 1px solid rgba(185, 28, 28, 0.3);
  border-radius: 8px;
  color: #b91c1c;
  font-size: 11px;
  font-weight: 700;
`;

export const InfoBox = styled.div`
  padding: 12px 14px;
  background: rgba(37, 99, 235, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 10px;
  color: #1e40af;
  font-size: 11px;
  line-height: 1.6;
`;
