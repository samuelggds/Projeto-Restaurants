'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  normalizePairingCode, normalizePrinterName, validateStoredRecord,
} = require('../shared/validation.cjs');

const token = 'pa_' + ['51783dad', '61e9', '4dc7', '8ad2', 'c69e5b42aac4'].join('-') + '.' + 'A'.repeat(43);

test('accepts only the exact tenant-bound agent credential shape', () => {
  assert.equal(normalizePairingCode('  ' + token + '\n'), token);
  assert.throws(() => normalizePairingCode('Bearer ' + token));
  assert.throws(() => normalizePairingCode('http://localhost'));
  assert.throws(() => normalizePairingCode(token + '\nmalicious'));
  assert.throws(() => normalizePairingCode('pa_1234.' + 'A'.repeat(43)));
});

test('printer selection must be a printable name, never a command', () => {
  assert.equal(normalizePrinterName(' Atomo MO-5812 USB '), 'Atomo MO-5812 USB');
  assert.throws(() => normalizePrinterName(' '));
  assert.throws(() => normalizePrinterName('Test\nPrinter'));
  assert.throws(() => normalizePrinterName('x'.repeat(201)));
});

test('disk record never accepts a plaintext credential', () => {
  assert.deepEqual(
    validateStoredRecord({
      version: 1, encryptedCredential: 'YWI=', printerName: 'Atomo MO-5812 USB',
      autoStart: false,
    }),
    { encryptedCredential: 'YWI=', printerName: 'Atomo MO-5812 USB', autoStart: false },
  );
  assert.throws(() => validateStoredRecord({ version: 1, credential: token }));
  assert.throws(() => validateStoredRecord({ version: 1, encryptedCredential: '$$$' }));
  assert.throws(() => validateStoredRecord({ version: 2, encryptedCredential: 'YWI=' }));
});
