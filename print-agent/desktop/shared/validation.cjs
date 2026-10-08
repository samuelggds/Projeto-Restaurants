'use strict';

const PAIRING_CODE_PATTERN = /^pa_([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/u;

function normalizePairingCode(value) {
  if (typeof value !== 'string') throw new Error('Informe o código de conexão.');
  const code = value.trim();
  if (!PAIRING_CODE_PATTERN.test(code)) throw new Error('Código de conexão inválido.');
  return code;
}

function normalizePrinterName(value) {
  if (typeof value !== 'string') throw new Error('Escolha uma impressora do Windows.');
  const printerName = value.trim();
  if ((!printerName || printerName.length > 200 ||
      [...printerName].some((character) => { const code = character.charCodeAt(0); return code < 32 || code === 127; }))) {
    throw new Error('Nome de impressora inválido.');
  }
  return printerName;
}

function validateStoredRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Configuração local inválida.');
  }
  if (value.version !== 1 || typeof value.encryptedCredential !== 'string' ||
      !/^[A-Za-z0-9+/]+={0,2}$/u.test(value.encryptedCredential) ||
      value.encryptedCredential.length > 2048) {
    throw new Error('Configuração local inválida.');
  }
  return {
    encryptedCredential: value.encryptedCredential,
    printerName: value.printerName == null ? null : normalizePrinterName(value.printerName),
    autoStart: value.autoStart !== false,
  };
}

module.exports = { normalizePairingCode, normalizePrinterName, validateStoredRecord };
