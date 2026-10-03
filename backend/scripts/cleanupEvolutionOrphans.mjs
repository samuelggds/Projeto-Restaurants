import 'dotenv/config';
import { createHash } from 'node:crypto';
import prisma from '../src/config/prisma.js';
import {
  assertAllowedOptions,
  hasFlag,
  optionalString,
  parseCliArgs,
  rejectPositionals,
  requiredString,
} from './_shared/cli.mjs';
import {
  requireReason,
  requireWriteConfirmation,
  resolveExecutionMode,
} from './_shared/confirmation.mjs';
import {
  assertOperationalEnvironment,
  normalizeEnvironment,
} from './_shared/environmentGuard.mjs';
import { safeError } from './_shared/redaction.mjs';

const LEGACY_INSTANCE_PATTERN = /^gastronexa-\d+$/u;
const SCOPED_INSTANCE_PATTERN = /^gastronexa-(?:dev|test|stage|prod)-\d+-[a-f0-9]{16}$/u;

function env(name) {
  return String(process.env[name] || '').trim();
}

function isTenantInstanceName(value) {
  const name = String(value || '').trim();
  return LEGACY_INSTANCE_PATTERN.test(name) || SCOPED_INSTANCE_PATTERN.test(name);
}

function evolutionBaseUrl() {
  const value = env('EVOLUTION_TENANT_API_URL') || env('EVOLUTION_API_URL');
  if (!value) throw new Error('EVOLUTION_TENANT_API_URL/EVOLUTION_API_URL não configurada.');
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('URL da Evolution inválida.');
  }
  return parsed.toString().replace(/\/+$/u, '');
}

function evolutionApiKey() {
  const value = env('EVOLUTION_TENANT_API_KEY') || env('EVOLUTION_API_KEY');
  if (!value) throw new Error('EVOLUTION_TENANT_API_KEY/EVOLUTION_API_KEY não configurada.');
  return value;
}

