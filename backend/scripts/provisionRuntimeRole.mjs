import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';

export function runtimeRoleSettings(ownerValue, runtimeValue) {
  const owner = new URL(ownerValue);
  const runtime = new URL(runtimeValue);
  if (![owner, runtime].every((url) => ['postgres:', 'postgresql:'].includes(url.protocol))) {
    throw new Error('As conexões devem usar PostgreSQL.');
  }
  // Provisionamento local à instalação: nunca alterar uma role em outro banco/servidor.
  if (owner.host !== runtime.host || owner.pathname !== runtime.pathname) {
    throw new Error('Migração e runtime devem apontar para o mesmo servidor e banco direto.');
  }
  const role = decodeURIComponent(runtime.username);
  const password = decodeURIComponent(runtime.password);
  if (!/^[a-z][a-z0-9_]{2,62}$/u.test(role) || role === decodeURIComponent(owner.username)) {
    throw new Error('Use uma role runtime distinta, com nome PostgreSQL simples.');
  }
  if (password.length < 20 || password.includes('\0')) {
    throw new Error('A senha runtime deve conter pelo menos 20 caracteres e não conter NUL.');
  }
  return { role, password };
}

export async function provisionRuntimeRole(db, settings) {
  await db.$transaction(async (tx) => {
    const existing = await tx.$queryRaw`
      SELECT r.oid, r.rolsuper, r.rolbypassrls,
        EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relowner = r.oid) AS owns_relations,
        EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member = r.oid) AS has_membership
      FROM pg_catalog.pg_roles r WHERE r.rolname = ${settings.role}
    `;
    if (existing.some((role) => role.rolsuper || role.rolbypassrls || role.owns_relations || role.has_membership)) {
      throw new Error('Role runtime existente tem privilégios/ownership incompatíveis. Revise-a antes do deploy.');
    }
    // format(%I/%L) no PostgreSQL faz quoting de identificador e senha; nunca registrar este SQL.
    const verb = existing.length ? 'ALTER' : 'CREATE';
    const [statement] = await tx.$queryRaw`
      SELECT format('%s ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS',
        ${verb}, ${settings.role}, ${settings.password}) AS sql
    `;
    await tx.$executeRawUnsafe(statement.sql);
    const role = `"${settings.role}"`; // nome estritamente validado acima
    await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await tx.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await tx.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    // As permissões são reaplicadas depois de cada migrate deploy, incluindo novas tabelas.
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let db;
  try {
    const settings = runtimeRoleSettings(process.env.DATABASE_URL, process.env.RUNTIME_DATABASE_URL);
    db = new PrismaClient({ log: [] });
    await provisionRuntimeRole(db, settings);
    console.info('Role runtime provisionada sem privilégios administrativos.');
  } catch {
    // Erros do driver podem incluir o SQL com senha; não imprimir message/stack.
    console.error('Falha ao provisionar role runtime. Verifique conexões, senha e privilégios do owner.');
    process.exitCode = 1;
  } finally {
    await db?.$disconnect();
  }
}
