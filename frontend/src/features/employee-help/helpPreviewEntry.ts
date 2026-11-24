const directStorefront = window.location.pathname === '/vitrine-demo.html';
const view = new URLSearchParams(window.location.search).get('view');

if (directStorefront || view === 'storefront') {
  document.title = 'Vitrine de demonstração | GastroNexa';
  void import('../../pages/Marketing/landing/storefrontDemo/entry');
} else {
  void import('./HelpPreviewPage');
}
