const GITHUB_RELEASES_API =
  'https://api.github.com/repos/samuelggds/Projeto-Restaurants/releases?per_page=100';
const DOWNLOAD_BASE =
  'https://github.com/samuelggds/Projeto-Restaurants/releases/download';
const INSTALLER_NAME = 'GastroNexa-Cozinha-Setup.exe';
const RELEASE_CACHE_MS = 10 * 60 * 1000;

export type KitchenDesktopRelease = {
  version: string;
  channel: 'official' | 'test';
  downloadUrl: string;
};

type VersionParts = [number, number, number];
type ParsedRelease = KitchenDesktopRelease & { parts: VersionParts };

let cachedRelease: { value: KitchenDesktopRelease | null; until: number } | null = null;
let pendingRelease: Promise<KitchenDesktopRelease | null> | null = null;

function parseVersion(value: string): VersionParts | null {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(value)) return null;
  const parts = value.split('.').map(Number);
  if (parts.length !== 3 || parts.some((number) => !Number.isSafeInteger(number))) return null;
  return parts as VersionParts;
}

function compareVersions(a: VersionParts, b: VersionParts) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function selectKitchenDesktopRelease(response: unknown): KitchenDesktopRelease | null {
  if (!Array.isArray(response)) throw new Error('Invalid GitHub release response.');

  const available: ParsedRelease[] = [];
  for (const item of response) {
    if (!item || typeof item !== 'object') continue;
    const release = item as Record<string, unknown>;
    if (release.draft !== false || typeof release.tag_name !== 'string') continue;
    const match = /^(kitchen|kitchen-test)-v([0-9]+\.[0-9]+\.[0-9]+)$/u.exec(
      release.tag_name,
    );
    if (!match) continue;

    const channel = match[1] === 'kitchen' ? 'official' : 'test';
    if (release.prerelease !== (channel === 'test')) continue;
    const parts = parseVersion(match[2]);
    if (!parts || !Array.isArray(release.assets)) continue;

    const expectedUrl = DOWNLOAD_BASE + '/' + release.tag_name + '/' + INSTALLER_NAME;
    const installer = release.assets.find(
      (asset: unknown) =>
        asset !== null &&
        typeof asset === 'object' &&
        (asset as Record<string, unknown>).name === INSTALLER_NAME &&
        (asset as Record<string, unknown>).state === 'uploaded' &&
        (asset as Record<string, unknown>).browser_download_url === expectedUrl,
    );
    if (!installer) continue;
    available.push({ version: match[2], channel, downloadUrl: expectedUrl, parts });
  }

  // A commercially approved release takes priority over preview builds.
  // Never silently upgrade paying restaurants to an unsigned test build.
  const official = available.filter((release) => release.channel === 'official');
  const candidates = official.length ? official : available;
  candidates.sort((a, b) => compareVersions(b.parts, a.parts));
  const selected = candidates[0];
  if (!selected) return null;
  return {
    version: selected.version,
    channel: selected.channel,
    downloadUrl: selected.downloadUrl,
  };
}

export async function getLatestKitchenDesktopRelease(): Promise<KitchenDesktopRelease | null> {
  if (cachedRelease && Date.now() < cachedRelease.until) return cachedRelease.value;
  if (pendingRelease) return pendingRelease;

  pendingRelease = (async () => {
    const response = await fetch(GITHUB_RELEASES_API, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GastroNexa-Kitchen-Release-Checker',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error('GitHub releases unavailable.');
    const release = selectKitchenDesktopRelease(await response.json());
    cachedRelease = { value: release, until: Date.now() + RELEASE_CACHE_MS };
    return release;
  })();

  try {
    return await pendingRelease;
  } finally {
    pendingRelease = null;
  }
}
