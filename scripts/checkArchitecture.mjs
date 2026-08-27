import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["frontend/src", "backend/src"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".scss"]);
const maximumLines = 1200;
// Dívida conhecida: estes arquivos não podem crescer e devem sair da lista à
// medida que forem divididos. Arquivos novos nunca recebem exceção automática.
const legacyLimits = new Map([
  ["frontend/src/features/employee-help/EmployeeHelpCenter.styles.ts", 1601],
  ["frontend/src/pages/admin/components/HelpCenter.styles.ts", 1419],
  ["frontend/src/pages/admin/styles/AdminProductForm.styles.ts", 1357],
  ["frontend/src/pages/Courier/styles.ts", 1695],
  ["frontend/src/pages/kitchen/Kitchen.styles.ts", 1356],
  ["frontend/src/pages/waiter/Waiter.styles.ts", 1465],
]);
const forbiddenImportRules = [
  {
    source: /^frontend\/src\/shared\//u,
    target: /(?:^|\/)(?:pages|features)(?:\/|$)/u,
    reason: "shared não pode depender de pages ou features",
  },
  {
    source: /^backend\/src\/modules\/[^/]+\/domain\//u,
    target: /(?:^|\/)(?:controllers|routes)(?:\/|$)/u,
    reason: "domain não pode depender de controllers ou routes",
  },
  {
    source: /^backend\/src\/modules\//u,
    target: /(?:^|\/)server\.js$/u,
    reason: "módulos devem publicar por uma porta realtime, sem importar o bootstrap HTTP",
  },
];
const importSpecifierPattern =
  /\bfrom\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\bimport\s+["']([^"']+)["']/gu;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", "dist", "coverage"].includes(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(entryPath));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(entryPath);
  }
  return files;
}

const files = (await Promise.all(roots.map(collectFiles))).flat();
const oversized = [];
const forbiddenImports = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/u).length;
  const normalizedFile = file.replace(/\\/gu, "/");
  const limit = legacyLimits.get(normalizedFile) ?? maximumLines;
  if (lines > limit) oversized.push({ file: normalizedFile, lines, limit });

  for (const rule of forbiddenImportRules) {
    if (!rule.source.test(normalizedFile)) continue;

    importSpecifierPattern.lastIndex = 0;
    for (const match of content.matchAll(importSpecifierPattern)) {
      const specifier = (match[1] ?? match[2] ?? match[3]).replace(/\\/gu, "/");
      if (!rule.target.test(specifier)) continue;

      const line = content.slice(0, match.index).split(/\r?\n/u).length;
      forbiddenImports.push({ file: normalizedFile, line, specifier, reason: rule.reason });
    }
  }
}

if (oversized.length) {
  console.error(`Arquivos acima do respectivo limite arquitetural:`);
  for (const item of oversized.sort((a, b) => b.lines - a.lines)) {
    console.error(`- ${item.file}: ${item.lines} linhas (limite ${item.limit})`);
  }
}

if (forbiddenImports.length) {
  console.error("Imports que violam as fronteiras arquiteturais:");
  for (const item of forbiddenImports) {
    console.error(`- ${item.file}:${item.line} importa ${item.specifier} (${item.reason})`);
  }
}

if (oversized.length || forbiddenImports.length) {
  process.exitCode = 1;
} else {
  console.log(
    `Arquitetura validada: arquivos dentro dos limites e nenhuma dependência proibida.`,
  );
}
