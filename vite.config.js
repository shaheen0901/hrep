import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths: the same build works at shaheen0901.github.io/hrep/, inside the lab
  // website at …/geosense/tools/hrep/, and later at <custom-domain>/tools/hrep/.
  base: './',
  // Plotly alone is ~4.5 MB; it is loaded lazily, so silence the size warning.
  build: { chunkSizeWarningLimit: 6000 },
})
