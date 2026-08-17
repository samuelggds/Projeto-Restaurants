import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getEmployeeHelpGuides, getEmployeeHelpTitle } from './employeeHelpGuides';
import { employeeHelpCallouts } from './employeeHelpCallouts';
import { EmployeeHelpPreview } from './EmployeeHelpPreview';

describe('employee help guides', () => {
  it.each(['kitchen', 'waiter', 'courier'] as const)('provides detailed guides for %s', (role) => {
    expect(getEmployeeHelpGuides(role).length).toBeGreaterThan(2);
    expect(getEmployeeHelpGuides(role).every((guide) => guide.steps.length >= 6)).toBe(true);
  });
  it('uses the operational role in the manual title', () =>
    expect(getEmployeeHelpTitle('courier')).toContain('motoqueiro'));
  it.each(['kitchen', 'waiter', 'courier'] as const)(
    'provides a complete marker sequence for every %s preview',
    (role) => {
      getEmployeeHelpGuides(role).forEach((guide) => {
        const callouts = employeeHelpCallouts[guide.preview];
        expect(callouts.length).toBeGreaterThan(5);
        expect(new Set(callouts.map((callout) => callout.label)).size).toBe(callouts.length);
        expect(callouts.every((callout) => callout.description.includes('—'))).toBe(true);
      });
    },
  );
  it.each(['kitchen', 'waiter', 'courier'] as const)(
    'renders every %s preview marker without gaps',
    (role) => {
      getEmployeeHelpGuides(role).forEach((guide) => {
        const markup = renderToStaticMarkup(createElement(EmployeeHelpPreview, { guide }));
        const renderedMarkers = [...markup.matchAll(/data-marker="(\d+)"/g)].map((match) =>
          Number(match[1]),
        );
        const expectedMarkers = Array.from(
          { length: employeeHelpCallouts[guide.preview].length - 1 },
          (_, index) => index + 2,
        );

        expect(renderedMarkers.sort((a, b) => a - b)).toEqual(expectedMarkers);
      });
    },
  );
});