async function evolutionRequest(path, options = {}) {
  const response = await fetch(`${evolutionBaseUrl()}${path}`, {
    method: options.method || 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
    headers: {
      apikey: evolutionApiKey(),
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Evolution respondeu HTTP ${response.status} durante operação administrativa.`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function instanceDataCount(instance) {
  const count =
    instance && typeof instance._count === 'object' && instance._count && !Array.isArray(instance._count)
      ? instance._count
      : {};
  return ['Message', 'Contact', 'Chat'].reduce((sum, key) => {
    const value = Number(count[key] || 0);
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}

function instanceRisk(instance) {
  const state = String(instance.connectionStatus || '').trim().toLowerCase();
  const hasIdentity = Boolean(
    String(instance.ownerJid || '').trim() ||
      String(instance.number || '').trim() ||
      String(instance.profileName || '').trim(),
  );
  const dataCount = instanceDataCount(instance);
  const active = state === 'open' || state === 'connecting' || state === 'connected';
  return {
    state: state || 'unknown',
    hasIdentity,
    dataCount,
    preserved: active || hasIdentity || dataCount > 0,
  };
}

function digestNames(names) {
  return createHash('sha256').update([...names].sort().join('\n')).digest('hex').slice(0, 16);
}

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));
  rejectPositionals(parsed);
  assertAllowedOptions(parsed, [
    'environment',
    'allow-production',
    'apply',
    'dry-run',
    'confirm',
    'actor',
    'reason',
    'include-preserved',
  ]);

  const targetEnvironment = requiredString(parsed, 'Ambiente alvo', 'environment');
  const context = assertOperationalEnvironment({
    targetEnvironment,
    allowProduction: hasFlag(parsed, 'allow-production'),
  });
  const apiEnvironment = normalizeEnvironment(process.env.OPS_API_ENV, 'OPS_API_ENV');
  if (apiEnvironment !== context.target) {
    throw new Error(
      `OPS_API_ENV (${apiEnvironment}) diverge do ambiente alvo (${context.target}). Operação bloqueada.`,
    );
  }

  const mode = resolveExecutionMode({
    apply: hasFlag(parsed, 'apply'),
    dryRun: hasFlag(parsed, 'dry-run'),
  });
  const includePreserved = hasFlag(parsed, 'include-preserved');
  const reason = optionalString(parsed, 'reason');
  const actor = optionalString(parsed, 'actor');
  requireReason(mode, reason);
  if (mode === 'write' && actor.length < 3) {
    throw new Error('--actor é obrigatório para escrita.');
  }

  const [remotePayload, localRows] = await Promise.all([
    evolutionRequest('/instance/fetchInstances'),
    prisma.$queryRaw`SELECT "externalInstanceId" FROM "RestaurantWhatsappConnection"`,
  ]);

  const localInstanceNames = new Set(
    localRows.map((row) => String(row.externalInstanceId || '').trim()).filter(Boolean),
  );
  const remoteInstances = Array.isArray(remotePayload) ? remotePayload : [];
  const tenantInstances = remoteInstances.filter(
    (instance) =>
      instance &&
      typeof instance === 'object' &&
      isTenantInstanceName(instance.name),
  );

  const orphans = tenantInstances
    .filter((instance) => !localInstanceNames.has(String(instance.name || '').trim()))
    .map((instance) => ({
      name: String(instance.name || '').trim(),
      ...instanceRisk(instance),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selected = orphans.filter((instance) => includePreserved || !instance.preserved);
  const skippedPreserved = orphans.filter((instance) => instance.preserved);
  const namesDigest = digestNames(selected.map((instance) => instance.name));
  const expectedConfirmation =
    `CLEANUP_EVOLUTION_ORPHANS:${context.target}:${context.databaseLabel}:${selected.length}:${namesDigest}:${includePreserved ? 'INCLUDING_PRESERVED' : 'SAFE_ONLY'}`;

  const plan = {
    mode,
    environment: context.target,
    database: context.database,
    apiEnvironment,
    includePreserved,
    remoteTenantInstances: tenantInstances.length,
    localBoundInstances: localInstanceNames.size,
    orphanCount: orphans.length,
    selectedCount: selected.length,
    skippedPreservedCount: includePreserved ? 0 : skippedPreserved.length,
    selected: selected.map(({ name, state, hasIdentity, dataCount }) => ({
      name,
      state,
      hasIdentity,
      dataCount,
    })),
    skippedPreserved: includePreserved
      ? []
      : skippedPreserved.map(({ name, state, hasIdentity, dataCount }) => ({
          name,
          state,
          hasIdentity,
          dataCount,
        })),
    actor: actor || null,
    reason: reason || null,
    confirmation: expectedConfirmation,
  };

  requireWriteConfirmation({
    mode,
    provided: optionalString(parsed, 'confirm'),
    expected: expectedConfirmation,
    action: 'remover instâncias órfãs da Evolution',
  });

  if (mode === 'dry-run') {
    console.log(JSON.stringify(plan, null, 2));
    console.log(
      `DRY_RUN: para aplicar exatamente este plano, use --apply --confirm="${expectedConfirmation}".`,
    );
    if (skippedPreserved.length && !includePreserved) {
      console.log(
        'Sessões com identidade, histórico ou estado ativo foram preservadas. Em um reset total autorizado, revise-as e repita com --include-preserved.',
      );
    }
    return;
  }

  const deleted = [];
  for (const instance of selected) {
    await evolutionRequest(`/instance/delete/${encodeURIComponent(instance.name)}`, {
      method: 'DELETE',
    });
    deleted.push(instance.name);
  }

  const remainingPayload = await evolutionRequest('/instance/fetchInstances');
  const remaining = new Set(
    (Array.isArray(remainingPayload) ? remainingPayload : [])
      .filter((instance) => instance && typeof instance === 'object')
      .map((instance) => String(instance.name || '').trim()),
  );
  const failed = deleted.filter((name) => remaining.has(name));
  if (failed.length) {
    throw new Error(
      `A Evolution ainda retornou ${failed.length} instância(s) selecionada(s) após a limpeza.`,
    );
  }

  console.log(
    JSON.stringify(
      {
        status: 'completed',
        environment: context.target,
        deletedCount: deleted.length,
        namesDigest,
        actor,
        reason,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
