import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { buildEscPosReceipt } from './EscPosReceipt.js';
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

const PRINT_SCRIPT = encodedPowerShell(String.raw`
$ErrorActionPreference = 'Stop'
$printerName = $env:PIZZA_PRINT_AGENT_PRINTER
$filePath = $env:PIZZA_PRINT_AGENT_FILE
if ([string]::IsNullOrWhiteSpace($printerName)) { throw 'Printer name is required.' }
if (-not (Test-Path -LiteralPath $filePath)) { throw 'Print file was not found.' }
# Winspool RAW bypasses GDI / Out-Printer paper-size and default font handling.
# Printer name is selected from installed Windows printers, never interpolated
# into executable PowerShell statements.
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
public static class KitchenRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  private class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName = "GastroNexa Cozinha";
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile = null;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType = "RAW";
  }
  [DllImport("winspool.drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  private static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
  [DllImport("winspool.drv", SetLastError=true)]
  private static extern bool ClosePrinter(IntPtr handle);
  [DllImport("winspool.drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  private static extern int StartDocPrinter(IntPtr handle, int level, [In] DOCINFO docInfo);
  [DllImport("winspool.drv", SetLastError=true)]
  private static extern bool EndDocPrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)]
  private static extern bool StartPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)]
  private static extern bool EndPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)]
  private static extern bool WritePrinter(IntPtr handle, byte[] bytes, int length, out int written);
  public static void Send(string printerName, byte[] data) {
    IntPtr handle;
    if (!OpenPrinter(printerName, out handle, IntPtr.Zero))
      throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "Unable to open Windows printer");
    try {
      if (StartDocPrinter(handle, 1, new DOCINFO()) == 0)
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "Unable to start print job");
      try {
        if (!StartPagePrinter(handle))
          throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "Unable to start print page");
        try {
          int written;
          if (!WritePrinter(handle, data, data.Length, out written))
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "Unable to send RAW data");
          if (written != data.Length) throw new IOException("Partial RAW print write");
        } finally { EndPagePrinter(handle); }
      } finally { EndDocPrinter(handle); }
    } finally { ClosePrinter(handle); }
  }
}
'@
[KitchenRawPrinter]::Send($printerName, [System.IO.File]::ReadAllBytes($filePath))
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

    const directory = await mkdtemp(path.join(tmpdir(), 'gastronexa-print-agent-'));
    const filePath = path.join(directory, 'command.bin');
    try {
      await writeFile(filePath, buildEscPosReceipt(request.content, request.paperWidth), { mode: 0o600 });
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
