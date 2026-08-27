#!/usr/bin/env node
import { spawnSync } from "child_process";
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, relative } from "path";
import { gzipSync } from "zlib";

const ROOT = process.cwd();

// ── ANSI ─────────────────────────────────────────────────────────────────────
const R = "\x1b[0m",
  B = "\x1b[1m",
  D = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[97m";

// ── Helpers de string ─────────────────────────────────────────────────────────
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

// ── Tabela de ANÁLISE ─────────────────────────────────────────────────────────
const A1 = 42,
  A2 = 12,
  A3 = 24;
const AINNER = A1 + A2 + A3 + 7;
const AV = "│";

function ahline(l, m, r, c = "─") {
  return `${l}${c.repeat(A1 + 2)}${m}${c.repeat(A2 + 2)}${m}${c.repeat(A3 + 2)}${r}`;
}
function arow(f, s, g) {
  return `${AV} ${ljust(f, A1)} ${AV} ${rjust(s, A2)} ${AV} ${ljust(g, A3)} ${AV}`;
}
function awide(label) {
  return `${AV} ${ljust(label, AINNER)}${AV}`;
}

// ── Tabela de TAMANHOS ────────────────────────────────────────────────────────
const S1 = 52,
  S2 = 11,
  S3 = 11;
const SINNER = S1 + S2 + S3 + 7;

function shline(l, m, r, c = "─") {
  return `${l}${c.repeat(S1 + 2)}${m}${c.repeat(S2 + 2)}${m}${c.repeat(S3 + 2)}${r}`;
}
function srow(f, s, g) {
  return `${AV} ${ljust(f, S1)} ${AV} ${rjust(s, S2)} ${AV} ${rjust(g, S3)} ${AV}`;
}
function swide(label) {
  return `${AV} ${ljust(label, SINNER)}${AV}`;
}

// ── Formatadores ──────────────────────────────────────────────────────────────
function fmtSize(bytes, c = "") {
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

// ── Parsers de saída ──────────────────────────────────────────────────────────
function parseTsc(output) {
  const errors = (output.match(/ error TS/g) || []).length;
  return errors;
}

function parseEslint(output) {
  const m = output.match(
    /(\d+) problem[s]?.*?(\d+) error[s]?,\s*(\d+) warning[s]?/,
  );
  return m
    ? { errors: parseInt(m[2]), warnings: parseInt(m[3]) }
    : { errors: 0, warnings: 0 };
}

// ── Rodar comando silenciosamente ─────────────────────────────────────────────
function run(cmd) {
  return spawnSync(cmd, { shell: true, cwd: ROOT, encoding: "utf8" });
}

// ── Definição das verificações ────────────────────────────────────────────────
const checks = [
  {
    label: "ESLint      —  Backend",
    cmd: "npm --prefix backend run lint",
    parse(r) {
      const { errors, warnings } = parseEslint(r.stdout + r.stderr);
      return errors > 0 || warnings > 0
        ? { ok: false, detail: `${RED}${errors} erros, ${warnings} avisos${R}` }
        : { ok: true, detail: `${D}0 erros, 0 avisos${R}` };
    },
  },
  {
    label: "TypeScript  —  Backend",
    cmd: "npm --prefix backend run typecheck",
    parse(r) {
      const n = parseTsc(r.stdout + r.stderr);
      return n > 0
        ? {
            ok: false,
            detail: `${RED}${n} erro${n > 1 ? "s" : ""} de tipo${R}`,
          }
        : { ok: true, detail: `${D}sem erros${R}` };
    },
  },
  {
    label: "TypeScript  —  Frontend",
    cmd: "npm --prefix frontend run typecheck",
    parse(r) {
      const n = parseTsc(r.stdout + r.stderr);
      return n > 0
        ? {
            ok: false,
            detail: `${RED}${n} erro${n > 1 ? "s" : ""} de tipo${R}`,
          }
        : { ok: true, detail: `${D}sem erros${R}` };
    },
  },
  {
    label: "ESLint      —  Frontend",
    cmd: "npm --prefix frontend run lint",
    parse(r) {
      const { errors, warnings } = parseEslint(r.stdout + r.stderr);
      if (errors > 0)
        return {
          ok: false,
          detail: `${RED}${errors} erro${errors > 1 ? "s" : ""}, ${warnings} aviso${warnings !== 1 ? "s" : ""}${R}`,
        };
      if (warnings > 0)
        return {
          ok: true,
          detail: `${YELLOW}${warnings} aviso${warnings !== 1 ? "s" : ""}${R}`,
        };
      return { ok: true, detail: `${D}0 erros, 0 avisos${R}` };
    },
  },
];

// ── Fase 1: Análise ───────────────────────────────────────────────────────────
const now = new Date().toLocaleString("pt-BR");

console.log();
console.log(`${D}Analisando projeto — aguarde...${R}\n`);

const results = checks.map((check) => {
  process.stdout.write(`  ${D}⋯  ${check.label}${R}\r`);
  const r = run(check.cmd);
  const parsed = check.parse(r);
  const ok = r.status === 0 && parsed.ok;
  return { ...check, ok, raw: r, detail: parsed.detail };
});

// Apaga linha de progresso
process.stdout.write(" ".repeat(60) + "\r");

const allOk = results.every((r) => r.ok);

// ── Tabela de resultados ──────────────────────────────────────────────────────
console.log(ahline("┌", "┬", "┐"));
console.log(
  awide(center(`${B}${WHITE} ANÁLISE DO PROJETO ${R}${D}  ${now}${R}`, AINNER)),
);
console.log(ahline("├", "┼", "┤"));
console.log(arow(`${B}Verificação${R}`, `${B}Status${R}`, `${B}Detalhes${R}`));
console.log(ahline("├", "┼", "┤"));

for (const r of results) {
  const status = r.ok ? `${GREEN}${B}✓  PASSOU${R}` : `${RED}${B}✗  FALHOU${R}`;
  console.log(arow(`  ${r.label}`, status, r.detail));
}

console.log(ahline("╞", "╪", "╡", "═"));

if (allOk) {
  console.log(awide(center(`${B}${GREEN}  ✓  TUDO PASSOU${R}`, AINNER)));
} else {
  console.log(
    awide(
      center(
        `${B}${RED}  ✗  FALHOU — corrija os erros acima e rode novamente${R}`,
        AINNER,
      ),
    ),
  );
}

console.log(ahline("└", "┴", "┘"));

// ── Detalhes dos erros ────────────────────────────────────────────────────────
for (const r of results.filter((r) => !r.ok)) {
  const out = (r.raw.stdout + r.raw.stderr).trim();
  if (!out) continue;
  console.log(`\n${RED}${B}── Erros: ${r.label} ${"─".repeat(40)}${R}`);
  out
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 30)
    .forEach((l) => console.log(`  ${l}`));
}

if (!allOk) process.exit(1);

// ── Fase 2: Build ─────────────────────────────────────────────────────────────
console.log(`\n${B}Building...${R}\n`);

const buildBack = spawnSync("npm --prefix backend run build", {
  shell: true,
  cwd: ROOT,
  stdio: "inherit",
});
const buildFront = spawnSync("npm --prefix frontend run build", {
  shell: true,
  cwd: ROOT,
  stdio: "inherit",
});

if (buildBack.status !== 0 || buildFront.status !== 0) {
  console.log(`\n${RED}${B}Build falhou.${R}`);
  process.exit(1);
}

// ── Fase 3: Tabela de tamanhos ────────────────────────────────────────────────
function renderSizeSection(titulo, distDir, accent) {
  const files = walk(distDir).sort();
  console.log(shline("├", "┼", "┤"));
  console.log(swide(`  ${B}${accent}${titulo}${R}`));
  console.log(shline("├", "┼", "┤"));
  if (!files.length) {
    console.log(swide(`  ${YELLOW}Pasta não encontrada.${R}`));
    return { count: 0, size: 0, gz: 0 };
  }
  let size = 0,
    gz = 0;
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, "/");
    const name = rel.length > S1 ? `…${rel.slice(1 - S1)}` : rel;
    const s = statSync(f).size;
    const g = gzSize(f);
    size += s;
    gz += g;
    const c = s > 200_000 ? YELLOW : accent;
    console.log(srow(`${c}${name}${R}`, fmtSize(s, c), fmtSize(g, D)));
  }
  const n = files.length;
  console.log(shline("├", "┼", "┤"));
  console.log(
    srow(
      `${B}  Subtotal — ${n} arquivo${n !== 1 ? "s" : ""}${R}`,
      fmtSize(size, B + GREEN),
      fmtSize(gz, D),
    ),
  );
  return { count: n, size, gz };
}

console.log();
console.log(shline("┌", "┬", "┐"));
console.log(swide(center(`${B}${WHITE} ARQUIVOS GERADOS ${R}`, SINNER)));
console.log(shline("├", "┼", "┤"));
console.log(srow(`${B}Arquivo${R}`, `${B}Tamanho${R}`, `${B}Gzip${R}`));

const back = renderSizeSection(
  "BACKEND   —  tsup  →  backend/dist/",
  join(ROOT, "backend/dist"),
  BLUE,
);
const front = renderSizeSection(
  "FRONTEND  —  Vite  →  frontend/dist/",
  join(ROOT, "frontend/dist"),
  GREEN,
);

const tot = back.size + front.size;
const gzt = back.gz + front.gz;
const cnt = back.count + front.count;

console.log(shline("╞", "╪", "╡", "═"));
console.log(
  srow(
    `${B}  TOTAL GERAL  —  ${cnt} arquivo${cnt !== 1 ? "s" : ""}${R}`,
    fmtSize(tot, B + MAGENTA),
    fmtSize(gzt, D),
  ),
);
console.log(shline("└", "┴", "┘"));
console.log();
