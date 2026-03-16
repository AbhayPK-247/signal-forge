import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    nodePolyfills(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-ui': ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
          'vendor-charts': ['plotly.js', 'react-plotly.js', 'recharts'],
          'vendor-dsp': ['jszip', 'katex'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
