export type PrinterDescriptor = {
  name: string;
  status: string;
  offline: boolean;
};

export type PrintRequest = {
  printerName: string;
  content: string;
  paperWidth: 'MM58' | 'MM80';
};

export interface PrinterTransport {
  readonly kind: 'windows' | 'mock';
  listPrinters(): Promise<PrinterDescriptor[]>;
  getStatus(printerName: string): Promise<PrinterDescriptor | null>;
  print(request: PrintRequest): Promise<void>;
}
