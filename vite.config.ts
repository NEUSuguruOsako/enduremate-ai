import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  base: '/enduremate-ai/',
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
})
