import { useLayoutEffect, useReducer, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { GlobalStyles } from '../../../../../GlobalStyles/globalStyles';
import { AppDialogProvider } from '../../../../components/AppDialog/AppDialogProvider';
import { demoStores, toggleStorefrontTheme, type DemoSlug } from './catalog';
import { initialDemoSessions, updateDemoSession } from './demoSession';
import { StorefrontExperience } from './StorefrontExperience';
import { DemoDarkStyles } from './DemoDarkStyles';
import { DemoProductTheme } from './DemoProductTheme';

function subscribe(notify: () => void) {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
}

function currentStore() {
  const slug = window.location.hash.slice(1);
  return Object.hasOwn(demoStores, slug) ? (slug as DemoSlug) : null;
}

export function DemoFrame() {
  const slug = useSyncExternalStore(subscribe, currentStore);
  const [sessions, dispatch] = useReducer(updateDemoSession, undefined, () =>
    initialDemoSessions(),
  );
  const theme = slug && sessions[slug].darkMode ? 'dark' : 'light';
  useLayoutEffect(() => {
    document.documentElement.dataset.storefrontTheme = theme;
    document.documentElement.style.colorScheme = theme;
    if (!slug) return;
    document.documentElement.style.setProperty('--demo-store-color', demoStores[slug].color);
    const toggle = () => dispatch({ slug, type: 'theme', enabled: theme === 'light' });
    document.addEventListener(toggleStorefrontTheme, toggle);
    return () => document.removeEventListener(toggleStorefrontTheme, toggle);
  }, [slug, theme]);
  return (
    <>
      <GlobalStyles />
      <DemoDarkStyles />
      <DemoProductTheme />
      {slug && (
        <MemoryRouter key={slug}>
          <AppDialogProvider>
            <StorefrontExperience slug={slug} session={sessions[slug]} dispatch={dispatch} />
          </AppDialogProvider>
        </MemoryRouter>
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<DemoFrame />);
