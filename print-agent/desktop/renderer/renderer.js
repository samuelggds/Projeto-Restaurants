'use strict';

const $ = (id) => document.getElementById(id);
let current = null;
let processing = false;

function message(text, ok = false) {
  $('message').textContent = text || '';
  $('message').classList.toggle('ok', ok);
}
async function execute(action, success = '') {
  if (processing) return;
  processing = true;
  document.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  message('');
  try {
    await action();
    message(success, Boolean(success));
    await refresh();
  } catch (error) {
    message(error?.message || 'Não foi possível concluir a operação.');
  } finally {
    processing = false;
    document.querySelectorAll('button').forEach((button) => { button.disabled = false; });
  }
}
async function refresh() {
  current = await window.kitchen.status();
  const connected = Boolean(current.paired && current.running);
  $('status').textContent = !current.paired ? 'Restaurante não conectado' :
    connected ? 'Programa pronto para receber comandas' : 'Conectado, aguardando impressora';
  document.querySelector('.status').classList.toggle('ok', connected);
  $('printer-status').textContent = current.printerName || 'Nenhuma impressora selecionada';
  $('startup').checked = Boolean(current.autoStart);
  $('code').disabled = current.paired;
  $('pair').disabled = current.paired;
  $('select').disabled = !current.paired;
  $('test').disabled = !current.printerName;
  $('disconnect').disabled = !current.paired;
  if (current.lastError) message('Atenção: ' + current.lastError);
}
async function refreshPrinters() {
  const printers = await window.kitchen.printers();
  const select = $('printers');
  select.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecione uma impressora';
  select.append(placeholder);
  for (const printer of printers) {
    const option = document.createElement('option');
    option.value = printer.name;
    option.textContent = printer.name + (printer.offline ? ' (offline)' : '');
    option.disabled = printer.offline;
    if (printer.name === current?.printerName) option.selected = true;
    select.append(option);
  }
}
$('pair').addEventListener('click', () => execute(async () => {
  await window.kitchen.pair($('code').value);
  $('code').value = '';
}, 'Restaurante conectado com segurança.'));
$('refresh').addEventListener('click', () => execute(refreshPrinters, 'Lista atualizada.'));
$('select').addEventListener('click', () => execute(() => window.kitchen.select($('printers').value), 'Impressora configurada.'));
$('test').addEventListener('click', () => execute(() => window.kitchen.test(), 'Teste enviado à impressora.'));
$('startup').addEventListener('change', (event) => execute(() => window.kitchen.autoStart(event.target.checked), 'Inicialização atualizada.'));
$('disconnect').addEventListener('click', () => {
  if (confirm('Desconectar este computador do restaurante?')) {
    execute(() => window.kitchen.disconnect(), 'Computador desconectado.');
  }
});
$('website').addEventListener('click', () => execute(() => window.kitchen.website()));
window.kitchen.onChanged(() => { if (!processing) refresh().catch(() => {}); });
(async () => {
  try { await refresh(); await refreshPrinters(); } catch (error) { message(error?.message || 'Erro ao iniciar.'); }
})();
