import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getEmployeeHelpGuides, getEmployeeHelpTitle } from './employeeHelpGuides';
import { EmployeeHelpPreview } from './EmployeeHelpPreview';
import { adminHelpGuides } from '../../pages/admin/components/adminHelpGuides';
import { settingItems } from '../../pages/admin/config/adminNavigation';

describe('manuais das telas atuais', () => {
  it.each(['kitchen', 'waiter', 'courier'] as const)(
    'oferece passo a passo e prévia isolada para cada área de %s',
    (role) => {
      const guides = getEmployeeHelpGuides(role);
      expect(guides.length).toBeGreaterThan(2);
      expect(new Set(guides.map((guide) => guide.preview)).size).toBe(guides.length);
      guides.forEach((guide) => {
        expect(guide.steps.length).toBeGreaterThanOrEqual(6);
        const markup = renderToStaticMarkup(createElement(EmployeeHelpPreview, { guide }));
        expect(markup).toContain('/help-preview.html?area=' + guide.preview);
        expect(markup).toContain('sandbox="allow-scripts allow-same-origin"');
        expect(markup).toContain('dados fictícios');
      });
    },
  );
  it('inclui todas as seções de configuração e pagamentos do garçom', () => {
    for (const [key] of settingItems)
      expect(adminHelpGuides.some((guide) => guide.preview === 'settings-' + key)).toBe(true);
    expect(
      getEmployeeHelpGuides('waiter').some((guide) => guide.preview === 'waiter-payments'),
    ).toBe(true);
  });
  it('explica histórico paginado, localização no cabeçalho e QR fixo', () => {
    expect(getEmployeeHelpTitle('courier')).toContain('motoqueiro');
    const text = (['kitchen', 'waiter', 'courier'] as const)
      .flatMap((role) => getEmployeeHelpGuides(role).flatMap((guide) => guide.steps))
      .join(' ');
    expect(text).toContain('Carregar mais pedidos do histórico');
    expect(text).toContain('localização no cabeçalho');
    expect(text).toContain('QR Code fixo');
  });
});
