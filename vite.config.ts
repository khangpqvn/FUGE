import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  // The department master criteria is a BinaryFormatter stream, not a JS/TS/CSS asset, so it
  // needs to be declared inlinable before `?url` will resolve it at build time.
  assetsInclude: ['**/*.master'],
})
