import { CHARACTER_WIDTH } from '../rendering/renderKitchenCommand.js';
import type { PaperWidth } from '../types.js';

const ESC = 0x1b;
const GS = 0x1d;
const MAX_RECEIPT_BYTES = 128 * 1024;

/**
 * ESC/POS devices do not generally interpret UTF-8 as Unicode. Only send
 * printable 7-bit ASCII from user-supplied fields. Accents are transliterated
 * to keep kitchen instructions readable, while untrusted control codes never
 * reach the printer (including cash-drawer, cut and reset commands).
 */
export function toThermalAscii(input: string) {
  const normalized = input
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u201c\u201d]/gu, '"')
    .replace(/[\u2013\u2014]/gu, '-')
    .replace(/\u2022/gu, '-')
    .replace(/\u00ba/gu, 'o')
    .replace(/\u00aa/gu, 'a');

  let result = '';
  for (const character of normalized) {
    const code = character.codePointAt(0) ?? 0;
    if (code >= 32 && code <= 126) result += character;
    else if (code < 32 || code === 127 || (code >= 128 && code <= 159)) continue;
    else result += '?';
  }
  return result;
}

export function buildEscPosReceipt(content: string, paperWidth: PaperWidth): Buffer {
  const columns = CHARACTER_WIDTH[paperWidth];
  if (!columns) throw new Error('Largura de papel não suportada para ESC/POS.');
  const rawLines = content.replace(/\r\n?/gu, '\n').split('\n');
  const lines: string[] = [];

  for (const rawLine of rawLines) {
    const safe = toThermalAscii(rawLine);
    if (!safe.length) {
      lines.push('');
      continue;
    }
    // Never silently drop item/observation text when a future renderer writes
    // longer lines. For normal receipts the renderer already word-wraps.
    for (let i = 0; i < safe.length; i += columns) {
      lines.push(safe.slice(i, i + columns));
    }
  }

  // A plain ESC/POS 58 mm printer usually prints 384 dots / 32 Font-A columns.
  // 80 mm normally prints 576 dots / 48 Font-A columns. Use normal-size font,
  // left alignment, no auto-cut (portable printers often lack a cutter).
  const dots = paperWidth === 'MM58' ? 384 : 576;
  const commands = Buffer.from([
    ESC, 0x40, // reset
    ESC, 0x61, 0, // align left
    ESC, 0x4d, 0, // font A
    GS, 0x21, 0, // normal width and height
    GS, 0x4c, 0, 0, // zero left margin
    GS, 0x57, dots & 0xff, (dots >> 8) & 0xff, // fixed printable region
  ]);
  const body = Buffer.from(lines.join('\n').replace(/\n*$/u, '') + '\n\n\n', 'ascii');
  if (body.length > MAX_RECEIPT_BYTES) throw new Error('Comanda excede o tamanho permitido.');
  return Buffer.concat([commands, body]);
}
