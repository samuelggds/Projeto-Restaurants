const LOCAL_VISUAL_LAB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalPaymentVisualLabRuntime(locationLike = window.location) {
  return LOCAL_VISUAL_LAB_HOSTS.has(String(locationLike.hostname || '').toLowerCase());
}
