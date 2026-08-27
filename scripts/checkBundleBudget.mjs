import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const assetsDirectory = path.resolve('frontend/dist/assets');
const maximumChunkBytes = Number(process.env.MAX_CHUNK_BYTES || 500_000);
const maximumGzipBytes = Number(process.env.MAX_CHUNK_GZIP_BYTES || 120_000);

const entries = await readdir(assetsDirectory, { withFileTypes: true });
const failures = [];

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
  const file = path.join(assetsDirectory, entry.name);
  const size = (await stat(file)).size;
  const gzipSize = gzipSync(await readFile(file)).length;
  if (size > maximumChunkBytes || gzipSize > maximumGzipBytes) {
    failures.push({ name: entry.name, size, gzipSize });
  }
}

if (failures.length) {
  console.error('Chunks acima do orçamento de bundle:');
  for (const item of failures) {
    console.error(`- ${item.name}: ${item.size} bytes (${item.gzipSize} gzip)`);
  }
  process.exit(1);
}

console.log(
  `Bundle dentro do orçamento: até ${maximumChunkBytes} bytes por chunk e ${maximumGzipBytes} gzip.`,
);
