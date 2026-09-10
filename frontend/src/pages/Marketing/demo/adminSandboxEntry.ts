// Separate document/runtime: production authentication, storage and API transport
// are never modified by the demo. The HTML CSP independently blocks connections.
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(String(key), String(value));
    },
  };
}
Object.defineProperty(window, 'localStorage', { value: memoryStorage() });
Object.defineProperty(window, 'sessionStorage', { value: memoryStorage() });
window.fetch = async () => {
  throw new Error('Conexões externas não são usadas na demonstração.');
};
window.open = () => null;
window.print = () => undefined;
document.addEventListener(
  'click',
  (event) => {
    const anchor = (event.target as Element | null)?.closest('a');
    if (anchor && !anchor.getAttribute('href')?.startsWith('#') && !anchor.hasAttribute('download'))
      event.preventDefault();
  },
  true,
);
void import('./DemoAdminSandbox');
