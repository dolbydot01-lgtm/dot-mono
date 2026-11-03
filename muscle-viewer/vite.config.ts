import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The lazily loaded 3D chunk is mostly three.js + postprocessing.
    chunkSizeWarningLimit: 1300,
  },
})
