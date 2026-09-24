import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // O .env fica na raiz do monorepo, compartilhado com o backend.
  envDir: '../../',
  server: {
    // Porta fixa: o CORS do backend libera exatamente esta origem (CORS_ORIGIN).
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        // Inclui as fontes no cache offline (o padrão só guarda js, css e html).
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
      manifest: {
        name: 'MeuPaciente',
        short_name: 'MeuPaciente',
        description: 'Prontuário veterinário para profissionais autônomos que atendem cães e gatos.',
        lang: 'pt-BR',
        theme_color: '#12615c',
        background_color: '#f7f9fb',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
});
