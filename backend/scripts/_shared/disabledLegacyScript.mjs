import path from 'node:path';

const scriptName = path.basename(String(process.argv[1] || 'script legado'));

throw new Error(
  `O script ${scriptName} está em quarentena porque podia alterar dados ou chamar provedores sem os controles operacionais atuais. Migre o fluxo para um comando com dry-run, --environment, --reason e confirmação vinculada ao banco antes de reativá-lo.`,
);
