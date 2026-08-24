import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      workbox: {
        // pdf.js worker bywa duzy - podnosimy limit prekeszowania
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        // HTML NIE moze byc serwowany z pamieci jako pierwszy wybor.
        // Nazwy plikow JS i CSS zawieraja skrot tresci, wiec po wdrozeniu
        // zmieniaja sie, a stare znikaja z serwera. Gdyby przegladarka podala
        // stary index.html z pamieci, odwolywalby sie do plikow, ktorych juz
        // nie ma - i uzytkownik zobaczylby pusta strone. Dlatego nawigacje
        // ida najpierw do sieci, a po kopie siegamy dopiero, gdy sieci brak.
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'jonasz-html',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 8 },
            },
          },
        ],
      },
      manifest: {
        name: 'Jonasz - Kalkulator Ciesielski',
        short_name: 'Jonasz',
        description: 'Kalkulator wiezby dachowej: krokwie, zaciosy, zestawienie materialu.',
        lang: 'pl',
        theme_color: '#1c1917',
        background_color: '#1c1917',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    // Rdzeń liczy w node, a testy interfejsu potrzebują DOM-u.
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
