import assert from 'node:assert/strict';
import test from 'node:test';
import { codeqlBlockers } from './checkCodeqlSarif.mjs';

const high = {
  id: 'js/security',
  properties: { 'security-severity': '7.5' },
  defaultConfiguration: { level: 'warning' },
};
const report = (tool, results) => ({ version: '2.1.0', runs: [{ tool, results }] });

test('blocks high security rules stored in CodeQL extensions even without result.level', () => {
  const sarif = report(
    { driver: { rules: [] }, extensions: [{ name: 'queries', rules: [high] }] },
    [{ ruleId: high.id, rule: { index: 0, toolComponent: { index: 0 } } }],
  );
  assert.equal(codeqlBlockers(sarif).length, 1);
});
test('supports driver rules, extension identifiers and default error level', () => {
  assert.equal(codeqlBlockers(report({ driver: { rules: [high] } }, [{ ruleIndex: 0 }])).length, 1);
  assert.equal(
    codeqlBlockers(
      report({ driver: {}, extensions: [{ name: 'queries', rules: [high] }] }, [
        { rule: { id: high.id, toolComponent: { name: 'queries' } } },
      ]),
    ).length,
    1,
  );
  const rule = { id: 'error-rule', defaultConfiguration: { level: 'error' } };
  assert.equal(
    codeqlBlockers(report({ driver: { rules: [rule] } }, [{ ruleId: rule.id }])).length,
    1,
  );
});
test('unknown rule references and malformed severity fail closed', () => {
  assert.throws(() => codeqlBlockers(report({ driver: { rules: [] } }, [{ ruleId: 'missing' }])));
  assert.throws(() =>
    codeqlBlockers(
      report({ driver: { rules: [{ ...high, properties: { 'security-severity': 'invalid' } }] } }, [
        { ruleId: high.id },
      ]),
    ),
  );
  assert.throws(() => codeqlBlockers({ runs: [] }));
});
test('passes completed reports with no alerts or only lower severity', () => {
  assert.deepEqual(codeqlBlockers(report({ driver: {} }, [])), []);
  assert.deepEqual(
    codeqlBlockers(
      report({ driver: { rules: [{ ...high, properties: { 'security-severity': '4' } }] } }, [
        { ruleId: high.id },
      ]),
    ),
    [],
  );
});
