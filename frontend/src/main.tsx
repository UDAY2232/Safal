import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSafalServiceWorker } from './utils/mobilePush.ts';

// Initialize Service Worker for native mobile notifications and PWA capabilities
registerSafalServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
