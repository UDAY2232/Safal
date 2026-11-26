import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSafalServiceWorker } from './utils/mobilePush.ts';

// Auto-recovery: If an asset chunk fails to load due to a new deployment, auto-reload to latest bundle
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[SAFAL Sync] Outdated asset chunk detected. Refreshing to latest version...');
    event.preventDefault();
    window.location.reload();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SAFAL Sync] Service Worker updated. Syncing application state...');
      window.location.reload();
    });
  }
}

// Initialize Service Worker for native mobile notifications and PWA capabilities
registerSafalServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
