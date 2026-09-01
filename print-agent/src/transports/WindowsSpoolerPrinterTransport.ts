import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { PrinterDescriptor, PrinterTransport, PrintRequest } from './PrinterTransport.js';

const execFileAsync = promisify(execFile);

function encodedPowerShell(script: string) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

const LIST_SCRIPT = encodedPowerShell(`
$ErrorActionPreference = 'Stop'
$items = @(Get-Printer | Select-Object Name, PrinterStatus, WorkOffline)
$items | ConvertTo-Json -Compress
`);

const PRINT_SCRIPT = encodedPowerShell(`
$ErrorActionPreference = 'Stop'
$printerName = $env:PIZZA_PRINT_AGENT_PRINTER
$filePath = $env:PIZZA_PRINT_AGENT_FILE
if ([string]::IsNullOrWhiteSpace($printerName)) { throw 'Printer name is required.' }
if (-not (Test-Path -LiteralPath $filePath)) { throw 'Print file was not found.' }
Get-Content -LiteralPath $filePath -Raw -Encoding UTF8 | Out-Printer -Name $printerName
`);

function normalizeList(value: unknown): PrinterDescriptor[] {
  const records = Array.isArray(value) ? value : value ? [value] : [];
  return records.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;
    const name = String(record.Name || '').trim();
    if (!name) return [];
    const offline = record.WorkOffline === true;
    return [
      {
        name,
        status: offline ? 'Offline' : String(record.PrinterStatus || 'Unknown'),
        offline,
      },
    ];
  });
}

export class WindowsSpoolerPrinterTransport implements PrinterTransport {
  readonly kind = 'windows' as const;

  private assertWindows() {
    if (process.platform !== 'win32') {
      throw new Error('O transporte Windows requer um computador Windows com Get-Printer.');
    }
  }

  async listPrinters() {
    this.assertWindows();
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', LIST_SCRIPT],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    if (!stdout.trim()) return [];
    return normalizeList(JSON.parse(stdout));
  }

  async getStatus(printerName: string) {
    return (await this.listPrinters()).find((printer) => printer.name === printerName) || null;
  }

  async print(request: PrintRequest) {
    this.assertWindows();
    const selected = await this.getStatus(request.printerName);
    if (!selected) throw new Error('A impressora selecionada não está instalada.');
    if (selected.offline) throw new Error('A impressora selecionada está offline.');

    const directory = await mkdtemp(path.join(tmpdir(), 'pizza-print-agent-'));
    const filePath = path.join(directory, 'command.txt');
    try {
      await writeFile(filePath, request.content, { encoding: 'utf8', mode: 0o600 });
      await execFileAsync(
        'powershell.exe',
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', PRINT_SCRIPT],
        {
          windowsHide: true,
          timeout: 30_000,
          env: {
            ...process.env,
            PIZZA_PRINT_AGENT_PRINTER: request.printerName,
            PIZZA_PRINT_AGENT_FILE: filePath,
          },
        },
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
