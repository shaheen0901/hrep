import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The site is served from https://shaheen0901.github.io/hrep/
  // Change this if HREP moves to another address (e.g. '/' on its own domain).
  base: '/hrep/',
  // Plotly alone is ~4.5 MB; it is loaded lazily, so silence the size warning.
  build: { chunkSizeWarningLimit: 6000 },
})
