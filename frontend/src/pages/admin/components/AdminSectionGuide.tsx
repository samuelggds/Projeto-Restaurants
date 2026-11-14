import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import styled from 'styled-components';
import type { AdminSection, SettingsSection } from '../types';
import { adminAreaGuides, adminSettingsGuides } from '../config/adminScreenGuides';
import { settingItems, sectionTitle } from '../config/adminNavigation';

const Guide = styled.details`
  margin-bottom: 22px;
  border: 1px solid var(--admin-border, #e5e7eb);
  border-radius: 12px;
  background: #fff;
  color: #252a31;
  summary {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 54px;
    padding: 14px 18px;
    cursor: pointer;
    list-style: none;
    font-size: 13px;
    font-weight: 600;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary > svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: #b94a17;
  }
  summary > svg:last-child {
    width: 16px;
    height: 16px;
    margin-left: auto;
    color: #68717d;
  }
  &[open] summary > svg:last-child {
    transform: rotate(180deg);
  }
  summary:focus-visible,
  button:focus-visible {
    outline: 3px solid #b94a17;
    outline-offset: 3px;
    border-radius: 8px;
  }
  ol {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 22px;
    padding: 0 18px 20px;
    margin: 0;
    list-style: none;
    counter-reset: instruction;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: #5a6470;
    font-size: 13px;
    line-height: 1.65;
  }
  li::before {
    counter-increment: instruction;
    content: counter(instruction);
    display: grid;
    place-items: center;
    flex: 0 0 24px;
    height: 24px;
    background: #f3f5f7;
    border-radius: 6px;
    font-size: 12px;
    color: #596470;
    font-weight: 650;
  }
  footer {
    padding: 12px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    border-top: 1px solid #edf0f2;
  }
  footer > span {
    color: #68717d;
    font-size: 12px;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    background: transparent;
    padding: 5px 0;
    color: #b94a17;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }
  button svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
  @media (max-width: 1150px) {
    ol {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }
  }
  @media (max-width: 520px) {
    summary {
      padding: 13px 14px;
    }
    ol {
      padding: 0 14px 16px;
    }
  }
`;

type Props = {
  area: AdminSection;
  section: SettingsSection;
  onOpenSettings: (section: SettingsSection) => void;
};

export function AdminSectionGuide({ area, section, onOpenSettings }: Props) {
  if (area === 'overview') return null;
  const content = area === 'settings' ? adminSettingsGuides[section] : adminAreaGuides[area];
  const currentIndex = settingItems.findIndex(([id]) => id === section);
  const nextSection = area === 'settings' ? settingItems[currentIndex + 1]?.[0] : undefined;
  return (
    <Guide key={area === 'settings' ? section : area} data-admin-screen-guide>
      <summary>
        <BookOpen aria-hidden="true" />
        {area === 'settings' ? 'Como configurar esta tela' : 'Como usar esta tela'}
        <ChevronDown aria-hidden="true" />
      </summary>
      <ol>
        {content.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {nextSection && (
        <footer>
          <span>Continue a revisão das configurações quando desejar.</span>
          <button type="button" onClick={() => onOpenSettings(nextSection)}>
            Próxima: {sectionTitle[nextSection]} <ArrowRight aria-hidden="true" />
          </button>
        </footer>
      )}
    </Guide>
  );
}
