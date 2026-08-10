import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["frontend/src", "backend/src"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".scss"]);
const maximumLines = 1800;

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
  if (lines > maximumLines) oversized.push({ file, lines });
}

if (oversized.length) {
  console.error(`Arquivos acima do limite arquitetural de ${maximumLines} linhas:`);
  for (const item of oversized.sort((a, b) => b.lines - a.lines)) {
    console.error(`- ${item.file}: ${item.lines} linhas`);
  }
  process.exitCode = 1;
} else {
  console.log(`Arquitetura validada: nenhum arquivo ultrapassa ${maximumLines} linhas.`);
}
