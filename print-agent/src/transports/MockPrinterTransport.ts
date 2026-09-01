import type { PrinterDescriptor, PrinterTransport, PrintRequest } from './PrinterTransport.js';

export class MockPrinterTransport implements PrinterTransport {
  readonly kind = 'mock' as const;
  readonly printed: PrintRequest[] = [];
  failWith: Error | null = null;

  constructor(
    private readonly printers: PrinterDescriptor[] = [
      { name: 'Mock Thermal Printer', status: 'Ready', offline: false },
    ],
  ) {}

  async listPrinters() {
    return [...this.printers];
  }

  async getStatus(printerName: string) {
    return this.printers.find((printer) => printer.name === printerName) || null;
  }

  async print(request: PrintRequest) {
    if (this.failWith) throw this.failWith;
    if (!(await this.getStatus(request.printerName))) {
      throw new Error('Impressora selecionada não encontrada.');
    }
    this.printed.push({ ...request });
  }
}
