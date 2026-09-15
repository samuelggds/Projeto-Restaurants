import fs from 'node:fs';

const shaPattern = /^[0-9a-f]{40}$/u;
const targetSha = String(process.env.TARGET_SHA || '').trim();
const mainSha = String(process.env.MAIN_SHA || '').trim();
const releaseRunsPath = process.env.RELEASE_RUNS_JSON;
const deployRunsPath = process.env.DEPLOY_RUNS_JSON;

if (!shaPattern.test(targetSha) || !shaPattern.test(mainSha)) {
  throw new Error('TARGET_SHA and MAIN_SHA must be complete commit SHAs.');
}
if (!releaseRunsPath || !deployRunsPath) throw new Error('Workflow-run JSON paths are required.');

const loadRuns = (file) => {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed.workflow_runs)) throw new Error(`Invalid workflow run payload: ${file}`);
  return parsed.workflow_runs;
};
const releaseRuns = loadRuns(releaseRunsPath);
const deployRuns = loadRuns(deployRunsPath);
const belongsToSha = (run) => String(run.display_title || '').includes(`sha=${targetSha}`);
const inFlight = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);

if (targetSha !== mainSha) {
  process.stdout.write(`${JSON.stringify({ action: 'skip', reason: 'stale-main', targetSha, mainSha })}\n`);
  process.exit(0);
}

const deployments = deployRuns.filter(belongsToSha);
if (deployments.some((run) => run.conclusion === 'success')) {
  process.stdout.write(`${JSON.stringify({ action: 'skip', reason: 'already-deployed', targetSha })}\n`);
  process.exit(0);
}
if (deployments.some((run) => inFlight.has(run.status))) {
  process.stdout.write(`${JSON.stringify({ action: 'skip', reason: 'deploy-in-flight', targetSha })}\n`);
  process.exit(0);
}
const failedAttempts = deployments.filter((run) => ['failure', 'cancelled'].includes(run.conclusion)).length;
if (failedAttempts >= 2) {
  process.stdout.write(`${JSON.stringify({ action: 'skip', reason: 'retry-limit', targetSha, failedAttempts })}\n`);
  process.exit(0);
}

const releasesForSha = releaseRuns.filter((run) => run.head_sha === targetSha);
if (releasesForSha.some((run) => inFlight.has(run.status))) {
  process.stdout.write(`${JSON.stringify({ action: 'skip', reason: 'release-in-flight', targetSha })}\n`);
  process.exit(0);
}
const successfulRelease = releasesForSha
  .filter((run) => run.conclusion === 'success')
  .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  .at(-1);

if (successfulRelease) {
  process.stdout.write(`${JSON.stringify({
    action: 'deploy',
    reason: failedAttempts ? 'resume-after-deploy-failure' : 'reuse-approved-release',
    targetSha,
    releaseRunId: Number(successfulRelease.id),
    failedAttempts,
  })}\n`);
  process.exit(0);
}

process.stdout.write(`${JSON.stringify({ action: 'release', reason: 'no-approved-images', targetSha })}\n`);
