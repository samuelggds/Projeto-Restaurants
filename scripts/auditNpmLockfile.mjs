#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import process from 'node:process';

const BULK_ADVISORY_URL =
  'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk';

const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function parseArgs(argv) {
  const lockfile = argv.find((value) => !value.startsWith('--'));
  const omitDev = argv.includes('--omit-dev');
  const levelArg = argv.find((value) => value.startsWith('--audit-level='));
  const auditLevel = (levelArg?.split('=')[1] || 'high').toLowerCase();

  if (!lockfile) {
    throw new Error(
      'Uso: node scripts/auditNpmLockfile.mjs <package-lock.json> [--omit-dev] [--audit-level=high]',
    );
  }
  if (!(auditLevel in severityRank)) {
    throw new Error(`Nivel de auditoria invalido: ${auditLevel}`);
  }

  return { lockfile, omitDev, auditLevel };
}

function packageNameFromPath(packagePath, entry) {
  if (typeof entry.name === 'string' && entry.name.trim()) {
    return entry.name.trim();
  }

  const marker = 'node_modules/';
  const markerIndex = packagePath.lastIndexOf(marker);
  if (markerIndex < 0) return '';

  const relative = packagePath.slice(markerIndex + marker.length);
  const parts = relative.split('/');
  if (relative.startsWith('@')) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';
  }
  return parts[0] || '';
}

function collectPackages(lockfile, omitDev) {
  const packages = lockfile?.packages;
  if (!packages || typeof packages !== 'object') {
    throw new Error('package-lock.json sem campo packages compativel com lockfile v2/v3.');
  }

  const result = new Map();

  for (const [packagePath, entry] of Object.entries(packages)) {
    if (!packagePath || !entry || typeof entry !== 'object') continue;
    if (entry.link === true) continue;
    if (omitDev && entry.dev === true) continue;

    const name = packageNameFromPath(packagePath, entry);
    const version = typeof entry.version === 'string' ? entry.version.trim() : '';
    if (!name || !version) continue;

    if (!result.has(name)) result.set(name, new Set());
    result.get(name).add(version);
  }

  return Object.fromEntries(
    [...result.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, versions]) => [name, [...versions].sort()]),
  );
}

function advisoryKey(packageName, advisory) {
  return [
    packageName,
    advisory.id ?? '',
    advisory.url ?? '',
    advisory.title ?? '',
    advisory.severity ?? '',
    advisory.vulnerable_versions ?? '',
  ].join('|');
}

async function main() {
  const { lockfile: lockfilePath, omitDev, auditLevel } = parseArgs(process.argv.slice(2));
  const lockfile = JSON.parse(await readFile(lockfilePath, 'utf8'));
  const payload = collectPackages(lockfile, omitDev);
  const packageCount = Object.keys(payload).length;

  if (packageCount === 0) {
    throw new Error(`Nenhum pacote auditavel encontrado em ${lockfilePath}.`);
  }

  console.log(
    `Auditando ${packageCount} pacotes de ${lockfilePath}${omitDev ? ' (sem devDependencies)' : ''} via Bulk Advisory...`,
  );

  const response = await fetch(BULK_ADVISORY_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'gastronexa-ci-lockfile-audit/1.0',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(
      `Bulk Advisory respondeu HTTP ${response.status}: ${rawBody.slice(0, 1000)}`,
    );
  }

  let report;
  try {
    report = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new Error('Bulk Advisory retornou JSON invalido.');
  }

  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Bulk Advisory retornou formato inesperado.');
  }

  const seen = new Set();
  const advisories = [];

  for (const [packageName, entries] of Object.entries(report)) {
    if (!Array.isArray(entries)) continue;
    for (const advisory of entries) {
      if (!advisory || typeof advisory !== 'object') continue;
      const key = advisoryKey(packageName, advisory);
      if (seen.has(key)) continue;
      seen.add(key);
      advisories.push({ packageName, ...advisory });
    }
  }

  advisories.sort((left, right) => {
    const severityDifference =
      (severityRank[String(right.severity).toLowerCase()] ?? -1) -
      (severityRank[String(left.severity).toLowerCase()] ?? -1);
    if (severityDifference !== 0) return severityDifference;
    return left.packageName.localeCompare(right.packageName);
  });

  if (advisories.length === 0) {
    console.log('Nenhuma vulnerabilidade conhecida retornada pelo Bulk Advisory.');
    return;
  }

  for (const advisory of advisories) {
    console.log(
      [
        `[${String(advisory.severity || 'unknown').toUpperCase()}]`,
        advisory.packageName,
        advisory.title || 'Advisory sem titulo',
        advisory.url || '',
        advisory.vulnerable_versions
          ? `vulneravel: ${advisory.vulnerable_versions}`
          : '',
      ]
        .filter(Boolean)
        .join(' - '),
    );
  }

  const minimumRank = severityRank[auditLevel];
  const blocking = advisories.filter(
    (advisory) =>
      (severityRank[String(advisory.severity).toLowerCase()] ?? -1) >= minimumRank,
  );

  if (blocking.length > 0) {
    throw new Error(
      `${blocking.length} advisory(s) com severidade ${auditLevel} ou superior encontrado(s).`,
    );
  }

  console.log(
    `${advisories.length} advisory(s) abaixo do nivel de bloqueio ${auditLevel}; auditoria aprovada.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
