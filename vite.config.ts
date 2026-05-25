import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      {
        name: 'mock-ws',
        configureServer(server) {
          if (!server.ws) {
            server.ws = {
              send() {},
              close() {},
              on() {},
              off() {},
              listen() {},
            } as any;
          }
          if (!server.hot) {
            server.hot = {
              send() {},
              close() {},
              on() {},
              off() {},
              listen() {},
              accept() {},
              dispose() {},
              prune() {},
              decline() {},
              invalidate() {},
            } as any;
          }
          // Safely intercept and guard existing objects 'send' functions if they are defined
          if (server.ws && typeof server.ws.send !== 'function') {
            server.ws.send = () => {};
          }
          if (server.hot && typeof server.hot.send !== 'function') {
            server.hot.send = () => {};
          }
        }
      },
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: process.env.DISABLE_HMR !== 'true',
          type: 'module',
        },
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'screenshot-desktop.png', 'screenshot-mobile.png'],
        manifestFilename: 'manifest.json',
        manifest: {
          id: '/',
          start_url: '/',
          name: 'Digital Farm App',
          short_name: 'Digital Farm',
          description: 'A comprehensive business management application for various types of farms.',
          theme_color: '#f97316',
          background_color: '#ffffff',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'minimal-ui'],
          orientation: 'portrait',
          categories: ['productivity', 'business'],
          lang: 'bn',
          dir: 'ltr',
          prefer_related_applications: false,
          related_applications: [],
          iarc_rating_id: 'e',
          shortcuts: [
            {
              name: 'Batches',
              short_name: 'Batches',
              description: 'View your active and completed batches',
              url: '/batches',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
            }
          ],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: '/screenshot-desktop.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide'
            },
            {
              src: '/screenshot-mobile.png',
              sizes: '720x1280',
              type: 'image/png',
              form_factor: 'narrow'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
