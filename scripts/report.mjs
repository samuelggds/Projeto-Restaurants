#!/usr/bin/env node
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, relative } from "path";
import { gzipSync } from "zlib";

const ROOT = process.cwd();

// ANSI
const R = "\x1b[0m";
const B = "\x1b[1m";
const D = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[97m";

// Larguras das colunas
const W1 = 52,
  W2 = 11,
  W3 = 11;
const INNER = W1 + W2 + W3 + 7; // largura interna de uma linha spanning

function strip(s) {
  return s.replace(/\x1b\[[^m]*m/g, "");
}
function ljust(s, w) {
  return s + " ".repeat(Math.max(0, w - strip(s).length));
}
function rjust(s, w) {
  return " ".repeat(Math.max(0, w - strip(s).length)) + s;
}
function center(s, w) {
  const p = Math.max(0, w - strip(s).length);
  return " ".repeat(Math.floor(p / 2)) + s + " ".repeat(Math.ceil(p / 2));
}

const V = "│";
function hline(l, m, r, c = "─") {
  return `${l}${c.repeat(W1 + 2)}${m}${c.repeat(W2 + 2)}${m}${c.repeat(W3 + 2)}${r}`;
}
function row(f, s, g) {
  return `${V} ${ljust(f, W1)} ${V} ${rjust(s, W2)} ${V} ${rjust(g, W3)} ${V}`;
}
function wide(label) {
  return `${V} ${ljust(label, INNER)}${V}`;
}

function fmt(bytes, c = "") {
  if (!bytes) return `${D}—${R}`;
  const n =
    bytes >= 1_048_576
      ? `${(bytes / 1_048_576).toFixed(2)} MB`
      : bytes >= 1_024
        ? `${(bytes / 1_024).toFixed(1)} kB`
        : `${bytes} B`;
  return c ? `${c}${n}${R}` : n;
}

function gzSize(p) {
  try {
    return gzipSync(readFileSync(p)).length;
  } catch {
    return 0;
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

function renderSection(titulo, distDir, accent) {
  const files = walk(distDir).sort();

  console.log(hline("├", "┼", "┤"));
  console.log(wide(`${B}${accent}  ${titulo}${R}`));
  console.log(hline("├", "┼", "┤"));

  if (!files.length) {
    console.log(
      wide(
        `  ${YELLOW}Pasta não encontrada — execute npm run build primeiro.${R}`,
      ),
    );
    return { count: 0, size: 0, gz: 0 };
  }

  let totalSize = 0,
    totalGz = 0;

  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, "/");
    const name = rel.length > W1 ? `…${rel.slice(1 - W1)}` : rel;
    const size = statSync(f).size;
    const gz = gzSize(f);
    totalSize += size;
    totalGz += gz;
    const c = size > 200_000 ? YELLOW : accent;
    console.log(row(`${c}${name}${R}`, fmt(size, c), fmt(gz, D)));
  }

  const n = files.length;
  console.log(hline("├", "┼", "┤"));
  console.log(
    row(
      `${B}  Subtotal — ${n} arquivo${n !== 1 ? "s" : ""}${R}`,
      fmt(totalSize, B + GREEN),
      fmt(totalGz, D),
    ),
  );

  return { count: n, size: totalSize, gz: totalGz };
}

// ── main ─────────────────────────────────────────────────────────────────────

const now = new Date().toLocaleString("pt-BR");

console.log();
console.log(hline("┌", "┬", "┐"));
console.log(
  wide(center(`${B}${WHITE} BUILD REPORT ${R}${D}  ${now} ${R}`, INNER)),
);
console.log(hline("├", "┼", "┤"));
console.log(row(`${B}Arquivo${R}`, `${B}Tamanho${R}`, `${B}Gzip${R}`));

const back = renderSection(
  "BACKEND   —  tsup  →  backend/dist/",
  join(ROOT, "backend/dist"),
  BLUE,
);
const front = renderSection(
  "FRONTEND  —  Vite  →  frontend/dist/",
  join(ROOT, "frontend/dist"),
  GREEN,
);

const tot = back.size + front.size;
const gzt = back.gz + front.gz;
const cnt = back.count + front.count;

console.log(hline("╞", "╪", "╡", "═"));
console.log(
  row(
    `${B}  TOTAL GERAL  —  ${cnt} arquivo${cnt !== 1 ? "s" : ""}${R}`,
    fmt(tot, B + MAGENTA),
    fmt(gzt, D),
  ),
);
console.log(hline("└", "┴", "┘"));
console.log();
