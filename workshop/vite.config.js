import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "SecurMask Workshop",
        short_name: "SecurMask",
        description:
          "Practice reviewing and masking fictional data before sharing.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f5f4ef",
        theme_color: "#f5f4ef",
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
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
