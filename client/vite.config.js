import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "SecurMask",
        short_name: "SecurMask",
        description: "A thoughtful workspace for masking spreadsheet data.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#fafafa",
        theme_color: "#fafafa",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg}"],
        globIgnores: ["**/social/**"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8081",
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  esbuild: mode === "production" ? { drop: ["console", "debugger"] } : {},
}));
