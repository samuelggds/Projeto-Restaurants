// Isolated audit configuration: does not reuse the user's Vite instance.
import path from 'node:path';
import original from '../frontend/playwright.config';
const directory = __dirname;
export default {
  ...original,
  testDir: path.resolve(directory, '../frontend/e2e'),
  outputDir: path.resolve(directory, 'auditoria-browser-results'),
  use: { ...original.use, baseURL: 'http://127.0.0.1:4179' },
  webServer: {
    ...original.webServer,
    command: 'node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4179',
    cwd: path.resolve(directory, '../frontend'),
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: false,
  },
};
