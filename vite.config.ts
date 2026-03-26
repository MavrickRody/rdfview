import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Some packages (jsonld, rdfxml-streaming-parser) need Node.js built-ins.
      // Vite handles most with esbuild; we just ensure stream/process are polyfilled.
      stream: 'stream-browserify',
      process: 'process/browser',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['n3', 'graphology', 'sigma', 'graphology-layout-forceatlas2'],
    exclude: [],
  },
})
