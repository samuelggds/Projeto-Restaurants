'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const compiled = path.resolve(root, '..', 'dist');
const target = path.join(root, 'agent');
for (const required of ['api/PrintAgentApi.js', 'runner/PrintAgentRunner.js',
  'rendering/renderKitchenCommand.js', 'transports/WindowsSpoolerPrinterTransport.js']) {
  if (!fs.existsSync(path.join(compiled, required))) {
    throw new Error('Print Agent não compilado. Execute npm --prefix print-agent run build.');
  }
}
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(compiled, target, { recursive: true, filter: (source) => !source.endsWith('.map') });
fs.writeFileSync(path.join(target, 'package.json'), '{"type":"module"}\n');
console.log('Print Agent compilado incorporado ao aplicativo Windows.');
