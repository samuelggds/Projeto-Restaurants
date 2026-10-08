import assert from 'node:assert/strict';
import test from 'node:test';

import { selectKitchenDesktopRelease } from './KitchenDesktopReleaseService.js';

const prefix = 'https://github.com/samuelggds/Projeto-Restaurants/releases/download/';
const installer = 'GastroNexa-Cozinha-Setup.exe';

function release(version: string, channel: 'official' | 'test', overrides = {}) {
  const tag = (channel === 'official' ? 'kitchen-v' : 'kitchen-test-v') + version;
  return {
    tag_name: tag,
    draft: false,
    prerelease: channel === 'test',
    assets: [{ name: installer, state: 'uploaded', browser_download_url: prefix + tag + '/' + installer }],
    ...overrides,
  };
}

test('não permite download sem release publicada e instalador validado', () => {
  assert.equal(selectKitchenDesktopRelease([]), null);
  assert.equal(selectKitchenDesktopRelease([release('1.0.0', 'test', { draft: true })]), null);
  assert.equal(
    selectKitchenDesktopRelease([release('1.0.0', 'test', { assets: [] })]),
    null,
  );
  assert.equal(
    selectKitchenDesktopRelease([release('1.0.0', 'test', { assets: [{ name: installer, state: 'uploaded', browser_download_url: 'https://evil.example/a.exe' }] })]),
    null,
  );
  assert.throws(() => selectKitchenDesktopRelease({}), /Invalid GitHub release response/u);
});

test('prefere versão comercial e seleciona maior versão semanticamente', () => {
  const result = selectKitchenDesktopRelease([
    release('1.0.9', 'official'),
    release('1.0.10', 'official'),
    release('9.0.0', 'test'),
  ]);
  assert.deepEqual(result, {
    version: '1.0.10',
    channel: 'official',
    downloadUrl: prefix + 'kitchen-v1.0.10/' + installer,
  });
});

test('antes do lançamento comercial disponibiliza apenas prerelease identificado', () => {
  const result = selectKitchenDesktopRelease([
    release('1.0.0', 'test'),
    release('1.0.1', 'test', { prerelease: false }),
  ]);
  assert.deepEqual(result, {
    version: '1.0.0',
    channel: 'test',
    downloadUrl: prefix + 'kitchen-test-v1.0.0/' + installer,
  });
});

test('ignora tags inválidas e qualquer tentativa de URL externa', () => {
  const result = selectKitchenDesktopRelease([
    release('1.0.0-beta', 'official'),
    release('2.0.0', 'official', { assets: [{ name: installer, state: 'uploaded', browser_download_url: 'https://example.com/malware.exe' }] }),
    release('1.2.0', 'official'),
  ]);
  assert.equal(result?.version, '1.2.0');
});
