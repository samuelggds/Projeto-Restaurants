'use strict';

const { app, BrowserWindow, ipcMain, safeStorage, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { normalizePairingCode, normalizePrinterName, validateStoredRecord } = require('./shared/validation.cjs');

const API_URL = 'https://api.gastronexa.com.br';
let window;
let runnerAbort = null;
let runnerPromise = null;
let busy = false;
let lastError = '';
let record = null;
let modulesPromise = null;
const getConfigFile = () => path.join(app.getPath('userData'), 'device.json');
const modules = () => {
  if (!modulesPromise) {
    const root = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'agent')
      : path.join(__dirname, 'agent');
    const load = (file) => import(pathToFileURL(path.join(root, file)).href);
    modulesPromise = Promise.all([
      load('api/PrintAgentApi.js'),
      load('runner/PrintAgentRunner.js'),
      load('transports/WindowsSpoolerPrinterTransport.js'),
      load('rendering/renderKitchenCommand.js'),
    ]).then(([api, runner, transport, rendering]) => ({ api, runner, transport, rendering }));
  }
  return modulesPromise;
};

const sendStatus = () => {
  if (window && !window.isDestroyed()) window.webContents.send('kitchen:changed');
};
const isPaired = () => Boolean(record?.encryptedCredential);
const credential = () => {
  if (!isPaired() || !safeStorage.isEncryptionAvailable()) {
    throw new Error('O armazenamento seguro do Windows está indisponível.');
  }
  return normalizePairingCode(safeStorage.decryptString(Buffer.from(record.encryptedCredential, 'base64')));
};
const persist = async () => {
  await fs.mkdir(path.dirname(getConfigFile()), { recursive: true });
  const file = getConfigFile();
  const temp = file + '.tmp';
  await fs.writeFile(temp, JSON.stringify({ version: 1, ...record }), { mode: 0o600 });
  await fs.rename(temp, file);
};
const withBusy = async (action) => {
  if (busy) throw new Error('Outra operação está em andamento.');
  busy = true;
  try { return await action(); } finally { busy = false; }
};
const getTransport = async () => {
  const { transport } = await modules();
  return new transport.WindowsSpoolerPrinterTransport();
};
const getApi = async (token) => {
  const { api } = await modules();
  return new api.PrintAgentApi(API_URL, token);
};
const heartbeat = async (token, printerName) => {
  const api = await getApi(token);
  const result = await api.heartbeat({ printerName, appVersion: app.getVersion() });
  if (!result.ok) throw new Error('API não confirmou o pareamento.');
  return result;
};
const stopRunner = async () => {
  runnerAbort?.abort();
  if (runnerPromise) await runnerPromise.catch(() => {});
  runnerAbort = null;
  runnerPromise = null;
  sendStatus();
};
const startRunner = async () => {
  if (runnerPromise || !record?.printerName || !isPaired()) return;
  const token = credential();
  const printerName = record.printerName;
  const transport = await getTransport();
  const printers = await transport.listPrinters();
  if (!printers.some((printer) => printer.name === printerName && !printer.offline)) {
    throw new Error('A impressora selecionada não está disponível no Windows.');
  }
  const { runner } = await modules();
  const api = await getApi(token);
  runnerAbort = new AbortController();
  const abort = runnerAbort;
  const logger = {
    info() { sendStatus(); },
    error(event) { lastError = event; sendStatus(); },
  };
  const jobRunner = new runner.PrintAgentRunner(
    { apiBaseUrl: API_URL, credential: token, printerName, transport: 'windows', pollIntervalMs: 2000 },
    api, transport, logger,
  );
  runnerPromise = jobRunner.run(abort.signal)
    .catch(() => { lastError = 'Conexão interrompida. Reinicie o programa.'; })
    .finally(() => { runnerPromise = null; runnerAbort = null; sendStatus(); });
  sendStatus();
};
const status = async () => ({
  paired: isPaired(), printerName: record?.printerName || '',
  running: Boolean(runnerPromise), autoStart: app.getLoginItemSettings().openAtLogin,
  lastError,
});

app.whenReady().then(async () => {
  if (process.platform !== 'win32') {
    throw new Error('GastroNexa Cozinha funciona no Windows.');
  }
  app.setAppUserModelId('br.com.gastronexa.cozinha');
  try {
    record = validateStoredRecord(JSON.parse(await fs.readFile(getConfigFile(), 'utf8')));
  } catch {
    record = null;
  }
  window = new BrowserWindow({
    width: 760, height: 710, minWidth: 600, minHeight: 570,
    title: 'GastroNexa Cozinha', backgroundColor: '#f6f5f3',
    icon: path.join(__dirname, 'assets', 'gastronexa-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      webSecurity: true, devTools: !app.isPackaged,
    },
  });
  window.setMenuBarVisibility(false);
  await window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  if (record?.printerName) {
    try { await startRunner(); } catch { lastError = 'Falha ao iniciar impressão. Verifique a impressora.'; sendStatus(); }
  }
}).catch(() => app.quit());

ipcMain.handle('kitchen:status', async () => status());
ipcMain.handle('kitchen:printers', async () => (await getTransport()).listPrinters());
ipcMain.handle('kitchen:pair', async (_event, code) => withBusy(async () => {
  const candidate = normalizePairingCode(code);
  if (!safeStorage.isEncryptionAvailable()) throw new Error('O Windows não disponibiliza criptografia segura.');
  await heartbeat(candidate, null); // Validate the tenant-bound token before saving it.
  await stopRunner();
  record = {
    encryptedCredential: safeStorage.encryptString(candidate).toString('base64'),
    printerName: null, autoStart: record?.autoStart !== false,
  };
  await persist();
  lastError = '';
  sendStatus();
  return status();
}));
ipcMain.handle('kitchen:select', async (_event, value) => withBusy(async () => {
  if (!isPaired()) throw new Error('Conecte primeiro o restaurante.');
  const printerName = normalizePrinterName(value);
  const printer = (await (await getTransport()).listPrinters()).find((item) => item.name === printerName);
  if (!printer || printer.offline) throw new Error('Selecione uma impressora instalada e disponível.');
  await stopRunner();
  record.printerName = printerName;
  await persist();
  lastError = '';
  await startRunner();
  return status();
}));
ipcMain.handle('kitchen:test', async () => withBusy(async () => {
  if (!record?.printerName) throw new Error('Escolha a impressora primeiro.');
  const printer = await getTransport();
  const { rendering } = await modules();
  const content = rendering.renderKitchenCommand({
    version: 1, kind: 'TEST', restaurantName: 'GastroNexa',
    requestedAt: new Date().toISOString(), message: 'Teste local do GastroNexa Cozinha.',
  }, 'MM58');
  await printer.print({ printerName: record.printerName, content, paperWidth: 'MM58' });
  return { ok: true };
}));
ipcMain.handle('kitchen:autoStart', async (_event, enabled) => withBusy(async () => {
  if (typeof enabled !== 'boolean') throw new Error('Opção inválida.');
  if (!app.isPackaged) throw new Error('Inicialização automática disponível após instalar o programa.');
  app.setLoginItemSettings({ openAtLogin: enabled });
  if (record) { record.autoStart = enabled; await persist(); }
  return status();
}));
ipcMain.handle('kitchen:disconnect', async () => withBusy(async () => {
  await stopRunner();
  record = null;
  await fs.rm(getConfigFile(), { force: true });
  lastError = '';
  sendStatus();
  return status();
}));
ipcMain.handle('kitchen:website', () => shell.openExternal('https://gastronexa.com.br/admin'));
app.on('window-all-closed', () => app.quit());
