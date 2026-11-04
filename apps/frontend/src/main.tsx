import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Fontes empacotadas com o app (e não do Google Fonts) para o PWA funcionar offline.
// Só o subconjunto latin: cobre todos os acentos do português.
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './styles/global.css';
import { App } from './App';

const SW_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

// Usa o cliente do vite-plugin-pwa (workbox-window) para recarregar a página assim que um
// novo Service Worker assumir o controle após deploy, evitando ficar preso ao index.html antigo.
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;

    const checkForUpdate = async () => {
      if (registration.installing || !navigator.onLine) return;
      try {
        const response = await fetch(swUrl, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache',
          },
        });
        if (response.status === 200) {
          await registration.update();
        }
      } catch {
        // Ignora falhas de rede momentâneas ao consultar atualização do SW.
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate();
      }
    });

    window.addEventListener('online', () => {
      void checkForUpdate();
    });

    window.setInterval(() => {
      void checkForUpdate();
    }, SW_UPDATE_INTERVAL_MS);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
