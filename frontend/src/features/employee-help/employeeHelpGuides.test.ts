import { describe, expect, it } from 'vitest';
import { getEmployeeHelpGuides, getEmployeeHelpTitle } from './employeeHelpGuides';

describe('employee help guides', () => {
  it.each(['kitchen', 'waiter', 'courier'] as const)('provides detailed guides for %s', (role) => {
    expect(getEmployeeHelpGuides(role).length).toBeGreaterThan(2);
    expect(getEmployeeHelpGuides(role).every((guide) => guide.steps.length >= 3)).toBe(true);
  });
  it('uses the operational role in the manual title', () =>
    expect(getEmployeeHelpTitle('courier')).toContain('motoqueiro'));
});
