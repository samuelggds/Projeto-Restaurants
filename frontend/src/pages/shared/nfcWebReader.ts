// Web NFC is supported primarily by Chrome on Android over HTTPS.
// All security decisions happen on the authenticated backend.
type NdefMessage = { records: Array<{ recordType: string; data?: DataView; encoding?: string }> };
type NdefReaderInstance = {
  scan: () => Promise<void>;
  write: (message: { records: Array<{ recordType: string; data: string }> }) => Promise<void>;
  onreading: ((event: { message: NdefMessage }) => void) | null;
  onreadingerror: (() => void) | null;
};
type NdefConstructor = new () => NdefReaderInstance;
function ndefConstructor(): NdefConstructor {
  const ctor = (window as Window & { NDEFReader?: NdefConstructor }).NDEFReader;
  if (!ctor || !window.isSecureContext) {
    throw new Error('Aproxime o cartão com um Android que tenha NFC e Chrome atualizado, em uma página HTTPS.');
  }
  return ctor;
}
export function extractNfcToken(value: string): string | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.origin !== 'https://www.gastronexa.com.br') return null;
  const match = /^\/(?:[a-z0-9][a-z0-9_-]{0,99}\/)?nfc\/([A-Za-z0-9_-]{32,128})\/?$/.exec(url.pathname);
  return match?.[1] || null;
}
function readText(record: NdefMessage['records'][number]) {
  if (!record.data) return '';
  try {
    return new TextDecoder(record.encoding || 'utf-8').decode(record.data);
  } catch { return ''; }
}
export async function writeNfcCard(url: string) {
  if (!extractNfcToken(url)) throw new Error('Identificador do cartão NFC inválido.');
  const Reader = ndefConstructor();
  const reader = new Reader();
  await reader.write({ records: [{ recordType: 'url', data: url }] });
}
export function scanNfcCard(): Promise<string> {
  const Reader = ndefConstructor();
  const reader = new Reader();
  return new Promise<string>((resolve, reject) => {
    let finished = false;
    const timeout = window.setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error('Nenhum cartão NFC lido. Tente novamente e aproxime o cartão.'));
      }
    }, 30000);
    reader.onreading = ({ message }) => {
      if (finished) return;
      for (const record of message.records) {
        if (record.recordType !== 'url') continue;
        const token = extractNfcToken(readText(record));
        if (token) {
          finished = true;
          window.clearTimeout(timeout);
          resolve(token);
          return;
        }
      }
      finished = true;
      window.clearTimeout(timeout);
      reject(new Error('O cartão não contém um identificador GastroNexa válido.'));
    };
    reader.onreadingerror = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      reject(new Error('Falha ao ler o cartão NFC.'));
    };
    void reader.scan().catch((error: unknown) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      reject(error);
    });
  });
}
