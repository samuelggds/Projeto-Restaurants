import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const resolver = path.join(root, 'scripts', 'resolveProductionReleaseState.mjs');
const sha = 'a'.repeat(40);
const newer = 'b'.repeat(40);

function decide({ mainSha = sha, releases = [], deploys = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gastronexa-release-state-'));
  try {
    const releaseFile = path.join(dir, 'releases.json');
    const deployFile = path.join(dir, 'deploys.json');
    fs.writeFileSync(releaseFile, JSON.stringify({ workflow_runs: releases }));
    fs.writeFileSync(deployFile, JSON.stringify({ workflow_runs: deploys }));
    const output = execFileSync(process.execPath, [resolver], {
      encoding: 'utf8',
      env: {
        ...process.env,
        TARGET_SHA: sha,
        MAIN_SHA: mainSha,
        RELEASE_RUNS_JSON: releaseFile,
        DEPLOY_RUNS_JSON: deployFile,
      },
    });
    return JSON.parse(output);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const release = (overrides = {}) => ({
  id: 42,
  head_sha: sha,
  status: 'completed',
  conclusion: 'success',
  created_at: '2026-09-15T10:00:00Z',
  ...overrides,
});
const deploy = (overrides = {}) => ({
  id: 90,
  display_title: `Deploy Production | sha=${sha} | release=42`,
  status: 'completed',
  conclusion: 'failure',
  ...overrides,
});

assert.equal(decide().action, 'release', 'no published image release should dispatch publication');

const publishedAfterFailure = decide({ releases: [release()], deploys: [deploy()] });
assert.equal(publishedAfterFailure.action, 'deploy');
assert.equal(publishedAfterFailure.releaseRunId, 42);
assert.equal(publishedAfterFailure.reason, 'resume-after-deploy-failure');

const cancelled = decide({ releases: [release()], deploys: [deploy({ conclusion: 'cancelled' })] });
assert.equal(cancelled.action, 'deploy', 'cancelled deploy should resume from immutable release');

const duplicate = decide({
  releases: [release()],
  deploys: [deploy({ status: 'in_progress', conclusion: null })],
});
assert.deepEqual([duplicate.action, duplicate.reason], ['skip', 'deploy-in-flight']);

const interruptedRelease = decide({
  releases: [release({ status: 'in_progress', conclusion: null })],
});
assert.deepEqual([interruptedRelease.action, interruptedRelease.reason], ['skip', 'release-in-flight']);

const stale = decide({ mainSha: newer, releases: [release()] });
assert.deepEqual([stale.action, stale.reason], ['skip', 'stale-main']);

const rejectedAfterLimit = decide({
  releases: [release()],
  deploys: [deploy(), deploy({ id: 91, conclusion: 'cancelled' })],
});
assert.deepEqual([rejectedAfterLimit.action, rejectedAfterLimit.reason], ['skip', 'retry-limit']);

const completed = decide({ releases: [release()], deploys: [deploy({ conclusion: 'success' })] });
assert.deepEqual([completed.action, completed.reason], ['skip', 'already-deployed']);

console.log('Production release recovery state-machine scenarios passed.');
