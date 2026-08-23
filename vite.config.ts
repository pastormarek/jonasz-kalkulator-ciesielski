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
