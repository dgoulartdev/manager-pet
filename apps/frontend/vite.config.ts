import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gerenciamento Felinos',
        short_name: 'Felinos',
        theme_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
    }),
  ],
});
