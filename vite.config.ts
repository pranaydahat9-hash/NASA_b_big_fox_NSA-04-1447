// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [VitePWA({
    strategies: 'generateSW', outDir: 'dist/client', filename: 'sw.js',
    injectRegister: null, registerType: 'autoUpdate', manifest: false,
    devOptions: { enabled: false },
    workbox: {
      globPatterns: ['emergency-kit.js', 'emergency-kit.css', 'manifest.webmanifest', 'favicon.png', 'apple-touch-icon.png'],
      navigateFallback: null, clientsClaim: true, skipWaiting: true,
      runtimeCaching: [
        { urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname === '/emergency-kit.html', handler: 'NetworkFirst', options: { cacheName: 'fox-public-help', networkTimeoutSeconds: 3, expiration: { maxEntries: 1 } } },
        { urlPattern: ({ url }) => url.origin === self.location.origin && /^\/assets\/.*-[a-zA-Z0-9_-]{8,}\.(js|css|woff2|png|jpg)$/.test(url.pathname), handler: 'CacheFirst', options: { cacheName: 'fox-public-assets', expiration: { maxEntries: 80 } } },
      ],
    },
  })],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
