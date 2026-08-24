const errors = [];
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) errors.push(`${name} e obrigatoria no build Docker.`);
  return value;
}

function validateSecureUrl(name, value) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHosts.has(url.hostname))) {
      errors.push(`${name} deve usar HTTPS fora do ambiente local.`);
    }
  } catch {
    errors.push(`${name} deve ser uma URL valida.`);
  }
}

const apiUrl = required('VITE_API_URL');
validateSecureUrl('VITE_API_URL', apiUrl);

const socketUrl = String(process.env.VITE_SOCKET_URL || apiUrl).trim();
validateSecureUrl('VITE_SOCKET_URL', socketUrl);

const socketPath = String(process.env.VITE_SOCKET_PATH || '/socket.io').trim();
if (!socketPath.startsWith('/')) errors.push('VITE_SOCKET_PATH deve iniciar com /.');

const tileUrl = String(process.env.VITE_MAP_TILE_URL || '').trim();
if (tileUrl) {
  validateSecureUrl('VITE_MAP_TILE_URL', tileUrl);
  if (!tileUrl.includes('{z}') || !tileUrl.includes('{x}') || !tileUrl.includes('{y}')) {
    errors.push('VITE_MAP_TILE_URL deve conter {z}, {x} e {y}.');
  }
}

if (errors.length) {
  throw new Error(`Falha na configuracao do frontend: ${errors.join(' ')}`);
}
