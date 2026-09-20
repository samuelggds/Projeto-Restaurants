import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function resolveRule(run, result) {
  const reference = result.rule || {};
  const id = reference.id || result.ruleId;
  const index = reference.index ?? result.ruleIndex;
  const component = reference.toolComponent;
  const extensions = run.tool?.extensions || [];
  let candidates;
  if (Number.isInteger(component?.index)) candidates = [extensions[component.index]];
  else if (component?.guid || component?.name) {
    candidates = [run.tool?.driver, ...extensions].filter(
      (entry) =>
        entry && (component.guid ? entry.guid === component.guid : entry.name === component.name),
    );
  } else candidates = [run.tool?.driver, ...extensions];
  const matches = candidates.filter(Boolean).flatMap((entry) => {
    const rules = entry.rules || [];
    if (Number.isInteger(index)) {
      const rule = rules[index];
      return rule && (!id || rule.id === id) ? [rule] : [];
    }
    return rules.filter((rule) => id && rule.id === id);
  });
  if (matches.length !== 1)
    throw new Error(`Unresolved or ambiguous SARIF rule: ${id || index || 'missing'}`);
  return matches[0];
}

export function codeqlBlockers(sarif) {
  if (sarif.version !== '2.1.0' || !Array.isArray(sarif.runs) || !sarif.runs.length)
    throw new Error('Invalid or empty SARIF report');
  const blockers = [];
  for (const run of sarif.runs) {
    if (run.invocations?.some((invocation) => invocation.executionSuccessful === false))
      throw new Error('SARIF analysis did not complete successfully');
    for (const result of run.results || []) {
      const rule = resolveRule(run, result);
      const rawScore = rule.properties?.['security-severity'];
      const score = rawScore === undefined ? 0 : Number(rawScore);
      if (!Number.isFinite(score) || score < 0 || score > 10)
        throw new Error(`Invalid security severity: ${rule.id}`);
      const level = result.level || rule.defaultConfiguration?.level || 'warning';
      if (score >= 7 || level === 'error') blockers.push({ ruleId: rule.id, score, level });
    }
  }
  return blockers;
}

export function checkSarifDirectory(directory) {
  const files = [];
  function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.sarif')) files.push(file);
    }
  }
  walk(directory);
  if (!files.length) throw new Error('CodeQL produced no SARIF files');
  return files.flatMap((file) => codeqlBlockers(JSON.parse(fs.readFileSync(file, 'utf8'))));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const blockers = checkSarifDirectory(process.argv[2] || process.env.SARIF_DIR || '');
    if (blockers.length) {
      console.error('Blocking CodeQL findings:', JSON.stringify(blockers));
      process.exitCode = 1;
    } else console.log('CodeQL: all resolved results passed the blocking policy.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
