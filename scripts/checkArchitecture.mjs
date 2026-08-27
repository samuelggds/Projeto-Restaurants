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

for (const file of files) {
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/u).length;
  const normalizedFile = file.replace(/\\/gu, "/");
  const limit = legacyLimits.get(normalizedFile) ?? maximumLines;
  if (lines > limit) oversized.push({ file: normalizedFile, lines, limit });
}

if (oversized.length) {
  console.error(`Arquivos acima do respectivo limite arquitetural:`);
  for (const item of oversized.sort((a, b) => b.lines - a.lines)) {
    console.error(`- ${item.file}: ${item.lines} linhas (limite ${item.limit})`);
  }
  process.exitCode = 1;
} else {
  console.log(`Arquitetura validada: nenhum arquivo ultrapassa ${maximumLines} linhas.`);
}
